from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
SIMULATION_CORE_PYTHON = REPO_ROOT / "simulation_core" / "python"

sys.path.insert(0, str(SIMULATION_CORE_PYTHON))

from autowatersimu_simulation_core.udm_network import (  # noqa: E402
    REFERENCE_COMPONENTS,
    SecondaryClarifierReferenceConfig,
    build_node_reaction_model,
    build_secondary_clarifier_reference_graph,
    compile_network,
    evaluate_reaction,
    solve_flow_balance,
)


def _compiled_reference(config: SecondaryClarifierReferenceConfig | None = None):
    return compile_network(build_secondary_clarifier_reference_graph(config))


def test_secondary_clarifier_reference_profile_has_80_state_registry() -> None:
    system = _compiled_reference()
    layer_ids = [node.node_id for node in system.nodes if node.node_type == "secondary_clarifier_layer"]

    assert len(layer_ids) == 10
    assert system.state_size == 80
    assert all(system.state_slices[layer_id].size == 8 for layer_id in layer_ids)
    assert all(system.node_by_id[layer_id].volume == pytest.approx(600.0) for layer_id in layer_ids)
    assert system.state_slices["clarifier_1_influent"].size == 0
    assert system.component_schemas["bsm1_clarifier_reference_8.v1"].components == REFERENCE_COMPONENTS


def test_secondary_clarifier_reference_profile_marks_feed_layer() -> None:
    graph = build_secondary_clarifier_reference_graph(
        SecondaryClarifierReferenceConfig(composite_id="sc", feed_layer=5)
    )
    feed_node = next(node for node in graph["nodes"] if node["node_id"] == "sc_layer_05")

    assert feed_node["unit_metadata"]["feed_layer"] == 5
    assert {"port_id": "influent", "port_kind": "hydraulic_in"} in feed_node["ports"]
    assert graph["composites"][0]["geometry"]["feed_layer"] == 5


def test_secondary_clarifier_reference_flow_balance_solves_outputs() -> None:
    config = SecondaryClarifierReferenceConfig(q_in=100.0, q_ras=25.0, q_was=5.0)
    system = _compiled_reference(config)

    flows = solve_flow_balance(system).resolved_flow_by_edge

    assert flows["clarifier_1_influent_feed"] == pytest.approx(100.0)
    assert flows["clarifier_1_hyd_up_05_04"] == pytest.approx(70.0)
    assert flows["clarifier_1_top_effluent"] == pytest.approx(70.0)
    assert flows["clarifier_1_hyd_down_05_06"] == pytest.approx(30.0)
    assert flows["clarifier_1_bottom_ras"] == pytest.approx(25.0)
    assert flows["clarifier_1_bottom_was"] == pytest.approx(5.0)


def test_secondary_clarifier_reference_has_top_and_bottom_boundary_outputs() -> None:
    graph = build_secondary_clarifier_reference_graph()
    edge_ids = {edge["edge_id"]: edge for edge in graph["edges"]}

    assert edge_ids["clarifier_1_top_effluent"]["source_node_id"] == "clarifier_1_layer_01"
    assert edge_ids["clarifier_1_bottom_ras"]["source_node_id"] == "clarifier_1_layer_10"
    assert edge_ids["clarifier_1_bottom_was"]["source_node_id"] == "clarifier_1_layer_10"


def test_secondary_clarifier_reference_hydraulic_edges_declare_flow_units() -> None:
    graph = build_secondary_clarifier_reference_graph()
    hydraulic_edges = [edge for edge in graph["edges"] if edge["edge_kind"] == "hydraulic"]

    assert hydraulic_edges
    assert all(edge["flow_spec"]["unit"] == "m3/d" for edge in hydraulic_edges)


def test_secondary_clarifier_reference_profile_has_no_reaction_contribution() -> None:
    system = _compiled_reference()
    layer = system.node_by_id["clarifier_1_layer_05"]
    model = build_node_reaction_model(layer)
    state = {component: 1.0 for component in REFERENCE_COMPONENTS}

    assert model.reaction_enabled is False
    assert evaluate_reaction(model, t=0.0, local_state=state) == {
        component: 0.0 for component in REFERENCE_COMPONENTS
    }


def test_secondary_clarifier_reference_profile_rejects_negative_effluent() -> None:
    with pytest.raises(ValueError, match="q_in"):
        build_secondary_clarifier_reference_graph(
            SecondaryClarifierReferenceConfig(q_in=10.0, q_ras=9.0, q_was=2.0)
        )


def test_bsm1_reference_oracle_manifest_is_provenance_only() -> None:
    manifest_path = (
        SIMULATION_CORE_PYTHON
        / "autowatersimu_simulation_core"
        / "udm_network"
        / "composites"
        / "bsm1_reference_oracle_manifest.v1.json"
    )
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))

    assert manifest["status"] == "provenance_only"
    assert manifest["conformance_status"] == "not_claimed"
    assert manifest["oracle_artifacts"] == []
    assert manifest["constraints"]["may_be_used_as_conformance_evidence"] is False
    assert manifest["source_provenance"][0]["required_for_p8"] is True
