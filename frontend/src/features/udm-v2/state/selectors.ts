import type { UdmV2FlowStore } from "./createUdmV2FlowStore"

export const selectNetworkV2Counts = (state: UdmV2FlowStore) => ({
  edgeCount: state.edges.length,
  nodeCount: state.nodes.length,
})

export const selectNetworkV2GraphIdentity = (state: UdmV2FlowStore) => ({
  graphFamily: state.graphFamily,
  graphId: state.currentNetworkGraphId,
  graphName: state.currentNetworkGraphName,
  graphVersion: state.currentNetworkGraphVersion,
})
