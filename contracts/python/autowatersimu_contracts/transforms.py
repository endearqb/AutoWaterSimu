from __future__ import annotations

from copy import deepcopy
from typing import Any

from .errors import ContractTransformError

SUPPORTED_JOB_TYPE = "simulation.material_balance.v1"
DEFAULT_COMPONENT = "COD"
DEFAULT_FLOW_RATE = 1000.0
DEFAULT_PARAMETERS = {
    "hours": 4.0,
    "steps_per_hour": 60,
    "solver_method": "scipy_solver",
    "tolerance": 0.000001,
    "max_iterations": 1000,
    "max_memory_mb": 1000,
}


def legacy_flow_export_to_canvas_graph(
    flow_export: dict[str, Any],
    *,
    graph_id: str = "legacy_flow_export",
    name: str = "Legacy Flow Export",
) -> dict[str, Any]:
    """Wrap a legacy React Flow export in the canonical CanvasGraph envelope."""

    return {
        "schema_version": "canvas_graph.v1",
        "graph_id": _string_value(flow_export.get("graph_id")) or graph_id,
        "name": _string_value(flow_export.get("name")) or name,
        "nodes": deepcopy(_as_list(flow_export.get("nodes"))),
        "edges": deepcopy(_as_list(flow_export.get("edges"))),
        "exported_at": (
            _string_value(flow_export.get("exported_at"))
            or _string_value(flow_export.get("exportedAt"))
            or "1970-01-01T00:00:00Z"
        ),
        "metadata": {
            "source_format": "legacy_flow_export",
            "version": flow_export.get("version"),
            "customParameters": deepcopy(_as_list(flow_export.get("customParameters"))),
            "calculationParameters": deepcopy(_as_dict(flow_export.get("calculationParameters"))),
            "timeSegments": deepcopy(_as_list(flow_export.get("timeSegments", flow_export.get("time_segments")))),
            "component_schema": deepcopy(_as_dict(flow_export.get("component_schema"))),
        },
    }


def canvas_graph_to_process_graph(canvas_graph: dict[str, Any]) -> dict[str, Any]:
    _require_schema(canvas_graph, "canvas_graph.v1", "$")
    nodes = _as_list(canvas_graph.get("nodes"))
    edges = _as_list(canvas_graph.get("edges"))
    components = _resolve_components(canvas_graph)
    time_segments = _legacy_time_segments(canvas_graph)
    errors: list[dict[str, Any]] = []
    warnings: list[str] = []

    if len(nodes) < 2:
        errors.append(_detail("$.nodes", "at least two nodes are required", None))
    if not edges:
        errors.append(_detail("$.edges", "at least one edge is required", None))

    node_ids: set[str] = set()
    for index, node in enumerate(nodes):
        node_id = _string_value(node.get("id"))
        if not node_id:
            errors.append(_detail(f"$.nodes[{index}].id", "node id is required", None))
            continue
        if node_id in node_ids:
            errors.append(_detail(f"$.nodes[{index}].id", "duplicate node id", node_id))
        node_ids.add(node_id)

    for index, edge in enumerate(edges):
        edge_id = _string_value(edge.get("id")) or f"edge_{index}"
        source = _string_value(edge.get("source"))
        target = _string_value(edge.get("target"))
        if source not in node_ids:
            errors.append(_detail(f"$.edges[{index}].source", "edge references unknown source node", edge_id))
        if target not in node_ids:
            errors.append(_detail(f"$.edges[{index}].target", "edge references unknown target node", edge_id))

    if errors:
        raise ContractTransformError("CanvasGraph validation failed", errors)

    process_nodes = [
        _canvas_node_to_process_node(node, components, warnings)
        for node in nodes
    ]
    process_edges = [
        _canvas_edge_to_process_edge(edge, components, warnings, time_segments)
        for edge in edges
    ]

    process_graph = {
        "schema_version": "process_graph.v1",
        "process_graph_id": f"pg_{canvas_graph['graph_id']}",
        "version": 1,
        "source_canvas_graph_id": canvas_graph["graph_id"],
        "component_schema": {
            "component_schema_id": "material_balance_components.v1",
            "components": components,
            "unit": _component_unit(canvas_graph),
        },
        "nodes": process_nodes,
        "edges": process_edges,
        "validation": {"status": "valid", "errors": [], "warnings": warnings},
        "metadata": {
            "source_name": canvas_graph.get("name", ""),
            "source_exported_at": canvas_graph.get("exported_at"),
            "source_calculation_parameters": _legacy_calculation_parameters(canvas_graph),
        },
    }

    is_valid, validation_errors = validate_process_graph(process_graph)
    if not is_valid:
        raise ContractTransformError("ProcessGraph validation failed", validation_errors)
    return process_graph


def validate_process_graph(process_graph: dict[str, Any]) -> tuple[bool, list[dict[str, Any]]]:
    errors: list[dict[str, Any]] = []
    if process_graph.get("schema_version") != "process_graph.v1":
        errors.append(_detail("$.schema_version", "schema_version must be process_graph.v1", None))

    component_schema = process_graph.get("component_schema")
    if not isinstance(component_schema, dict):
        errors.append(_detail("$.component_schema", "component_schema is required", None))
        components: list[str] = []
    else:
        components = [
            _string_value(component)
            for component in _as_list(component_schema.get("components"))
            if _string_value(component)
        ]
        if not components:
            errors.append(_detail("$.component_schema.components", "at least one component is required", None))
        if len(components) != len(set(components)):
            errors.append(_detail("$.component_schema.components", "component names must be unique", None))

    nodes = _as_list(process_graph.get("nodes"))
    if len(nodes) < 2:
        errors.append(_detail("$.nodes", "at least two nodes are required", None))

    node_ids: set[str] = set()
    for index, node in enumerate(nodes):
        node_id = _string_value(node.get("node_id"))
        if not node_id:
            errors.append(_detail(f"$.nodes[{index}].node_id", "node_id is required", None))
            continue
        if node_id in node_ids:
            errors.append(_detail(f"$.nodes[{index}].node_id", "duplicate node id", node_id))
        node_ids.add(node_id)

        if "initial_conditions" not in node:
            errors.append(_detail(f"$.nodes[{index}].initial_conditions", "initial_conditions is required", node_id))

    edges = _as_list(process_graph.get("edges"))
    if not edges:
        errors.append(_detail("$.edges", "at least one edge is required", None))

    edge_ids: set[str] = set()
    for index, edge in enumerate(edges):
        edge_id = _string_value(edge.get("edge_id"))
        if not edge_id:
            errors.append(_detail(f"$.edges[{index}].edge_id", "edge_id is required", None))
            continue
        if edge_id in edge_ids:
            errors.append(_detail(f"$.edges[{index}].edge_id", "duplicate edge id", edge_id))
        edge_ids.add(edge_id)

        if edge.get("source_node_id") not in node_ids:
            errors.append(_detail(f"$.edges[{index}].source_node_id", "edge references unknown source node", edge_id))
        if edge.get("target_node_id") not in node_ids:
            errors.append(_detail(f"$.edges[{index}].target_node_id", "edge references unknown target node", edge_id))

        transform = edge.get("concentration_transform")
        if not isinstance(transform, dict):
            errors.append(_detail(f"$.edges[{index}].concentration_transform", "concentration_transform is required", edge_id))
            continue
        for component in components:
            factor = transform.get(component)
            if not isinstance(factor, dict) or "a" not in factor or "b" not in factor:
                errors.append(_detail(
                    f"$.edges[{index}].concentration_transform.{component}",
                    "component transform must include a and b",
                    edge_id,
                ))

    return len(errors) == 0, errors


def process_graph_to_simulation_input(
    process_graph: dict[str, Any],
    parameters: dict[str, Any] | None = None,
    *,
    simulation_input_id: str | None = None,
    job_type: str = SUPPORTED_JOB_TYPE,
) -> dict[str, Any]:
    if job_type != SUPPORTED_JOB_TYPE:
        raise ContractTransformError(
            "Unsupported job type",
            [_detail("$.job_type", f"supported job_type is {SUPPORTED_JOB_TYPE}", job_type)],
        )

    is_valid, errors = validate_process_graph(process_graph)
    if not is_valid:
        raise ContractTransformError("ProcessGraph validation failed", errors)

    metadata = process_graph.get("metadata") if isinstance(process_graph.get("metadata"), dict) else {}
    source_parameters = _as_dict(metadata.get("source_calculation_parameters"))
    resolved_parameters = {**DEFAULT_PARAMETERS, **source_parameters, **(parameters or {})}
    process_graph_id = process_graph["process_graph_id"]
    return {
        "schema_version": "simulation_input.v1",
        "simulation_input_id": simulation_input_id or f"si_{process_graph_id}",
        "process_graph_id": process_graph_id,
        "process_graph_version": process_graph["version"],
        "job_type": job_type,
        "component_schema": deepcopy(process_graph["component_schema"]),
        "nodes": [_process_node_to_simulation_node(node) for node in process_graph["nodes"]],
        "edges": [_process_edge_to_simulation_edge(edge) for edge in process_graph["edges"]],
        "time_segments": _collect_time_segments(process_graph),
        "parameters": resolved_parameters,
        "runtime_options": {
            "numerical_tolerance": {"rtol": 0.000001, "atol": 0.000000001},
        },
        "metadata": {
            "source_canvas_graph_id": process_graph["source_canvas_graph_id"],
            "transform": "process_graph_to_simulation_input.v1",
        },
    }


def _canvas_node_to_process_node(
    node: dict[str, Any],
    components: list[str],
    warnings: list[str],
) -> dict[str, Any]:
    node_id = _string_value(node["id"])
    node_type = _string_value(node.get("type")) or "default"
    data = node.get("data") if isinstance(node.get("data"), dict) else {}
    is_input = node_type in {"input", "inlet"}
    is_output = node_type in {"output", "outlet"}
    process_unit_type = "influent" if is_input else "effluent" if is_output else "storage"
    volume = _node_volume(node_id, node_type, data)
    initial_conditions = {}

    for component in components:
        raw = data.get(component)
        if raw in (None, ""):
            warnings.append(f"Node {node_id} missing {component}; defaulted to 0.0")
        initial_conditions[component] = _number(raw, default=0.0, path=f"node {node_id}.{component}")

    return {
        "node_id": node_id,
        "node_type": node_type,
        "process_unit_type": process_unit_type,
        "ports": _ports_for_node(is_input, is_output),
        "volume": volume,
        "initial_conditions": initial_conditions,
        "model_binding": {"model_key": "material_balance", "model_version": "v1"},
        "parameter_binding": {},
        "unit_metadata": {
            "volume": "m3",
            "concentration": "mg/L",
            "position": node.get("position", {}),
            "label": data.get("label", node_id),
        },
    }


def _canvas_edge_to_process_edge(
    edge: dict[str, Any],
    components: list[str],
    warnings: list[str],
    time_segments: list[Any],
) -> dict[str, Any]:
    edge_id = _string_value(edge.get("id"))
    data = edge.get("data") if isinstance(edge.get("data"), dict) else {}
    raw_flow = data.get("flow_rate", data.get("flow"))
    if raw_flow in (None, ""):
        warnings.append(f"Edge {edge_id} missing flow; defaulted to {DEFAULT_FLOW_RATE}")
    transform = data.get("concentration_transform")
    concentration_transform: dict[str, dict[str, float]] = {}

    for component in components:
        if isinstance(transform, dict) and isinstance(transform.get(component), dict):
            factor = transform[component]
            raw_a = factor.get("a")
            raw_b = factor.get("b")
        else:
            raw_a = data.get(f"{component}_a")
            raw_b = data.get(f"{component}_b")
        concentration_transform[component] = {
            "a": _number(raw_a, default=1.0, path=f"edge {edge_id}.{component}.a"),
            "b": _number(raw_b, default=0.0, path=f"edge {edge_id}.{component}.b"),
        }

    return {
        "edge_id": edge_id,
        "source_node_id": edge["source"],
        "target_node_id": edge["target"],
        "source_port": _string_value(edge.get("sourceHandle")) or "out",
        "target_port": _string_value(edge.get("targetHandle")) or "in",
        "flow_rate": _number(raw_flow, default=DEFAULT_FLOW_RATE, path=f"edge {edge_id}.flow_rate"),
        "concentration_transform": concentration_transform,
        "time_segment_overrides": _time_segment_overrides_for_edge(edge_id, time_segments),
    }


def _process_node_to_simulation_node(node: dict[str, Any]) -> dict[str, Any]:
    node_type = _string_value(node.get("node_type"))
    return {
        "node_id": node["node_id"],
        "node_type": node_type,
        "initial_volume": node.get("volume"),
        "initial_concentrations": deepcopy(node.get("initial_conditions", {})),
        "is_inlet": node_type in {"input", "inlet"},
        "is_outlet": node_type in {"output", "outlet"},
    }


def _process_edge_to_simulation_edge(edge: dict[str, Any]) -> dict[str, Any]:
    return {
        "edge_id": edge["edge_id"],
        "source_node_id": edge["source_node_id"],
        "target_node_id": edge["target_node_id"],
        "flow_rate": edge["flow_rate"],
        "concentration_transform": deepcopy(edge["concentration_transform"]),
    }


def _resolve_components(canvas_graph: dict[str, Any]) -> list[str]:
    component_schema = _component_schema(canvas_graph)
    schema_components = _as_list(component_schema.get("components"))
    if schema_components:
        return [_string_value(item) for item in schema_components if _string_value(item)]

    custom_parameters = _legacy_custom_parameters(canvas_graph)
    components = [
        _string_value(item.get("name"))
        for item in custom_parameters
        if isinstance(item, dict) and _string_value(item.get("name"))
    ]
    return components or [DEFAULT_COMPONENT]


def _component_unit(canvas_graph: dict[str, Any]) -> str:
    component_schema = _component_schema(canvas_graph)
    return _string_value(component_schema.get("unit")) or "mg/L"


def _component_schema(canvas_graph: dict[str, Any]) -> dict[str, Any]:
    top_level = _as_dict(canvas_graph.get("component_schema"))
    if top_level:
        return top_level
    metadata = canvas_graph.get("metadata") if isinstance(canvas_graph.get("metadata"), dict) else {}
    return _as_dict(metadata.get("component_schema"))


def _legacy_custom_parameters(canvas_graph: dict[str, Any]) -> list[Any]:
    top_level = _as_list(canvas_graph.get("customParameters"))
    if top_level:
        return top_level
    metadata = _as_dict(canvas_graph.get("metadata"))
    return _as_list(metadata.get("customParameters"))


def _legacy_calculation_parameters(canvas_graph: dict[str, Any]) -> dict[str, Any]:
    top_level = _as_dict(canvas_graph.get("calculationParameters"))
    if top_level:
        return top_level
    metadata = _as_dict(canvas_graph.get("metadata"))
    return _as_dict(metadata.get("calculationParameters"))


def _legacy_time_segments(canvas_graph: dict[str, Any]) -> list[Any]:
    top_level = _as_list(canvas_graph.get("timeSegments", canvas_graph.get("time_segments")))
    if top_level:
        return top_level
    metadata = _as_dict(canvas_graph.get("metadata"))
    return _as_list(metadata.get("timeSegments", metadata.get("time_segments")))


def _time_segment_overrides_for_edge(edge_id: str, time_segments: list[Any]) -> list[dict[str, Any]]:
    overrides: list[dict[str, Any]] = []
    for index, raw_segment in enumerate(time_segments):
        if not isinstance(raw_segment, dict):
            continue
        segment_edge_overrides = _as_dict(raw_segment.get("edgeOverrides", raw_segment.get("edge_overrides")))
        raw_override = segment_edge_overrides.get(edge_id)
        if not isinstance(raw_override, dict):
            continue
        segment_id = _string_value(raw_segment.get("id")) or f"seg_{index + 1}"
        start_hour = _number(
            raw_segment.get("startHour", raw_segment.get("start_hour")),
            default=0.0,
            path=f"time segment {segment_id}.start_hour",
        )
        end_hour = _number(
            raw_segment.get("endHour", raw_segment.get("end_hour")),
            default=0.0,
            path=f"time segment {segment_id}.end_hour",
        )
        overrides.append(
            {
                "segment_id": segment_id,
                "start_hour": start_hour,
                "end_hour": end_hour,
                "flow": raw_override.get("flow"),
                "factors": deepcopy(_as_dict(raw_override.get("factors"))),
            }
        )
    return overrides


def _collect_time_segments(process_graph: dict[str, Any]) -> list[dict[str, Any]]:
    segments: dict[str, dict[str, Any]] = {}
    for edge in _as_list(process_graph.get("edges")):
        edge_id = _string_value(edge.get("edge_id"))
        if not edge_id:
            continue
        for index, raw_override in enumerate(_as_list(edge.get("time_segment_overrides"))):
            if not isinstance(raw_override, dict):
                continue
            segment_id = _string_value(raw_override.get("segment_id", raw_override.get("id"))) or f"seg_{index + 1}"
            segment = segments.setdefault(
                segment_id,
                {
                    "id": segment_id,
                    "start_hour": _number(
                        raw_override.get("start_hour", raw_override.get("startHour")),
                        default=0.0,
                        path=f"time segment {segment_id}.start_hour",
                    ),
                    "end_hour": _number(
                        raw_override.get("end_hour", raw_override.get("endHour")),
                        default=0.0,
                        path=f"time segment {segment_id}.end_hour",
                    ),
                    "edge_overrides": {},
                },
            )
            override: dict[str, Any] = {"factors": deepcopy(_as_dict(raw_override.get("factors")))}
            if raw_override.get("flow") is not None:
                override["flow"] = _number(
                    raw_override.get("flow"),
                    default=0.0,
                    path=f"time segment {segment_id}.{edge_id}.flow",
                )
            segment["edge_overrides"][edge_id] = override

    return sorted(
        segments.values(),
        key=lambda item: (item["start_hour"], item["end_hour"], item["id"]),
    )


def _node_volume(node_id: str, node_type: str, data: dict[str, Any]) -> float:
    raw_volume = data.get("volume")
    if raw_volume in (None, "") and node_type in {"input", "inlet", "output", "outlet"}:
        return 1.0
    if raw_volume in (None, ""):
        raise ContractTransformError(
            "CanvasGraph validation failed",
            [_detail(f"$.nodes[{node_id}].data.volume", "reactor volume is required", node_id)],
        )
    return _number(raw_volume, default=1.0, path=f"node {node_id}.volume")


def _ports_for_node(is_input: bool, is_output: bool) -> list[dict[str, str]]:
    if is_input:
        return [{"port_id": "out", "direction": "out"}]
    if is_output:
        return [{"port_id": "in", "direction": "in"}]
    return [{"port_id": "in", "direction": "in"}, {"port_id": "out", "direction": "out"}]


def _require_schema(payload: dict[str, Any], schema_version: str, path: str) -> None:
    if payload.get("schema_version") != schema_version:
        raise ContractTransformError(
            "Schema version mismatch",
            [_detail(f"{path}.schema_version", f"schema_version must be {schema_version}", None)],
        )


def _number(value: Any, *, default: float, path: str) -> float:
    if value in (None, ""):
        return default
    try:
        return float(value)
    except (TypeError, ValueError) as exc:
        raise ContractTransformError(
            "Numeric conversion failed",
            [_detail(path, "value must be numeric", None)],
        ) from exc


def _string_value(value: Any) -> str:
    return str(value).strip() if value is not None else ""


def _as_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def _as_dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _detail(path: str, reason: str, source_id: Any) -> dict[str, Any]:
    return {"path": path, "reason": reason, "source_id": source_id}
