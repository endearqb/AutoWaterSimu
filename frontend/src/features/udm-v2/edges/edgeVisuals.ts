import { MarkerType } from "@xyflow/react"

import type { NetworkV2EdgeKind } from "./edgeModel"

export const NETWORK_V2_EDGE_KIND_ORDER: NetworkV2EdgeKind[] = [
  "hydraulic",
  "pump",
  "settling",
  "signal",
]

export const NETWORK_V2_EDGE_VISUALS: Record<
  NetworkV2EdgeKind,
  { stroke: string; dasharray?: string; opacity: number }
> = {
  hydraulic: { stroke: "#2563eb", opacity: 0.9 },
  pump: { stroke: "#b45309", dasharray: "10 3", opacity: 0.92 },
  settling: { stroke: "#15803d", dasharray: "6 4", opacity: 0.9 },
  signal: { stroke: "#7c3aed", dasharray: "1 6", opacity: 0.84 },
}

export function createNetworkV2Marker(kind: NetworkV2EdgeKind) {
  const visual = NETWORK_V2_EDGE_VISUALS[kind]
  const scale = kind === "signal" ? 0.8 : kind === "settling" ? 0.95 : 1
  return {
    type: MarkerType.ArrowClosed,
    color: visual.stroke,
    width: 16 * scale,
    height: 16 * scale,
  }
}
