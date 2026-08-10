import { describe, expect, it } from "vitest"
import { createStore } from "zustand/vanilla"

import { createNetworkV2Node } from "../nodes/nodeTypes"
import {
  UDM_V2_GRAPH_FAMILY,
  type UdmV2FlowStore,
  createUdmV2FlowStore,
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

  it("creates typed v2 edge data on connect", () => {
    const store = createTestStore()
    const source = createNetworkV2Node("controller", { x: 0, y: 0 })
    const target = createNetworkV2Node("controller", { x: 100, y: 0 })
    source.id = "source"
    target.id = "target"
    store.getState().replaceGraph({ nodes: [source, target], edges: [] })

    store.getState().setActiveEdgeKind("signal")
    store.getState().onConnect({
      source: "source",
      sourceHandle: "signal_out",
      target: "target",
      targetHandle: "signal_in",
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

  it("changes an existing edge kind only when its ports are compatible", () => {
    const store = createTestStore()
    const source = createNetworkV2Node("udm_reactor", { x: 0, y: 0 })
    const target = createNetworkV2Node("udm_reactor", { x: 100, y: 0 })
    source.id = "source"
    target.id = "target"
    store.getState().replaceGraph({ nodes: [source, target], edges: [] })
    store.getState().onConnect({
      source: "source",
      sourceHandle: "out",
      target: "target",
      targetHandle: "in",
    })
    const edgeId = store.getState().edges[0].id
    store.getState().updateEdgeData(edgeId, { ui: { label: "Recycle" } })

    expect(store.getState().changeEdgeKind(edgeId, "pump")).toBe(true)
    expect(store.getState().edges[0]).toMatchObject({
      type: "pump_v2",
      data: {
        edge_kind: "pump",
        ui: { label: "Recycle" },
      },
    })
    expect(store.getState().edges[0].data?.pump).toBeDefined()
    expect(store.getState().changeEdgeKind(edgeId, "signal")).toBe(false)
    expect(store.getState().edges[0].data?.edge_kind).toBe("pump")
  })

  it("keeps selection changes clean", () => {
    const store = createTestStore()
    const node = createNetworkV2Node("boundary", { x: 0, y: 0 })
    store.getState().replaceGraph({ nodes: [node], edges: [] })

    store
      .getState()
      .onNodesChange([{ id: node.id, type: "select", selected: true }])

    expect(store.getState().dirty).toBe(false)
  })
})
