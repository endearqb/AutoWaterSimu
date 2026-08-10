import type { Edge } from "@xyflow/react"

import { type NetworkV2EdgeData, normalizeNetworkV2EdgeKind } from "./edgeModel"
import { createNetworkV2Marker } from "./edgeVisuals"

export const decorateEdgesForRender = (
  edges: Edge<NetworkV2EdgeData>[],
): Edge<NetworkV2EdgeData>[] =>
  edges.map((edge) => ({
    ...edge,
    markerEnd: createNetworkV2Marker(
      normalizeNetworkV2EdgeKind(edge.data?.edge_kind),
    ),
    interactionWidth: 18,
  }))
