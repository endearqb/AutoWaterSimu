import type {
  NetworkV2ComponentPolicy,
  NetworkV2FlowSpec,
  NetworkV2TransportModel,
} from "../edges/edgeModel"
import {
  SECONDARY_CLARIFIER_V2_REFERENCE_COMPONENTS,
  SECONDARY_CLARIFIER_V2_REFERENCE_SCHEMA_ID,
  type SecondaryClarifierV2Config,
} from "./secondaryClarifierV2Defaults"

type ProcessGraphPort = {
  port_id: string
  port_kind: string
}

export type ExpandedSecondaryClarifierV2Node = {
  node_id: string
  node_type: string
  process_unit_type: string
  component_schema_id: string
  initial_conditions: Record<string, number>
  volume?: number
  ports: ProcessGraphPort[]
  model_binding: {
    model_kind: string
    model_id?: string
    model_version?: string
    reaction_enabled: boolean
  }
  parameter_binding: Record<string, number>
  unit_metadata: Record<string, unknown>
}

export type ExpandedSecondaryClarifierV2Edge = {
  edge_id: string
  edge_kind: "hydraulic" | "settling"
  source_node_id: string
  source_port: string
  target_node_id: string
  target_port: string
  component_policy: NetworkV2ComponentPolicy
  stream_adapter?: null
  flow_spec?: NetworkV2FlowSpec
  transport_model?: NetworkV2TransportModel
  metadata: Record<string, unknown>
}

export type ExpandedSecondaryClarifierV2Graph = {
  component_schemas: Array<{
    component_schema_id: string
    components: string[]
    unit: string
  }>
  nodes: ExpandedSecondaryClarifierV2Node[]
  edges: ExpandedSecondaryClarifierV2Edge[]
  flow_constraints: Array<Record<string, unknown>>
  signal_bindings: []
  composites: Array<Record<string, unknown>>
}

type ExpandOptions = {
  compositeId?: string
  componentSchemaId?: string
}

const hydraulicPolicy = (): NetworkV2ComponentPolicy => ({
  mode: "include",
  include: [...SECONDARY_CLARIFIER_V2_REFERENCE_COMPONENTS],
  exclude: [],
})

const settlingPolicy = (): NetworkV2ComponentPolicy => ({
  mode: "include",
  include: ["X_TSS"],
  exclude: [],
})

export function secondaryClarifierV2Expand(
  config: SecondaryClarifierV2Config,
  options: ExpandOptions = {},
): ExpandedSecondaryClarifierV2Graph {
  validateConfig(config)

  const compositeId = options.compositeId || "clarifier_1"
  const componentSchemaId =
    options.componentSchemaId || SECONDARY_CLARIFIER_V2_REFERENCE_SCHEMA_ID
  const layerNodes = createLayerNodes(config, compositeId, componentSchemaId)
  const boundaryNodes = createBoundaryNodes(config, compositeId, componentSchemaId)

  return {
    component_schemas: [
      {
        component_schema_id: componentSchemaId,
        components: [...SECONDARY_CLARIFIER_V2_REFERENCE_COMPONENTS],
        unit: "g/m3",
      },
    ],
    nodes: [...boundaryNodes, ...layerNodes],
    edges: [
      ...createBoundaryHydraulicEdges(config, compositeId),
      ...createInternalHydraulicEdges(config, compositeId),
      ...createSettlingEdges(config, compositeId),
    ],
    flow_constraints: createFlowConstraints(config, compositeId),
    signal_bindings: [],
    composites: [
      {
        composite_id: compositeId,
        composite_type: "SecondaryClarifier10Layer",
        profile: config.profile,
        geometry: {
          area_m2: config.area_m2,
          height_m: config.height_m,
          layers: config.layer_count,
          feed_layer: config.feed_layer,
        },
        ports: {
          influent: nodeId(compositeId, "influent"),
          effluent: nodeId(compositeId, "effluent"),
          ras: nodeId(compositeId, "ras"),
          was: nodeId(compositeId, "was"),
        },
      },
    ],
  }
}

function validateConfig(config: SecondaryClarifierV2Config) {
  if (config.layer_count !== 10) {
    throw new Error("SecondaryClarifier10Layer requires 10 layers")
  }
  if (config.feed_layer <= 1 || config.feed_layer >= config.layer_count) {
    throw new Error("feed_layer must be an internal generated layer")
  }
}

function createLayerNodes(
  config: SecondaryClarifierV2Config,
  compositeId: string,
  componentSchemaId: string,
) {
  const layerVolume = (config.area_m2 * config.height_m) / config.layer_count
  return Array.from({ length: config.layer_count }, (_, offset) => {
    const index = offset + 1
    const ports: ProcessGraphPort[] = [
      { port_id: "h_in", port_kind: "hydraulic_in" },
      { port_id: "h_out", port_kind: "hydraulic_out" },
      { port_id: "settling_in", port_kind: "settling_in" },
      { port_id: "settling_out", port_kind: "settling_out" },
    ]
    if (index === config.feed_layer) {
      ports.push({ port_id: "influent", port_kind: "hydraulic_in" })
    }
    if (index === 1) {
      ports.push({ port_id: "effluent", port_kind: "hydraulic_out" })
    }
    if (index === config.layer_count) {
      ports.push(
        { port_id: "ras", port_kind: "hydraulic_out" },
        { port_id: "was", port_kind: "hydraulic_out" },
      )
    }

    return {
      node_id: layerId(compositeId, index),
      node_type: "secondary_clarifier_layer",
      process_unit_type: "settling_layer",
      component_schema_id: componentSchemaId,
      initial_conditions: emptyReferenceState(),
      volume: layerVolume,
      ports,
      model_binding: {
        model_kind: "passive_udm",
        model_id: "secondary_clarifier_reference",
        model_version: "v1",
        reaction_enabled: false,
      },
      parameter_binding: {},
      unit_metadata: {
        composite_unit_id: compositeId,
        composite_type: "SecondaryClarifier10Layer",
        profile: config.profile,
        layer_index: index,
        feed_layer: config.feed_layer,
      },
    }
  })
}

function createBoundaryNodes(
  config: SecondaryClarifierV2Config,
  compositeId: string,
  componentSchemaId: string,
) {
  return [
    boundaryNode(config, compositeId, componentSchemaId, "influent", [
      { port_id: "out", port_kind: "hydraulic_out" },
    ]),
    boundaryNode(config, compositeId, componentSchemaId, "effluent", [
      { port_id: "in", port_kind: "hydraulic_in" },
    ]),
    boundaryNode(config, compositeId, componentSchemaId, "ras", [
      { port_id: "in", port_kind: "hydraulic_in" },
    ]),
    boundaryNode(config, compositeId, componentSchemaId, "was", [
      { port_id: "in", port_kind: "hydraulic_in" },
    ]),
  ]
}

function boundaryNode(
  config: SecondaryClarifierV2Config,
  compositeId: string,
  componentSchemaId: string,
  role: "influent" | "effluent" | "ras" | "was",
  ports: ProcessGraphPort[],
): ExpandedSecondaryClarifierV2Node {
  return {
    node_id: nodeId(compositeId, role),
    node_type: "controller",
    process_unit_type: "boundary",
    component_schema_id: componentSchemaId,
    initial_conditions:
      role === "influent" ? { ...config.feed_composition } : {},
    ports,
    model_binding: { model_kind: "controller", reaction_enabled: false },
    parameter_binding: {},
    unit_metadata: {
      composite_unit_id: compositeId,
      boundary_role: role,
      profile: config.profile,
    },
  }
}

function createBoundaryHydraulicEdges(
  config: SecondaryClarifierV2Config,
  compositeId: string,
) {
  return [
    hydraulicEdge(
      compositeId,
      "influent_feed",
      nodeId(compositeId, "influent"),
      "out",
      layerId(compositeId, config.feed_layer),
      "influent",
      withUnit(config.flows.influent_flow, {
        mode: "fixed",
        value: 100,
        unit: "m3/d",
      }),
      config.profile,
    ),
    hydraulicEdge(
      compositeId,
      "top_effluent",
      layerId(compositeId, 1),
      "effluent",
      nodeId(compositeId, "effluent"),
      "in",
      withUnit(config.flows.effluent_flow, { mode: "residual", unit: "m3/d" }),
      config.profile,
    ),
    hydraulicEdge(
      compositeId,
      "bottom_ras",
      layerId(compositeId, config.layer_count),
      "ras",
      nodeId(compositeId, "ras"),
      "in",
      withUnit(config.flows.ras_flow, { mode: "fixed", value: 25, unit: "m3/d" }),
      config.profile,
    ),
    hydraulicEdge(
      compositeId,
      "bottom_was",
      layerId(compositeId, config.layer_count),
      "was",
      nodeId(compositeId, "was"),
      "in",
      withUnit(config.flows.was_flow, { mode: "fixed", value: 5, unit: "m3/d" }),
      config.profile,
    ),
  ]
}

function createInternalHydraulicEdges(
  config: SecondaryClarifierV2Config,
  compositeId: string,
) {
  const edges: ExpandedSecondaryClarifierV2Edge[] = []
  for (let upper = config.feed_layer - 1; upper > 0; upper -= 1) {
    const lower = upper + 1
    edges.push(
      hydraulicEdge(
        compositeId,
        `hyd_up_${pad(lower)}_${pad(upper)}`,
        layerId(compositeId, lower),
        "h_out",
        layerId(compositeId, upper),
        "h_in",
        { mode: "balanced", unit: "m3/d" },
        config.profile,
      ),
    )
  }
  for (let upper = config.feed_layer; upper < config.layer_count; upper += 1) {
    const lower = upper + 1
    edges.push(
      hydraulicEdge(
        compositeId,
        `hyd_down_${pad(upper)}_${pad(lower)}`,
        layerId(compositeId, upper),
        "h_out",
        layerId(compositeId, lower),
        "h_in",
        { mode: "balanced", unit: "m3/d" },
        config.profile,
      ),
    )
  }
  return edges
}

function createSettlingEdges(
  config: SecondaryClarifierV2Config,
  compositeId: string,
) {
  return Array.from({ length: config.layer_count - 1 }, (_, offset) => {
    const upper = offset + 1
    const lower = upper + 1
    return {
      edge_id: edgeId(compositeId, `settling_${pad(upper)}_${pad(lower)}`),
      edge_kind: "settling",
      source_node_id: layerId(compositeId, upper),
      source_port: "settling_out",
      target_node_id: layerId(compositeId, lower),
      target_port: "settling_in",
      component_policy: settlingPolicy(),
      stream_adapter: null,
      transport_model: {
        model_id: "takacs_settling.v1",
        parameters: { area_m2: config.area_m2, ...defined(config.takacs) },
      },
      metadata: {
        composite_unit_id: compositeId,
        profile: config.profile,
        upper_layer: upper,
        lower_layer: lower,
      },
    } satisfies ExpandedSecondaryClarifierV2Edge
  })
}

function createFlowConstraints(
  config: SecondaryClarifierV2Config,
  compositeId: string,
) {
  return [
    {
      constraint_id: edgeId(compositeId, "feed_effluent_residual"),
      constraint_type: "residual",
      node_id: layerId(compositeId, config.feed_layer),
      known_outflow_edges: [
        edgeId(
          compositeId,
          `hyd_down_${pad(config.feed_layer)}_${pad(config.feed_layer + 1)}`,
        ),
      ],
      residual_edge_id: edgeId(
        compositeId,
        `hyd_up_${pad(config.feed_layer)}_${pad(config.feed_layer - 1)}`,
      ),
    },
  ]
}

function hydraulicEdge(
  compositeId: string,
  suffix: string,
  sourceNodeId: string,
  sourcePort: string,
  targetNodeId: string,
  targetPort: string,
  flowSpec: NetworkV2FlowSpec,
  profile: SecondaryClarifierV2Config["profile"],
): ExpandedSecondaryClarifierV2Edge {
  return {
    edge_id: edgeId(compositeId, suffix),
    edge_kind: "hydraulic",
    source_node_id: sourceNodeId,
    source_port: sourcePort,
    target_node_id: targetNodeId,
    target_port: targetPort,
    component_policy: hydraulicPolicy(),
    stream_adapter: null,
    flow_spec: withUnit(flowSpec, flowSpec),
    transport_model: undefined,
    metadata: { composite_unit_id: compositeId, profile },
  }
}

function withUnit(
  flowSpec: NetworkV2FlowSpec | undefined,
  fallback: NetworkV2FlowSpec,
): NetworkV2FlowSpec {
  return { unit: "m3/d", ...fallback, ...flowSpec }
}

function emptyReferenceState() {
  return Object.fromEntries(
    SECONDARY_CLARIFIER_V2_REFERENCE_COMPONENTS.map((component) => [
      component,
      0,
    ]),
  )
}

function defined(values: Record<string, number | undefined>) {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== undefined),
  )
}

function layerId(compositeId: string, index: number) {
  return `${compositeId}_layer_${pad(index)}`
}

function nodeId(compositeId: string, role: string) {
  return `${compositeId}_${role}`
}

function edgeId(compositeId: string, suffix: string) {
  return `${compositeId}_${suffix}`
}

function pad(value: number) {
  return String(value).padStart(2, "0")
}
