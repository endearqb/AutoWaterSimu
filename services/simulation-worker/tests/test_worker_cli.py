from __future__ import annotations

import hashlib
import http.server
import json
import subprocess
import sys
import threading
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import pytest
from jsonschema import Draft202012Validator

REPO_ROOT = Path(__file__).resolve().parents[3]
BACKEND_PATH = REPO_ROOT / "backend"
WORKER_PACKAGE_PATH = REPO_ROOT / "services" / "simulation-worker"
CLI_PATH = REPO_ROOT / "services" / "simulation-worker" / "simulation_worker" / "cli.py"
VALID_JOB = REPO_ROOT / "contracts" / "examples" / "valid" / "material_balance_minimal.compute_job.v1.json"
ASM1SLIM_JOB = REPO_ROOT / "contracts" / "examples" / "valid" / "asm1slim_minimal.compute_job.v1.json"
ASM1SLIM_INDEPENDENT_JOB = (
    REPO_ROOT
    / "contracts"
    / "examples"
    / "valid"
    / "asm1slim_independent.compute_job.v1.json"
)
ASM1_INDEPENDENT_JOB = (
    REPO_ROOT
    / "contracts"
    / "examples"
    / "valid"
    / "asm1_independent.compute_job.v1.json"
)
ASM3_INDEPENDENT_JOB = (
    REPO_ROOT
    / "contracts"
    / "examples"
    / "valid"
    / "asm3_independent.compute_job.v1.json"
)
UDM_INDEPENDENT_JOB = (
    REPO_ROOT
    / "contracts"
    / "examples"
    / "valid"
    / "udm_independent.compute_job.v1.json"
)

for import_path in (BACKEND_PATH, WORKER_PACKAGE_PATH):
    import_path_text = str(import_path)
    if import_path_text not in sys.path:
        sys.path.insert(0, import_path_text)

from app.material_balance.core import MaterialBalanceCalculator as BackendMaterialBalanceCalculator
from app.services.simulation_input_adapter import (
    simulation_input_to_material_balance_input as backend_simulation_input_to_material_balance_input,
)
from app.services.udm_seed_templates import get_udm_seed_template
import simulation_worker.runner as worker_runner
from simulation_worker.runner import run_job


def _run_worker(args: list[str], *, input_text: str | None = None) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, str(CLI_PATH), *args],
        cwd=REPO_ROOT,
        input=input_text,
        capture_output=True,
        text=True,
        check=False,
    )


def _load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _sha256_json(value: Any) -> str:
    payload = json.dumps(
        value,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")
    return f"sha256:{hashlib.sha256(payload).hexdigest()}"


def _validate(schema_name: str, payload: dict[str, Any]) -> None:
    Draft202012Validator(_load_json(REPO_ROOT / "contracts" / schema_name)).validate(payload)


def _run_worker_job_in_process(
    job: dict[str, Any],
    artifact_dir: Path,
) -> tuple[dict[str, Any], dict[str, Any]]:
    result = run_job(job, artifact_dir)
    _validate("compute_result.v1.json", result)
    assert result["status"] == "succeeded", result

    artifact = result["artifacts"][0]
    _validate("artifact.v1.json", artifact)
    artifact_path = artifact_dir / Path(artifact["object_key"])
    return result, _load_json(artifact_path)


def _backend_result_for_payload(payload: dict[str, Any]) -> Any:
    backend_input = backend_simulation_input_to_material_balance_input(payload)
    return BackendMaterialBalanceCalculator().calculate(backend_input)


def _assert_worker_matches_backend(
    job: dict[str, Any],
    artifact_dir: Path,
) -> tuple[dict[str, Any], dict[str, Any], Any]:
    result, time_series = _run_worker_job_in_process(job, artifact_dir)
    backend_result = _backend_result_for_payload(job["payload"])

    assert result["summary"]["total_steps"] == backend_result.summary["total_steps"]
    assert time_series["timestamps"] == pytest.approx(backend_result.timestamps, abs=1e-9)

    for node_id, backend_components in backend_result.node_data.items():
        assert node_id in time_series["node_data"]
        for component_name, backend_values in backend_components.items():
            if not isinstance(backend_values, list):
                continue
            worker_values = time_series["node_data"][node_id][component_name]
            assert len(worker_values) == len(backend_values)
            assert worker_values[-1] == pytest.approx(
                backend_values[-1],
                rel=1e-5,
                abs=1e-5,
            )

    return result, time_series, backend_result


def _count_changed_series(node_data: dict[str, Any], *, tolerance: float = 1e-6) -> int:
    changed = 0
    for values in node_data.values():
        if not isinstance(values, list) or len(values) < 2:
            continue
        baseline = float(values[0])
        if any(abs(float(value) - baseline) > tolerance for value in values[1:]):
            changed += 1
    return changed


def _identity_transform(component_names: list[str]) -> dict[str, dict[str, float]]:
    return {name: {"a": 1.0, "b": 0.0} for name in component_names}


def _compute_job(job_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    return {
        "schema_version": "compute_job.v1",
        "job_id": job_id,
        "job_type": payload["job_type"],
        "queue": "simulation-worker-baseline",
        "request_id": f"req_{job_id}",
        "idempotency_key": f"idemp_{job_id}",
        "payload": payload,
        "context": {
            "source_system": "pytest",
            "requested_by": "simulation-worker-tests",
            "trace_id": f"trace_{job_id}",
        },
        "execution": {
            "time_limit_sec": 60,
            "priority": "normal",
            "required_capabilities": ["udm", "ode"],
        },
        "metadata": {"baseline_matrix": True},
    }


def _build_udm_snapshot(
    *,
    model_id: str,
    name: str,
    components: list[dict[str, Any]],
    parameters: list[dict[str, Any]],
    processes: list[dict[str, Any]],
    meta: dict[str, Any] | None = None,
) -> dict[str, Any]:
    return {
        "id": model_id,
        "name": name,
        "version": 1,
        "hash": "sha256:" + hashlib.sha256(model_id.encode("utf-8")).hexdigest(),
        "components": components,
        "parameters": parameters,
        "processes": processes,
        "meta": meta or {},
    }


def _udm_parameter_values(parameters: list[dict[str, Any]]) -> dict[str, float]:
    return {
        str(parameter["name"]): float(parameter.get("default_value", 0.0))
        for parameter in parameters
        if str(parameter.get("name") or "").strip()
    }


def _udm_reactor_node(
    *,
    node_id: str,
    model_id: str,
    name: str,
    initial_concentrations: dict[str, float],
    volume: float,
    components: list[dict[str, Any]],
    parameters: list[dict[str, Any]],
    processes: list[dict[str, Any]],
    meta: dict[str, Any] | None = None,
    variable_bindings: list[dict[str, str]] | None = None,
) -> dict[str, Any]:
    component_names = [str(component["name"]) for component in components]
    snapshot = _build_udm_snapshot(
        model_id=model_id,
        name=name,
        components=components,
        parameters=parameters,
        processes=processes,
        meta=meta,
    )
    return {
        "node_id": node_id,
        "node_type": "udm",
        "initial_volume": volume,
        "initial_concentrations": initial_concentrations,
        "is_inlet": False,
        "is_outlet": False,
        "udm_model_id": model_id,
        "udm_model_version": 1,
        "udm_model_hash": snapshot["hash"],
        "udm_component_names": component_names,
        "udm_processes": processes,
        "udm_parameter_values": _udm_parameter_values(parameters),
        "udm_model_snapshot": snapshot,
        "udm_variable_bindings": variable_bindings
        or [{"local_var": name, "canonical_var": name} for name in component_names],
    }


def _build_udm_hybrid_job() -> dict[str, Any]:
    component_names = ["A1", "A2", "B1", "B2"]
    components_a = [
        {"name": "A1", "label": "A1", "default_value": 10.0, "unit": "mg/L"},
        {"name": "A2", "label": "A2", "default_value": 0.0, "unit": "mg/L"},
    ]
    components_b = [
        {"name": "B1", "label": "B1", "default_value": 0.0, "unit": "mg/L"},
        {"name": "B2", "label": "B2", "default_value": 0.0, "unit": "mg/L"},
    ]
    parameters_a = [{"name": "k_a", "default_value": 0.08}]
    parameters_b = [{"name": "k_b", "default_value": 0.05}]
    processes_a = [
        {
            "id": "convert_a1_to_a2",
            "rate_expr": "k_a * A1",
            "stoich": {"A1": -1.0, "A2": 1.0},
        }
    ]
    processes_b = [
        {
            "id": "convert_b1_to_b2",
            "rate_expr": "k_b * B1",
            "stoich": {"B1": -1.0, "B2": 1.0},
        }
    ]

    payload = {
        "schema_version": "simulation_input.v1",
        "simulation_input_id": "si_udm_hybrid_baseline",
        "process_graph_id": "pg_udm_hybrid_baseline",
        "process_graph_version": 1,
        "job_type": "simulation.udm.v1",
        "component_schema": {
            "component_schema_id": "udm_hybrid_components.v1",
            "components": component_names,
            "unit": "mg/L",
        },
        "nodes": [
            {
                "node_id": "node_in",
                "node_type": "input",
                "initial_volume": 1.0,
                "initial_concentrations": {"A1": 10.0, "A2": 0.0, "B1": 0.0, "B2": 0.0},
                "is_inlet": True,
                "is_outlet": False,
            },
            _udm_reactor_node(
                node_id="node_a",
                model_id="hybrid_model_a",
                name="Hybrid Model A",
                initial_concentrations={"A1": 8.0, "A2": 0.5, "B1": 0.0, "B2": 0.0},
                volume=10.0,
                components=components_a,
                parameters=parameters_a,
                processes=processes_a,
            ),
            _udm_reactor_node(
                node_id="node_b",
                model_id="hybrid_model_b",
                name="Hybrid Model B",
                initial_concentrations={"A1": 2.0, "A2": 0.0, "B1": 0.0, "B2": 0.0},
                volume=10.0,
                components=components_b,
                parameters=parameters_b,
                processes=processes_b,
                variable_bindings=[
                    {"local_var": "B1", "canonical_var": "A1"},
                    {"local_var": "B2", "canonical_var": "A2"},
                ],
            ),
            {
                "node_id": "node_out",
                "node_type": "output",
                "initial_volume": 1.0,
                "initial_concentrations": {"A1": 0.0, "A2": 0.0, "B1": 0.0, "B2": 0.0},
                "is_inlet": False,
                "is_outlet": True,
            },
        ],
        "edges": [
            {
                "edge_id": "edge_in_a",
                "source_node_id": "node_in",
                "target_node_id": "node_a",
                "flow_rate": 10.0,
                "concentration_transform": _identity_transform(component_names),
            },
            {
                "edge_id": "edge_a_b",
                "source_node_id": "node_a",
                "target_node_id": "node_b",
                "flow_rate": 10.0,
                "concentration_transform": _identity_transform(component_names),
            },
            {
                "edge_id": "edge_b_out",
                "source_node_id": "node_b",
                "target_node_id": "node_out",
                "flow_rate": 10.0,
                "concentration_transform": _identity_transform(component_names),
            },
        ],
        "time_segments": [],
        "parameters": {
            "hours": 1.0,
            "steps_per_hour": 10,
            "solver_method": "scipy_solver",
            "tolerance": 0.000001,
        },
        "runtime_options": {
            "model_family": "udm",
            "numerical_tolerance": {"rtol": 0.000001, "atol": 0.000000001},
        },
        "metadata": {"baseline_case": "udm_hybrid"},
    }
    return _compute_job("job_udm_hybrid_baseline", payload)


def _build_petersen_tutorial_job(
    *,
    template_key: str,
    input_overrides: dict[str, float],
    reactor_volume: float,
    edge_flow_rate: float,
) -> dict[str, Any]:
    template = get_udm_seed_template(template_key)
    components = list(template["components"])
    component_names = [str(component["name"]) for component in components]
    parameter_values = _udm_parameter_values(list(template["parameters"]))
    default_concentrations = {
        str(component["name"]): float(component.get("default_value", 0.0))
        for component in components
    }
    input_concentrations = {**default_concentrations, **input_overrides}

    payload = {
        "schema_version": "simulation_input.v1",
        "simulation_input_id": f"si_{template_key}_worker_baseline",
        "process_graph_id": f"pg_{template_key}_worker_baseline",
        "process_graph_version": 1,
        "job_type": "simulation.udm.v1",
        "component_schema": {
            "component_schema_id": f"{template_key}_components.v1",
            "components": component_names,
            "unit": "mg/L",
        },
        "nodes": [
            {
                "node_id": "udm-input-1",
                "node_type": "input",
                "initial_volume": 0.001,
                "initial_concentrations": input_concentrations,
                "is_inlet": True,
                "is_outlet": False,
            },
            _udm_reactor_node(
                node_id="udm-reactor-1",
                model_id=template_key,
                name=str(template["name"]),
                initial_concentrations=default_concentrations,
                volume=reactor_volume,
                components=components,
                parameters=list(template["parameters"]),
                processes=list(template["processes"]),
                meta=dict(template.get("meta") or {}),
            ),
            {
                "node_id": "udm-output-1",
                "node_type": "output",
                "initial_volume": 0.001,
                "initial_concentrations": default_concentrations,
                "is_inlet": False,
                "is_outlet": True,
            },
        ],
        "edges": [
            {
                "edge_id": "udm-edge-1",
                "source_node_id": "udm-input-1",
                "target_node_id": "udm-reactor-1",
                "flow_rate": edge_flow_rate,
                "concentration_transform": _identity_transform(component_names),
            },
            {
                "edge_id": "udm-edge-2",
                "source_node_id": "udm-reactor-1",
                "target_node_id": "udm-output-1",
                "flow_rate": edge_flow_rate,
                "concentration_transform": _identity_transform(component_names),
            },
        ],
        "time_segments": [],
        "parameters": {
            "hours": 2.0,
            "steps_per_hour": 12,
            "solver_method": "scipy_solver",
            "tolerance": 0.000001,
        },
        "runtime_options": {
            "model_family": "udm",
            "parameter_values": parameter_values,
            "numerical_tolerance": {"rtol": 0.000001, "atol": 0.000000001},
        },
        "metadata": {"baseline_case": template_key},
    }
    return _compute_job(f"job_{template_key}_worker_baseline", payload)


def test_worker_self_check_outputs_json() -> None:
    completed = _run_worker(["--self-check"])

    assert completed.returncode == 0
    payload = json.loads(completed.stdout)
    assert payload["worker_version"]
    assert "compute_job.v1" in payload["supported_contract_versions"]
    assert "simulation.material_balance.v1" in payload["supported_job_types"]
    assert "simulation.asm1slim.v1" in payload["supported_job_types"]
    assert "simulation.asm1.v1" in payload["supported_job_types"]
    assert "simulation.asm3.v1" in payload["supported_job_types"]
    assert "simulation.udm.v1" in payload["supported_job_types"]
    assert "asm1slim" in payload["capabilities"]
    assert payload["git_sha"]
    assert payload["packaging_mode"] in {"source", "frozen"}
    assert payload["worker_dependency_imports"]["ok"] is True
    assert payload["worker_dependency_imports"]["deprecated_repo_path_fallback_used"] in {False, True}
    assert payload["dependency_imports"]["numpy"]["ok"] is True
    assert payload["dependency_imports"]["scipy"]["ok"] is True
    assert payload["dependency_imports"]["torch"]["ok"] is True
    assert payload["dependency_imports"]["torchdiffeq"]["ok"] is True
    assert payload["artifact_temp_writable"]["ok"] is True
    assert payload["minimal_job_status"]["ok"] is True


def test_worker_run_job_writes_artifact_with_checksum(tmp_path: Path) -> None:
    completed = _run_worker([
        "--run-job",
        str(VALID_JOB),
        "--artifact-dir",
        str(tmp_path),
    ])

    assert completed.returncode == 0
    result = json.loads(completed.stdout)
    _validate("compute_result.v1.json", result)
    assert result["status"] == "succeeded"
    assert result["summary"]["total_steps"] >= 240
    assert result["summary"]["total_time"] == 4.0

    artifact = result["artifacts"][0]
    _validate("artifact.v1.json", artifact)
    artifact_path = tmp_path / Path(artifact["object_key"])
    artifact_bytes = artifact_path.read_bytes()
    assert artifact["checksum"] == f"sha256:{hashlib.sha256(artifact_bytes).hexdigest()}"

    model_run = result["runtime_audit"]["model_runs"][0]
    _validate("model_run.v1.json", model_run)
    assert model_run["job_id"] == result["job_id"]
    assert model_run["model_key"] == "material_balance"
    assert model_run["parameter_hash"] == _sha256_json(_load_json(VALID_JOB)["payload"]["parameters"])
    assert model_run["evidence_refs"] == [artifact["artifact_id"]]

    time_series = json.loads(artifact_bytes.decode("utf-8"))
    assert time_series["schema_version"] == "material_balance_time_series_artifact.v1"
    assert time_series["node_data"]
    assert time_series["edge_data"]


def test_worker_run_asm1slim_job_preserves_model_run_binding(tmp_path: Path) -> None:
    completed = _run_worker([
        "--run-job",
        str(ASM1SLIM_JOB),
        "--artifact-dir",
        str(tmp_path),
    ])

    assert completed.returncode == 0
    result = json.loads(completed.stdout)
    _validate("compute_result.v1.json", result)
    assert result["status"] == "succeeded"
    assert result["job_id"] == "job_asm1slim_minimal"
    assert result["summary"]["total_time"] == 1.0

    artifact = result["artifacts"][0]
    artifact_path = tmp_path / Path(artifact["object_key"])
    time_series = json.loads(artifact_path.read_text(encoding="utf-8"))
    assert time_series["node_data"]["n_reactor"]["S_S"]

    model_run = result["runtime_audit"]["model_runs"][0]
    _validate("model_run.v1.json", model_run)
    assert model_run["model_key"] == "asm1slim"
    assert model_run["model_version"] == "asm1slim.v1"
    assert model_run["metadata"]["component_schema_id"] == "asm1slim_components.v1"
    assert model_run["evidence_refs"] == [artifact["artifact_id"]]


def test_worker_run_independent_asm1slim_job_type(tmp_path: Path) -> None:
    completed = _run_worker([
        "--run-job",
        str(ASM1SLIM_INDEPENDENT_JOB),
        "--artifact-dir",
        str(tmp_path),
    ])

    assert completed.returncode == 0
    result = json.loads(completed.stdout)
    _validate("compute_result.v1.json", result)
    assert result["status"] == "succeeded"
    assert result["job_type"] == "simulation.asm1slim.v1"

    artifact = result["artifacts"][0]
    artifact_path = tmp_path / Path(artifact["object_key"])
    time_series = json.loads(artifact_path.read_text(encoding="utf-8"))
    assert time_series["job_type"] == "simulation.asm1slim.v1"
    assert time_series["node_data"]["n_reactor"]["S_S"]

    model_run = result["runtime_audit"]["model_runs"][0]
    _validate("model_run.v1.json", model_run)
    assert model_run["model_run_id"] == "mr_job_asm1slim_independent_asm1slim"
    assert model_run["model_key"] == "asm1slim"
    assert model_run["model_version"] == "asm1slim.v1"


def test_worker_run_independent_asm1_job_type(tmp_path: Path) -> None:
    completed = _run_worker([
        "--run-job",
        str(ASM1_INDEPENDENT_JOB),
        "--artifact-dir",
        str(tmp_path),
    ])

    assert completed.returncode == 0
    result = json.loads(completed.stdout)
    _validate("compute_result.v1.json", result)
    assert result["status"] == "succeeded"
    assert result["job_type"] == "simulation.asm1.v1"

    artifact = result["artifacts"][0]
    artifact_path = tmp_path / Path(artifact["object_key"])
    time_series = json.loads(artifact_path.read_text(encoding="utf-8"))
    assert time_series["job_type"] == "simulation.asm1.v1"
    assert time_series["node_data"]["n_reactor"]["S_S"]

    model_run = result["runtime_audit"]["model_runs"][0]
    _validate("model_run.v1.json", model_run)
    assert model_run["model_run_id"] == "mr_job_asm1_independent_asm1"
    assert model_run["model_key"] == "asm1"
    assert model_run["model_version"] == "asm1.v1"


def test_worker_run_independent_asm3_job_type(tmp_path: Path) -> None:
    completed = _run_worker([
        "--run-job",
        str(ASM3_INDEPENDENT_JOB),
        "--artifact-dir",
        str(tmp_path),
    ])

    assert completed.returncode == 0
    result = json.loads(completed.stdout)
    _validate("compute_result.v1.json", result)
    assert result["status"] == "succeeded"
    assert result["job_type"] == "simulation.asm3.v1"

    artifact = result["artifacts"][0]
    artifact_path = tmp_path / Path(artifact["object_key"])
    time_series = json.loads(artifact_path.read_text(encoding="utf-8"))
    assert time_series["job_type"] == "simulation.asm3.v1"
    assert time_series["node_data"]["n_reactor"]["S_S"]

    model_run = result["runtime_audit"]["model_runs"][0]
    _validate("model_run.v1.json", model_run)
    assert model_run["model_run_id"] == "mr_job_asm3_independent_asm3"
    assert model_run["model_key"] == "asm3"
    assert model_run["model_version"] == "asm3.v1"


def test_worker_run_independent_udm_job_type(tmp_path: Path) -> None:
    completed = _run_worker([
        "--run-job",
        str(UDM_INDEPENDENT_JOB),
        "--artifact-dir",
        str(tmp_path),
    ])

    assert completed.returncode == 0
    result = json.loads(completed.stdout)
    _validate("compute_result.v1.json", result)
    assert result["status"] == "succeeded"
    assert result["job_type"] == "simulation.udm.v1"

    artifact = result["artifacts"][0]
    artifact_path = tmp_path / Path(artifact["object_key"])
    time_series = json.loads(artifact_path.read_text(encoding="utf-8"))
    assert time_series["job_type"] == "simulation.udm.v1"
    assert time_series["node_data"]["n_reactor"]["A"]

    model_run = result["runtime_audit"]["model_runs"][0]
    _validate("model_run.v1.json", model_run)
    assert model_run["model_run_id"] == "mr_job_udm_independent_udm"
    assert model_run["model_key"] == "udm"
    assert model_run["model_version"] == "udm.v1"
    expected_payload = _load_json(UDM_INDEPENDENT_JOB)["payload"]
    expected_model_parameter_payload = {
        "parameters": expected_payload["parameters"],
        "runtime_options": expected_payload["runtime_options"],
        "model_nodes": [
            {
                "node_id": "n_reactor",
                "node_type": "udm",
                "model_fields": {
                    "udm_model_id": "udm_ab_decay",
                    "udm_model_version": 1,
                    "udm_model_hash": "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                    "udm_component_names": ["S", "P"],
                    "udm_processes": expected_payload["nodes"][1]["udm_processes"],
                    "udm_parameter_values": {"k_decay": 0.05},
                    "udm_model_snapshot": expected_payload["nodes"][1]["udm_model_snapshot"],
                    "udm_variable_bindings": expected_payload["nodes"][1]["udm_variable_bindings"],
                },
            }
        ],
    }
    assert model_run["parameter_hash"] == _sha256_json(expected_model_parameter_payload)


@pytest.mark.parametrize(
    ("job_path", "expected_model_key"),
    [
        (VALID_JOB, "material_balance"),
        (ASM1SLIM_JOB, "asm1slim"),
        (ASM1SLIM_INDEPENDENT_JOB, "asm1slim"),
        (ASM1_INDEPENDENT_JOB, "asm1"),
        (ASM3_INDEPENDENT_JOB, "asm3"),
        (UDM_INDEPENDENT_JOB, "udm"),
    ],
)
def test_worker_old_vs_backend_fixture_baseline_matrix(
    tmp_path: Path,
    job_path: Path,
    expected_model_key: str,
) -> None:
    result, _, _ = _assert_worker_matches_backend(_load_json(job_path), tmp_path)

    model_run = result["runtime_audit"]["model_runs"][0]
    assert model_run["model_key"] == expected_model_key


def test_worker_old_vs_backend_udm_hybrid_baseline(tmp_path: Path) -> None:
    job = _build_udm_hybrid_job()
    result, time_series, _ = _assert_worker_matches_backend(job, tmp_path)

    assert result["job_type"] == "simulation.udm.v1"
    assert result["runtime_audit"]["model_runs"][0]["model_key"] == "udm"
    assert _count_changed_series(time_series["node_data"]["node_a"]) > 0
    assert _count_changed_series(time_series["node_data"]["node_b"]) > 0


@pytest.mark.parametrize(
    ("template_key", "input_overrides", "reactor_volume", "edge_flow_rate"),
    [
        (
            "petersen-chapter-2",
            {
                "dissolvedOxygen": 2.0,
                "cod": 200.0,
                "nitrate": 0.0,
                "ammonia": 25.0,
                "totalAlkalinity": 100.0,
            },
            800.0,
            800.0,
        ),
        (
            "petersen-chapter-7",
            {
                "S_S": 200.0,
                "S_O": 0.0,
                "S_NH": 25.0,
                "S_NO": 10.0,
                "S_ND": 5.0,
                "X_BH": 0.0,
                "X_BA": 0.0,
                "X_S": 50.0,
                "X_i": 0.0,
                "X_ND": 0.0,
                "S_ALK": 4.0,
            },
            1000.0,
            1000.0,
        ),
    ],
)
def test_worker_old_vs_backend_petersen_tutorial_baseline(
    tmp_path: Path,
    template_key: str,
    input_overrides: dict[str, float],
    reactor_volume: float,
    edge_flow_rate: float,
) -> None:
    job = _build_petersen_tutorial_job(
        template_key=template_key,
        input_overrides=input_overrides,
        reactor_volume=reactor_volume,
        edge_flow_rate=edge_flow_rate,
    )
    result, time_series, _ = _assert_worker_matches_backend(job, tmp_path)

    assert result["job_type"] == "simulation.udm.v1"
    assert result["runtime_audit"]["model_runs"][0]["model_key"] == "udm"
    assert _count_changed_series(time_series["node_data"]["udm-input-1"]) == 0
    assert _count_changed_series(time_series["node_data"]["udm-output-1"]) == 0
    assert _count_changed_series(time_series["node_data"]["udm-reactor-1"]) > 0


def test_worker_invalid_job_returns_failed_result_without_traceback(tmp_path: Path) -> None:
    invalid_job = _load_json(VALID_JOB)
    invalid_job["payload"]["parameters"]["tolerance"] = 0.1
    invalid_path = tmp_path / "invalid.compute_job.v1.json"
    invalid_path.write_text(json.dumps(invalid_job), encoding="utf-8")

    completed = _run_worker([
        "--run-job",
        str(invalid_path),
        "--artifact-dir",
        str(tmp_path / "artifacts"),
    ])

    assert completed.returncode == 0
    result = json.loads(completed.stdout)
    _validate("compute_result.v1.json", result)
    assert result["status"] == "failed"
    assert "validation failed" in result["summary"]["error_message"]
    assert "Traceback" not in completed.stderr


def test_worker_stdio_jsonrpc_self_check() -> None:
    request = {"jsonrpc": "2.0", "id": 1, "method": "self_check"}
    completed = _run_worker(["--stdio-jsonrpc"], input_text=json.dumps(request) + "\n")

    assert completed.returncode == 0
    response = json.loads(completed.stdout)
    assert response["jsonrpc"] == "2.0"
    assert response["id"] == 1
    assert "worker_version" in response["result"]


def test_worker_stdio_jsonrpc_run_job_accepts_job_object(tmp_path: Path) -> None:
    request = {
        "jsonrpc": "2.0",
        "id": "rpc_1",
        "method": "run_job",
        "params": {
            "job": _load_json(VALID_JOB),
            "artifact_dir": str(tmp_path),
        },
    }
    completed = _run_worker(["--stdio-jsonrpc"], input_text=json.dumps(request) + "\n")

    assert completed.returncode == 0
    response = json.loads(completed.stdout)
    assert response["jsonrpc"] == "2.0"
    assert response["id"] == "rpc_1"
    result = response["result"]["compute_result"]
    _validate("compute_result.v1.json", result)
    assert result["status"] == "succeeded"


def test_worker_run_api_once_claims_runs_uploads_and_succeeds(tmp_path: Path) -> None:
    records: list[dict[str, Any]] = []
    completion_payload: dict[str, Any] = {}
    job = _load_json(VALID_JOB)

    class Handler(http.server.BaseHTTPRequestHandler):
        def do_POST(self) -> None:  # noqa: N802
            content_length = int(self.headers.get("Content-Length", "0"))
            body = self.rfile.read(content_length)
            path = urlparse(self.path).path
            records.append(
                {
                    "path": path,
                    "authorization": self.headers.get("Authorization"),
                    "content_type": self.headers.get("Content-Type"),
                    "body": body,
                }
            )

            if self.headers.get("Authorization") != "Bearer worker-token":
                self.send_error(401)
                return

            if path == "/api/v1/workers/worker_test/register":
                self._write_json({"worker_id": "worker_test"})
                return
            if path == "/api/v1/workers/register":
                self._write_json({"worker_id": "worker_test"})
                return
            if path == "/api/v1/workers/worker_test/claim":
                self._write_json({"job": job, "attempt": 1})
                return
            if path == "/api/v1/workers/worker_test/heartbeat":
                payload = json.loads(body.decode("utf-8"))
                assert payload["job_id"] == "job_material_balance_minimal"
                self._write_json(
                    {
                        "job_id": "job_material_balance_minimal",
                        "status": "running",
                        "cancel_requested": False,
                        "job_terminal": False,
                    }
                )
                return
            if path == "/api/v1/workers/worker_test/jobs/job_material_balance_minimal/artifact":
                assert b'name="metadata"' in body
                assert b'name="file"' in body
                self._write_json(
                    {
                        "schema_version": "artifact.v1",
                        "artifact_id": "art_server_time_series",
                        "job_id": "job_material_balance_minimal",
                        "artifact_type": "material_balance.time_series",
                        "storage_provider": "local_fs",
                        "object_key": "jobs/job_material_balance_minimal/art_server_time_series.json",
                        "content_type": "application/json",
                        "size_bytes": 2,
                        "checksum": "sha256:" + ("0" * 64),
                        "created_at": "2026-05-30T00:00:00Z",
                    }
                )
                return
            if path == "/api/v1/workers/worker_test/jobs/job_material_balance_minimal/succeed":
                completion_payload.update(json.loads(body.decode("utf-8")))
                self._write_json(
                    {
                        "job": {"job_id": "job_material_balance_minimal", "status": "succeeded"},
                        "artifacts": [],
                        "event_count": 5,
                    }
                )
                return
            self.send_error(404)

        def log_message(self, format: str, *args: Any) -> None:
            return

        def _write_json(self, payload: dict[str, Any]) -> None:
            data = json.dumps(payload).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)

    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        completed = _run_worker(
            [
                "--run-api-once",
                "--api-base-url",
                f"http://127.0.0.1:{server.server_port}",
                "--api-token",
                "worker-token",
                "--worker-id",
                "worker_test",
                "--artifact-dir",
                str(tmp_path),
            ]
        )
    finally:
        server.shutdown()
        thread.join(timeout=5)
        server.server_close()

    assert completed.returncode == 0, completed.stderr
    payload = json.loads(completed.stdout)
    assert payload["status"] == "succeeded"
    assert payload["job_id"] == "job_material_balance_minimal"
    assert payload["compute_result"]["artifacts"][0]["artifact_id"] == "art_server_time_series"
    model_run = completion_payload["compute_result"]["runtime_audit"]["model_runs"][0]
    _validate("model_run.v1.json", model_run)
    assert model_run["evidence_refs"] == ["art_server_time_series"]
    assert completion_payload["attempt"] == 1
    assert completion_payload["compute_result"]["status"] == "succeeded"
    assert [record["path"] for record in records] == [
        "/api/v1/workers/register",
        "/api/v1/workers/worker_test/claim",
        "/api/v1/workers/worker_test/heartbeat",
        "/api/v1/workers/worker_test/jobs/job_material_balance_minimal/artifact",
        "/api/v1/workers/worker_test/jobs/job_material_balance_minimal/succeed",
    ]


def test_worker_run_api_loop_processes_multiple_claimed_jobs(tmp_path: Path) -> None:
    records: list[dict[str, Any]] = []
    completed_jobs: list[str] = []
    first_job = _load_json(VALID_JOB)
    second_job = _load_json(VALID_JOB)
    second_job["job_id"] = "job_material_balance_loop_second"
    second_job["request_id"] = "req_material_balance_loop_second"
    jobs = [first_job, second_job]

    class Handler(http.server.BaseHTTPRequestHandler):
        def do_POST(self) -> None:  # noqa: N802
            content_length = int(self.headers.get("Content-Length", "0"))
            body = self.rfile.read(content_length)
            path = urlparse(self.path).path
            records.append(
                {
                    "path": path,
                    "authorization": self.headers.get("Authorization"),
                    "content_type": self.headers.get("Content-Type"),
                    "body": body,
                }
            )

            if self.headers.get("Authorization") != "Bearer worker-token":
                self.send_error(401)
                return

            if path == "/api/v1/workers/register":
                self._write_json({"worker_id": "worker_loop"})
                return
            if path == "/api/v1/workers/worker_loop/claim":
                if jobs:
                    self._write_json({"job": jobs.pop(0), "attempt": 1})
                else:
                    self._write_json({"job": None})
                return
            if path == "/api/v1/workers/worker_loop/heartbeat":
                payload = json.loads(body.decode("utf-8"))
                self._write_json(
                    {
                        "job_id": payload["job_id"],
                        "status": "running",
                        "cancel_requested": False,
                        "job_terminal": False,
                    }
                )
                return
            if path.endswith("/artifact"):
                assert b'name="metadata"' in body
                self._write_json(
                    {
                        "schema_version": "artifact.v1",
                        "artifact_id": f"art_server_{len(completed_jobs) + 1}",
                        "job_id": path.split("/jobs/", 1)[1].split("/", 1)[0],
                        "artifact_type": "material_balance.time_series",
                        "storage_provider": "local_fs",
                        "object_key": "server/time_series.json",
                        "content_type": "application/json",
                        "size_bytes": 2,
                        "checksum": "sha256:" + ("0" * 64),
                        "created_at": "2026-05-31T00:00:00Z",
                    }
                )
                return
            if path.endswith("/succeed"):
                payload = json.loads(body.decode("utf-8"))
                completed_jobs.append(payload["compute_result"]["job_id"])
                self._write_json(
                    {
                        "job": {
                            "job_id": payload["compute_result"]["job_id"],
                            "status": "succeeded",
                        },
                        "artifacts": [],
                        "event_count": 5,
                    }
                )
                return
            self.send_error(404)

        def log_message(self, format: str, *args: Any) -> None:
            return

        def _write_json(self, payload: dict[str, Any]) -> None:
            data = json.dumps(payload).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)

    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        completed = _run_worker(
            [
                "--run-api-loop",
                "--api-base-url",
                f"http://127.0.0.1:{server.server_port}",
                "--api-token",
                "worker-token",
                "--worker-id",
                "worker_loop",
                "--artifact-dir",
                str(tmp_path),
                "--max-jobs",
                "2",
                "--idle-sleep-seconds",
                "0",
            ]
        )
    finally:
        server.shutdown()
        thread.join(timeout=5)
        server.server_close()

    assert completed.returncode == 0, completed.stderr
    payload = json.loads(completed.stdout)
    assert payload["status"] == "completed"
    assert payload["jobs_processed"] == 2
    assert payload["idle_polls"] == 0
    assert [result["job_id"] for result in payload["results"]] == [
        "job_material_balance_minimal",
        "job_material_balance_loop_second",
    ]
    assert completed_jobs == [
        "job_material_balance_minimal",
        "job_material_balance_loop_second",
    ]
    assert [record["path"] for record in records] == [
        "/api/v1/workers/register",
        "/api/v1/workers/worker_loop/claim",
        "/api/v1/workers/worker_loop/heartbeat",
        "/api/v1/workers/worker_loop/jobs/job_material_balance_minimal/artifact",
        "/api/v1/workers/worker_loop/jobs/job_material_balance_minimal/succeed",
        "/api/v1/workers/worker_loop/claim",
        "/api/v1/workers/worker_loop/heartbeat",
        "/api/v1/workers/worker_loop/jobs/job_material_balance_loop_second/artifact",
        "/api/v1/workers/worker_loop/jobs/job_material_balance_loop_second/succeed",
    ]


def test_worker_code_does_not_import_legacy_backend_app() -> None:
    worker_dir = REPO_ROOT / "services" / "simulation-worker" / "simulation_worker"
    for path in worker_dir.glob("*.py"):
        source = path.read_text(encoding="utf-8")
        assert "from app." not in source
        assert "import app." not in source


def test_worker_dependency_imports_prefer_installed_packages(monkeypatch: pytest.MonkeyPatch) -> None:
    original_sys_path = list(sys.path)
    monkeypatch.setattr(worker_runner, "_missing_worker_dependency_modules", lambda: [])
    monkeypatch.setattr(
        worker_runner,
        "_ensure_deprecated_repo_import_paths",
        lambda: pytest.fail("repo path fallback should not run when packages are importable"),
    )

    assert worker_runner._ensure_worker_dependency_imports() is False
    assert sys.path == original_sys_path


def test_worker_dependency_imports_use_deprecated_repo_fallback(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    missing_states = [["autowatersimu_simulation_core"], []]
    fallback_calls: list[str] = []
    monkeypatch.setattr(
        worker_runner,
        "_missing_worker_dependency_modules",
        lambda: missing_states.pop(0),
    )
    monkeypatch.setattr(
        worker_runner,
        "_ensure_deprecated_repo_import_paths",
        lambda: fallback_calls.append("fallback"),
    )

    assert worker_runner._ensure_worker_dependency_imports() is True
    assert fallback_calls == ["fallback"]
    assert missing_states == []


def test_worker_dependency_imports_report_missing_after_fallback(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        worker_runner,
        "_missing_worker_dependency_modules",
        lambda: ["autowatersimu_simulation_core"],
    )
    monkeypatch.setattr(worker_runner, "_ensure_deprecated_repo_import_paths", lambda: None)

    with pytest.raises(worker_runner.WorkerRunError, match="missing worker Python dependencies"):
        worker_runner._ensure_worker_dependency_imports()
