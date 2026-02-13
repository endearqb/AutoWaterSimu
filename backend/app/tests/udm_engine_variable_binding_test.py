import torch

from app.material_balance.udm_engine import build_udm_runtime_payload
from app.models import NodeData


def test_udm_engine_applies_local_to_canonical_variable_binding() -> None:
    node = NodeData(
        node_id="node_1",
        node_type="udm",
        initial_volume=1.0,
        initial_concentrations=[10.0, 2.0],
        is_inlet=False,
        is_outlet=False,
        udm_component_names=["B"],
        udm_processes=[
            {
                "name": "growth",
                "rate_expr": "B",
                "stoich": {"B": 1.0},
            }
        ],
        udm_parameter_values={},
        udm_variable_bindings=[
            {"local_var": "B", "canonical_var": "A"},
        ],
        udm_model_snapshot={
            "components": [
                {"name": "B", "is_fixed": False},
            ]
        },
    )

    runtimes = build_udm_runtime_payload(
        nodes=[node],
        global_component_names=["A", "B"],
        device=torch.device("cpu"),
        dtype=torch.float32,
    )
    assert len(runtimes) == 1

    reaction = runtimes[0].evaluate_reaction(torch.tensor([10.0, 2.0], dtype=torch.float32))
    assert reaction.shape[0] == 2
    # Local symbol B is bound to canonical A, so the reaction is projected to A.
    assert float(reaction[0].item()) == 10.0
    assert float(reaction[1].item()) == 0.0
