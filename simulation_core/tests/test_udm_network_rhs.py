from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
SIMULATION_CORE_PYTHON = REPO_ROOT / "simulation_core" / "python"
VALID_EXAMPLES = REPO_ROOT / "contracts" / "examples" / "valid"

sys.path.insert(0, str(SIMULATION_CORE_PYTHON))

from autowatersimu_simulation_core.udm_network import (  # noqa: E402
    UDMNetworkRHSError,
    assemble_rhs,
    compile_network,
)


def _node(node_id: str, ports: list[tuple[str, str]], *, volume: float = 10.0) -> dict[str, Any]:
    return {
        "node_id": node_id,
        "node_type": "cstr",
        "process_unit_type": "cstr",
        "component_schema_id": "components.v1",
        "initial_conditions": {"A": 0.0},
        "volume": volume,
        "ports": [
            {"port_id": port_id, "port_kind": port_kind}
            for port_id, port_kind in ports
        ],
        "model_binding": {"model_kind": "passive_udm", "reaction_enabled": False},
        "parameter_binding": {},
        "unit_metadata": {},
    }


def _graph(
    nodes: list[dict[str, Any]],
    edges: list[dict[str, Any]],
    *,
    components: list[str] | None = None,
) -> dict[str, Any]:
    return {
        "schema_version": "network_process_graph.v1",
        "network_graph_id": "rhs_case",
        "version": 1,
        "component_schemas": [
            {
                "component_schema_id": "components.v1",
                "components": components or ["A"],
                "unit": "mg/L",
            }
        ],
        "nodes": nodes,
        "edges": edges,
        "flow_constraints": [],
        "signal_bindings": [],
        "composites": [],
        "validation": {"status": "valid", "errors": [], "warnings": []},
    }


def test_assemble_rhs_adds_hydraulic_transport_by_node_volume() -> None:
    source = _node("source", [("out", "hydraulic_out")], volume=10.0)
    source["initial_conditions"] = {"A": 100.0}
    target = _node("target", [("in", "hydraulic_in")], volume=20.0)
    system = compile_network(
        _graph(
            [source, target],
            [
                {
                    "edge_id": "e",
                    "edge_kind": "hydraulic",
                    "source_node_id": "source",
                    "source_port": "out",
                    "target_node_id": "target",
                    "target_port": "in",
                    "component_policy": {"mode": "all", "include": [], "exclude": []},
                    "flow_spec": {"mode": "fixed", "value": 2.0},
                }
            ],
        )
    )

    result = assemble_rhs(system, system.initial_state_vector())

    assert result.derivative == pytest.approx((-20.0, 10.0))
    assert result.flow_balance is not None
    assert result.flow_balance.resolved_flow_by_edge == {"e": 2.0}


def test_assemble_rhs_adds_reaction_contribution_without_volume_scaling() -> None:
    node = _node("reactor", [], volume=100.0)
    node["initial_conditions"] = {"S": 2.0, "P": 0.0}
    node["model_binding"] = {
        "model_kind": "inline_udm",
        "reaction_enabled": True,
        "model_definition": {
            "components": ["S", "P"],
            "parameters": {"k": 0.5},
            "processes": [
                {
                    "name": "decay",
                    "rate_expr": "k * S",
                    "stoich": {"S": -1.0, "P": 1.0},
                }
            ],
        },
    }
    system = compile_network(_graph([node], [], components=["S", "P"]))

    result = assemble_rhs(system, system.initial_state_vector())

    assert result.flow_balance is None
    assert result.derivative[:2] == pytest.approx((-1.0, 1.0))


def test_assemble_rhs_adds_settling_transport_by_node_volume() -> None:
    source = _node("upper", [("out", "settling_out")], volume=10.0)
    source["initial_conditions"] = {"X_TSS": 100.0}
    target = _node("lower", [("in", "settling_in")], volume=20.0)
    target["initial_conditions"] = {"X_TSS": 0.0}
    system = compile_network(
        _graph(
            [source, target],
            [
                {
                    "edge_id": "settle",
                    "edge_kind": "settling",
                    "source_node_id": "upper",
                    "source_port": "out",
                    "target_node_id": "lower",
                    "target_port": "in",
                    "component_policy": {"mode": "include", "include": ["X_TSS"], "exclude": []},
                    "transport_model": {
                        "model_id": "takacs_settling.v1",
                        "parameters": {
                            "area_m2": 1.0,
                            "v0_m_per_day": 1.0,
                            "v0_max_m_per_day": 10.0,
                            "r_h_m3_per_g": 0.0,
                            "r_p_m3_per_g": 1.0,
                            "f_ns": 0.0,
                        },
                    },
                }
            ],
            components=["X_TSS"],
        )
    )

    result = assemble_rhs(system, system.initial_state_vector())
    flux = result.transport_by_edge["settle"]["total_solids_flux"]

    assert result.derivative == pytest.approx((-flux / 10.0, flux / 20.0))


def test_assemble_rhs_rejects_stream_adapter_execution_until_adapter_math_exists() -> None:
    payload = json.loads(
        (VALID_EXAMPLES / "udm_network_stream_adapter.network_process_graph.v1.json").read_text(encoding="utf-8")
    )
    system = compile_network(payload)

    with pytest.raises(UDMNetworkRHSError) as error:
        assemble_rhs(system, system.initial_state_vector())

    assert error.value.code == "UDM_RHS_STREAM_ADAPTER_NOT_IMPLEMENTED"
