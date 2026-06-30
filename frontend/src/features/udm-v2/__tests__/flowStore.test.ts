import { describe, expect, it } from "vitest"
import { createStore } from "zustand/vanilla"

import {
  UDM_V2_GRAPH_FAMILY,
  createUdmV2FlowStore,
  type UdmV2FlowStore,
} from "../state/createUdmV2FlowStore"

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
})
