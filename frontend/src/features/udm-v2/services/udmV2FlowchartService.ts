import type { CanvasGraph, CanvasGraphRecord } from "@/client/compute"
import { computeWorkspaceApi } from "@/features/workspace/api"

import { validateNetworkProcessGraphContract } from "../serialize/contractValidation"
import { toNetworkProcessGraphV1 } from "../serialize/toNetworkProcessGraphV1"
import { UDM_V2_GRAPH_FAMILY } from "../state/actions"
import type { UdmV2FlowStore } from "../state/createUdmV2FlowStore"
import {
  type UdmV2GraphSummary,
  type UdmV2StandaloneFlowchartPayload,
  createUdmV2StandalonePayload,
  filterUdmV2GraphRecords,
  isUdmV2StandalonePayload,
} from "./standaloneFlowchartAdapter"

export type SaveUdmV2GraphInput = Pick<
  UdmV2FlowStore,
  | "nodes"
  | "edges"
  | "viewport"
  | "flowConstraints"
  | "validationReport"
  | "currentNetworkGraphId"
  | "currentNetworkGraphName"
> & {
  saveAs?: boolean
}

type WorkspaceApi = Pick<
  typeof computeWorkspaceApi,
  | "archiveCanvasGraph"
  | "getCanvasGraph"
  | "listCanvasGraphs"
  | "saveCanvasGraph"
  | "updateCanvasGraph"
>

export function createUdmV2FlowchartService(
  api: WorkspaceApi = computeWorkspaceApi,
) {
  return {
    async listGraphs(): Promise<UdmV2GraphSummary[]> {
      const response = await api.listCanvasGraphs({ limit: 100 })
      return filterUdmV2GraphRecords(response.items)
    },

    async loadGraph(graphId: string): Promise<UdmV2StandaloneFlowchartPayload> {
      const record = await api.getCanvasGraph(graphId)
      return payloadFromRecord(record)
    },

    async saveGraph(input: SaveUdmV2GraphInput): Promise<UdmV2GraphSummary> {
      const payload = buildPayload(input)
      const record = await api.saveCanvasGraph({
        canvasGraph: payload as CanvasGraph,
        graphId: input.saveAs
          ? undefined
          : (input.currentNetworkGraphId ?? undefined),
        name: input.currentNetworkGraphName ?? payload.display_name,
        metadata: { graph_family: UDM_V2_GRAPH_FAMILY },
      })
      return filterUdmV2GraphRecords([record])[0]
    },

    async updateGraph(
      graphId: string,
      input: SaveUdmV2GraphInput,
    ): Promise<UdmV2GraphSummary> {
      const payload = buildPayload(input)
      const record = await api.updateCanvasGraph({
        canvasGraph: payload as CanvasGraph,
        graphId,
        name: input.currentNetworkGraphName ?? payload.display_name,
        metadata: { graph_family: UDM_V2_GRAPH_FAMILY },
      })
      return filterUdmV2GraphRecords([record])[0]
    },

    async deleteGraph(graphId: string): Promise<void> {
      await this.loadGraph(graphId)
      await api.archiveCanvasGraph(graphId)
    },
  }
}

export const udmV2FlowchartService = createUdmV2FlowchartService()

export function buildPayload(
  input: SaveUdmV2GraphInput,
): UdmV2StandaloneFlowchartPayload {
  const graphId = input.currentNetworkGraphId || "udm_network_v2_canvas"
  const networkProcessGraph = toNetworkProcessGraphV1({
    graphId,
    sourceCanvasGraphId: graphId,
    nodes: input.nodes,
    edges: input.edges,
    flowConstraints: input.flowConstraints,
  })
  const contractReport =
    validateNetworkProcessGraphContract(networkProcessGraph)
  if (contractReport.status === "invalid") {
    throw new Error("UDM_V2_GRAPH_CONTRACT_INVALID")
  }

  return createUdmV2StandalonePayload({
    displayName: input.currentNetworkGraphName || "Untitled UDM Network v2",
    graphId,
    networkProcessGraph: networkProcessGraph as unknown as Record<
      string,
      unknown
    >,
    snapshot: {
      nodes: input.nodes,
      edges: input.edges,
      viewport: input.viewport,
    },
    validationReport: input.validationReport,
  })
}

function payloadFromRecord(
  record: CanvasGraphRecord,
): UdmV2StandaloneFlowchartPayload {
  if (!isUdmV2StandalonePayload(record.payload)) {
    throw new Error("UDM_V2_GRAPH_FAMILY_MISMATCH")
  }
  if (
    !record.payload.network_process_graph ||
    record.payload.network_process_graph.schema_version !==
      "network_process_graph.v1"
  ) {
    throw new Error("UDM_V2_NETWORK_PROCESS_GRAPH_MISSING")
  }
  return record.payload
}
