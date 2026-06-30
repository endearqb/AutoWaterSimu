import {
  addEdge,
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

export type NetworkV2EdgeKind = "hydraulic" | "pump" | "settling" | "signal"

export type UdmV2RuntimeStatus =
  | "idle"
  | "validating"
  | "saving"
  | "submitting"
  | "runtime_pending"
  | "failed"

export type UdmV2FlowState = {
  nodes: Node<Record<string, unknown>>[]
  edges: Edge<Record<string, unknown>>[]
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
  setNodes: (nodes: Node<Record<string, unknown>>[]) => void
  setEdges: (edges: Edge<Record<string, unknown>>[]) => void
  onNodesChange: OnNodesChange
  onEdgesChange: OnEdgesChange
  onConnect: OnConnect
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
  activeEdgeKind: "hydraulic",
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
  onNodesChange: (changes: NodeChange[]) => {
    set({ nodes: applyNodeChanges(changes, get().nodes), dirty: true })
  },
  onEdgesChange: (changes: EdgeChange[]) => {
    set({ edges: applyEdgeChanges(changes, get().edges), dirty: true })
  },
  onConnect: (connection: Connection) => {
    const state = get()
    set({
      edges: addEdge(
        {
          ...connection,
          type: "placeholder_v2",
          data: { edge_kind: state.activeEdgeKind },
        },
        state.edges,
      ),
      dirty: true,
    })
  },
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
