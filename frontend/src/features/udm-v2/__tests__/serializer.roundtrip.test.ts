import type { Edge, Node } from "@xyflow/react"
import { describe, expect, it } from "vitest"

import canvasFixture from "../__fixtures__/valid-network-v2-canvas.json"
import type { NetworkProcessGraphV1 } from "../contracts/generated"
import type { NetworkV2EdgeData } from "../edges/edgeModel"
import type { NetworkV2NodeData } from "../nodes/nodeTypes"
import { fromNetworkProcessGraphV1 } from "../serialize/fromNetworkProcessGraphV1"
import {
  stableStringify,
  toNetworkProcessGraphV1,
} from "../serialize/toNetworkProcessGraphV1"

describe("network v2 serializer roundtrip", () => {
  it("keeps key node and edge fields across canvas -> graph -> canvas", () => {
    const graph = toNetworkProcessGraphV1({
      graphId: "graph_valid_network_v2",
      sourceCanvasGraphId: canvasFixture.graph_id,
      nodes: canvasFixture.nodes as Node<NetworkV2NodeData>[],
      edges: canvasFixture.edges as Edge<NetworkV2EdgeData>[],
    })
    const canvas = fromNetworkProcessGraphV1(graph)

    expect(graph.schema_version).toBe("network_process_graph.v1")
    expect(graph.nodes.map((node) => node.node_id)).toEqual([
      "influent",
      "reactor",
    ])
    expect(graph.edges[0]).toMatchObject({
      edge_id: "e_influent_reactor",
      edge_kind: "hydraulic",
      flow_spec: { mode: "fixed", value: 100, unit: "m3/d" },
    })
    expect(canvas.nodes.map((node) => node.id)).toEqual(["influent", "reactor"])
    expect(canvas.nodes[1].data).toMatchObject({
      label: "Reactor",
      node_kind: "udm_reactor",
      initial_conditions: { COD: 50, X_TSS: 80 },
    })
    expect(canvas.edges[0].data?.flow_spec).toMatchObject({
      mode: "fixed",
      value: 100,
      unit: "m3/d",
    })
  })

  it("produces stable JSON for snapshots", () => {
    const graph = toNetworkProcessGraphV1({
      graphId: "graph_valid_network_v2",
      nodes: canvasFixture.nodes as Node<NetworkV2NodeData>[],
      edges: canvasFixture.edges as Edge<NetworkV2EdgeData>[],
    })

    expect(stableStringify(graph)).toBe(stableStringify(graph))
    expect(
      Object.keys(JSON.parse(stableStringify(graph)) as NetworkProcessGraphV1),
    ).toEqual([
      "component_schemas",
      "composites",
      "edges",
      "flow_constraints",
      "metadata",
      "network_graph_id",
      "nodes",
      "schema_version",
      "signal_bindings",
      "validation",
      "version",
    ])
  })
})
