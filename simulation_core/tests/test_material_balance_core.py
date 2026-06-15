from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path
from typing import Any

import pytest
import torch

REPO_ROOT = Path(__file__).resolve().parents[2]
SIMULATION_CORE_PYTHON = REPO_ROOT / "simulation_core" / "python"
VALID_EXAMPLES = REPO_ROOT / "contracts" / "examples" / "valid"

sys.path.insert(0, str(SIMULATION_CORE_PYTHON))

from autowatersimu_simulation_core.adapters import (  # noqa: E402
    simulation_input_to_material_balance_input,
)
from autowatersimu_simulation_core.material_balance import (  # noqa: E402
    MaterialBalanceCalculator,
)

CORE_F64_GOLDEN_CASES: dict[str, dict[str, Any]] = {
    "material_balance_minimal": {
        "fixture": VALID_EXAMPLES / "material_balance_minimal.simulation_input.v1.json",
        "expected_job_type": "simulation.material_balance.v1",
        "expected_node_type": "default",
        "expected_timestamp_count": 241,
        "expected_total_steps": 241,
        "stable_result_sha256": "f82f72a2258bd2e64d60fa7e234245da28acb6fea64a78c67a1b78e6b83a3c2d",
    },
    "asm1slim_model_bound": {
        "fixture": VALID_EXAMPLES / "asm1slim_minimal.simulation_input.v1.json",
        "expected_job_type": "simulation.material_balance.v1",
        "expected_node_type": "asm1slim",
        "expected_parameter_field": "asm1slim_parameters",
        "expected_parameter_count": 7,
        "expected_timestamp_count": 21,
        "expected_total_steps": 21,
        "stable_result_sha256": "0553a15da9a46530ee5babe040445801e5f6687c5aa470f8671c0b35233035ce",
    },
    "asm1slim_independent": {
        "fixture": VALID_EXAMPLES / "asm1slim_independent.simulation_input.v1.json",
        "expected_job_type": "simulation.asm1slim.v1",
        "expected_node_type": "asm1slim",
        "expected_parameter_field": "asm1slim_parameters",
        "expected_parameter_count": 7,
        "expected_timestamp_count": 21,
        "expected_total_steps": 21,
        "stable_result_sha256": "0553a15da9a46530ee5babe040445801e5f6687c5aa470f8671c0b35233035ce",
    },
    "asm1_independent": {
        "fixture": VALID_EXAMPLES / "asm1_independent.simulation_input.v1.json",
        "expected_job_type": "simulation.asm1.v1",
        "expected_node_type": "asm1",
        "expected_parameter_field": "asm1_parameters",
        "expected_parameter_count": 19,
        "expected_timestamp_count": 11,
        "expected_total_steps": 11,
        "stable_result_sha256": "3f8314148c7201916a9ab838869ec8ec3926ec065aeba1b5be4ec139f22ee91a",
    },
    "asm3_independent": {
        "fixture": VALID_EXAMPLES / "asm3_independent.simulation_input.v1.json",
        "expected_job_type": "simulation.asm3.v1",
        "expected_node_type": "asm3",
        "expected_parameter_field": "asm3_parameters",
        "expected_parameter_count": 37,
        "expected_timestamp_count": 11,
        "expected_total_steps": 11,
        "stable_result_sha256": "d72e1a97c10c9fea15b8fc62263092d54a9c612346f6e5ca9c0e97b5b9e53d8a",
    },
    "udm_independent": {
        "fixture": VALID_EXAMPLES / "udm_independent.simulation_input.v1.json",
        "expected_job_type": "simulation.udm.v1",
        "expected_node_type": "udm",
        "expected_parameter_field": "udm_model_snapshot",
        "expected_parameter_count": None,
        "expected_timestamp_count": 11,
        "expected_total_steps": 11,
        "stable_result_sha256": "70de8de8c358526ddf02feeef732e10bc117f5db9a98e5027c731bfaa52725ab",
    },
}
REQUIRED_CORE_F64_GOLDEN_CASES = frozenset(
    {
        "material_balance_minimal",
        "asm1slim_model_bound",
        "asm1slim_independent",
        "asm1_independent",
        "asm3_independent",
        "udm_independent",
    }
)


@pytest.fixture(scope="session", autouse=True)
def _deterministic_session() -> None:
    torch.manual_seed(0)
    torch.set_num_threads(1)
    try:
        torch.use_deterministic_algorithms(True)
    except Exception:  # pragma: no cover - backend dependent
        pass


def _load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _json_safe(value: Any) -> Any:
    if isinstance(value, torch.Tensor):
        return _json_safe(value.detach().cpu().tolist())
    if isinstance(value, Path):
        return str(value)
    if isinstance(value, dict):
        return {str(key): _json_safe(inner) for key, inner in value.items()}
    if isinstance(value, (list, tuple)):
        return [_json_safe(inner) for inner in value]
    if isinstance(value, float):
        return float(value)
    return value


def _stable_material_balance_result(result: Any) -> dict[str, Any]:
    summary = dict(result.summary)
    summary.pop("calculation_time_seconds", None)
    return _json_safe(
        {
            "status": result.status,
            "timestamps": result.timestamps,
            "node_data": result.node_data,
            "edge_data": result.edge_data,
            "segment_markers": result.segment_markers or [],
            "parameter_change_events": result.parameter_change_events or [],
            "summary": summary,
        }
    )


def _sha256_json(value: Any) -> str:
    payload = json.dumps(
        _json_safe(value),
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
        allow_nan=False,
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _cpu_f64_calculator() -> MaterialBalanceCalculator:
    calculator = MaterialBalanceCalculator()
    calculator.device = torch.device("cpu")
    calculator.dtype = torch.float64
    return calculator


def test_core_f64_golden_manifest_is_complete() -> None:
    assert set(CORE_F64_GOLDEN_CASES) == REQUIRED_CORE_F64_GOLDEN_CASES
    for case in CORE_F64_GOLDEN_CASES.values():
        assert case["fixture"].is_file()
        assert case["stable_result_sha256"]


@pytest.mark.parametrize("case_id", sorted(CORE_F64_GOLDEN_CASES))
def test_core_calculator_matches_committed_f64_golden(case_id: str) -> None:
    case = CORE_F64_GOLDEN_CASES[case_id]
    simulation_input = _load_json(case["fixture"])
    core_input = simulation_input_to_material_balance_input(simulation_input)

    assert simulation_input["job_type"] == case["expected_job_type"]
    reactor_node = core_input.nodes[1]
    assert reactor_node.node_type == case["expected_node_type"]
    if "expected_parameter_field" in case:
        parameter_value = getattr(reactor_node, case["expected_parameter_field"])
        assert parameter_value is not None
        if case["expected_parameter_count"] is not None:
            assert len(parameter_value) == case["expected_parameter_count"]

    result = _cpu_f64_calculator().calculate(core_input)
    stable_result = _stable_material_balance_result(result)

    assert stable_result["status"] == "success"
    assert stable_result["summary"]["total_steps"] == case["expected_total_steps"]
    assert len(stable_result["timestamps"]) == case["expected_timestamp_count"]
    assert _sha256_json(stable_result) == case["stable_result_sha256"]
