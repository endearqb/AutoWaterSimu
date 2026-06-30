import type { Edge, Node, XYPosition } from "@xyflow/react"

import { createDefaultSecondaryClarifierV2Config } from "../composite/secondaryClarifierV2Defaults"
import type {
  NetworkProcessGraphV1,
  NetworkProcessGraphV1Edge,
  NetworkProcessGraphV1Node,
  NetworkProcessGraphV1Port,
} from "../contracts/generated"
import {
  createNetworkV2EdgeData,
  networkV2EdgeTypeByKind,
  type NetworkV2EdgeData,
  type NetworkV2EdgeKind,
} from "../edges/edgeModel"
import {
  createNetworkV2NodeData,
  networkV2NodeTypeByKind,
  normalizeNetworkV2NodeKind,
  type NetworkV2NodeData,
  type NetworkV2NodeKind,
  type NetworkV2Port,
} from "../nodes/nodeTypes"

export type NetworkV2CanvasGraph = {
  nodes: Node<NetworkV2NodeData>[]
  edges: Edge<NetworkV2EdgeData>[]
}

export function fromNetworkProcessGraphV1(
  graph: NetworkProcessGraphV1,
): NetworkV2CanvasGraph {
  if (graph.schema_version !== "network_process_graph.v1") {
    throw new Error("UNSUPPORTED_NETWORK_PROCESS_GRAPH_SCHEMA")
  }

  const compositeIds = new Set(
    graph.composites
      .map((composite) => composite.composite_id)
      .filter((value): value is string => typeof value === "string"),
  )

  return {
    nodes: [
      ...graph.composites.flatMap((composite, index) =>
        composite.composite_type === "SecondaryClarifier10Layer" &&
        typeof composite.composite_id === "string"
          ? [fromSecondaryClarifierComposite(graph, composite, index)]
          : [],
      ),
      ...graph.nodes
        .filter(
          (node) =>
            !compositeIds.has(
              String(node.unit_metadata?.composite_unit_id || ""),
            ),
        )
        .map(fromProcessNode),
    ],
    edges: graph.edges
      .filter(
        (edge) =>
          !compositeIds.has(String(edge.metadata?.composite_unit_id || "")),
      )
      .map(fromProcessEdge),
  }
}

function fromSecondaryClarifierComposite(
  graph: NetworkProcessGraphV1,
  composite: Record<string, unknown>,
  index: number,
): Node<NetworkV2NodeData> {
  const data = createNetworkV2NodeData("secondary_clarifier_10_layer")
  const geometry = composite.geometry as Record<string, unknown> | undefined
  const ports = composite.ports as Record<string, unknown> | undefined
  const influentNode = graph.nodes.find(
    (node) => node.node_id === ports?.influent,
  )

  data.composite = {
    ...createDefaultSecondaryClarifierV2Config(),
    profile:
      composite.profile === "reactive_pending" ? "reactive_pending" : "reference",
    area_m2: numberOr(geometry?.area_m2, data.composite?.area_m2 ?? 1500),
    height_m: numberOr(geometry?.height_m, data.composite?.height_m ?? 4),
    layer_count: 10,
    feed_layer: numberOr(geometry?.feed_layer, data.composite?.feed_layer ?? 5),
    feed_composition:
      influentNode?.initial_conditions ||
      data.composite?.feed_composition ||
      {},
  }
  data.volume_m3 = data.composite.area_m2 * data.composite.height_m

  return {
    id: String(composite.composite_id),
    type: networkV2NodeTypeByKind.secondary_clarifier_10_layer,
    position: fallbackPosition(index),
    data,
  }
}

function fromProcessNode(
  node: NetworkProcessGraphV1Node,
  index: number,
): Node<NetworkV2NodeData> {
  const kind = inferNodeKind(node)
  const data = {
    ...createNetworkV2NodeData(kind),
    label: String(uiMetadata(node).label || node.node_id),
    node_kind: kind,
    process_unit_type: node.process_unit_type,
    component_schema_id: node.component_schema_id,
    initial_conditions: node.initial_conditions,
    volume_m3: node.volume,
    model_binding: {
      ...createNetworkV2NodeData(kind).model_binding,
      ...node.model_binding,
      model_kind: fromProcessModelKind(node.model_binding.model_kind),
    },
    parameter_binding: Object.fromEntries(
      Object.entries(node.parameter_binding || {}).filter(
        ([, value]) => typeof value === "number",
      ),
    ) as Record<string, number>,
    ports: node.ports.map(fromProcessPort),
  } satisfies NetworkV2NodeData

  return {
    id: node.node_id,
    type: networkV2NodeTypeByKind[kind],
    position: uiMetadata(node).position || fallbackPosition(index),
    data,
  }
}

function fromProcessEdge(edge: NetworkProcessGraphV1Edge): Edge<NetworkV2EdgeData> {
  const kind = edge.edge_kind as NetworkV2EdgeKind
  return {
    id: edge.edge_id,
    type: networkV2EdgeTypeByKind[kind],
    source: edge.source_node_id,
    sourceHandle: edge.source_port,
    target: edge.target_node_id,
    targetHandle: edge.target_port,
    data: {
      ...createNetworkV2EdgeData(kind),
      component_policy: edge.component_policy,
      stream_adapter: edge.stream_adapter,
      flow_spec: edge.flow_spec,
      transport_model: edge.transport_model as NetworkV2EdgeData["transport_model"],
      pump: edge.pump as NetworkV2EdgeData["pump"],
      signal_spec: edge.signal_spec as NetworkV2EdgeData["signal_spec"],
    },
  }
}

function inferNodeKind(node: NetworkProcessGraphV1Node): NetworkV2NodeKind {
  if (node.process_unit_type === "controller" || node.node_type === "controller") {
    return "controller"
  }
  if (
    node.process_unit_type === "boundary" ||
    node.node_type === "source" ||
    node.node_type === "sink"
  ) {
    return "boundary"
  }
  if (node.process_unit_type === "splitter") {
    return "splitter"
  }
  return normalizeNetworkV2NodeKind(node.node_type) === "boundary"
    ? "udm_reactor"
    : normalizeNetworkV2NodeKind(node.node_type)
}

function fromProcessPort(port: NetworkProcessGraphV1Port): NetworkV2Port {
  const roleByKind: Record<NetworkProcessGraphV1Port["port_kind"], NetworkV2Port["role"]> = {
    hydraulic_in: "inlet",
    hydraulic_out: "outlet",
    settling_in: "inlet",
    settling_out: "outlet",
    signal_in: "signal_in",
    signal_out: "signal_out",
  }
  return {
    id: port.port_id,
    label: port.port_id,
    role: roleByKind[port.port_kind],
    placement: port.port_kind.endsWith("_in") ? "left" : "right",
  }
}

function uiMetadata(node: NetworkProcessGraphV1Node) {
  return (node.metadata?.ui || {}) as {
    label?: string
    position?: XYPosition
  }
}

function fromProcessModelKind(
  modelKind: string,
): NetworkV2NodeData["model_binding"]["model_kind"] {
  if (modelKind === "passive_udm") {
    return "passive"
  }
  if (
    ["passive", "udm", "asm1", "asm1slim", "asm3", "controller"].includes(
      modelKind,
    )
  ) {
    return modelKind as NetworkV2NodeData["model_binding"]["model_kind"]
  }
  return "passive"
}

function numberOr(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

function fallbackPosition(index: number): XYPosition {
  return { x: index * 180, y: 0 }
}
