import pytest
from pydantic import ValidationError

from app.models import CalculationParameters, EdgeData, MaterialBalanceInput, NodeData
from app.services.material_balance_runtime_input import (
    material_balance_input_to_core_runtime,
)
from autowatersimu_simulation_core.material_balance.models import (
    MaterialBalanceInput as CoreMaterialBalanceInput,
)


def _build_legacy_input() -> MaterialBalanceInput:
    return MaterialBalanceInput(
        nodes=[
            NodeData(
                node_id="n_in",
                node_type="inlet",
                is_inlet=True,
                initial_volume=1.0,
                initial_concentrations=[10.0],
            ),
            NodeData(
                node_id="n_reactor",
                node_type="default",
                initial_volume=2.0,
                initial_concentrations=[0.0],
            ),
        ],
        edges=[
            EdgeData(
                edge_id="edge_1",
                source_node_id="n_in",
                target_node_id="n_reactor",
                flow_rate=1.0,
                concentration_factor_a=[1.0],
                concentration_factor_b=[0.0],
            )
        ],
        parameters=CalculationParameters(hours=1.0, steps_per_hour=1),
    )


def test_legacy_material_balance_input_is_revalidated_as_core_runtime_input() -> None:
    core_input = material_balance_input_to_core_runtime(_build_legacy_input())

    assert type(core_input) is CoreMaterialBalanceInput
    assert core_input.nodes[0].node_id == "n_in"
    assert core_input.parameters.solver_method == "scipy_solver"


def test_legacy_route_custom_parameters_are_preserved_for_core_runtime() -> None:
    legacy_input = _build_legacy_input()
    legacy_input.customParameters = [
        {"name": "COD", "label": "COD"},
        {"name": "NH3", "label": "NH3"},
    ]

    core_input = material_balance_input_to_core_runtime(legacy_input)

    assert core_input.original_flowchart_data == {
        "customParameters": [
            {"name": "COD", "label": "COD"},
            {"name": "NH3", "label": "NH3"},
        ]
    }


def test_legacy_route_component_schema_derives_core_custom_parameters() -> None:
    payload = _build_legacy_input().model_dump(mode="json")
    payload["component_schema"] = {
        "component_schema_id": "material_balance_components.v1",
        "components": ["COD", "NH3"],
    }

    core_input = material_balance_input_to_core_runtime(payload)

    assert core_input.original_flowchart_data == {
        "component_schema": {
            "component_schema_id": "material_balance_components.v1",
            "components": ["COD", "NH3"],
        },
        "customParameters": [
            {"name": "COD", "label": "COD"},
            {"name": "NH3", "label": "NH3"},
        ],
    }


def test_existing_original_flowchart_data_wins_over_route_metadata() -> None:
    legacy_input = _build_legacy_input()
    legacy_input.customParameters = [{"name": "route_only", "label": "route_only"}]
    legacy_input.original_flowchart_data = {
        "customParameters": [{"name": "original", "label": "original"}]
    }

    core_input = material_balance_input_to_core_runtime(legacy_input)

    assert core_input.original_flowchart_data == {
        "customParameters": [{"name": "original", "label": "original"}]
    }


def test_runtime_input_boundary_rejects_unknown_node_fields() -> None:
    payload = _build_legacy_input().model_dump(mode="json")
    payload["nodes"][0]["unexpected_legacy_field"] = "not allowed"

    with pytest.raises(ValidationError, match="unexpected_legacy_field"):
        material_balance_input_to_core_runtime(payload)


def test_core_runtime_input_passthrough_preserves_identity() -> None:
    core_input = material_balance_input_to_core_runtime(_build_legacy_input())

    assert material_balance_input_to_core_runtime(core_input) is core_input
