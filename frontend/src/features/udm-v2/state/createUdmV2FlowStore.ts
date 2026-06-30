import {
  applyEdgeChanges,
  applyNodeChanges,
} from "@xyflow/react"
import type {
  Connection,
  Edge,
  EdgeChange,
  Node,
  NodeChange,
  OnConnect,
  OnEdgesChange,
  OnNodesChange,
  Viewport,
} from "@xyflow/react"
import type { StateCreator } from "zustand"

import {
  DEFAULT_NETWORK_V2_EDGE_KIND,
  createNetworkV2EdgeData,
  networkV2EdgeTypeByKind,
  type NetworkV2EdgeData,
  type NetworkV2EdgeKind,
} from "../edges/edgeModel"
import type { NetworkV2NodeData } from "../nodes/nodeTypes"

export type UdmV2RuntimeStatus =
  | "idle"
  | "validating"
  | "saving"
  | "submitting"
  | "runtime_pending"
  | "failed"

export type UdmV2FlowState = {
  nodes: Node<NetworkV2NodeData>[]
  edges: Edge<NetworkV2EdgeData>[]
  viewport: Viewport | null
  selectedNodeId: string | null
  selectedEdgeId: string | null
  activeEdgeKind: NetworkV2EdgeKind
  currentNetworkGraphId: string | null
  currentNetworkGraphVersion: number | null
  currentNetworkGraphName: string | null
  graphFamily: "udm_network_v2"
  dirty: boolean
  diagnostics: Array<Record<string, unknown>>
  runtimeStatus: UdmV2RuntimeStatus
  showMiniMap: boolean
}

export type UdmV2FlowActions = {
  setNodes: (nodes: Node<NetworkV2NodeData>[]) => void
  setEdges: (edges: Edge<NetworkV2EdgeData>[]) => void
  onNodesChange: OnNodesChange<Node<NetworkV2NodeData>>
  onEdgesChange: OnEdgesChange<Edge<NetworkV2EdgeData>>
  onConnect: OnConnect
  addNode: (node: Node<NetworkV2NodeData>) => void
  setSelectedNodeId: (id: string | null) => void
  setSelectedEdgeId: (id: string | null) => void
  setActiveEdgeKind: (kind: NetworkV2EdgeKind) => void
  setViewport: (viewport: Viewport) => void
  setCurrentGraph: (graph: {
    id: string | null
    version?: number | null
    name?: string | null
  }) => void
  setShowMiniMap: (show: boolean) => void
  newGraph: () => void
}

export type UdmV2FlowStore = UdmV2FlowState & UdmV2FlowActions

export const UDM_V2_GRAPH_FAMILY = "udm_network_v2" as const

const initialState = (): UdmV2FlowState => ({
  nodes: [],
  edges: [],
  viewport: null,
  selectedNodeId: null,
  selectedEdgeId: null,
  activeEdgeKind: DEFAULT_NETWORK_V2_EDGE_KIND,
  currentNetworkGraphId: null,
  currentNetworkGraphVersion: null,
  currentNetworkGraphName: "Untitled UDM Network v2",
  graphFamily: UDM_V2_GRAPH_FAMILY,
  dirty: false,
  diagnostics: [],
  runtimeStatus: "idle",
  showMiniMap: true,
})

export const createUdmV2FlowStore: StateCreator<UdmV2FlowStore> = (
  set,
  get,
) => ({
  ...initialState(),

  setNodes: (nodes) => set({ nodes, dirty: true }),
  setEdges: (edges) => set({ edges, dirty: true }),
  onNodesChange: (changes: NodeChange<Node<NetworkV2NodeData>>[]) => {
    set({
      nodes: applyNodeChanges<Node<NetworkV2NodeData>>(changes, get().nodes),
      dirty: true,
    })
  },
  onEdgesChange: (changes: EdgeChange<Edge<NetworkV2EdgeData>>[]) => {
    set({
      edges: applyEdgeChanges<Edge<NetworkV2EdgeData>>(changes, get().edges),
      dirty: true,
    })
  },
  onConnect: (connection: Connection) => {
    if (!connection.source || !connection.target) {
      return
    }
    const state = get()
    const newEdge: Edge<NetworkV2EdgeData> = {
      ...connection,
      id: `edge-${Date.now()}`,
      source: connection.source,
      target: connection.target,
      type: networkV2EdgeTypeByKind[state.activeEdgeKind],
      data: createNetworkV2EdgeData(state.activeEdgeKind),
    }
    set({
      edges: [...state.edges, newEdge],
      dirty: true,
    })
  },
  addNode: (node) =>
    set({
      nodes: [...get().nodes, node],
      dirty: true,
    }),
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  setSelectedEdgeId: (id) => set({ selectedEdgeId: id }),
  setActiveEdgeKind: (kind) => set({ activeEdgeKind: kind }),
  setViewport: (viewport) => set({ viewport }),
  setCurrentGraph: (graph) =>
    set({
      currentNetworkGraphId: graph.id,
      currentNetworkGraphVersion: graph.version ?? null,
      currentNetworkGraphName: graph.name ?? "Untitled UDM Network v2",
      dirty: false,
    }),
  setShowMiniMap: (show) => set({ showMiniMap: show }),
  newGraph: () => set(initialState()),
})
