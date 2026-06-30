import { describe, expect, it } from "vitest"
import { useASM1FlowStore } from "../asm1FlowStore"
import useFlowStore from "../flowStore"

const expectLegacyEdgeData = (data: Record<string, unknown> | undefined) => {
  expect(data?.flow).toBe(0)
  expect(data).not.toHaveProperty("edge_kind")
  expect(data).not.toHaveProperty("flow_spec")
  expect(data).not.toHaveProperty("component_policy")
  expect(data).not.toHaveProperty("pump")
  expect(data).not.toHaveProperty("transport_model")
  expect(data).not.toHaveProperty("signal_spec")
}

describe("v1 flow edge isolation", () => {
  it("material balance creates legacy flow edges", () => {
    const store = useFlowStore.getState()
    store.setEdges([])

    store.onConnect({
      source: "source",
      target: "target",
      sourceHandle: null,
      targetHandle: null,
    })

    const edge = useFlowStore.getState().edges[0]
    expect(edge?.type).toBe("editable")
    expectLegacyEdgeData(edge?.data)
  })

  it("model stores create legacy flow edges", () => {
    const store = useASM1FlowStore.getState()
    store.setEdges([])

    store.onConnect({
      source: "source",
      target: "target",
      sourceHandle: null,
      targetHandle: null,
    })

    const edge = useASM1FlowStore.getState().edges[0]
    expect(edge?.type).toBe("editable")
    expectLegacyEdgeData(edge?.data)
  })
})
