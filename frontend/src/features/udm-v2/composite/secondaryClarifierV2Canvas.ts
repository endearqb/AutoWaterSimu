import type { Edge, Node, XYPosition } from "@xyflow/react"

import type { NetworkV2EdgeData } from "../edges/edgeModel"
import { networkV2EdgeTypeByKind } from "../edges/edgeModel"
import type { NetworkV2NodeData } from "../nodes/nodeTypes"
import { createDefaultSecondaryClarifierV2Config } from "./secondaryClarifierV2Defaults"
import { secondaryClarifierV2Expand } from "./secondaryClarifierV2Expand"

export function buildSecondaryClarifierV2Canvas(
  origin: XYPosition = { x: 280, y: 60 },
) {
  const id = `clarifier_${Date.now()}`
  const graph = secondaryClarifierV2Expand(
    createDefaultSecondaryClarifierV2Config(),
    { compositeId: id },
  )
  const feedLayer = 5
  const nodes: Node<NetworkV2NodeData>[] = graph.nodes.map((node) => {
    const layer = Number(node.unit_metadata?.layer_index ?? 0)
    const role = String(node.unit_metadata?.boundary_role ?? "")
    const isLayer = node.node_type === "secondary_clarifier_layer"
    const y = isLayer
      ? origin.y + (layer - 1) * 105
      : origin.y +
        (role === "influent"
          ? (feedLayer - 1) * 105
          : role === "effluent"
            ? 0
            : 9 * 105)
    const ports = node.ports.map((port) => ({
      id: port.port_id,
      label: port.port_id,
      role: port.port_kind.includes("_in")
        ? ("inlet" as const)
        : ("outlet" as const),
      port_kind: port.port_kind,
      placement:
        port.port_id === "settling_in"
          ? ("top" as const)
          : port.port_id === "settling_out"
            ? ("bottom" as const)
            : port.port_kind.includes("_in")
              ? ("left" as const)
              : ("right" as const),
    }))
    return {
      id: node.node_id,
      type: isLayer ? "clarifier_layer_v2" : "boundary_v2",
      position: {
        x: origin.x + (isLayer ? 360 : role === "influent" ? 0 : 760),
        y,
      },
      data: {
        label: isLayer ? `Layer ${layer}` : role.toUpperCase(),
        node_kind: isLayer ? "clarifier_layer" : "boundary",
        process_unit_type: node.process_unit_type,
        component_schema_id: node.component_schema_id,
        initial_conditions: node.initial_conditions,
        volume_m3: node.volume,
        model_binding: { model_kind: "passive", reaction_enabled: false },
        parameter_binding: {},
        boundary: isLayer
          ? undefined
          : {
              boundary_kind:
                role === "influent" ? "constant_composition" : "effluent",
              feed_composition:
                role === "influent" ? node.initial_conditions : undefined,
            },
        ports,
      },
    }
  })
  const edges: Edge<NetworkV2EdgeData>[] = graph.edges.map((edge) => ({
    id: edge.edge_id,
    source: edge.source_node_id,
    target: edge.target_node_id,
    sourceHandle: edge.source_port,
    targetHandle: edge.target_port,
    type: networkV2EdgeTypeByKind[edge.edge_kind],
    data: {
      edge_kind: edge.edge_kind,
      component_policy: edge.component_policy,
      stream_adapter: edge.stream_adapter,
      flow_spec: edge.flow_spec,
      transport_model:
        edge.transport_model as NetworkV2EdgeData["transport_model"],
    },
  }))
  return { nodes, edges }
}
