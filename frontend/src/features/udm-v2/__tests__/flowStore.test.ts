import { describe, expect, it } from "vitest"
import { createStore } from "zustand/vanilla"

import {
  UDM_V2_GRAPH_FAMILY,
  createUdmV2FlowStore,
  type UdmV2FlowStore,
} from "../state/createUdmV2FlowStore"
import { createNetworkV2Node } from "../nodes/nodeTypes"

const createTestStore = () =>
  createStore<UdmV2FlowStore>()(createUdmV2FlowStore)

describe("createUdmV2FlowStore", () => {
  it("starts as an empty UDM Network v2 graph", () => {
    const store = createTestStore()

    expect(store.getState().graphFamily).toBe(UDM_V2_GRAPH_FAMILY)
    expect(store.getState().nodes).toEqual([])
    expect(store.getState().edges).toEqual([])
    expect(store.getState().dirty).toBe(false)
  })

  it("tracks graph identity without using legacy flowchart names", () => {
    const store = createTestStore()

    store.getState().setCurrentGraph({
      id: "graph-1",
      name: "Plant network",
      version: 3,
    })

    expect(store.getState().currentNetworkGraphId).toBe("graph-1")
    expect(store.getState().currentNetworkGraphName).toBe("Plant network")
    expect(store.getState().currentNetworkGraphVersion).toBe(3)
  })

  it("creates typed v2 edge data on connect", () => {
    const store = createTestStore()

    store.getState().setActiveEdgeKind("signal")
    store.getState().onConnect({
      source: "source",
      sourceHandle: null,
      target: "target",
      targetHandle: null,
    })

    expect(store.getState().edges).toHaveLength(1)
    expect(store.getState().edges[0].type).toBe("signal_v2")
    expect(store.getState().edges[0].data?.edge_kind).toBe("signal")
    expect(store.getState().edges[0].data?.flow_spec).toBeUndefined()
  })

  it("adds typed v2 nodes", () => {
    const store = createTestStore()

    store
      .getState()
      .addNode(createNetworkV2Node("udm_reactor", { x: 10, y: 20 }))

    expect(store.getState().nodes).toHaveLength(1)
    expect(store.getState().nodes[0].type).toBe("udm_reactor_v2")
    expect(store.getState().nodes[0].data.node_kind).toBe("udm_reactor")
    expect(store.getState().dirty).toBe(true)
  })
})
