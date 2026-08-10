import type { Connection, Edge, Node } from "@xyflow/react"

import type { NetworkV2NodeData } from "../nodes/nodeTypes"
import {
  edgeKindsForPort,
  isSourcePort,
  isTargetPort,
} from "../nodes/portKinds"
import type { NetworkV2EdgeData, NetworkV2EdgeKind } from "./edgeModel"

export type ConnectionValidationCode =
  | "MISSING_ENDPOINT"
  | "SELF_CONNECTION"
  | "SOURCE_NODE_NOT_FOUND"
  | "TARGET_NODE_NOT_FOUND"
  | "SOURCE_PORT_NOT_FOUND"
  | "TARGET_PORT_NOT_FOUND"
  | "SOURCE_DIRECTION_INVALID"
  | "TARGET_DIRECTION_INVALID"
  | "EDGE_KIND_INCOMPATIBLE"

export type ConnectionValidationResult =
  | { valid: true }
  | { valid: false; code: ConnectionValidationCode }

export function validateNetworkV2Connection({
  connection,
  edgeKind,
  nodes,
}: {
  connection: Connection | Edge<NetworkV2EdgeData>
  edgeKind: NetworkV2EdgeKind
  nodes: Node<NetworkV2NodeData>[]
}): ConnectionValidationResult {
  if (
    !connection.source ||
    !connection.target ||
    !connection.sourceHandle ||
    !connection.targetHandle
  ) {
    return { valid: false, code: "MISSING_ENDPOINT" }
  }
  if (connection.source === connection.target) {
    return { valid: false, code: "SELF_CONNECTION" }
  }

  const sourceNode = nodes.find((node) => node.id === connection.source)
  const targetNode = nodes.find((node) => node.id === connection.target)
  if (!sourceNode) return { valid: false, code: "SOURCE_NODE_NOT_FOUND" }
  if (!targetNode) return { valid: false, code: "TARGET_NODE_NOT_FOUND" }

  const sourcePort = sourceNode.data.ports.find(
    (port) => port.id === connection.sourceHandle,
  )
  const targetPort = targetNode.data.ports.find(
    (port) => port.id === connection.targetHandle,
  )
  if (!sourcePort) return { valid: false, code: "SOURCE_PORT_NOT_FOUND" }
  if (!targetPort) return { valid: false, code: "TARGET_PORT_NOT_FOUND" }
  if (!isSourcePort(sourcePort)) {
    return { valid: false, code: "SOURCE_DIRECTION_INVALID" }
  }
  if (!isTargetPort(targetPort)) {
    return { valid: false, code: "TARGET_DIRECTION_INVALID" }
  }
  if (
    !edgeKindsForPort(sourcePort).includes(edgeKind) ||
    !edgeKindsForPort(targetPort).includes(edgeKind)
  ) {
    return { valid: false, code: "EDGE_KIND_INCOMPATIBLE" }
  }
  return { valid: true }
}
