import { applyEdgeChanges, applyNodeChanges } from "@xyflow/react"
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

import { validateNetworkV2Connection } from "../edges/connectionRules"
import {
  DEFAULT_NETWORK_V2_EDGE_KIND,
  type NetworkV2EdgeData,
  type NetworkV2EdgeKind,
  createNetworkV2EdgeData,
  networkV2EdgeTypeByKind,
} from "../edges/edgeModel"
import type { NetworkV2NodeData } from "../nodes/nodeTypes"
import {
  type NetworkV2Diagnostic,
  type NetworkV2FlowConstraint,
  type NetworkV2ValidationReport,
  validateNetworkV2Graph,
} from "../serialize/semanticValidation"

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
  flowConstraints: NetworkV2FlowConstraint[]
  validationReport: NetworkV2ValidationReport | null
  diagnostics: NetworkV2Diagnostic[]
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
  updateNodeData: (nodeId: string, patch: Partial<NetworkV2NodeData>) => void
  updateEdgeData: (edgeId: string, patch: Partial<NetworkV2EdgeData>) => void
  changeEdgeKind: (edgeId: string, kind: NetworkV2EdgeKind) => boolean
  setSelectedNodeId: (id: string | null) => void
  setSelectedEdgeId: (id: string | null) => void
  clearSelection: () => void
  setActiveEdgeKind: (kind: NetworkV2EdgeKind) => void
  setFlowConstraints: (constraints: NetworkV2FlowConstraint[]) => void
  validateGraph: () => NetworkV2ValidationReport
  replaceGraph: (graph: {
    nodes: Node<NetworkV2NodeData>[]
    edges: Edge<NetworkV2EdgeData>[]
    viewport?: Viewport | null
    flowConstraints?: NetworkV2FlowConstraint[]
    id?: string | null
    version?: number | null
    name?: string | null
    validationReport?: NetworkV2ValidationReport | null
  }) => void
  setRuntimeStatus: (status: UdmV2RuntimeStatus) => void
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
  currentNetworkGraphName: null,
  graphFamily: UDM_V2_GRAPH_FAMILY,
  dirty: false,
  flowConstraints: [],
  validationReport: null,
  diagnostics: [],
  runtimeStatus: "idle",
  showMiniMap: true,
})

const persistentNodeChange = (change: NodeChange) =>
  ["add", "remove", "position", "replace"].includes(change.type)

const persistentEdgeChange = (change: EdgeChange) =>
  ["add", "remove", "replace"].includes(change.type)

function withoutRemovedEdges(
  constraints: NetworkV2FlowConstraint[],
  removed: Set<string>,
) {
  return constraints.flatMap((constraint) => {
    if (constraint.edge_id && removed.has(constraint.edge_id)) return []
    const edge_ids = constraint.edge_ids?.filter((id) => !removed.has(id))
    if (constraint.edge_ids && !edge_ids?.length) return []
    return [{ ...constraint, edge_ids }]
  })
}

export const createUdmV2FlowStore: StateCreator<UdmV2FlowStore> = (
  set,
  get,
) => ({
  ...initialState(),

  setNodes: (nodes) => set({ nodes, dirty: true }),
  setEdges: (edges) => set({ edges, dirty: true }),
  onNodesChange: (changes: NodeChange<Node<NetworkV2NodeData>>[]) => {
    const state = get()
    const removedNodes = new Set(
      changes.flatMap((change) =>
        change.type === "remove" ? [change.id] : [],
      ),
    )
    const removedEdges = new Set(
      state.edges
        .filter(
          (edge) =>
            removedNodes.has(edge.source) || removedNodes.has(edge.target),
        )
        .map((edge) => edge.id),
    )
    set({
      nodes: applyNodeChanges<Node<NetworkV2NodeData>>(changes, state.nodes),
      edges: state.edges.filter((edge) => !removedEdges.has(edge.id)),
      flowConstraints: withoutRemovedEdges(state.flowConstraints, removedEdges),
      dirty: changes.some(persistentNodeChange) ? true : state.dirty,
    })
  },
  onEdgesChange: (changes: EdgeChange<Edge<NetworkV2EdgeData>>[]) => {
    const state = get()
    const removedEdges = new Set(
      changes.flatMap((change) =>
        change.type === "remove" ? [change.id] : [],
      ),
    )
    set({
      edges: applyEdgeChanges<Edge<NetworkV2EdgeData>>(changes, state.edges),
      flowConstraints: withoutRemovedEdges(state.flowConstraints, removedEdges),
      dirty: changes.some(persistentEdgeChange) ? true : state.dirty,
    })
  },
  onConnect: (connection: Connection) => {
    const state = get()
    const validation = validateNetworkV2Connection({
      connection,
      nodes: state.nodes,
      edgeKind: state.activeEdgeKind,
    })
    if (!validation.valid) return
    const newEdge: Edge<NetworkV2EdgeData> = {
      ...connection,
      id: `edge-${crypto.randomUUID()}`,
      source: connection.source!,
      target: connection.target!,
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
  updateNodeData: (nodeId, patch) =>
    set({
      nodes: get().nodes.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...patch } }
          : node,
      ),
      dirty: true,
    }),
  updateEdgeData: (edgeId, patch) =>
    set({
      edges: get().edges.map((edge) => {
        if (edge.id !== edgeId || !edge.data) {
          return edge
        }
        const data: NetworkV2EdgeData = {
          ...edge.data,
          ...patch,
          edge_kind: patch.edge_kind ?? edge.data.edge_kind,
          component_policy:
            patch.component_policy ?? edge.data.component_policy,
        }
        return {
          ...edge,
          type: networkV2EdgeTypeByKind[data.edge_kind],
          data,
        }
      }),
      dirty: true,
    }),
  changeEdgeKind: (edgeId, kind) => {
    const state = get()
    const edge = state.edges.find((item) => item.id === edgeId)
    if (!edge?.data || edge.data.edge_kind === kind) return true

    const validation = validateNetworkV2Connection({
      connection: edge,
      nodes: state.nodes,
      edgeKind: kind,
    })
    if (!validation.valid) return false

    const nextData = createNetworkV2EdgeData(kind)
    if (edge.data.ui) {
      nextData.ui = edge.data.ui
    }
    set({
      edges: state.edges.map((item) =>
        item.id === edgeId
          ? {
              ...item,
              type: networkV2EdgeTypeByKind[kind],
              data: nextData,
            }
          : item,
      ),
      dirty: true,
    })
    return true
  },
  setSelectedNodeId: (id) =>
    set({
      selectedNodeId: id,
      selectedEdgeId: id ? null : get().selectedEdgeId,
    }),
  setSelectedEdgeId: (id) =>
    set({
      selectedNodeId: id ? null : get().selectedNodeId,
      selectedEdgeId: id,
    }),
  clearSelection: () => set({ selectedNodeId: null, selectedEdgeId: null }),
  setActiveEdgeKind: (kind) => set({ activeEdgeKind: kind }),
  setFlowConstraints: (constraints) =>
    set({ flowConstraints: constraints, dirty: true }),
  validateGraph: () => {
    const state = get()
    const validationReport = validateNetworkV2Graph({
      nodes: state.nodes,
      edges: state.edges,
      flowConstraints: state.flowConstraints,
    })
    set({
      validationReport,
      diagnostics: validationReport.diagnostics,
      runtimeStatus: validationReport.status === "valid" ? "idle" : "failed",
    })
    return validationReport
  },
  replaceGraph: (graph) =>
    set({
      nodes: graph.nodes,
      edges: graph.edges,
      viewport: graph.viewport ?? null,
      flowConstraints: graph.flowConstraints ?? [],
      currentNetworkGraphId: graph.id ?? null,
      currentNetworkGraphVersion: graph.version ?? null,
      currentNetworkGraphName: graph.name ?? null,
      validationReport: graph.validationReport ?? null,
      diagnostics: graph.validationReport?.diagnostics ?? [],
      dirty: false,
      runtimeStatus: "idle",
    }),
  setRuntimeStatus: (status) => set({ runtimeStatus: status }),
  setViewport: (viewport) => set({ viewport }),
  setCurrentGraph: (graph) =>
    set({
      currentNetworkGraphId: graph.id,
      currentNetworkGraphVersion: graph.version ?? null,
      currentNetworkGraphName: graph.name ?? null,
      dirty: false,
    }),
  setShowMiniMap: (show) => set({ showMiniMap: show }),
  newGraph: () => set(initialState()),
})
