from __future__ import annotations

import hashlib
import importlib
import importlib.metadata
import json
import math
import os
import platform
import subprocess
import sys
import time
import tempfile
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any

WORKER_VERSION = "0.2.0-phase2b"
MATERIAL_BALANCE_JOB_TYPE = "simulation.material_balance.v1"
ASM1SLIM_JOB_TYPE = "simulation.asm1slim.v1"
ASM1_JOB_TYPE = "simulation.asm1.v1"
ASM3_JOB_TYPE = "simulation.asm3.v1"
UDM_JOB_TYPE = "simulation.udm.v1"
SUPPORTED_JOB_TYPES = [MATERIAL_BALANCE_JOB_TYPE, ASM1SLIM_JOB_TYPE, ASM1_JOB_TYPE, ASM3_JOB_TYPE, UDM_JOB_TYPE]
JOB_TYPE_MODEL_FAMILY = {
    MATERIAL_BALANCE_JOB_TYPE: "material_balance",
    ASM1SLIM_JOB_TYPE: "asm1slim",
    ASM1_JOB_TYPE: "asm1",
    ASM3_JOB_TYPE: "asm3",
    UDM_JOB_TYPE: "udm",
}
SUPPORTED_CONTRACT_VERSIONS = [
    "compute_job.v1",
    "simulation_input.v1",
    "compute_result.v1",
    "artifact.v1",
]
SUPPORTED_CAPABILITIES = ["material_balance", "asm1slim", "asm1", "asm3", "udm", "ode"]
ADAPTER_VALIDATION_MODE_ENV = "AUTOWATERSIMU_WORKER_ADAPTER_VALIDATION_MODE"
ADAPTER_VALIDATION_MODES = {"compat", "warn", "strict"}
MODEL_PARAMETER_FIELD_PAIRS = [
    ("asm1slim_parameters", "asm1slimParameters"),
    ("asm1_parameters", "asm1Parameters"),
    ("asm3_parameters", "asm3Parameters"),
    ("udm_model_id", "udmModelId"),
    ("udm_model_version", "udmModelVersion"),
    ("udm_model_hash", "udmModelHash"),
    ("udm_component_names", "udmComponentNames"),
    ("udm_processes", "udmProcesses"),
    ("udm_parameter_values", "udmParameterValues"),
    ("udm_model_snapshot", "udmModelSnapshot"),
    ("udm_variable_bindings", "udmVariableBindings"),
]
WORKER_DEPENDENCY_MODULES = (
    "autowatersimu_simulation_core",
    "autowatersimu_contracts",
)


class WorkerRunError(RuntimeError):
    """Handled worker failure that should become a failed compute_result.v1."""


def self_check() -> dict[str, Any]:
    worker_dependency_imports = _worker_dependency_import_status()
    dependency_imports = {
        name: _dependency_status(name)
        for name in ("numpy", "scipy", "torch", "torchdiffeq")
    }
    artifact_temp_writable = _artifact_temp_writable()
    minimal_job_status = _minimal_job_self_check()

    return {
        "worker_version": WORKER_VERSION,
        "python_version": platform.python_version(),
        "platform": platform.platform(),
        "supported_contract_versions": SUPPORTED_CONTRACT_VERSIONS,
        "supported_job_types": SUPPORTED_JOB_TYPES,
        "capabilities": SUPPORTED_CAPABILITIES,
        "git_sha": _git_sha(),
        "packaging_mode": _packaging_mode(),
        "adapter_validation_mode": _adapter_validation_mode_status(),
        "worker_dependency_imports": worker_dependency_imports,
        "dependency_imports": dependency_imports,
        "torch_runtime": _torch_runtime_status(),
        "artifact_temp_writable": artifact_temp_writable,
        "minimal_job_status": minimal_job_status,
    }


def run_job_file(
    job_path: str | Path,
    artifact_dir: str | Path,
    *,
    adapter_validation_mode: str | None = None,
) -> dict[str, Any]:
    try:
        job = _load_json(Path(job_path))
    except Exception as exc:
        return _failed_result(
            job_id="unknown_job",
            job_type=MATERIAL_BALANCE_JOB_TYPE,
            message=_safe_error_message(exc),
            started_at=time.perf_counter(),
        )
    return run_job(job, artifact_dir, adapter_validation_mode=adapter_validation_mode)


def run_job(
    job: dict[str, Any],
    artifact_dir: str | Path,
    *,
    adapter_validation_mode: str | None = None,
) -> dict[str, Any]:
    started_at = time.perf_counter()
    timings_ms: dict[str, int] = {}
    job_id = "unknown_job"
    job_type = MATERIAL_BALANCE_JOB_TYPE
    adapter_validation_mode_for_audit = _adapter_validation_mode_label(adapter_validation_mode)

    try:
        if not isinstance(job, dict):
            raise WorkerRunError("compute_job root must be an object")

        job_id = _string_value(job.get("job_id")) or job_id
        raw_job_type = _string_value(job.get("job_type")) or job_type
        job_type = raw_job_type if raw_job_type in SUPPORTED_JOB_TYPES else MATERIAL_BALANCE_JOB_TYPE

        phase_started_at = time.perf_counter()
        _validate_against_schema("compute_job.v1.json", job)
        if raw_job_type not in SUPPORTED_JOB_TYPES:
            raise WorkerRunError(f"unsupported job_type: {raw_job_type}")
        adapter_validation_mode_for_audit = _resolve_adapter_validation_mode(adapter_validation_mode)

        payload = job.get("payload")
        if not isinstance(payload, dict):
            raise WorkerRunError("compute_job payload must be an object")
        _validate_against_schema("simulation_input.v1.json", payload)
        timings_ms["schema_validate"] = _elapsed_ms(phase_started_at)

        phase_started_at = time.perf_counter()
        _ensure_worker_dependency_imports()
        from autowatersimu_simulation_core.adapters import (
            SimulationCoreAdapterError,
            simulation_input_to_material_balance_input,
        )
        from autowatersimu_simulation_core.material_balance import MaterialBalanceCalculator
        timings_ms["dependency_import"] = _elapsed_ms(phase_started_at)

        phase_started_at = time.perf_counter()
        try:
            material_balance_input = simulation_input_to_material_balance_input(
                payload,
                validation_mode=adapter_validation_mode_for_audit,
            )
        except SimulationCoreAdapterError as exc:
            raise WorkerRunError(str(exc)) from exc
        timings_ms["adapter_convert"] = _elapsed_ms(phase_started_at)

        phase_started_at = time.perf_counter()
        result = MaterialBalanceCalculator().calculate(material_balance_input)
        summary = _json_safe(result.summary)
        timings_ms["compute"] = _elapsed_ms(phase_started_at)

        phase_started_at = time.perf_counter()
        artifact = _write_time_series_artifact(
            result=result,
            job_id=job_id,
            job_type=job_type,
            artifact_dir=Path(artifact_dir),
        )
        timings_ms["artifact_serialize"] = _elapsed_ms(phase_started_at)

        phase_started_at = time.perf_counter()
        model_run = _model_run_record(
            job_id=job_id,
            payload=payload,
            summary=summary,
            artifact=artifact,
        )
        timings_ms["result_envelope"] = _elapsed_ms(phase_started_at)
        timings_ms["total"] = _elapsed_ms(started_at)

        return {
            "schema_version": "compute_result.v1",
            "job_id": job_id,
            "job_type": job_type,
            "status": "succeeded",
            "summary": summary,
            "data": {},
            "quality": {"data_quality": "simulated", "warnings": []},
            "artifacts": [artifact],
            "runtime_audit": {
                "model_runs": [model_run],
                "timings_ms": timings_ms,
                "fallback_used": False,
                "fallback_reason": "",
                "adapter_validation_mode": adapter_validation_mode_for_audit,
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
            adapter_validation_mode=adapter_validation_mode_for_audit,
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


def _model_run_record(
    *,
    job_id: str,
    payload: dict[str, Any],
    summary: Any,
    artifact: dict[str, Any],
) -> dict[str, Any]:
    summary_record = summary if isinstance(summary, dict) else {}
    model_family = _model_family(payload)
    return {
        "schema_version": "model_run.v1",
        "model_run_id": f"mr_{_safe_path_part(job_id)}_{_safe_path_part(model_family)}",
        "job_id": job_id,
        "model_key": model_family,
        "model_version": f"{model_family}.v1",
        "parameter_hash": _sha256_json(_model_parameter_payload(payload)),
        "input_hash": _sha256_json(payload),
        "quality_metrics": {
            "convergence_status": summary_record.get("convergence_status"),
            "final_mass_balance_error": summary_record.get("final_mass_balance_error"),
            "total_steps": summary_record.get("total_steps"),
        },
        "warnings": [],
        "evidence_refs": [str(artifact.get("artifact_id") or "")],
        "metadata": {
            "worker_version": WORKER_VERSION,
            "component_schema_id": _component_schema_id(payload),
            "solver_method": summary_record.get("solver_method"),
        },
    }


def _elapsed_ms(started_at: float) -> int:
    return max(0, int((time.perf_counter() - started_at) * 1000))


def _failed_result(
    *,
    job_id: str,
    job_type: str,
    message: str,
    started_at: float,
    adapter_validation_mode: str | None = None,
) -> dict[str, Any]:
    return {
        "schema_version": "compute_result.v1",
        "job_id": job_id or "unknown_job",
        "job_type": job_type if job_type in SUPPORTED_JOB_TYPES else MATERIAL_BALANCE_JOB_TYPE,
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
            **({"adapter_validation_mode": adapter_validation_mode} if adapter_validation_mode else {}),
            "worker_version": WORKER_VERSION,
            "python_version": platform.python_version(),
            "package_versions": {},
        },
    }


def _resolve_adapter_validation_mode(explicit_mode: str | None = None) -> str:
    raw_mode = explicit_mode
    if raw_mode is None or str(raw_mode).strip() == "":
        raw_mode = os.getenv(ADAPTER_VALIDATION_MODE_ENV, "compat")
    mode = str(raw_mode).strip().lower() or "compat"
    if mode in ADAPTER_VALIDATION_MODES:
        return mode
    raise WorkerRunError(
        f"unsupported adapter validation mode: {raw_mode}; expected compat, warn, or strict"
    )


def _adapter_validation_mode_label(explicit_mode: str | None = None) -> str:
    if explicit_mode is not None and str(explicit_mode).strip() != "":
        return str(explicit_mode).strip().lower()
    env_mode = os.getenv(ADAPTER_VALIDATION_MODE_ENV)
    if env_mode is not None and env_mode.strip() != "":
        return env_mode.strip().lower()
    return "compat"


def _adapter_validation_mode_status() -> dict[str, Any]:
    env_mode = os.getenv(ADAPTER_VALIDATION_MODE_ENV)
    source = "env" if env_mode else "default"
    try:
        mode = _resolve_adapter_validation_mode()
        return {
            "ok": True,
            "mode": mode,
            "source": source,
            "env_var": ADAPTER_VALIDATION_MODE_ENV,
            "supported_modes": sorted(ADAPTER_VALIDATION_MODES),
        }
    except WorkerRunError as exc:
        return {
            "ok": False,
            "mode": _adapter_validation_mode_label(),
            "source": source,
            "env_var": ADAPTER_VALIDATION_MODE_ENV,
            "supported_modes": sorted(ADAPTER_VALIDATION_MODES),
            "error": str(exc),
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


def _missing_worker_dependency_modules() -> list[str]:
    missing: list[str] = []
    for module_name in WORKER_DEPENDENCY_MODULES:
        try:
            importlib.import_module(module_name)
        except ImportError:
            missing.append(module_name)
    return missing


def _ensure_worker_dependency_imports() -> bool:
    missing = _missing_worker_dependency_modules()
    if not missing:
        return False

    _ensure_deprecated_repo_import_paths()
    missing_after_fallback = _missing_worker_dependency_modules()
    if missing_after_fallback:
        raise WorkerRunError(
            "missing worker Python dependencies: "
            + ", ".join(missing_after_fallback)
        )
    return True


def _worker_dependency_import_status() -> dict[str, Any]:
    fallback_used = False
    missing_before_fallback: list[str] = []
    missing_after_fallback: list[str] = []
    try:
        missing_before_fallback = _missing_worker_dependency_modules()
        if missing_before_fallback:
            _ensure_deprecated_repo_import_paths()
            fallback_used = True
        missing_after_fallback = _missing_worker_dependency_modules()
        if missing_after_fallback:
            raise WorkerRunError(
                "missing worker Python dependencies: "
                + ", ".join(missing_after_fallback)
            )
        return {
            "ok": True,
            "required_modules": list(WORKER_DEPENDENCY_MODULES),
            "missing_before_fallback": missing_before_fallback,
            "missing_after_fallback": missing_after_fallback,
            "deprecated_repo_path_fallback_used": fallback_used,
            "module_locations": _worker_dependency_module_locations(),
        }
    except Exception as exc:
        return {
            "ok": False,
            "required_modules": list(WORKER_DEPENDENCY_MODULES),
            "missing_before_fallback": missing_before_fallback,
            "missing_after_fallback": missing_after_fallback,
            "deprecated_repo_path_fallback_used": fallback_used,
            "error": _safe_error_message(exc),
        }


def _ensure_deprecated_repo_import_paths() -> None:
    # Compatibility fallback for source-mode and packaged sidecar layouts not yet
    # installing the Python helper packages.
    root = _repo_root()
    for path in (root / "simulation_core" / "python", root / "contracts" / "python"):
        path_text = str(path)
        if path_text not in sys.path:
            sys.path.insert(0, path_text)


def _worker_dependency_module_locations() -> dict[str, Any]:
    locations: dict[str, Any] = {}
    for module_name in WORKER_DEPENDENCY_MODULES:
        module = importlib.import_module(module_name)
        package_name = module_name.replace("_", "-")
        try:
            version = importlib.metadata.version(package_name)
        except importlib.metadata.PackageNotFoundError:
            version = getattr(module, "__version__", None)
        locations[module_name] = {
            "file": str(getattr(module, "__file__", "") or ""),
            "version": version,
        }
    return locations


def _repo_root() -> Path:
    explicit_root = os.environ.get("AUTOWATERSIMU_WORKER_REPO_ROOT")
    if explicit_root:
        return Path(explicit_root).resolve()
    if getattr(sys, "frozen", False):
        bundle_root = getattr(sys, "_MEIPASS", None)
        if bundle_root:
            return Path(bundle_root).resolve()
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


def _sha256_json(value: Any) -> str:
    payload = json.dumps(
        _json_safe(value),
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")
    return "sha256:" + hashlib.sha256(payload).hexdigest()


def _component_schema_id(payload: dict[str, Any]) -> str:
    component_schema = payload.get("component_schema")
    if isinstance(component_schema, dict):
        return _string_value(component_schema.get("component_schema_id"))
    return ""


def _field_value(payload: dict[str, Any], snake_key: str, camel_key: str) -> Any:
    if snake_key in payload:
        return payload.get(snake_key)
    if camel_key in payload:
        return payload.get(camel_key)
    return None


def _model_parameter_payload(payload: dict[str, Any]) -> Any:
    parameters = payload.get("parameters", {})
    nodes = payload.get("nodes")
    if not isinstance(nodes, list):
        return parameters

    model_nodes: list[dict[str, Any]] = []
    for node in nodes:
        if not isinstance(node, dict):
            continue
        model_fields: dict[str, Any] = {}
        for snake_key, camel_key in MODEL_PARAMETER_FIELD_PAIRS:
            value = _field_value(node, snake_key, camel_key)
            if value is not None:
                model_fields[snake_key] = value
        if not model_fields:
            continue
        model_nodes.append(
            {
                "node_id": _string_value(node.get("node_id") or node.get("id")),
                "node_type": _string_value(node.get("node_type") or node.get("type")),
                "model_fields": model_fields,
            }
        )

    if not model_nodes:
        return parameters
    return {
        "parameters": parameters,
        "runtime_options": payload.get("runtime_options", {}),
        "model_nodes": model_nodes,
    }


def _model_family(payload: dict[str, Any]) -> str:
    job_type = _string_value(payload.get("job_type"))
    if job_type and job_type != MATERIAL_BALANCE_JOB_TYPE and job_type in JOB_TYPE_MODEL_FAMILY:
        return JOB_TYPE_MODEL_FAMILY[job_type]
    runtime_options = payload.get("runtime_options")
    if isinstance(runtime_options, dict):
        value = _string_value(runtime_options.get("model_family"))
        if value:
            return value
    nodes = payload.get("nodes")
    if isinstance(nodes, list):
        for node in nodes:
            if isinstance(node, dict):
                node_type = _string_value(node.get("node_type"))
                if node_type in {"asm1slim", "asm1", "asm3", "udm"}:
                    return node_type
    if job_type in JOB_TYPE_MODEL_FAMILY:
        return JOB_TYPE_MODEL_FAMILY[job_type]
    return "material_balance"


def _safe_error_message(exc: Exception) -> str:
    return str(exc).splitlines()[0][:500] or exc.__class__.__name__


def _safe_path_part(value: str) -> str:
    return "".join(char if char.isalnum() or char in {"-", "_"} else "_" for char in value) or "unknown"


def _string_value(value: Any) -> str:
    return str(value).strip() if value is not None else ""


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _dependency_status(module_name: str) -> dict[str, Any]:
    try:
        module = importlib.import_module(module_name)
        version = getattr(module, "__version__", None)
        if version is None:
            try:
                version = importlib.metadata.version(module_name)
            except importlib.metadata.PackageNotFoundError:
                version = None
        return {"ok": True, "version": version}
    except Exception as exc:
        return {"ok": False, "error": _safe_error_message(exc)}


def _torch_runtime_status() -> dict[str, Any]:
    try:
        torch = importlib.import_module("torch")
        cuda = getattr(torch, "cuda", None)
        cuda_available = False
        if cuda is not None and hasattr(cuda, "is_available"):
            cuda_available = bool(cuda.is_available())
        return {
            "ok": True,
            "version": getattr(torch, "__version__", None),
            "num_threads": int(torch.get_num_threads()),
            "num_interop_threads": int(torch.get_num_interop_threads()),
            "cuda_available": cuda_available,
        }
    except Exception as exc:
        return {"ok": False, "error": _safe_error_message(exc)}


def _artifact_temp_writable() -> dict[str, Any]:
    try:
        with tempfile.TemporaryDirectory(prefix="autowatersimu-worker-") as temp_dir:
            path = Path(temp_dir) / "write-test.json"
            path.write_text('{"ok":true}', encoding="utf-8")
            return {"ok": path.read_text(encoding="utf-8") == '{"ok":true}'}
    except Exception as exc:
        return {"ok": False, "error": _safe_error_message(exc)}


def _minimal_job_self_check() -> dict[str, Any]:
    try:
        job = _load_json(
            _repo_root()
            / "contracts"
            / "examples"
            / "valid"
            / "material_balance_minimal.compute_job.v1.json"
        )
        with tempfile.TemporaryDirectory(prefix="autowatersimu-worker-artifacts-") as temp_dir:
            result = run_job(job, temp_dir)
        return {
            "ok": result.get("status") == "succeeded",
            "status": result.get("status"),
            "job_id": result.get("job_id"),
        }
    except Exception as exc:
        return {"ok": False, "error": _safe_error_message(exc)}


def _git_sha() -> str:
    try:
        completed = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            cwd=_repo_root(),
            capture_output=True,
            text=True,
            check=False,
        )
        if completed.returncode == 0:
            return completed.stdout.strip() or "unknown"
    except Exception:
        pass
    return "unknown"


def _packaging_mode() -> str:
    if getattr(sys, "frozen", False):
        return "frozen"
    return "source"
