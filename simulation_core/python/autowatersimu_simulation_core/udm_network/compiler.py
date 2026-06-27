from __future__ import annotations

from typing import Any, Mapping

from .graph import (
    ComponentSchema,
    EdgeKind,
    Port,
    RuntimeEdge,
    RuntimeNode,
    UDMNetworkCompileError,
)
from .results import CompiledNetworkSystem, EdgeBundles, StateSlice

SUPPORTED_SCHEMA_VERSIONS = {
    "network_process_graph.v1",
    "network_simulation_input.v1",
}

PORT_KINDS_BY_EDGE_KIND = {
    EdgeKind.HYDRAULIC: ("hydraulic_out", "hydraulic_in"),
    EdgeKind.PUMP: ("hydraulic_out", "hydraulic_in"),
    EdgeKind.SETTLING: ("settling_out", "settling_in"),
    EdgeKind.SIGNAL: ("signal_out", "signal_in"),
}


def compile_network(document: Mapping[str, Any]) -> CompiledNetworkSystem:
    schema_version = str(document.get("schema_version", "")).strip()
    if schema_version not in SUPPORTED_SCHEMA_VERSIONS:
        raise UDMNetworkCompileError(
            "NETWORK_SCHEMA_UNSUPPORTED",
            f"unsupported network schema_version: {schema_version}",
        )

    component_schemas = _component_schemas(document.get("component_schemas", []))
    nodes = _nodes(document.get("nodes", []), component_schemas)
    edges = _edges(document.get("edges", []), nodes, component_schemas)

    state_slices = _state_slices(nodes)
    static_edges = tuple(edge for edge in edges if edge.is_static)
    dynamic_edges = tuple(edge for edge in edges if not edge.is_static)

    return CompiledNetworkSystem(
        schema_version=schema_version,
        network_graph_id=str(document.get("network_graph_id") or document.get("simulation_input_id") or ""),
        version=int(document.get("version") or document.get("network_graph_version") or 1),
        component_schemas=component_schemas,
        nodes=tuple(nodes.values()),
        edges=edges,
        state_slices=state_slices,
        edge_bundles=EdgeBundles(static_edges=static_edges, dynamic_edges=dynamic_edges),
        flow_constraints=tuple(dict(item) for item in document.get("flow_constraints", [])),
        signal_bindings=tuple(dict(item) for item in document.get("signal_bindings", [])),
    )


def _component_schemas(raw_schemas: Any) -> dict[str, ComponentSchema]:
    schemas: dict[str, ComponentSchema] = {}
    for raw_schema in raw_schemas or []:
        schema_id = str(raw_schema.get("component_schema_id", "")).strip()
        if not schema_id:
            raise UDMNetworkCompileError("NETWORK_COMPONENT_SCHEMA_ID_REQUIRED", "component_schema_id is required")
        if schema_id in schemas:
            raise UDMNetworkCompileError("NETWORK_DUPLICATE_COMPONENT_SCHEMA", f"duplicate component schema: {schema_id}")
        components = tuple(str(component).strip() for component in raw_schema.get("components", []) if str(component).strip())
        if not components:
            raise UDMNetworkCompileError("NETWORK_COMPONENT_SCHEMA_EMPTY", f"component schema is empty: {schema_id}")
        schemas[schema_id] = ComponentSchema(
            component_schema_id=schema_id,
            components=components,
            unit=str(raw_schema.get("unit", "")),
        )
    return schemas


def _nodes(raw_nodes: Any, component_schemas: dict[str, ComponentSchema]) -> dict[str, RuntimeNode]:
    nodes: dict[str, RuntimeNode] = {}
    for raw_node in raw_nodes or []:
        node_id = str(raw_node.get("node_id", "")).strip()
        if not node_id:
            raise UDMNetworkCompileError("NETWORK_NODE_ID_REQUIRED", "node_id is required")
        if node_id in nodes:
            raise UDMNetworkCompileError("NETWORK_DUPLICATE_NODE", f"duplicate node: {node_id}")

        schema_id = str(raw_node.get("component_schema_id", "")).strip()
        schema = component_schemas.get(schema_id)
        if schema is None:
            raise UDMNetworkCompileError("NETWORK_UNKNOWN_COMPONENT_SCHEMA", f"unknown component schema: {schema_id}")

        initial_conditions = _float_map(raw_node.get("initial_conditions", {}), f"node {node_id} initial_conditions")
        unknown_initial = set(initial_conditions) - set(schema.components)
        if unknown_initial:
            missing = ", ".join(sorted(unknown_initial))
            raise UDMNetworkCompileError("NETWORK_UNKNOWN_COMPONENT", f"node {node_id} initial_conditions unknown components: {missing}")

        model_binding = dict(raw_node.get("model_binding") or {})
        raw_ports = raw_node.get("ports", [])
        component_names = _node_components(raw_node, model_binding, schema, initial_conditions)
        nodes[node_id] = RuntimeNode(
            node_id=node_id,
            node_type=str(raw_node.get("node_type", "")),
            process_unit_type=str(raw_node.get("process_unit_type", "")),
            component_schema_id=schema_id,
            component_names=component_names,
            initial_conditions=initial_conditions,
            model_binding=model_binding,
            parameter_binding=dict(raw_node.get("parameter_binding") or {}),
            ports=_ports(raw_ports),
            explicit_ports=bool(raw_ports),
        )
    return nodes


def _node_components(
    raw_node: Mapping[str, Any],
    model_binding: Mapping[str, Any],
    schema: ComponentSchema,
    initial_conditions: Mapping[str, float],
) -> tuple[str, ...]:
    if _is_controller(raw_node, model_binding):
        return tuple(component for component in schema.components if component in initial_conditions)
    return schema.components


def _is_controller(raw_node: Mapping[str, Any], model_binding: Mapping[str, Any]) -> bool:
    values = {
        str(raw_node.get("node_type", "")),
        str(raw_node.get("process_unit_type", "")),
        str(model_binding.get("model_kind", "")),
    }
    return bool({"controller", "signal_controller"} & values)


def _ports(raw_ports: Any) -> dict[str, Port]:
    ports: dict[str, Port] = {}
    for raw_port in raw_ports or []:
        port_id = str(raw_port.get("port_id", "")).strip()
        port_kind = str(raw_port.get("port_kind", "")).strip()
        if not port_id or not port_kind:
            continue
        ports[port_id] = Port(port_id=port_id, port_kind=port_kind)
    return ports


def _edges(
    raw_edges: Any,
    nodes: dict[str, RuntimeNode],
    component_schemas: dict[str, ComponentSchema],
) -> tuple[RuntimeEdge, ...]:
    edges: list[RuntimeEdge] = []
    seen: set[str] = set()
    for raw_edge in raw_edges or []:
        edge_id = str(raw_edge.get("edge_id", "")).strip()
        if not edge_id:
            raise UDMNetworkCompileError("NETWORK_EDGE_ID_REQUIRED", "edge_id is required")
        if edge_id in seen:
            raise UDMNetworkCompileError("NETWORK_DUPLICATE_EDGE", f"duplicate edge: {edge_id}")
        seen.add(edge_id)

        edge_kind = _edge_kind(raw_edge.get("edge_kind"), edge_id)
        source = _node(nodes, raw_edge.get("source_node_id"), "source", edge_id)
        target = _node(nodes, raw_edge.get("target_node_id"), "target", edge_id)
        source_port = str(raw_edge.get("source_port", "")).strip()
        target_port = str(raw_edge.get("target_port", "")).strip()
        _validate_port(source, source_port, PORT_KINDS_BY_EDGE_KIND[edge_kind][0], edge_id)
        _validate_port(target, target_port, PORT_KINDS_BY_EDGE_KIND[edge_kind][1], edge_id)

        component_names = _edge_components(edge_kind, raw_edge, source, target, component_schemas)
        flow_spec = _optional_dict(raw_edge.get("flow_spec"))
        edges.append(
            RuntimeEdge(
                edge_id=edge_id,
                edge_kind=edge_kind,
                source_node_id=source.node_id,
                source_port=source_port,
                target_node_id=target.node_id,
                target_port=target_port,
                component_names=component_names,
                component_policy=dict(raw_edge.get("component_policy") or {"mode": "all", "include": [], "exclude": []}),
                flow_spec=flow_spec,
                stream_adapter=_optional_dict(raw_edge.get("stream_adapter")),
                transport_model=_optional_dict(raw_edge.get("transport_model")),
                pump=_optional_dict(raw_edge.get("pump")),
                signal_spec=_optional_dict(raw_edge.get("signal_spec")),
            )
        )
    return tuple(edges)


def _edge_kind(value: Any, edge_id: str) -> EdgeKind:
    try:
        return EdgeKind(str(value))
    except ValueError as exc:
        raise UDMNetworkCompileError("NETWORK_UNKNOWN_EDGE_KIND", f"edge {edge_id} has unknown edge_kind: {value}") from exc


def _node(nodes: dict[str, RuntimeNode], raw_node_id: Any, role: str, edge_id: str) -> RuntimeNode:
    node_id = str(raw_node_id or "").strip()
    node = nodes.get(node_id)
    if node is None:
        raise UDMNetworkCompileError("NETWORK_UNKNOWN_NODE", f"edge {edge_id} references unknown {role} node: {node_id}")
    return node


def _validate_port(node: RuntimeNode, port_id: str, expected_kind: str, edge_id: str) -> None:
    if not port_id:
        raise UDMNetworkCompileError("NETWORK_PORT_REQUIRED", f"edge {edge_id} port is required")
    port = node.ports.get(port_id)
    if port is None:
        if node.explicit_ports:
            raise UDMNetworkCompileError("NETWORK_UNKNOWN_PORT", f"edge {edge_id} references missing port {node.node_id}.{port_id}")
        node.ports[port_id] = Port(port_id=port_id, port_kind=expected_kind, inferred=True)
        return
    if port.port_kind != expected_kind:
        raise UDMNetworkCompileError(
            "NETWORK_PORT_KIND_MISMATCH",
            f"edge {edge_id} port {node.node_id}.{port_id} is {port.port_kind}, expected {expected_kind}",
        )


def _edge_components(
    edge_kind: EdgeKind,
    raw_edge: Mapping[str, Any],
    source: RuntimeNode,
    target: RuntimeNode,
    component_schemas: dict[str, ComponentSchema],
) -> tuple[str, ...]:
    if edge_kind is EdgeKind.SIGNAL:
        return ()

    source_schema = component_schemas[source.component_schema_id]
    target_schema = component_schemas[target.component_schema_id]
    policy = dict(raw_edge.get("component_policy") or {"mode": "all", "include": [], "exclude": []})
    mode = str(policy.get("mode", "all"))
    include = tuple(str(item).strip() for item in policy.get("include", []) if str(item).strip())
    exclude = set(str(item).strip() for item in policy.get("exclude", []) if str(item).strip())

    known = set(source_schema.components)
    requested = set(include) | exclude
    unknown = requested - known
    if unknown:
        missing = ", ".join(sorted(unknown))
        raise UDMNetworkCompileError("NETWORK_COMPONENT_POLICY_INVALID", f"edge {raw_edge.get('edge_id')} unknown components: {missing}")

    if mode == "all":
        components = tuple(component for component in source.component_names if component not in exclude)
    elif mode == "include":
        components = include
    elif mode == "exclude":
        components = tuple(component for component in source.component_names if component not in exclude)
    else:
        raise UDMNetworkCompileError("NETWORK_COMPONENT_POLICY_INVALID", f"edge {raw_edge.get('edge_id')} has invalid component policy mode: {mode}")

    missing_target = set(components) - set(target_schema.components)
    if missing_target:
        missing = ", ".join(sorted(missing_target))
        raise UDMNetworkCompileError("NETWORK_COMPONENT_POLICY_INVALID", f"edge {raw_edge.get('edge_id')} target schema lacks components: {missing}")
    return components


def _state_slices(nodes: dict[str, RuntimeNode]) -> dict[str, StateSlice]:
    offset = 0
    slices: dict[str, StateSlice] = {}
    for node in nodes.values():
        stop = offset + len(node.component_names)
        slices[node.node_id] = StateSlice(
            node_id=node.node_id,
            component_schema_id=node.component_schema_id,
            start=offset,
            stop=stop,
            component_names=node.component_names,
        )
        offset = stop
    return slices


def _float_map(value: Any, label: str) -> dict[str, float]:
    if not isinstance(value, Mapping):
        raise UDMNetworkCompileError("NETWORK_INVALID_NUMERIC_MAP", f"{label} must be an object")
    result: dict[str, float] = {}
    for key, raw in value.items():
        try:
            result[str(key)] = float(raw)
        except (TypeError, ValueError) as exc:
            raise UDMNetworkCompileError("NETWORK_INVALID_NUMERIC_MAP", f"{label}.{key} must be numeric") from exc
    return result


def _optional_dict(value: Any) -> dict[str, Any] | None:
    if value is None:
        return None
    return dict(value)
