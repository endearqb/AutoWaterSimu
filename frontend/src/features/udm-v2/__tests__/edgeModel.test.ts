import { describe, expect, it } from "vitest"

import {
  createNetworkV2EdgeData,
  isNetworkV2EdgeTypeKindMatch,
  networkV2EdgeTypeByKind,
} from "../edges/edgeModel"

describe("edgeModel", () => {
  it("creates hydraulic and pump edges with flow specs", () => {
    expect(createNetworkV2EdgeData("hydraulic").flow_spec).toMatchObject({
      mode: "fixed",
      unit: "m3/d",
      value: 0,
    })
    expect(createNetworkV2EdgeData("pump").pump).toMatchObject({
      efficiency: 0.75,
      energy_enabled: true,
      head_m: 2,
    })
  })

  it("keeps settling and signal edges free of flow specs", () => {
    expect(createNetworkV2EdgeData("settling").flow_spec).toBeUndefined()
    expect(createNetworkV2EdgeData("signal").flow_spec).toBeUndefined()
    expect(createNetworkV2EdgeData("signal").transport_model).toBeUndefined()
  })

  it("maps React Flow edge types to edge kinds", () => {
    expect(networkV2EdgeTypeByKind.hydraulic).toBe("hydraulic_v2")
    expect(
      isNetworkV2EdgeTypeKindMatch({
        edgeKind: "signal",
        edgeType: "signal_v2",
      }),
    ).toBe(true)
  })
})
