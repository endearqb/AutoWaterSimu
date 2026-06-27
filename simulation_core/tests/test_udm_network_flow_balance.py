from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
SIMULATION_CORE_PYTHON = REPO_ROOT / "simulation_core" / "python"

sys.path.insert(0, str(SIMULATION_CORE_PYTHON))

from autowatersimu_simulation_core.udm_network import (  # noqa: E402
    FlowBalanceError,
    compile_network,
    solve_flow_balance,
)


def _node(node_id: str, node_type: str, ports: list[tuple[str, str]]) -> dict[str, Any]:
    return {
        "node_id": node_id,
        "node_type": node_type,
        "process_unit_type": node_type,
        "component_schema_id": "components.v1",
        "initial_conditions": {"COD": 0.0},
        "ports": [
            {"port_id": port_id, "port_kind": port_kind}
            for port_id, port_kind in ports
        ],
        "model_binding": {"model_kind": "passive_udm", "reaction_enabled": False},
        "parameter_binding": {},
        "unit_metadata": {},
    }


def _edge(
    edge_id: str,
    source: str,
    source_port: str,
    target: str,
    target_port: str,
    flow_spec: dict[str, Any],
    *,
    kind: str = "hydraulic",
    pump: dict[str, Any] | None = None,
) -> dict[str, Any]:
    return {
        "edge_id": edge_id,
        "edge_kind": kind,
        "source_node_id": source,
        "source_port": source_port,
        "target_node_id": target,
        "target_port": target_port,
        "component_policy": {"mode": "all", "include": [], "exclude": []},
        "flow_spec": flow_spec,
        "pump": pump,
    }


def _graph(
    nodes: list[dict[str, Any]],
    edges: list[dict[str, Any]],
    flow_constraints: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    return {
        "schema_version": "network_process_graph.v1",
        "network_graph_id": "flow_balance_case",
        "version": 1,
        "component_schemas": [
            {
                "component_schema_id": "components.v1",
                "components": ["COD"],
                "unit": "mg/L",
            }
        ],
        "nodes": nodes,
        "edges": edges,
        "flow_constraints": flow_constraints or [],
        "signal_bindings": [],
        "composites": [],
        "validation": {"status": "valid", "errors": [], "warnings": []},
    }


def _solve(payload: dict[str, Any]) -> dict[str, float]:
    return solve_flow_balance(compile_network(payload)).resolved_flow_by_edge


def test_fixed_single_path_has_unique_solution() -> None:
    result = _solve(
        _graph(
            [
                _node("source", "source", [("out", "hydraulic_out")]),
                _node("sink", "sink", [("in", "hydraulic_in")]),
            ],
            [
                _edge(
                    "e",
                    "source",
                    "out",
                    "sink",
                    "in",
                    {"mode": "fixed", "value": 10.0},
                )
            ],
        )
    )

    assert result == {"e": 10.0}


def test_balanced_serial_graph_uses_node_conservation() -> None:
    result = _solve(
        _graph(
            [
                _node("source", "source", [("out", "hydraulic_out")]),
                _node("tank", "cstr", [("in", "hydraulic_in"), ("out", "hydraulic_out")]),
                _node("sink", "sink", [("in", "hydraulic_in")]),
            ],
            [
                _edge("in", "source", "out", "tank", "in", {"mode": "fixed", "value": 10.0}),
                _edge("out", "tank", "out", "sink", "in", {"mode": "balanced"}),
            ],
        )
    )

    assert result == {"in": 10.0, "out": 10.0}


def test_split_fraction_solves_70_30() -> None:
    result = _solve(
        _graph(
            [
                _node("source", "source", [("out", "hydraulic_out")]),
                _node("splitter", "splitter", [("in", "hydraulic_in"), ("a", "hydraulic_out"), ("b", "hydraulic_out")]),
                _node("sink_a", "sink", [("in", "hydraulic_in")]),
                _node("sink_b", "sink", [("in", "hydraulic_in")]),
            ],
            [
                _edge("in", "source", "out", "splitter", "in", {"mode": "fixed", "value": 100.0}),
                _edge("a", "splitter", "a", "sink_a", "in", {"mode": "balanced"}),
                _edge("b", "splitter", "b", "sink_b", "in", {"mode": "balanced"}),
            ],
            [
                {
                    "constraint_id": "split",
                    "constraint_type": "split_fraction",
                    "edge_fractions": {"a": 0.7, "b": 0.3},
                    "sum_to_one": True,
                }
            ],
        )
    )

    assert result == {"in": 100.0, "a": 70.0, "b": 30.0}


def test_ratio_to_edge_solves_proportion() -> None:
    result = _solve(
        _graph(
            [
                _node("source", "source", [("out", "hydraulic_out")]),
                _node("tank", "cstr", [("in", "hydraulic_in"), ("a", "hydraulic_out"), ("b", "hydraulic_out")]),
                _node("sink_a", "sink", [("in", "hydraulic_in")]),
                _node("sink_b", "sink", [("in", "hydraulic_in")]),
            ],
            [
                _edge("in", "source", "out", "tank", "in", {"mode": "fixed", "value": 10.0}),
                _edge("a", "tank", "a", "sink_a", "in", {"mode": "balanced"}),
                _edge("b", "tank", "b", "sink_b", "in", {"mode": "balanced"}),
            ],
            [
                {
                    "constraint_id": "ratio",
                    "constraint_type": "ratio_to_edge",
                    "edge_id": "b",
                    "reference_edge_id": "a",
                    "ratio": 3.0,
                }
            ],
        )
    )

    assert result == {"in": 10.0, "a": 2.5, "b": 7.5}


def test_recognized_but_unimplemented_constraint_fails_explicitly() -> None:
    payload = _graph(
        [
            _node("source", "source", [("out", "hydraulic_out")]),
            _node("sink", "sink", [("in", "hydraulic_in")]),
        ],
        [
            _edge("e", "source", "out", "sink", "in", {"mode": "fixed", "value": 10.0}),
        ],
        [
            {
                "constraint_id": "future_fixed",
                "constraint_type": "fixed_edge_flow",
                "edge_id": "e",
                "value": 10.0,
            }
        ],
    )

    with pytest.raises(FlowBalanceError) as error:
        _solve(payload)

    assert error.value.code == "FLOW_CONSTRAINT_NOT_IMPLEMENTED"


def test_residual_solves_remaining_flow() -> None:
    result = _solve(
        _graph(
            [
                _node("source", "source", [("out", "hydraulic_out")]),
                _node("tank", "cstr", [("in", "hydraulic_in"), ("ras", "hydraulic_out"), ("was", "hydraulic_out"), ("eff", "hydraulic_out")]),
                _node("ras_sink", "sink", [("in", "hydraulic_in")]),
                _node("was_sink", "sink", [("in", "hydraulic_in")]),
                _node("eff_sink", "sink", [("in", "hydraulic_in")]),
            ],
            [
                _edge("in", "source", "out", "tank", "in", {"mode": "fixed", "value": 10.0}),
                _edge("ras", "tank", "ras", "ras_sink", "in", {"mode": "fixed", "value": 2.0}),
                _edge("was", "tank", "was", "was_sink", "in", {"mode": "fixed", "value": 3.0}),
                _edge("eff", "tank", "eff", "eff_sink", "in", {"mode": "residual"}),
            ],
            [
                {
                    "constraint_id": "residual",
                    "constraint_type": "residual",
                    "node_id": "tank",
                    "known_outflow_edges": ["ras", "was"],
                    "residual_edge_id": "eff",
                }
            ],
        )
    )

    assert result == {"in": 10.0, "ras": 2.0, "was": 3.0, "eff": 5.0}


def test_negative_residual_fails_strict() -> None:
    payload = _graph(
        [
            _node("source", "source", [("out", "hydraulic_out")]),
            _node("tank", "cstr", [("in", "hydraulic_in"), ("ras", "hydraulic_out"), ("was", "hydraulic_out"), ("eff", "hydraulic_out")]),
            _node("ras_sink", "sink", [("in", "hydraulic_in")]),
            _node("was_sink", "sink", [("in", "hydraulic_in")]),
            _node("eff_sink", "sink", [("in", "hydraulic_in")]),
        ],
        [
            _edge("in", "source", "out", "tank", "in", {"mode": "fixed", "value": 3.0}),
            _edge("ras", "tank", "ras", "ras_sink", "in", {"mode": "fixed", "value": 2.0}),
            _edge("was", "tank", "was", "was_sink", "in", {"mode": "fixed", "value": 3.0}),
            _edge("eff", "tank", "eff", "eff_sink", "in", {"mode": "residual"}),
        ],
        [
            {
                "constraint_id": "residual",
                "constraint_type": "residual",
                "node_id": "tank",
                "known_outflow_edges": ["ras", "was"],
                "residual_edge_id": "eff",
            }
        ],
    )

    with pytest.raises(FlowBalanceError) as error:
        _solve(payload)

    assert error.value.code == "FLOW_NEGATIVE_RESIDUAL"


def test_overdetermined_conflict_fails() -> None:
    payload = _graph(
        [
            _node("source", "source", [("out", "hydraulic_out")]),
            _node("tank", "cstr", [("in", "hydraulic_in"), ("out", "hydraulic_out")]),
            _node("sink", "sink", [("in", "hydraulic_in")]),
        ],
        [
            _edge("in", "source", "out", "tank", "in", {"mode": "fixed", "value": 10.0}),
            _edge("out", "tank", "out", "sink", "in", {"mode": "fixed", "value": 9.0}),
        ],
    )

    with pytest.raises(FlowBalanceError) as error:
        _solve(payload)

    assert error.value.code == "FLOW_INCONSISTENT"


def test_pump_bounds_fail_strict() -> None:
    payload = _graph(
        [
            _node("source", "source", [("out", "hydraulic_out")]),
            _node("sink", "sink", [("in", "hydraulic_in")]),
        ],
        [
            _edge(
                "pump",
                "source",
                "out",
                "sink",
                "in",
                {"mode": "fixed", "value": 10.0},
                kind="pump",
                pump={"min_flow": 0.0, "max_flow": 5.0},
            )
        ],
    )

    with pytest.raises(FlowBalanceError) as error:
        _solve(payload)

    assert error.value.code == "PUMP_BOUNDS_VIOLATION"
