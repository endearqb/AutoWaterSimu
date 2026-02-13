import pytest

from app.services.data_conversion_service import DataConversionService
from app.services.hybrid_udm_validation import build_hybrid_runtime_info


def _build_model_snapshot(
    model_id: str,
    version: int,
    components: list[str],
    rate_expr: str,
) -> dict:
    return {
        "model_id": model_id,
        "version": version,
        "name": model_id,
        "hash": f"hash-{model_id}-{version}",
        "components": [
            {
                "name": comp,
                "label": comp,
                "default_value": 0.0,
                "unit": "mg/L",
            }
            for comp in components
        ],
        "parameters": [],
        "processes": [
            {
                "name": f"p_{model_id}",
                "rate_expr": rate_expr,
                "stoich": {comp: 1.0 for comp in components},
            }
        ],
        "meta": {},
    }


def _build_flowchart_data(include_pair_mapping: bool = True, use_local_exempt: bool = False) -> dict:
    model_a = _build_model_snapshot("model_a", 1, ["A1", "A2"], "A1 + A2")
    model_b = _build_model_snapshot("model_b", 1, ["B1", "B2"], "B1 + B2")

    variable_map = [
        {
            "source_var": "A1",
            "target_var": "B1",
            "enabled": True,
        }
    ]
    if use_local_exempt:
        variable_map.append(
            {
                "source_var": None,
                "target_var": "B2",
                "enabled": True,
                "local_exempt": True,
            }
        )
    else:
        variable_map.append(
            {
                "source_var": "A2",
                "target_var": "B2",
                "enabled": True,
            }
        )

    model_pair_mappings = {}
    if include_pair_mapping:
        model_pair_mappings = {
            "model_a@1->model_b@1": {
                "source_model_id": "model_a",
                "source_version": 1,
                "target_model_id": "model_b",
                "target_version": 1,
                "variable_map": variable_map,
            }
        }

    return {
        "nodes": [
            {
                "id": "node_in",
                "type": "input",
                "data": {
                    "label": "Influent",
                    "volume": "1.0",
                    "A1": "10",
                    "A2": "5",
                    "B1": "0",
                    "B2": "0",
                },
            },
            {
                "id": "node_a",
                "type": "udm",
                "data": {
                    "label": "A reactor",
                    "volume": "1.0",
                    "A1": "10",
                    "A2": "5",
                    "udmModelId": "model_a",
                    "udmModelVersion": 1,
                    "udmModelSnapshot": {
                        "id": "model_a",
                        "version": 1,
                        "hash": model_a["hash"],
                        "components": model_a["components"],
                        "parameters": model_a["parameters"],
                        "processes": model_a["processes"],
                    },
                },
            },
            {
                "id": "node_b",
                "type": "udm",
                "data": {
                    "label": "B reactor",
                    "volume": "1.0",
                    "B1": "0",
                    "B2": "0",
                    "udmModelId": "model_b",
                    "udmModelVersion": 1,
                    "udmModelSnapshot": {
                        "id": "model_b",
                        "version": 1,
                        "hash": model_b["hash"],
                        "components": model_b["components"],
                        "parameters": model_b["parameters"],
                        "processes": model_b["processes"],
                    },
                },
            },
            {
                "id": "node_out",
                "type": "output",
                "data": {
                    "label": "Effluent",
                    "volume": "1.0",
                    "A1": "0",
                    "A2": "0",
                    "B1": "0",
                    "B2": "0",
                },
            },
        ],
        "edges": [
            {
                "id": "edge_in_a",
                "source": "node_in",
                "target": "node_a",
                "data": {
                    "flow": 100.0,
                    "A1_a": 1.0,
                    "A1_b": 0.0,
                    "A2_a": 1.0,
                    "A2_b": 0.0,
                    "B1_a": 1.0,
                    "B1_b": 0.0,
                    "B2_a": 1.0,
                    "B2_b": 0.0,
                },
            },
            {
                "id": "edge_ab",
                "source": "node_a",
                "target": "node_b",
                "data": {
                    "flow": 100.0,
                    "A1_a": 1.0,
                    "A1_b": 0.0,
                    "A2_a": 1.0,
                    "A2_b": 0.0,
                    "B1_a": 1.0,
                    "B1_b": 0.0,
                    "B2_a": 1.0,
                    "B2_b": 0.0,
                },
            },
            {
                "id": "edge_b_out",
                "source": "node_b",
                "target": "node_out",
                "data": {
                    "flow": 100.0,
                    "A1_a": 1.0,
                    "A1_b": 0.0,
                    "A2_a": 1.0,
                    "A2_b": 0.0,
                    "B1_a": 1.0,
                    "B1_b": 0.0,
                    "B2_a": 1.0,
                    "B2_b": 0.0,
                },
            },
        ],
        "customParameters": [
            {"name": "A1", "label": "A1", "defaultValue": 0},
            {"name": "A2", "label": "A2", "defaultValue": 0},
            {"name": "B1", "label": "B1", "defaultValue": 0},
            {"name": "B2", "label": "B2", "defaultValue": 0},
        ],
        "calculationParameters": {
            "hours": 1,
            "steps_per_hour": 1,
            "solver_method": "rk4",
        },
        "hybrid_config": {
            "mode": "udm_only",
            "selected_models": [model_a, model_b],
            "model_pair_mappings": model_pair_mappings,
        },
    }


def test_hybrid_runtime_builds_node_bindings_for_mapped_pair() -> None:
    flowchart_data = _build_flowchart_data(include_pair_mapping=True)
    runtime = build_hybrid_runtime_info(flowchart_data, strict=True)

    assert runtime.is_hybrid
    assert runtime.errors == []
    bindings = runtime.node_variable_bindings.get("node_b") or []
    binding_map = {item["local_var"]: item["canonical_var"] for item in bindings}
    assert binding_map["B1"] == "A1"
    assert binding_map["B2"] == "A2"


def test_hybrid_runtime_requires_pair_mapping_for_connected_models() -> None:
    flowchart_data = _build_flowchart_data(include_pair_mapping=False)
    runtime = build_hybrid_runtime_info(flowchart_data, strict=False)

    assert not runtime.errors == []
    assert any("Missing model_pair_mapping" in err for err in runtime.errors)


def test_hybrid_runtime_accepts_local_exempt_mapping_for_focal_var() -> None:
    flowchart_data = _build_flowchart_data(
        include_pair_mapping=True,
        use_local_exempt=True,
    )
    runtime = build_hybrid_runtime_info(flowchart_data, strict=True)

    assert runtime.errors == []
    bindings = runtime.node_variable_bindings.get("node_b") or []
    binding_map = {item["local_var"]: item["canonical_var"] for item in bindings}
    assert binding_map["B1"] == "A1"
    assert binding_map["B2"] == "B2"


def test_data_conversion_injects_hybrid_node_variable_bindings() -> None:
    flowchart_data = _build_flowchart_data(include_pair_mapping=True)
    runtime = build_hybrid_runtime_info(flowchart_data, strict=True)

    converter = DataConversionService()
    converted = converter.convert_flowchart_to_material_balance_input(
        flowchart_data,
        hybrid_runtime=runtime,
    )

    node_b = next(node for node in converted.nodes if node.node_id == "node_b")
    assert node_b.udm_variable_bindings is not None
    binding_map = {
        item["local_var"]: item["canonical_var"] for item in node_b.udm_variable_bindings
    }
    assert binding_map["B1"] == "A1"
    assert binding_map["B2"] == "A2"
