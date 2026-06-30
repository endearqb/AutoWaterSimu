import { describe, expect, it } from "vitest"

import { createDefaultSecondaryClarifierV2Config } from "../composite/secondaryClarifierV2Defaults"
import { secondaryClarifierV2Expand } from "../composite/secondaryClarifierV2Expand"

describe("secondary clarifier v2 composite expansion", () => {
  it("expands the folded composite into 10 layers and internal edges", () => {
    const config = createDefaultSecondaryClarifierV2Config()
    const graph = secondaryClarifierV2Expand(config, { compositeId: "sc" })

    const layers = graph.nodes.filter(
      (node) => node.node_type === "secondary_clarifier_layer",
    )
    const settlingEdges = graph.edges.filter(
      (edge) => edge.edge_kind === "settling",
    )
    const internalHydraulicEdges = graph.edges.filter((edge) =>
      edge.edge_id.startsWith("sc_hyd_"),
    )

    expect(layers).toHaveLength(10)
    expect(settlingEdges).toHaveLength(9)
    expect(internalHydraulicEdges).toHaveLength(9)
    expect(graph.edges.map((edge) => edge.edge_id)).toEqual(
      expect.arrayContaining(["sc_hyd_up_05_04", "sc_hyd_down_05_06"]),
    )
  })

  it("maps feed composition to the influent boundary initial conditions", () => {
    const config = createDefaultSecondaryClarifierV2Config()
    config.feed_composition = { S_I: 11, X_TSS: 222 }

    const graph = secondaryClarifierV2Expand(config, { compositeId: "sc" })
    const influent = graph.nodes.find((node) => node.node_id === "sc_influent")

    expect(influent?.initial_conditions).toEqual(config.feed_composition)
  })

  it("aligns geometry, feed layer, and Takacs fields with the reference graph", () => {
    const config = createDefaultSecondaryClarifierV2Config()
    config.area_m2 = 1200
    config.height_m = 5
    config.feed_layer = 6
    config.takacs = {
      v0_m_per_day: 240,
      r_h: 0.001,
    }

    const graph = secondaryClarifierV2Expand(config, { compositeId: "sc" })
    const feedLayer = graph.nodes.find((node) => node.node_id === "sc_layer_06")
    const settling = graph.edges.find((edge) => edge.edge_id === "sc_settling_01_02")

    expect(feedLayer?.ports).toContainEqual({
      port_id: "influent",
      port_kind: "hydraulic_in",
    })
    expect(feedLayer?.unit_metadata).toMatchObject({
      composite_unit_id: "sc",
      feed_layer: 6,
      layer_index: 6,
    })
    expect(graph.composites[0]).toMatchObject({
      geometry: { area_m2: 1200, height_m: 5, layers: 10, feed_layer: 6 },
    })
    expect(settling?.transport_model?.parameters).toMatchObject({
      area_m2: 1200,
      v0_m_per_day: 240,
      r_h: 0.001,
    })
  })

  it("rejects non-internal feed layers", () => {
    const config = createDefaultSecondaryClarifierV2Config()
    config.feed_layer = 10

    expect(() => secondaryClarifierV2Expand(config)).toThrow(
      "feed_layer must be an internal generated layer",
    )
  })
})
