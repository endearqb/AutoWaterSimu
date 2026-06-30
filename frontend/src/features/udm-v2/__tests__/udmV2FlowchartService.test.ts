import type { Edge, Node } from "@xyflow/react"
import { describe, expect, it, vi } from "vitest"

import type { CanvasGraphRecord } from "@/client/compute"

import canvasFixture from "../__fixtures__/valid-network-v2-canvas.json"
import type { NetworkV2EdgeData } from "../edges/edgeModel"
import type { NetworkV2NodeData } from "../nodes/nodeTypes"
import { createUdmV2FlowchartService } from "../services/udmV2FlowchartService"

const saveInput = {
  currentNetworkGraphId: "graph-1",
  currentNetworkGraphName: "Plant A",
  edges: canvasFixture.edges as Edge<NetworkV2EdgeData>[],
  flowConstraints: [],
  nodes: canvasFixture.nodes as Node<NetworkV2NodeData>[],
  validationReport: null,
  viewport: null,
}

function canvasGraphRecord(
  overrides: Partial<CanvasGraphRecord>,
): CanvasGraphRecord {
  return {
    created_at: "2026-06-30T00:00:00Z",
    graph_id: "graph-1",
    name: "Plant A",
    payload: { graph_family: "udm_network_v2" },
    payload_hash: "sha256:test",
    requested_by: "test",
    schema_version: "canvas_graph.v1",
    source_system: "test",
    version: 1,
    ...overrides,
  } as CanvasGraphRecord
}

describe("udmV2FlowchartService", () => {
  it("saves and lists only UDM Network v2 graph family records", async () => {
    const records: any[] = []
    const api = {
      archiveCanvasGraph: vi.fn(),
      getCanvasGraph: vi.fn(),
      listCanvasGraphs: vi.fn(async () => ({
        items: [
          ...records,
          canvasGraphRecord({
            graph_id: "legacy",
            name: "Legacy",
            payload: { graph_family: "legacy_flow" },
            version: 1,
          }),
        ],
        total_estimate: records.length + 1,
      })),
      saveCanvasGraph: vi.fn(async (args) => {
        const record = canvasGraphRecord({
          graph_id: args.graphId || "graph-1",
          name: args.name || "Plant A",
          payload: args.canvasGraph,
          version: 1,
        })
        records.push(record)
        return record
      }),
      updateCanvasGraph: vi.fn(),
    }
    const service = createUdmV2FlowchartService(api)

    await expect(service.saveGraph(saveInput)).resolves.toMatchObject({
      graphFamily: "udm_network_v2",
      id: "graph-1",
    })
    await expect(service.listGraphs()).resolves.toEqual([
      {
        graphFamily: "udm_network_v2",
        id: "graph-1",
        name: "Plant A",
        version: 1,
      },
    ])
    expect(api.saveCanvasGraph).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { graph_family: "udm_network_v2" },
      }),
    )
  })

  it("rejects family mismatch on load and delete", async () => {
    const api = {
      archiveCanvasGraph: vi.fn(),
      getCanvasGraph: vi.fn(async () => canvasGraphRecord({
        graph_id: "legacy",
        name: "Legacy",
        payload: { graph_family: "legacy_flow" },
        version: 1,
      })),
      listCanvasGraphs: vi.fn(),
      saveCanvasGraph: vi.fn(),
      updateCanvasGraph: vi.fn(),
    }
    const service = createUdmV2FlowchartService(api)

    await expect(service.loadGraph("legacy")).rejects.toThrow(
      "UDM_V2_GRAPH_FAMILY_MISMATCH",
    )
    await expect(service.deleteGraph("legacy")).rejects.toThrow(
      "UDM_V2_GRAPH_FAMILY_MISMATCH",
    )
    expect(api.archiveCanvasGraph).not.toHaveBeenCalled()
  })
})
