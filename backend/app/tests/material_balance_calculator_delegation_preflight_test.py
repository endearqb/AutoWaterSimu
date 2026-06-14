from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest

from app.material_balance.core import MaterialBalanceCalculator as BackendMaterialBalanceCalculator
from app.models import MaterialBalanceInput as LegacyMaterialBalanceInput
from app.services.simulation_input_adapter import (
    simulation_input_to_core_material_balance_input,
    simulation_input_to_material_balance_input,
)
from autowatersimu_simulation_core.material_balance import (
    MaterialBalanceCalculator as CoreMaterialBalanceCalculator,
)
from autowatersimu_simulation_core.material_balance.models import (
    MaterialBalanceInput as CoreMaterialBalanceInput,
)

REPO_ROOT = Path(__file__).resolve().parents[3]
VALID_EXAMPLES = REPO_ROOT / "contracts" / "examples" / "valid"

DELEGATION_PREFLIGHT_CASES: dict[str, dict[str, Any]] = {
    "material_balance_minimal": {
        "fixture": VALID_EXAMPLES / "material_balance_minimal.simulation_input.v1.json",
    },
    "asm1slim_model_bound": {
        "fixture": VALID_EXAMPLES / "asm1slim_minimal.simulation_input.v1.json",
        "expected_node_type": "asm1slim",
        "expected_parameter_field": "asm1slim_parameters",
        "expected_parameter_count": 7,
    },
    "asm1slim_independent": {
        "fixture": VALID_EXAMPLES / "asm1slim_independent.simulation_input.v1.json",
        "expected_job_type": "simulation.asm1slim.v1",
        "expected_node_type": "asm1slim",
        "expected_parameter_field": "asm1slim_parameters",
        "expected_parameter_count": 7,
    },
    "asm1_independent": {
        "fixture": VALID_EXAMPLES / "asm1_independent.simulation_input.v1.json",
        "expected_job_type": "simulation.asm1.v1",
        "expected_node_type": "asm1",
        "expected_parameter_field": "asm1_parameters",
        "expected_parameter_count": 19,
    },
    "asm3_independent": {
        "fixture": VALID_EXAMPLES / "asm3_independent.simulation_input.v1.json",
        "expected_job_type": "simulation.asm3.v1",
        "expected_node_type": "asm3",
        "expected_parameter_field": "asm3_parameters",
        "expected_parameter_count": 37,
    },
    "udm_independent": {
        "fixture": VALID_EXAMPLES / "udm_independent.simulation_input.v1.json",
        "expected_job_type": "simulation.udm.v1",
        "expected_node_type": "udm",
        "expected_parameter_field": "udm_model_snapshot",
        "expected_parameter_count": None,
    },
}
REQUIRED_DELEGATION_PREFLIGHT_CASES = frozenset(
    {
        "material_balance_minimal",
        "asm1slim_model_bound",
        "asm1slim_independent",
        "asm1_independent",
        "asm3_independent",
        "udm_independent",
    }
)
ALLOWED_CALCULATOR_MIGRATION_DIFFERENCES: dict[str, str] = {}
NUMERIC_TOLERANCE = {"rel": 1e-6, "abs": 1e-9}


def _load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _is_numeric_sequence(values: Any) -> bool:
    return isinstance(values, list) and all(isinstance(value, (int, float)) for value in values)


def _assert_no_undeclared_migration_difference(case_id: str) -> None:
    assert case_id not in ALLOWED_CALCULATOR_MIGRATION_DIFFERENCES


def _assert_result_match(case_id: str, core_result: Any, backend_result: Any) -> None:
    _assert_no_undeclared_migration_difference(case_id)

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


def test_delegation_preflight_manifest_is_complete_and_has_no_allowed_differences() -> None:
    assert set(DELEGATION_PREFLIGHT_CASES) == REQUIRED_DELEGATION_PREFLIGHT_CASES
    assert ALLOWED_CALCULATOR_MIGRATION_DIFFERENCES == {}
    for case in DELEGATION_PREFLIGHT_CASES.values():
        assert case["fixture"].is_file()


@pytest.mark.parametrize("case_id", sorted(DELEGATION_PREFLIGHT_CASES))
def test_backend_calculator_delegation_preflight_matches_core(case_id: str) -> None:
    case = DELEGATION_PREFLIGHT_CASES[case_id]
    simulation_input = _load_json(case["fixture"])

    legacy_input = simulation_input_to_material_balance_input(simulation_input)
    core_input = simulation_input_to_core_material_balance_input(simulation_input)

    assert type(legacy_input) is LegacyMaterialBalanceInput
    assert type(core_input) is CoreMaterialBalanceInput
    if "expected_job_type" in case:
        assert simulation_input["job_type"] == case["expected_job_type"]
    if "expected_node_type" in case:
        reactor_node = core_input.nodes[1]
        assert reactor_node.node_type == case["expected_node_type"]
        parameter_value = getattr(reactor_node, case["expected_parameter_field"])
        assert parameter_value is not None
        if case["expected_parameter_count"] is not None:
            assert len(parameter_value) == case["expected_parameter_count"]

    backend_result = BackendMaterialBalanceCalculator().calculate(legacy_input)
    core_result = CoreMaterialBalanceCalculator().calculate(core_input)

    _assert_result_match(case_id, core_result, backend_result)
