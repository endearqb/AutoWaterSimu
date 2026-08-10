from __future__ import annotations

import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import pytest
import torch

REPO_ROOT = Path(__file__).resolve().parents[2]
SIMULATION_CORE_PYTHON = REPO_ROOT / "simulation_core" / "python"

sys.path.insert(0, str(SIMULATION_CORE_PYTHON))

from autowatersimu_simulation_core.material_balance.udm_engine import (  # noqa: E402
    build_udm_runtime_payload,
)
from autowatersimu_simulation_core.udm_network import (  # noqa: E402
    UDMReactionError,
    build_reaction_model,
    evaluate_reaction,
)


@dataclass
class LegacyUDMNode:
    node_type: str
    udm_component_names: list[str]
    udm_processes: list[dict[str, Any]]
    udm_parameter_values: dict[str, float]
    udm_variable_bindings: list[dict[str, str]] | None = None
    udm_model_snapshot: dict[str, Any] | None = None


def _seed_definition(
    *,
    reaction_enabled: bool = True,
    processes: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    return {
        "key": "fixture",
        "template_revision": "test",
        "reaction_enabled": reaction_enabled,
        "components": [{"name": "S"}, {"name": "P"}],
        "parameters": [{"name": "k", "default_value": 2.0}],
        "processes": processes
        if processes is not None
        else [
            {
                "name": "conversion",
                "rate_expr": "k*S",
                "stoich": {"S": -1.0, "P": 1.0},
            }
        ],
    }


def test_passive_reaction_model_returns_zero_reaction() -> None:
    model = build_reaction_model(
        _seed_definition(reaction_enabled=False, processes=[]),
    )

    assert evaluate_reaction(model, t=0.0, local_state={"S": 3.0, "P": 1.0}) == {
        "S": 0.0,
        "P": 0.0,
    }


def test_reaction_enabled_false_ignores_declared_processes() -> None:
    model = build_reaction_model(_seed_definition(reaction_enabled=False))

    assert evaluate_reaction(model, t=0.0, local_state={"S": 3.0, "P": 1.0}) == {
        "S": 0.0,
        "P": 0.0,
    }


def test_seed_reaction_evaluator_uses_rate_stoich_and_parameter_overrides() -> None:
    model = build_reaction_model(
        _seed_definition(),
        parameter_overrides={"k": 3.0},
    )

    assert evaluate_reaction(model, t=0.0, local_state={"S": 4.0, "P": 0.0}) == {
        "S": -12.0,
        "P": 12.0,
    }


def test_seed_reaction_evaluator_exposes_t_signals_and_stoich_expr() -> None:
    model = build_reaction_model(
        {
            "key": "signals",
            "components": [{"name": "S"}, {"name": "P"}],
            "parameters": [{"name": "k", "default_value": 1.0}],
            "processes": [
                {
                    "name": "signal_driven",
                    "rate_expr": "k*S + u + t",
                    "stoich_expr": {"S": "-yield_coeff", "P": "yield_coeff"},
                }
            ],
        },
        parameter_overrides={"yield_coeff": 0.5},
    )

    assert evaluate_reaction(
        model,
        t=2.0,
        local_state={"S": 3.0, "P": 0.0},
        signals={"u": 4.0},
    ) == {"S": -4.5, "P": 4.5}


def test_reaction_model_rejects_unknown_stoich_component() -> None:
    with pytest.raises(UDMReactionError) as error:
        build_reaction_model(
            {
                "components": [{"name": "S"}],
                "processes": [
                    {
                        "name": "bad",
                        "rate_expr": "S",
                        "stoich": {"Ghost": -1.0},
                    }
                ],
            }
        )

    assert error.value.code == "UDM_REACTION_UNKNOWN_COMPONENT"


def test_reaction_model_matches_v1_udm_runtime_small_case() -> None:
    processes = [
        {
            "name": "conversion",
            "rate_expr": "k*S",
            "stoich": {"S": -1.0, "P": 1.0},
        }
    ]
    model = build_reaction_model(
        {
            "key": "parity",
            "components": [{"name": "S"}, {"name": "P"}],
            "parameters": [{"name": "k", "default_value": 2.0}],
            "processes": processes,
        }
    )
    v2_reaction = evaluate_reaction(
        model,
        t=0.0,
        local_state={"S": 3.0, "P": 0.0},
    )

    legacy_runtime = build_udm_runtime_payload(
        nodes=[
            LegacyUDMNode(
                node_type="udm",
                udm_component_names=["S", "P"],
                udm_processes=processes,
                udm_parameter_values={"k": 2.0},
            )
        ],
        global_component_names=["S", "P"],
        device=torch.device("cpu"),
        dtype=torch.float64,
    )[0]
    legacy_reaction = legacy_runtime.evaluate_reaction(
        torch.tensor([3.0, 0.0], dtype=torch.float64)
    )

    assert [v2_reaction["S"], v2_reaction["P"]] == pytest.approx(
        legacy_reaction.tolist(),
        rel=1e-12,
        abs=1e-12,
    )
