import { describe, expect, it } from "vitest"

import {
  NETWORK_V2_NODE_KIND_OPTIONS,
  createNetworkV2Node,
  createNetworkV2NodeData,
  networkV2NodeTypeByKind,
  networkV2NodeTypes,
} from "../nodes/nodeTypes"

describe("network v2 node factory", () => {
  it("registers one renderer per v2 node type", () => {
    expect(Object.keys(networkV2NodeTypes).sort()).toEqual([
      "boundary_v2",
      "clarifier_layer_v2",
      "controller_v2",
      "secondary_clarifier_10_layer_v2",
      "splitter_v2",
      "udm_reactor_v2",
    ])
  })

  it("creates default data with required semantic fields and ports", () => {
    for (const option of NETWORK_V2_NODE_KIND_OPTIONS) {
      const data = createNetworkV2NodeData(option.kind)

      expect(data.label).toBeTruthy()
      expect(data.node_kind).toBe(option.kind)
      expect(data.component_schema_id).toBeTruthy()
      expect(data.model_binding.reaction_enabled).toBe(false)
      expect(data.initial_conditions).toEqual(
        expect.objectContaining({ COD: 0, X_TSS: 0 }),
      )
      expect(data.ports.length).toBeGreaterThan(0)
      expect(data.ports.every((port) => port.id && port.label)).toBe(true)
    }
  })

  it("creates React Flow nodes with matching type and data kind", () => {
    for (const option of NETWORK_V2_NODE_KIND_OPTIONS) {
      const node = createNetworkV2Node(option.kind, { x: 1, y: 2 })

      expect(node.type).toBe(networkV2NodeTypeByKind[option.kind])
      expect(node.position).toEqual({ x: 1, y: 2 })
      expect(node.data.node_kind).toBe(option.kind)
    }
  })
})
