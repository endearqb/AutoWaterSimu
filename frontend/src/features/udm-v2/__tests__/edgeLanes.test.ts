import type { Edge } from "@xyflow/react"
import { describe, expect, it } from "vitest"

import { computeEdgeLanes } from "../edges/edgeLanes"
import {
  type NetworkV2EdgeData,
  type NetworkV2EdgeKind,
  createNetworkV2EdgeData,
} from "../edges/edgeModel"

const parallelEdges = (kinds: NetworkV2EdgeKind[]) =>
  kinds.map(
    (kind): Edge<NetworkV2EdgeData> => ({
      id: `edge-${kind}`,
      source: "a",
      sourceHandle: "out",
      target: "b",
      targetHandle: "in",
      data: createNetworkV2EdgeData(kind),
    }),
  )

describe("computeEdgeLanes", () => {
  it("assigns deterministic center-out lanes", () => {
    const edges = parallelEdges(["hydraulic", "pump", "settling", "signal"])
    const lanes = computeEdgeLanes(edges)

    expect(lanes.get("edge-hydraulic")?.source.offset).toBe(-6)
    expect(lanes.get("edge-pump")?.source.offset).toBe(6)
    expect(lanes.get("edge-settling")?.source.offset).toBe(-18)
    expect(lanes.get("edge-signal")?.source.offset).toBe(18)
    expect(lanes.get("edge-hydraulic")?.target.offset).toBe(-6)

    const reordered = computeEdgeLanes([...edges].reverse())
    for (const edge of edges) {
      expect(reordered.get(edge.id)).toEqual(lanes.get(edge.id))
    }
  })

  it.each([1, 2, 3, 4, 8, 10])(
    "keeps %i lane offsets unique and within 56px",
    (count) => {
      const edges = Array.from({ length: count }, (_, index) => ({
        ...parallelEdges(["hydraulic"])[0],
        id: `edge-${index}`,
      }))
      const values = edges.map(
        (edge) => computeEdgeLanes(edges).get(edge.id)!.source.offset,
      )
      expect(new Set(values).size).toBe(count)
      expect(Math.max(...values) - Math.min(...values)).toBeLessThanOrEqual(56)
    },
  )
})
