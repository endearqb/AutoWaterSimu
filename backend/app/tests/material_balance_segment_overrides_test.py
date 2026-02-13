import pytest
import torch

from app.material_balance.core import MaterialBalanceCalculator
from app.material_balance.exceptions import InvalidInputError
from app.models import CalculationParameters, EdgeData, MaterialBalanceInput, NodeData, TimeSegment


def _build_input(time_segments: list[TimeSegment] | None = None) -> MaterialBalanceInput:
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
        parameters=CalculationParameters(hours=24.0, steps_per_hour=1),
        time_segments=time_segments or [],
    )


def test_prepare_segments_falls_back_to_single_baseline_segment() -> None:
    calculator = MaterialBalanceCalculator()
    input_data = _build_input()

    segments = calculator._prepare_segments(input_data, 24.0)

    assert segments == [
        {
            "id": "baseline",
            "start_hour": 0.0,
            "end_hour": 24.0,
            "edge_overrides": {},
        }
    ]


def test_prepare_segments_rejects_non_continuous_segments() -> None:
    calculator = MaterialBalanceCalculator()
    input_data = _build_input(
        time_segments=[
            TimeSegment(id="seg_1", start_hour=0.0, end_hour=12.0, edge_overrides={}),
            TimeSegment(id="seg_2", start_hour=13.0, end_hour=24.0, edge_overrides={}),
        ]
    )

    with pytest.raises(InvalidInputError, match="continuous"):
        calculator._prepare_segments(input_data, 24.0)


def test_resolve_segment_edge_values_applies_flow_and_ab_overrides() -> None:
    calculator = MaterialBalanceCalculator()
    input_data = _build_input()
    tensors = calculator._convert_to_tensors(input_data)

    q_vals, a_edge, b_edge = calculator._resolve_segment_edge_values(
        input_data=input_data,
        segment={
            "id": "seg_2",
            "start_hour": 12.0,
            "end_hour": 24.0,
            "edge_overrides": {
                "edge_1": {
                    "flow": 220.0,
                    "factors": {"COD": {"a": 2.5, "b": 3.0}},
                }
            },
        },
        sparse_bundle=tensors["sparse_bundle"],
        parameter_names=["COD"],
    )

    assert float(q_vals[0].item()) == pytest.approx(220.0)
    assert float(a_edge[0, 0].item()) == pytest.approx(2.5)
    assert float(b_edge[0, 0].item()) == pytest.approx(3.0)


def test_build_parameter_change_events_detects_step_change_items() -> None:
    calculator = MaterialBalanceCalculator()
    input_data = _build_input()

    previous_q = torch.tensor([100.0], dtype=calculator.dtype, device=calculator.device)
    previous_a = torch.tensor([[1.0]], dtype=calculator.dtype, device=calculator.device)
    previous_b = torch.tensor([[0.0]], dtype=calculator.dtype, device=calculator.device)
    current_q = torch.tensor([120.0], dtype=calculator.dtype, device=calculator.device)
    current_a = torch.tensor([[1.1]], dtype=calculator.dtype, device=calculator.device)
    current_b = torch.tensor([[0.0]], dtype=calculator.dtype, device=calculator.device)

    events = calculator._build_parameter_change_events(
        at_hour=12.0,
        input_data=input_data,
        parameter_names=["COD"],
        previous_q=previous_q,
        previous_a=previous_a,
        previous_b=previous_b,
        current_q=current_q,
        current_a=current_a,
        current_b=current_b,
    )

    assert len(events) == 1
    assert events[0]["atHour"] == pytest.approx(12.0)
    assert events[0]["edgeId"] == "edge_1"
    assert set(events[0]["changed"]) == {"flow", "COD_a"}
