from __future__ import annotations

import json
import os
import subprocess
import sys
from copy import deepcopy
from pathlib import Path
from typing import Any

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
SIMULATION_CORE_PYTHON = REPO_ROOT / "simulation_core" / "python"
VALID_SIMULATION_INPUT = (
    REPO_ROOT
    / "contracts"
    / "examples"
    / "valid"
    / "material_balance_minimal.simulation_input.v1.json"
)

sys.path.insert(0, str(SIMULATION_CORE_PYTHON))

from autowatersimu_simulation_core.adapters import (  # noqa: E402
    SimulationCoreAdapterError,
    simulation_input_to_material_balance_input,
)


def _load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _minimal_simulation_input() -> dict[str, Any]:
    return _load_json(VALID_SIMULATION_INPUT)


def _simulation_input_with_unknown_fields() -> dict[str, Any]:
    simulation_input = deepcopy(_minimal_simulation_input())
    simulation_input["unknown_top_level_for_test"] = {"ignored": True}
    simulation_input["nodes"][0]["unknown_node_field_for_test"] = "node-extra"
    simulation_input["edges"][0]["unknown_edge_field_for_test"] = "edge-extra"
    return simulation_input


def test_simulation_core_import_boundary_uses_core_python_only() -> None:
    env = os.environ.copy()
    env["PYTHONPATH"] = str(SIMULATION_CORE_PYTHON)
    completed = subprocess.run(
        [
            sys.executable,
            "-c",
            (
                "import autowatersimu_simulation_core; "
                "from autowatersimu_simulation_core.material_balance import MaterialBalanceCalculator; "
                "print(MaterialBalanceCalculator.__name__)"
            ),
        ],
        cwd=REPO_ROOT,
        env=env,
        capture_output=True,
        text=True,
        check=False,
    )

    assert completed.returncode == 0, completed.stderr
    assert completed.stdout.strip() == "MaterialBalanceCalculator"


def test_core_adapter_preserves_component_order_defaults_and_time_segments() -> None:
    simulation_input = _minimal_simulation_input()
    simulation_input["component_schema"]["components"] = ["COD", "NH3"]
    simulation_input["nodes"][0]["initial_concentrations"] = {"NH3": 2.0, "COD": 1.0}
    simulation_input["edges"][0]["concentration_transform"] = {"COD": {"a": 2.0, "b": ""}}
    simulation_input["time_segments"] = [
        {
            "id": "seg_1",
            "start_hour": 0.0,
            "end_hour": 2.0,
            "edge_overrides": {
                "e_in_tank": {
                    "flow": 80.0,
                    "factors": {"COD": {"a": 0.8, "b": 0.1}},
                }
            },
        },
        {"id": "seg_2", "start_hour": 2.0, "end_hour": 4.0, "edge_overrides": {}},
    ]

    adapted = simulation_input_to_material_balance_input(simulation_input)

    assert adapted.nodes[0].initial_concentrations == [1.0, 2.0]
    assert adapted.edges[0].concentration_factor_a == [2.0, 1.0]
    assert adapted.edges[0].concentration_factor_b == [0.0, 0.0]
    assert [segment.id for segment in adapted.time_segments] == ["seg_1", "seg_2"]
    assert adapted.time_segments[0].edge_overrides["e_in_tank"].flow == 80.0
    assert adapted.time_segments[0].edge_overrides["e_in_tank"].factors["COD"].a == 0.8


def test_core_adapter_wraps_invalid_parameters_as_contract_style_error() -> None:
    simulation_input = _minimal_simulation_input()
    simulation_input["parameters"]["tolerance"] = 0.1

    with pytest.raises(SimulationCoreAdapterError) as exc_info:
        simulation_input_to_material_balance_input(simulation_input)

    assert str(exc_info.value) == "simulation_input adapter validation failed"
    assert any("tolerance" in item["path"] for item in exc_info.value.details)
    assert exc_info.value.to_contract_error()["error_code"] == "VALIDATION_FAILED"


def test_core_adapter_preserves_model_runtime_bindings() -> None:
    simulation_input = deepcopy(_minimal_simulation_input())
    reactor = simulation_input["nodes"][1]
    reactor["node_type"] = "asm1slim"
    reactor["asm1slim_parameters"] = [0.12, 0.08, 2.5, 10.0, 0.5, 0.8, 0.4]
    reactor["udm_model_id"] = "udm_model_a"
    reactor["udm_model_version"] = "2"
    reactor["udm_model_hash"] = "sha256:" + ("a" * 64)
    reactor["udm_component_names"] = ["A", "B"]
    reactor["udm_processes"] = [{"id": "p1", "rate_expr": "k * A", "stoich": {"A": -1}}]
    reactor["udm_parameter_values"] = {"k": "0.1"}
    reactor["udm_model_snapshot"] = {"id": "udm_model_a", "version": 2}
    reactor["udm_variable_bindings"] = [{"local_var": "A_local", "canonical_var": "A"}]

    adapted = simulation_input_to_material_balance_input(simulation_input)
    adapted_node = adapted.nodes[1]

    assert adapted_node.asm1slim_parameters == [0.12, 0.08, 2.5, 10.0, 0.5, 0.8, 0.4]
    assert adapted_node.udm_model_id == "udm_model_a"
    assert adapted_node.udm_model_version == 2
    assert adapted_node.udm_model_hash == "sha256:" + ("a" * 64)
    assert adapted_node.udm_component_names == ["A", "B"]
    assert adapted_node.udm_processes == [{"id": "p1", "rate_expr": "k * A", "stoich": {"A": -1}}]
    assert adapted_node.udm_parameter_values == {"k": 0.1}
    assert adapted_node.udm_model_snapshot == {"id": "udm_model_a", "version": 2}
    assert adapted_node.udm_variable_bindings == [{"local_var": "A_local", "canonical_var": "A"}]


def test_core_adapter_default_compat_silently_ignores_unknown_fields() -> None:
    simulation_input = _simulation_input_with_unknown_fields()

    adapted = simulation_input_to_material_balance_input(simulation_input)

    assert adapted.contract_warnings == []
    assert getattr(adapted.nodes[0], "model_extra", None) == {}
    assert getattr(adapted.edges[0], "model_extra", None) == {}


def test_core_adapter_warns_for_unknown_fields_without_rejecting_payload() -> None:
    simulation_input = _simulation_input_with_unknown_fields()

    adapted = simulation_input_to_material_balance_input(
        simulation_input,
        validation_mode="warn",
    )

    warning_paths = {item["path"] for item in adapted.contract_warnings}
    assert warning_paths == {
        "$.unknown_top_level_for_test",
        "$.nodes[0].unknown_node_field_for_test",
        "$.edges[0].unknown_edge_field_for_test",
    }
    assert adapted.contract_warnings[0]["source_id"] == "si_material_balance_minimal"
    assert adapted.nodes[0].node_id == "n_in"
    assert adapted.edges[0].edge_id == "e_in_tank"


def test_core_adapter_strict_rejects_unknown_fields() -> None:
    simulation_input = _simulation_input_with_unknown_fields()

    with pytest.raises(SimulationCoreAdapterError) as exc_info:
        simulation_input_to_material_balance_input(
            simulation_input,
            validation_mode="strict",
        )

    assert str(exc_info.value) == "simulation_input contains unknown fields"
    detail_paths = {item["path"] for item in exc_info.value.details}
    assert detail_paths == {
        "$.unknown_top_level_for_test",
        "$.nodes[0].unknown_node_field_for_test",
        "$.edges[0].unknown_edge_field_for_test",
    }
