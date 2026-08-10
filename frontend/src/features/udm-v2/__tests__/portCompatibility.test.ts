import type { Connection, Node } from "@xyflow/react"
import { describe, expect, it } from "vitest"

import { validateNetworkV2Connection } from "../edges/connectionRules"
import type { NetworkV2EdgeKind } from "../edges/edgeModel"
import type { NetworkV2NodeData, NetworkV2Port } from "../nodes/nodeTypes"
import { createNetworkV2NodeData } from "../nodes/nodeTypes"

const port = (
  id: string,
  port_kind: NonNullable<NetworkV2Port["port_kind"]>,
): NetworkV2Port => ({
  id,
  label: id,
  role: port_kind.endsWith("_in") ? "inlet" : "outlet",
  placement: port_kind.endsWith("_in") ? "left" : "right",
  port_kind,
})

const nodes: Node<NetworkV2NodeData>[] = [
  {
    id: "source",
    position: { x: 0, y: 0 },
    data: {
      ...createNetworkV2NodeData("boundary"),
      ports: [
        port("hydraulic_out", "hydraulic_out"),
        port("settling_out", "settling_out"),
        port("signal_out", "signal_out"),
      ],
    },
  },
  {
    id: "target",
    position: { x: 100, y: 0 },
    data: {
      ...createNetworkV2NodeData("udm_reactor"),
      ports: [
        port("hydraulic_in", "hydraulic_in"),
        port("settling_in", "settling_in"),
        port("signal_in", "signal_in"),
      ],
    },
  },
]

const valid = (
  edgeKind: NetworkV2EdgeKind,
  sourceHandle: string | null,
  targetHandle: string | null,
  connection: Partial<Connection> = {},
) =>
  validateNetworkV2Connection({
    nodes,
    edgeKind,
    connection: {
      source: "source",
      target: "target",
      sourceHandle,
      targetHandle,
      ...connection,
    },
  }).valid

describe("validateNetworkV2Connection", () => {
  it("enforces canonical port capabilities", () => {
    expect(valid("hydraulic", "hydraulic_out", "hydraulic_in")).toBe(true)
    expect(valid("pump", "hydraulic_out", "hydraulic_in")).toBe(true)
    expect(valid("settling", "settling_out", "settling_in")).toBe(true)
    expect(valid("signal", "signal_out", "signal_in")).toBe(true)
    expect(valid("signal", "signal_out", "hydraulic_in")).toBe(false)
    expect(valid("settling", "hydraulic_out", "hydraulic_in")).toBe(false)
    expect(valid("hydraulic", null, "hydraulic_in")).toBe(false)
    expect(
      valid("hydraulic", "hydraulic_out", "hydraulic_in", {
        target: "source",
      }),
    ).toBe(false)
  })
})
