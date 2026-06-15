from app.material_balance.core import MaterialBalanceCalculator
from app.material_balance.models import MaterialBalanceResult as BackendMaterialBalanceResult
from app.models import CalculationParameters, EdgeData, MaterialBalanceInput, NodeData
from autowatersimu_simulation_core.material_balance.models import (
    MaterialBalanceResult as CoreMaterialBalanceResult,
)


def _build_input() -> MaterialBalanceInput:
    return MaterialBalanceInput(
        nodes=[
            NodeData(
                node_id="n_in",
                node_type="input",
                initial_volume=1.0,
                initial_concentrations=[10.0],
                is_inlet=True,
                is_outlet=False,
            ),
            NodeData(
                node_id="n_out",
                node_type="output",
                initial_volume=1.0,
                initial_concentrations=[0.0],
                is_inlet=False,
                is_outlet=True,
            ),
        ],
        edges=[
            EdgeData(
                edge_id="edge_1",
                source_node_id="n_in",
                target_node_id="n_out",
                flow_rate=100.0,
                concentration_factor_a=[1.0],
                concentration_factor_b=[0.0],
            )
        ],
        parameters=CalculationParameters(hours=1.0, steps_per_hour=1),
    )


def test_backend_calculator_returns_core_material_balance_result() -> None:
    result = MaterialBalanceCalculator().calculate(_build_input())

    assert type(result) is CoreMaterialBalanceResult
    assert isinstance(result, CoreMaterialBalanceResult)
    assert BackendMaterialBalanceResult is CoreMaterialBalanceResult
