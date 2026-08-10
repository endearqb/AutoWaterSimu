import type { Edge } from "@xyflow/react"

import { type NetworkV2EdgeData, normalizeNetworkV2EdgeKind } from "./edgeModel"
import { NETWORK_V2_EDGE_KIND_ORDER } from "./edgeVisuals"

export type EndpointLane = {
  index: number
  count: number
  offset: number
}

export type EdgeLaneInfo = {
  source: EndpointLane
  target: EndpointLane
}

export type EdgeLaneMap = ReadonlyMap<string, EdgeLaneInfo>

type NetworkEdge = Edge<NetworkV2EdgeData>

const endpointKey = (edge: NetworkEdge, endpoint: "source" | "target") =>
  `${edge[endpoint]}::${edge[`${endpoint}Handle`] ?? `__${endpoint}__`}`

const kindRank = (edge: NetworkEdge) =>
  NETWORK_V2_EDGE_KIND_ORDER.indexOf(
    normalizeNetworkV2EdgeKind(edge.data?.edge_kind),
  )

const compareEdges =
  (endpoint: "source" | "target") => (a: NetworkEdge, b: NetworkEdge) => {
    const opposite = endpoint === "source" ? "target" : "source"
    return (
      kindRank(a) - kindRank(b) ||
      `${a[opposite]}::${a[`${opposite}Handle`] ?? ""}`.localeCompare(
        `${b[opposite]}::${b[`${opposite}Handle`] ?? ""}`,
      ) ||
      a.id.localeCompare(b.id)
    )
  }

function offsets(count: number) {
  if (count <= 1) return [0]
  const spacing = Math.min(12, 56 / (count - 1))
  return Array.from(
    { length: count },
    (_, index) => (index - (count - 1) / 2) * spacing,
  ).sort((a, b) => Math.abs(a) - Math.abs(b) || a - b)
}

function allocate(edges: NetworkEdge[], endpoint: "source" | "target") {
  const groups = new Map<string, NetworkEdge[]>()
  const lanes = new Map<string, EndpointLane>()

  for (const edge of edges) {
    const key = endpointKey(edge, endpoint)
    groups.set(key, [...(groups.get(key) ?? []), edge])
  }

  for (const group of groups.values()) {
    const sorted = [...group].sort(compareEdges(endpoint))
    const laneOffsets = offsets(sorted.length)
    sorted.forEach((edge, index) =>
      lanes.set(edge.id, {
        index,
        count: sorted.length,
        offset: laneOffsets[index] ?? 0,
      }),
    )
  }
  return lanes
}

const centerLane = (): EndpointLane => ({ index: 0, count: 1, offset: 0 })

export function computeEdgeLanes(edges: NetworkEdge[]): EdgeLaneMap {
  const source = allocate(edges, "source")
  const target = allocate(edges, "target")
  return new Map(
    edges.map((edge) => [
      edge.id,
      {
        source: source.get(edge.id) ?? centerLane(),
        target: target.get(edge.id) ?? centerLane(),
      },
    ]),
  )
}
