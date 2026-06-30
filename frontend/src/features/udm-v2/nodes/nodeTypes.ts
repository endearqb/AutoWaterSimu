import type { Node, NodeTypes, XYPosition } from "@xyflow/react"

import {
  createDefaultSecondaryClarifierV2Config,
  type SecondaryClarifierV2Config,
} from "../composite/secondaryClarifierV2Defaults"
import { BoundaryV2Node } from "./BoundaryV2Node"
import { ControllerV2Node } from "./ControllerV2Node"
import { SecondaryClarifier10LayerV2Node } from "./SecondaryClarifier10LayerV2Node"
import { SplitterV2Node } from "./SplitterV2Node"
import { UdmReactorV2Node } from "./UdmReactorV2Node"

export type NetworkV2NodeKind =
  | "boundary"
  | "udm_reactor"
  | "secondary_clarifier_10_layer"
  | "splitter"
  | "controller"

export type NetworkV2ReactFlowNodeType =
  | "boundary_v2"
  | "udm_reactor_v2"
  | "secondary_clarifier_10_layer_v2"
  | "splitter_v2"
  | "controller_v2"

export type NetworkV2PortRole =
  | "inlet"
  | "outlet"
  | "signal_in"
  | "signal_out"

export type NetworkV2PortPlacement = "left" | "right" | "top" | "bottom"

export type NetworkV2Port = {
  id: string
  label: string
  role: NetworkV2PortRole
  placement: NetworkV2PortPlacement
}

export type SecondaryClarifierV2CompositeData = SecondaryClarifierV2Config

export type NetworkV2NodeData = {
  label: string
  node_kind: NetworkV2NodeKind
  process_unit_type: string
  component_schema_id: string
  initial_conditions: Record<string, number>
  volume_m3?: number
  model_binding: {
    model_kind:
      | "passive"
      | "udm"
      | "asm1"
      | "asm1slim"
      | "asm3"
      | "controller"
    model_id?: string
    model_version?: string | number
    reaction_enabled: boolean
  }
  parameter_binding: Record<string, number>
  boundary?: {
    boundary_kind: "source" | "sink" | "constant_composition" | "effluent"
    feed_composition?: Record<string, number>
  }
  composite?: SecondaryClarifierV2CompositeData
  ports: NetworkV2Port[]
  ui?: {
    collapsed?: boolean
    diagnostics?: string[]
  }
}

export const DEFAULT_NETWORK_V2_COMPONENT_SCHEMA_ID =
  "udm_network_minimal_components.v1"

const defaultInitialConditions = (): Record<string, number> => ({
  COD: 0,
  X_TSS: 0,
})

const passiveBinding = (): NetworkV2NodeData["model_binding"] => ({
  model_kind: "passive",
  reaction_enabled: false,
})

export const networkV2NodeTypeByKind: Record<
  NetworkV2NodeKind,
  NetworkV2ReactFlowNodeType
> = {
  boundary: "boundary_v2",
  udm_reactor: "udm_reactor_v2",
  secondary_clarifier_10_layer: "secondary_clarifier_10_layer_v2",
  splitter: "splitter_v2",
  controller: "controller_v2",
}

export const NETWORK_V2_NODE_KIND_OPTIONS: Array<{
  kind: NetworkV2NodeKind
  label: string
  shortLabel: string
  description: string
}> = [
  {
    kind: "boundary",
    label: "Boundary",
    shortLabel: "Boundary",
    description: "Source, sink, or effluent boundary",
  },
  {
    kind: "udm_reactor",
    label: "UDM Reactor",
    shortLabel: "Reactor",
    description: "Reaction-capable process unit",
  },
  {
    kind: "secondary_clarifier_10_layer",
    label: "Secondary Clarifier 10-Layer",
    shortLabel: "Clarifier",
    description: "Reference 10-layer settling composite",
  },
  {
    kind: "splitter",
    label: "Splitter",
    shortLabel: "Splitter",
    description: "Hydraulic split junction",
  },
  {
    kind: "controller",
    label: "Controller",
    shortLabel: "Control",
    description: "Signal input/output controller",
  },
]

export const NETWORK_V2_NODE_KINDS = NETWORK_V2_NODE_KIND_OPTIONS.map(
  (option) => option.kind,
)

export function normalizeNetworkV2NodeKind(value: unknown): NetworkV2NodeKind {
  return NETWORK_V2_NODE_KINDS.includes(value as NetworkV2NodeKind)
    ? (value as NetworkV2NodeKind)
    : "boundary"
}

export function createNetworkV2NodeData(
  kind: NetworkV2NodeKind,
): NetworkV2NodeData {
  const base = {
    component_schema_id: DEFAULT_NETWORK_V2_COMPONENT_SCHEMA_ID,
    initial_conditions: defaultInitialConditions(),
    parameter_binding: {},
    ui: { collapsed: false, diagnostics: [] },
  }

  if (kind === "udm_reactor") {
    return {
      ...base,
      label: "UDM Reactor",
      node_kind: kind,
      process_unit_type: "udm_reactor",
      volume_m3: 1000,
      model_binding: { model_kind: "udm", reaction_enabled: false },
      ports: [
        { id: "in", label: "In", role: "inlet", placement: "left" },
        { id: "out", label: "Out", role: "outlet", placement: "right" },
      ],
    }
  }

  if (kind === "secondary_clarifier_10_layer") {
    return {
      ...base,
      label: "Secondary Clarifier",
      node_kind: kind,
      process_unit_type: "secondary_clarifier_10_layer",
      volume_m3: 6000,
      model_binding: passiveBinding(),
      composite: createDefaultSecondaryClarifierV2Config(),
      ports: [
        { id: "feed", label: "Feed", role: "inlet", placement: "left" },
        { id: "effluent", label: "Effluent", role: "outlet", placement: "right" },
        { id: "ras", label: "RAS", role: "outlet", placement: "bottom" },
        { id: "was", label: "WAS", role: "outlet", placement: "bottom" },
      ],
    }
  }

  if (kind === "splitter") {
    return {
      ...base,
      label: "Splitter",
      node_kind: kind,
      process_unit_type: "splitter",
      model_binding: passiveBinding(),
      ports: [
        { id: "in", label: "In", role: "inlet", placement: "left" },
        { id: "out_a", label: "Out A", role: "outlet", placement: "right" },
        { id: "out_b", label: "Out B", role: "outlet", placement: "bottom" },
      ],
    }
  }

  if (kind === "controller") {
    return {
      ...base,
      label: "Controller",
      node_kind: kind,
      process_unit_type: "controller",
      model_binding: { model_kind: "controller", reaction_enabled: false },
      ports: [
        { id: "signal_in", label: "Signal In", role: "signal_in", placement: "left" },
        { id: "signal_out", label: "Signal Out", role: "signal_out", placement: "right" },
      ],
    }
  }

  return {
    ...base,
    label: "Boundary",
    node_kind: "boundary",
    process_unit_type: "boundary",
    model_binding: passiveBinding(),
    boundary: {
      boundary_kind: "source",
      feed_composition: defaultInitialConditions(),
    },
    ports: [{ id: "out", label: "Out", role: "outlet", placement: "right" }],
  }
}

export function createNetworkV2Node(
  kind: NetworkV2NodeKind,
  position: XYPosition,
): Node<NetworkV2NodeData> {
  return {
    id: `node-${kind}-${Date.now()}`,
    type: networkV2NodeTypeByKind[kind],
    position,
    data: createNetworkV2NodeData(kind),
  }
}

export const networkV2NodeTypes: NodeTypes = {
  boundary_v2: BoundaryV2Node,
  udm_reactor_v2: UdmReactorV2Node,
  secondary_clarifier_10_layer_v2: SecondaryClarifier10LayerV2Node,
  splitter_v2: SplitterV2Node,
  controller_v2: ControllerV2Node,
}
