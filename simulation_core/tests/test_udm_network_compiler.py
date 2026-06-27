from __future__ import annotations

import json
import sys
from copy import deepcopy
from pathlib import Path
from typing import Any

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
SIMULATION_CORE_PYTHON = REPO_ROOT / "simulation_core" / "python"
VALID_EXAMPLES = REPO_ROOT / "contracts" / "examples" / "valid"

sys.path.insert(0, str(SIMULATION_CORE_PYTHON))

from autowatersimu_simulation_core.udm_network import (  # noqa: E402
    EdgeKind,
    UDMNetworkCompileError,
    compile_network,
)


def _load_fixture(name: str) -> dict[str, Any]:
    return json.loads((VALID_EXAMPLES / name).read_text(encoding="utf-8"))


def test_compile_minimal_network_process_graph() -> None:
    system = compile_network(
        _load_fixture("udm_network_minimal.network_process_graph.v1.json")
    )

    assert system.network_graph_id == "ng_udm_network_minimal"
    assert system.state_size == 8
    assert system.state_slices["influent"].start == 0
    assert system.state_slices["controller"].size == 0
    assert system.node_by_id["reactor"].volume == 1000.0
    assert system.edge_by_id["e_influent_reactor"].edge_kind is EdgeKind.HYDRAULIC
    assert [edge.edge_id for edge in system.edge_bundles.static_edges] == [
        "e_influent_reactor",
        "e_reactor_clarifier",
    ]
    assert [edge.edge_id for edge in system.edge_bundles.dynamic_edges] == [
        "e_clarifier_sludge",
        "e_reactor_controller",
    ]
    assert system.initial_state_vector() == (
        200.0,
        120.0,
        50.0,
        80.0,
        40.0,
        100.0,
        0.0,
        0.0,
    )


def test_compile_network_simulation_input_infers_ports() -> None:
    system = compile_network(
        _load_fixture("udm_network_minimal.network_simulation_input.v1.json")
    )

    influent = system.node_by_id["influent"]
    assert influent.ports["out"].inferred
    assert influent.ports["out"].port_kind == "hydraulic_out"
    assert system.edge_by_id["e_reactor_controller"].component_names == ()


def test_compile_stream_adapter_allows_source_side_cross_schema_components() -> None:
    system = compile_network(
        _load_fixture("udm_network_stream_adapter.network_process_graph.v1.json")
    )
    edge = system.edge_by_id["e_reactor_clarifier"]

    assert edge.component_names == ("S_I", "X_I")
    assert edge.stream_adapter == {
        "adapter_id": "asm1_13_to_bsm1_clarifier_8.v1",
        "source_schema_id": "asm1_13.v1",
        "target_schema_id": "bsm1_clarifier_reference_8.v1",
        "component_mappings": {"S_I": "S_I", "X_I": "X_TSS"},
    }


def test_compile_rejects_stream_adapter_schema_mismatch() -> None:
    payload = deepcopy(_load_fixture("udm_network_stream_adapter.network_process_graph.v1.json"))
    payload["edges"][0]["stream_adapter"]["target_schema_id"] = "asm1_13.v1"

    with pytest.raises(UDMNetworkCompileError) as error:
        compile_network(payload)

    assert error.value.code == "NETWORK_STREAM_ADAPTER_SCHEMA_MISMATCH"


def test_compile_rejects_invalid_port() -> None:
    payload = _load_fixture("udm_network_minimal.network_process_graph.v1.json")
    payload["edges"][0]["target_port"] = "missing"

    with pytest.raises(UDMNetworkCompileError) as error:
        compile_network(payload)

    assert error.value.code == "NETWORK_UNKNOWN_PORT"


def test_compile_rejects_unknown_edge_kind() -> None:
    payload = deepcopy(_load_fixture("udm_network_minimal.network_process_graph.v1.json"))
    payload["edges"][0]["edge_kind"] = "split"

    with pytest.raises(UDMNetworkCompileError) as error:
        compile_network(payload)

    assert error.value.code == "NETWORK_UNKNOWN_EDGE_KIND"
