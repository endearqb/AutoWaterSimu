import type { Edge, Node } from "@xyflow/react"
import { describe, expect, it } from "vitest"

import {
  type NetworkV2EdgeData,
  createNetworkV2EdgeData,
} from "../edges/edgeModel"
import {
  type NetworkV2NodeData,
  createNetworkV2NodeData,
} from "../nodes/nodeTypes"
import { mapDiagnosticToInspectorTarget } from "../serialize/diagnosticsMapping"
import {
  type NetworkV2FlowConstraint,
  validateNetworkV2Graph,
} from "../serialize/semanticValidation"

const nodes: Node<NetworkV2NodeData>[] = [
  {
    id: "source",
    type: "boundary_v2",
    position: { x: 0, y: 0 },
    data: createNetworkV2NodeData("boundary"),
  },
  {
    id: "reactor",
    type: "udm_reactor_v2",
    position: { x: 100, y: 0 },
    data: createNetworkV2NodeData("udm_reactor"),
  },
]

const edge = (
  id: string,
  type: string,
  data: NetworkV2EdgeData,
): Edge<NetworkV2EdgeData> => ({
  id,
  source: "source",
  sourceHandle: "out",
  target: "reactor",
  targetHandle: "in",
  type,
  data,
})

describe("network v2 semantic validation", () => {
  it("rejects settling flow specs and maps diagnostics to fields", () => {
    const report = validateNetworkV2Graph({
      nodes,
      edges: [
        edge("settling-1", "settling_v2", {
          ...createNetworkV2EdgeData("settling"),
          flow_spec: { mode: "fixed", value: 1 },
        }),
      ],
      flowConstraints: [],
    })

    expect(report.status).toBe("invalid")
    const diagnostic = report.diagnostics.find(
      (item) => item.code === "SETTLING_VOLUME_CONTRIBUTION_FORBIDDEN",
    )!
    expect(mapDiagnosticToInspectorTarget(diagnostic)).toEqual({
      tab: "edge",
      elementId: "settling-1",
      fieldPath: "flow_spec",
    })
  })

  it("rejects signal mass and volume fields", () => {
    const report = validateNetworkV2Graph({
      nodes,
      edges: [
        edge("signal-1", "signal_v2", {
          ...createNetworkV2EdgeData("signal"),
          flow_spec: { mode: "fixed", value: 1 },
          transport_model: { model_id: "takacs_settling.v1" },
        }),
      ],
      flowConstraints: [],
    })

    expect(report.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining([
        "SIGNAL_VOLUME_CONTRIBUTION_FORBIDDEN",
        "SIGNAL_MASS_CONTRIBUTION_FORBIDDEN",
      ]),
    )
  })

  it("rejects unknown component policy references", () => {
    const report = validateNetworkV2Graph({
      nodes,
      edges: [
        edge("hydraulic-1", "hydraulic_v2", {
          ...createNetworkV2EdgeData("hydraulic"),
          component_policy: {
            mode: "include",
            include: ["NOT_A_COMPONENT"],
            exclude: [],
          },
        }),
      ],
      flowConstraints: [],
    })

    const diagnostic = report.diagnostics.find(
      (item) => item.code === "UNKNOWN_COMPONENT_IN_POLICY",
    )!
    expect(diagnostic.fieldPath).toBe("component_policy.include")
  })

  it("rejects missing edge references and invalid flow constraint values", () => {
    const constraints: NetworkV2FlowConstraint[] = [
      {
        id: "split-1",
        constraint_kind: "split",
        edge_ids: ["missing-edge"],
        value: 1.5,
      },
    ]
    const report = validateNetworkV2Graph({
      nodes,
      edges: [],
      flowConstraints: constraints,
    })

    expect(report.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "FLOW_CONSTRAINT_EDGE_NOT_FOUND",
      "FLOW_CONSTRAINT_INVALID_VALUE",
    ])
  })
})
