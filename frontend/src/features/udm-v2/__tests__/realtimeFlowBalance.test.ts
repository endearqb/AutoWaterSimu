import { describe, expect, it } from "vitest"

import { buildSecondaryClarifierV2Canvas } from "../composite/secondaryClarifierV2Canvas"
import { solveRealtimeFlowBalance } from "../flow/realtimeFlowBalance"

describe("UDM-v2 realtime flow balance", () => {
  it("balances the default 10-layer clarifier", () => {
    const graph = buildSecondaryClarifierV2Canvas({ x: 0, y: 0 })
    const solved = solveRealtimeFlowBalance(graph.nodes, graph.edges)

    expect(graph.nodes).toHaveLength(14)
    expect(graph.edges).toHaveLength(22)
    expect(solved.status).toBe("balanced")
    expect(
      solved.flows[
        Object.keys(solved.flows).find((id) => id.endsWith("top_effluent"))!
      ],
    ).toBe(70)
    expect(
      Object.entries(solved.flows).find(([id]) =>
        id.endsWith("hyd_down_05_06"),
      )?.[1],
    ).toBe(30)
    expect(
      Object.entries(solved.flows).find(([id]) =>
        id.endsWith("hyd_up_05_04"),
      )?.[1],
    ).toBe(70)
  })

  it("reports conflicting fixed flows", () => {
    const graph = buildSecondaryClarifierV2Canvas({ x: 0, y: 0 })
    const effluent = graph.edges.find((edge) =>
      edge.id.endsWith("top_effluent"),
    )!
    effluent.data = {
      ...effluent.data!,
      flow_spec: { mode: "fixed", value: 99 },
    }
    expect(solveRealtimeFlowBalance(graph.nodes, graph.edges).status).toBe(
      "inconsistent",
    )
  })
})
