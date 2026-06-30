import { describe, expect, it } from "vitest"

import {
  createUdmV2StandalonePayload,
  filterUdmV2GraphRecords,
  summarizeUdmV2GraphRecord,
} from "../services/standaloneFlowchartAdapter"

describe("standaloneFlowchartAdapter", () => {
  it("writes the UDM Network v2 graph family into persisted payloads", () => {
    const payload = createUdmV2StandalonePayload({
      displayName: "Plant A",
      exportedAt: "2026-06-30T00:00:00.000Z",
      graphId: "graph-1",
    })

    expect(payload.graph_family).toBe("udm_network_v2")
    expect(payload.metadata.created_by_feature).toBe("features/udm-v2")
    expect(payload.network_process_graph.schema_version).toBe(
      "network_process_graph.v1",
    )
  })

  it("rejects records from other graph families", () => {
    const payload = createUdmV2StandalonePayload({
      displayName: "Plant A",
      graphId: "graph-1",
    })
    const records = [
      { graph_id: "graph-1", name: "Plant A", payload, version: 1 },
      {
        graph_id: "legacy-1",
        name: "Legacy",
        payload: { graph_family: "legacy_flow" },
        version: 1,
      },
    ]

    expect(filterUdmV2GraphRecords(records)).toEqual([
      {
        graphFamily: "udm_network_v2",
        id: "graph-1",
        name: "Plant A",
        version: 1,
      },
    ])
    expect(() => summarizeUdmV2GraphRecord(records[1])).toThrow(
      "UDM_V2_GRAPH_FAMILY_MISMATCH",
    )
  })
})
