import type { Edge, Node } from "@xyflow/react"
import { describe, expect, it } from "vitest"

import invalidGraphFixture from "../__fixtures__/invalid-network-process-graph.v1.json"
import graphFixture from "../__fixtures__/valid-network-process-graph.v1.json"
import inputFixture from "../__fixtures__/valid-network-simulation-input.v1.json"
import canvasFixture from "../__fixtures__/valid-network-v2-canvas.json"
import type { NetworkProcessGraphV1 } from "../contracts/generated"
import type { NetworkV2EdgeData } from "../edges/edgeModel"
import type { NetworkV2NodeData } from "../nodes/nodeTypes"
import {
  validateNetworkProcessGraphContract,
  validateNetworkSimulationInputContract,
} from "../serialize/contractValidation"
import { toNetworkProcessGraphV1 } from "../serialize/toNetworkProcessGraphV1"
import { toNetworkSimulationInputV1 } from "../serialize/toNetworkSimulationInputV1"

describe("network v2 serializer contract validation", () => {
  it("accepts committed valid graph and simulation input fixtures", () => {
    expect(validateNetworkProcessGraphContract(graphFixture).status).toBe(
      "valid",
    )
    expect(validateNetworkSimulationInputContract(inputFixture).status).toBe(
      "valid",
    )
  })

  it("validates generated graph and simulation input contracts", () => {
    const graph = toNetworkProcessGraphV1({
      graphId: "graph_valid_network_v2",
      sourceCanvasGraphId: canvasFixture.graph_id,
      nodes: canvasFixture.nodes as Node<NetworkV2NodeData>[],
      edges: canvasFixture.edges as Edge<NetworkV2EdgeData>[],
    })
    const input = toNetworkSimulationInputV1(graph)

    expect(validateNetworkProcessGraphContract(graph).diagnostics).toEqual([])
    expect(validateNetworkSimulationInputContract(input).diagnostics).toEqual(
      [],
    )
  })

  it("returns clear diagnostics for invalid graph fixtures", () => {
    const report = validateNetworkProcessGraphContract(invalidGraphFixture)

    expect(report.status).toBe("invalid")
    expect(report.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "CONTRACT_SCHEMA_INVALID",
          fieldPath: "network_graph_id",
        }),
      ]),
    )
  })

  it("builds simulation input from a process graph", () => {
    const input = toNetworkSimulationInputV1(
      graphFixture as unknown as NetworkProcessGraphV1,
      { simulationInputId: "custom-input" },
    )

    expect(input).toMatchObject({
      schema_version: "network_simulation_input.v1",
      simulation_input_id: "custom-input",
      job_type: "simulation.udm_network.v1",
      network_graph_id: "graph_valid_network_v2",
      runtime_options: {
        strict_flow_balance: true,
        strict_mass_balance: true,
        profile: "network_v2",
      },
    })
  })
})
