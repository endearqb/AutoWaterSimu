from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
SIMULATION_CORE_PYTHON = REPO_ROOT / "simulation_core" / "python"
BACKEND_PATH = REPO_ROOT / "backend"
VALID_SIMULATION_INPUT = (
    REPO_ROOT
    / "contracts"
    / "examples"
    / "valid"
    / "material_balance_minimal.simulation_input.v1.json"
)
ASM1SLIM_SIMULATION_INPUT = (
    REPO_ROOT
    / "contracts"
    / "examples"
    / "valid"
    / "asm1slim_minimal.simulation_input.v1.json"
)
ASM1SLIM_INDEPENDENT_SIMULATION_INPUT = (
    REPO_ROOT
    / "contracts"
    / "examples"
    / "valid"
    / "asm1slim_independent.simulation_input.v1.json"
)
ASM1_INDEPENDENT_SIMULATION_INPUT = (
    REPO_ROOT
    / "contracts"
    / "examples"
    / "valid"
    / "asm1_independent.simulation_input.v1.json"
)
ASM3_INDEPENDENT_SIMULATION_INPUT = (
    REPO_ROOT
    / "contracts"
    / "examples"
    / "valid"
    / "asm3_independent.simulation_input.v1.json"
)
UDM_INDEPENDENT_SIMULATION_INPUT = (
    REPO_ROOT
    / "contracts"
    / "examples"
    / "valid"
    / "udm_independent.simulation_input.v1.json"
)
BACKEND_CORE_DRIFT_GUARD_CASES: dict[str, dict[str, Any]] = {
    "material_balance_minimal": {"fixture": VALID_SIMULATION_INPUT},
    "asm1slim_model_bound": {"fixture": ASM1SLIM_SIMULATION_INPUT},
    "asm1slim_independent": {"fixture": ASM1SLIM_INDEPENDENT_SIMULATION_INPUT},
    "asm1_independent": {"fixture": ASM1_INDEPENDENT_SIMULATION_INPUT},
    "asm3_independent": {"fixture": ASM3_INDEPENDENT_SIMULATION_INPUT},
    "udm_independent": {"fixture": UDM_INDEPENDENT_SIMULATION_INPUT},
}
REQUIRED_BACKEND_CORE_DRIFT_GUARD_CASES = frozenset(
    {
        "material_balance_minimal",
        "asm1slim_model_bound",
        "asm1slim_independent",
        "asm1_independent",
        "asm3_independent",
        "udm_independent",
    }
)
NUMERIC_TOLERANCE = {"rel": 1e-6, "abs": 1e-9}

sys.path.insert(0, str(SIMULATION_CORE_PYTHON))
sys.path.insert(0, str(BACKEND_PATH))

from app.material_balance.core import MaterialBalanceCalculator as BackendMaterialBalanceCalculator
from app.services.simulation_input_adapter import (
    simulation_input_to_material_balance_input as backend_simulation_input_to_material_balance_input,
)
from autowatersimu_simulation_core.adapters import (
    simulation_input_to_material_balance_input,
)
from autowatersimu_simulation_core.material_balance import MaterialBalanceCalculator


def _load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _load_drift_guard_case(case_id: str) -> dict[str, Any]:
    fixture = BACKEND_CORE_DRIFT_GUARD_CASES[case_id]["fixture"]
    return _load_json(fixture)


def _is_numeric_sequence(values: Any) -> bool:
    return isinstance(values, list) and all(isinstance(value, (int, float)) for value in values)


def _assert_backend_core_result_match(core_result: Any, backend_result: Any) -> None:
    assert core_result.status == "success"
    assert backend_result.status == "success"
    assert core_result.summary["total_steps"] == backend_result.summary["total_steps"]
    assert len(core_result.timestamps) == len(backend_result.timestamps)
    assert core_result.timestamps == pytest.approx(backend_result.timestamps, **NUMERIC_TOLERANCE)
    assert set(core_result.node_data) == set(backend_result.node_data)

    for node_id, backend_components in backend_result.node_data.items():
        core_components = core_result.node_data[node_id]
        assert set(core_components) == set(backend_components)
        for component_name, backend_values in backend_components.items():
            core_values = core_components[component_name]
            if _is_numeric_sequence(backend_values):
                assert core_values == pytest.approx(backend_values, **NUMERIC_TOLERANCE)
            else:
                assert core_values == backend_values


def test_backend_core_drift_guard_manifest_is_complete() -> None:
    assert set(BACKEND_CORE_DRIFT_GUARD_CASES) == REQUIRED_BACKEND_CORE_DRIFT_GUARD_CASES
    for case in BACKEND_CORE_DRIFT_GUARD_CASES.values():
        assert case["fixture"].is_file()


def test_core_calculator_matches_backend_baseline() -> None:
    simulation_input = _load_drift_guard_case("material_balance_minimal")

    core_input = simulation_input_to_material_balance_input(simulation_input)
    backend_input = backend_simulation_input_to_material_balance_input(simulation_input)

    core_result = MaterialBalanceCalculator().calculate(core_input)
    backend_result = BackendMaterialBalanceCalculator().calculate(backend_input)

    _assert_backend_core_result_match(core_result, backend_result)


def test_core_calculator_matches_backend_for_asm1slim_runtime_binding() -> None:
    simulation_input = _load_drift_guard_case("asm1slim_model_bound")

    core_input = simulation_input_to_material_balance_input(simulation_input)
    backend_input = backend_simulation_input_to_material_balance_input(simulation_input)

    core_result = MaterialBalanceCalculator().calculate(core_input)
    backend_result = BackendMaterialBalanceCalculator().calculate(backend_input)

    assert core_input.nodes[1].node_type == "asm1slim"
    assert core_input.nodes[1].asm1slim_parameters == [0.12, 0.08, 2.5, 10.0, 0.5, 0.8, 0.4]
    _assert_backend_core_result_match(core_result, backend_result)


def test_core_calculator_matches_backend_for_independent_asm1slim_job_type() -> None:
    simulation_input = _load_drift_guard_case("asm1slim_independent")

    core_input = simulation_input_to_material_balance_input(simulation_input)
    backend_input = backend_simulation_input_to_material_balance_input(simulation_input)

    core_result = MaterialBalanceCalculator().calculate(core_input)
    backend_result = BackendMaterialBalanceCalculator().calculate(backend_input)

    assert simulation_input["job_type"] == "simulation.asm1slim.v1"
    assert core_input.nodes[1].node_type == "asm1slim"
    _assert_backend_core_result_match(core_result, backend_result)


def test_core_calculator_matches_backend_for_independent_asm1_job_type() -> None:
    simulation_input = _load_drift_guard_case("asm1_independent")

    core_input = simulation_input_to_material_balance_input(simulation_input)
    backend_input = backend_simulation_input_to_material_balance_input(simulation_input)

    core_result = MaterialBalanceCalculator().calculate(core_input)
    backend_result = BackendMaterialBalanceCalculator().calculate(backend_input)

    assert simulation_input["job_type"] == "simulation.asm1.v1"
    assert core_input.nodes[1].node_type == "asm1"
    assert core_input.nodes[1].asm1_parameters is not None
    assert len(core_input.nodes[1].asm1_parameters) == 19
    _assert_backend_core_result_match(core_result, backend_result)


def test_core_calculator_matches_backend_for_independent_asm3_job_type() -> None:
    simulation_input = _load_drift_guard_case("asm3_independent")

    core_input = simulation_input_to_material_balance_input(simulation_input)
    backend_input = backend_simulation_input_to_material_balance_input(simulation_input)

    core_result = MaterialBalanceCalculator().calculate(core_input)
    backend_result = BackendMaterialBalanceCalculator().calculate(backend_input)

    assert simulation_input["job_type"] == "simulation.asm3.v1"
    assert core_input.nodes[1].node_type == "asm3"
    assert core_input.nodes[1].asm3_parameters is not None
    assert len(core_input.nodes[1].asm3_parameters) == 37
    _assert_backend_core_result_match(core_result, backend_result)


def test_core_calculator_matches_backend_for_independent_udm_job_type() -> None:
    simulation_input = _load_drift_guard_case("udm_independent")

    core_input = simulation_input_to_material_balance_input(simulation_input)
    backend_input = backend_simulation_input_to_material_balance_input(simulation_input)

    core_result = MaterialBalanceCalculator().calculate(core_input)
    backend_result = BackendMaterialBalanceCalculator().calculate(backend_input)

    assert simulation_input["job_type"] == "simulation.udm.v1"
    assert core_input.nodes[1].node_type == "udm"
    assert core_input.nodes[1].udm_model_snapshot is not None
    assert core_input.nodes[1].udm_variable_bindings is not None
    _assert_backend_core_result_match(core_result, backend_result)
