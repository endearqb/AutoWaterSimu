import { describe, expect, it } from "vitest"

import { formatHydraulicV2EdgeLabel } from "../edges/HydraulicV2Edge"
import { formatPumpV2EdgeLabel } from "../edges/PumpV2Edge"
import { formatSettlingV2EdgeLabel } from "../edges/SettlingV2Edge"
import { formatSignalV2EdgeLabel } from "../edges/SignalV2Edge"
import { networkV2EdgeTypes } from "../edges/edgeTypes"

describe("edge renderers", () => {
  it("registers one renderer per v2 edge type", () => {
    expect(Object.keys(networkV2EdgeTypes).sort()).toEqual([
      "hydraulic_v2",
      "pump_v2",
      "settling_v2",
      "signal_v2",
    ])
  })

  it("formats edge labels without cross-kind field leakage", () => {
    expect(formatHydraulicV2EdgeLabel()).toBe("Q 0 m³/d")
    expect(formatPumpV2EdgeLabel()).toBe("Q 0 m³/d")
    expect(formatSettlingV2EdgeLabel()).toBe("J_TSS")
    expect(formatSignalV2EdgeLabel()).toBe("signal")
  })
})
