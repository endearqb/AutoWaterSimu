from __future__ import annotations

import hashlib
import json
import math
import platform
import sys
import time
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any

WORKER_VERSION = "0.1.0-phase2a"
SUPPORTED_JOB_TYPE = "simulation.material_balance.v1"
SUPPORTED_CONTRACT_VERSIONS = [
    "compute_job.v1",
    "simulation_input.v1",
    "compute_result.v1",
    "artifact.v1",
]


class WorkerRunError(RuntimeError):
    """Handled worker failure that should become a failed compute_result.v1."""


def self_check() -> dict[str, Any]:
    return {
        "worker_version": WORKER_VERSION,
        "python_version": platform.python_version(),
        "platform": platform.platform(),
        "supported_contract_versions": SUPPORTED_CONTRACT_VERSIONS,
        "supported_job_types": [SUPPORTED_JOB_TYPE],
        "capabilities": ["material_balance", "ode"],
    }


def run_job_file(job_path: str | Path, artifact_dir: str | Path) -> dict[str, Any]:
    started_at = time.perf_counter()
    job_id = "unknown_job"
    job_type = SUPPORTED_JOB_TYPE

    try:
        job = _load_json(Path(job_path))
        job_id = _string_value(job.get("job_id")) or job_id
        raw_job_type = _string_value(job.get("job_type")) or job_type
        job_type = raw_job_type if raw_job_type == SUPPORTED_JOB_TYPE else SUPPORTED_JOB_TYPE

        _validate_against_schema("compute_job.v1.json", job)
        if raw_job_type != SUPPORTED_JOB_TYPE:
            raise WorkerRunError(f"unsupported job_type: {raw_job_type}")

        payload = job.get("payload")
        if not isinstance(payload, dict):
            raise WorkerRunError("compute_job payload must be an object")
        _validate_against_schema("simulation_input.v1.json", payload)

        _ensure_repo_import_paths()
        from app.material_balance.core import MaterialBalanceCalculator
        from app.services.simulation_input_adapter import (
            SimulationInputAdapterError,
            simulation_input_to_material_balance_input,
        )

        try:
            material_balance_input = simulation_input_to_material_balance_input(payload)
        except SimulationInputAdapterError as exc:
            raise WorkerRunError(str(exc)) from exc

        result = MaterialBalanceCalculator().calculate(material_balance_input)
        artifact = _write_time_series_artifact(
            result=result,
            job_id=job_id,
            job_type=job_type,
            artifact_dir=Path(artifact_dir),
        )

        return {
            "schema_version": "compute_result.v1",
            "job_id": job_id,
            "job_type": job_type,
            "status": "succeeded",
            "summary": _json_safe(result.summary),
            "data": {},
            "quality": {"data_quality": "simulated", "warnings": []},
            "artifacts": [artifact],
            "runtime_audit": {
                "model_runs": [],
                "timings_ms": {"total": int((time.perf_counter() - started_at) * 1000)},
                "fallback_used": False,
                "fallback_reason": "",
                "worker_version": WORKER_VERSION,
                "python_version": platform.python_version(),
                "package_versions": {},
            },
        }
    except Exception as exc:
        return _failed_result(
            job_id=job_id,
            job_type=job_type,
            message=_safe_error_message(exc),
            started_at=started_at,
        )


def _write_time_series_artifact(
    *,
    result: Any,
    job_id: str,
    job_type: str,
    artifact_dir: Path,
) -> dict[str, Any]:
    object_key = f"jobs/{_safe_path_part(job_id)}/time_series.json"
    artifact_path = artifact_dir / Path(object_key)
    artifact_path.parent.mkdir(parents=True, exist_ok=True)

    payload = {
        "schema_version": "material_balance_time_series_artifact.v1",
        "job_id": job_id,
        "job_type": job_type,
        "timestamps": result.timestamps,
        "node_data": result.node_data,
        "edge_data": result.edge_data,
        "segment_markers": result.segment_markers or [],
        "parameter_change_events": result.parameter_change_events or [],
    }
    artifact_bytes = json.dumps(
        _json_safe(payload),
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")
    artifact_path.write_bytes(artifact_bytes)
    checksum = hashlib.sha256(artifact_bytes).hexdigest()

    return {
        "schema_version": "artifact.v1",
        "artifact_id": f"art_{_safe_path_part(job_id)}_time_series",
        "job_id": job_id,
        "artifact_type": "material_balance.time_series",
        "storage_provider": "local_fs",
        "object_key": object_key,
        "content_type": "application/json",
        "size_bytes": len(artifact_bytes),
        "checksum": f"sha256:{checksum}",
        "created_at": _utc_now_iso(),
        "metadata": {
            "description": "Material balance time-series artifact",
            "worker_version": WORKER_VERSION,
        },
    }


def _failed_result(
    *,
    job_id: str,
    job_type: str,
    message: str,
    started_at: float,
) -> dict[str, Any]:
    return {
        "schema_version": "compute_result.v1",
        "job_id": job_id or "unknown_job",
        "job_type": job_type if job_type == SUPPORTED_JOB_TYPE else SUPPORTED_JOB_TYPE,
        "status": "failed",
        "summary": {"error_message": message},
        "data": {},
        "quality": {
            "data_quality": "none",
            "warnings": [message],
        },
        "artifacts": [],
        "runtime_audit": {
            "model_runs": [],
            "timings_ms": {"total": int((time.perf_counter() - started_at) * 1000)},
            "fallback_used": False,
            "fallback_reason": "",
            "worker_version": WORKER_VERSION,
            "python_version": platform.python_version(),
            "package_versions": {},
        },
    }


def _validate_against_schema(schema_name: str, payload: dict[str, Any]) -> None:
    try:
        from jsonschema import Draft202012Validator
    except ImportError as exc:
        raise WorkerRunError("jsonschema is required for worker contract validation") from exc

    schema = _load_json(_repo_root() / "contracts" / schema_name)
    errors = sorted(Draft202012Validator(schema).iter_errors(payload), key=lambda item: list(item.path))
    if errors:
        first = errors[0]
        path = "$" + "".join(f".{part}" for part in first.path)
        raise WorkerRunError(f"{schema_name} validation failed at {path}: {first.message}")


def _ensure_repo_import_paths() -> None:
    root = _repo_root()
    for path in (root / "backend", root / "contracts" / "python"):
        path_text = str(path)
        if path_text not in sys.path:
            sys.path.insert(0, path_text)


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def _load_json(path: Path) -> dict[str, Any]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except OSError as exc:
        raise WorkerRunError(f"unable to read JSON file: {path}") from exc
    except json.JSONDecodeError as exc:
        raise WorkerRunError(f"invalid JSON file: {path}") from exc
    if not isinstance(data, dict):
        raise WorkerRunError("JSON file root must be an object")
    return data


def _json_safe(value: Any) -> Any:
    if isinstance(value, Enum):
        return value.value
    if isinstance(value, dict):
        return {str(key): _json_safe(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [_json_safe(item) for item in value]
    if isinstance(value, float):
        return value if math.isfinite(value) else None
    if hasattr(value, "model_dump"):
        return _json_safe(value.model_dump())
    return value


def _safe_error_message(exc: Exception) -> str:
    return str(exc).splitlines()[0][:500] or exc.__class__.__name__


def _safe_path_part(value: str) -> str:
    return "".join(char if char.isalnum() or char in {"-", "_"} else "_" for char in value) or "unknown"


def _string_value(value: Any) -> str:
    return str(value).strip() if value is not None else ""


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
