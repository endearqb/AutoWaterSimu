import type { CanvasGraphRecord } from "@/client/compute"

import { UDM_V2_GRAPH_FAMILY } from "../state/actions"

export type NetworkV2CanvasSnapshot = {
  schema_version: "udm_network_canvas.v1"
  nodes: unknown[]
  edges: unknown[]
  viewport?: unknown
}

export type UdmV2StandaloneFlowchartPayload = {
  schema_version: "udm_network_canvas.v1"
  graph_family: typeof UDM_V2_GRAPH_FAMILY
  display_name: string
  network_process_graph: Record<string, unknown>
  canvas_snapshot: NetworkV2CanvasSnapshot
  validation_report?: Record<string, unknown>
  metadata: {
    created_by_feature: "features/udm-v2"
    contract_versions: {
      network_process_graph: "network_process_graph.v1"
      network_simulation_input: "network_simulation_input.v1"
    }
    exported_at: string
  }
}

export type UdmV2GraphSummary = {
  id: string
  name: string
  version: number
  graphFamily: typeof UDM_V2_GRAPH_FAMILY
}

type CanvasGraphRecordLike = Pick<
  CanvasGraphRecord,
  "graph_id" | "name" | "payload" | "version"
>

export function createUdmV2StandalonePayload(args: {
  displayName: string
  graphId: string
  networkProcessGraph?: Record<string, unknown>
  snapshot?: Partial<NetworkV2CanvasSnapshot>
  exportedAt?: string
}): UdmV2StandaloneFlowchartPayload {
  return {
    schema_version: "udm_network_canvas.v1",
    graph_family: UDM_V2_GRAPH_FAMILY,
    display_name: args.displayName,
    network_process_graph:
      args.networkProcessGraph ??
      ({
        schema_version: "network_process_graph.v1",
        graph_id: args.graphId,
        nodes: [],
        edges: [],
      } as Record<string, unknown>),
    canvas_snapshot: {
      schema_version: "udm_network_canvas.v1",
      nodes: args.snapshot?.nodes ?? [],
      edges: args.snapshot?.edges ?? [],
      viewport: args.snapshot?.viewport,
    },
    metadata: {
      created_by_feature: "features/udm-v2",
      contract_versions: {
        network_process_graph: "network_process_graph.v1",
        network_simulation_input: "network_simulation_input.v1",
      },
      exported_at: args.exportedAt ?? new Date().toISOString(),
    },
  }
}

export function isUdmV2StandalonePayload(
  payload: unknown,
): payload is UdmV2StandaloneFlowchartPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    (payload as { graph_family?: unknown }).graph_family === UDM_V2_GRAPH_FAMILY
  )
}

export function summarizeUdmV2GraphRecord(
  record: CanvasGraphRecordLike,
): UdmV2GraphSummary {
  if (!isUdmV2StandalonePayload(record.payload)) {
    throw new Error("UDM_V2_GRAPH_FAMILY_MISMATCH")
  }

  return {
    id: record.graph_id,
    name: record.name || record.payload.display_name,
    version: record.version,
    graphFamily: UDM_V2_GRAPH_FAMILY,
  }
}

export function filterUdmV2GraphRecords(
  records: CanvasGraphRecordLike[],
): UdmV2GraphSummary[] {
  return records
    .filter((record) => isUdmV2StandalonePayload(record.payload))
    .map(summarizeUdmV2GraphRecord)
}
