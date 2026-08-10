import { describe, expect, it } from "vitest"

import { computeEdgeLanes } from "../edges/edgeLanes"
import { createNetworkV2EdgeData } from "../edges/edgeModel"
import { decorateEdgesForRender } from "../edges/renderEdgeVisuals"

describe("UDM-v2 render persistence boundary", () => {
  it("keeps lane, marker and hit width out of stored edges", () => {
    const edges = [
      {
        id: "edge-1",
        source: "a",
        sourceHandle: "out",
        target: "b",
        targetHandle: "in",
        data: createNetworkV2EdgeData("hydraulic"),
      },
    ]
    const lanes = computeEdgeLanes(edges)
    const rendered = decorateEdgesForRender(edges)

    expect(lanes.get("edge-1")?.source.offset).toBe(0)
    expect(rendered[0].markerEnd).toBeDefined()
    expect(rendered[0].interactionWidth).toBe(18)
    expect(JSON.stringify(edges)).not.toMatch(
      /lane|markerEnd|interactionWidth|__routing/,
    )
  })
})
