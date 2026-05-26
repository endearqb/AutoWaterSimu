export const SUPPORTED_JOB_TYPE = "simulation.material_balance.v1"

export type ContractErrorDetail = {
  path: string
  reason: string
  source_id: unknown
}

export class ContractTransformError extends Error {
  details: ContractErrorDetail[]

  constructor(message: string, details: ContractErrorDetail[] = []) {
    super(message)
    this.name = "ContractTransformError"
    this.details = details
  }
}

export type CanvasGraph = {
  schema_version: "canvas_graph.v1"
  graph_id: string
  name: string
  component_schema?: { components?: string[]; unit?: string }
  customParameters?: Array<{ name?: string }>
  calculationParameters?: Record<string, unknown>
  timeSegments?: Array<Record<string, unknown>>
  time_segments?: Array<Record<string, unknown>>
  nodes: Array<{
    id: string
    type: string
    position: Record<string, unknown>
    data: Record<string, unknown>
  }>
  edges: Array<{
    id: string
    source: string
    target: string
    sourceHandle?: string
    targetHandle?: string
    data?: Record<string, unknown>
  }>
  exported_at: string
  metadata?: {
    component_schema?: { components?: string[]; unit?: string }
    customParameters?: Array<{ name?: string }>
    calculationParameters?: Record<string, unknown>
    timeSegments?: Array<Record<string, unknown>>
    time_segments?: Array<Record<string, unknown>>
    source_format?: string
    version?: unknown
  }
}

export type LegacyFlowExport = {
  graph_id?: string
  name?: string
  nodes?: CanvasGraph["nodes"]
  edges?: CanvasGraph["edges"]
  customParameters?: Array<{ name?: string }>
  calculationParameters?: Record<string, unknown>
  timeSegments?: Array<Record<string, unknown>>
  time_segments?: Array<Record<string, unknown>>
  exportedAt?: string
  exported_at?: string
  version?: string
  component_schema?: { components?: string[]; unit?: string }
}

export type ProcessGraph = {
  schema_version: "process_graph.v1"
  process_graph_id: string
  version: number
  source_canvas_graph_id: string
  component_schema: { component_schema_id: string; components: string[]; unit: string }
  nodes: ProcessNode[]
  edges: ProcessEdge[]
  validation: { status: "valid"; errors: []; warnings: string[] }
  metadata?: Record<string, unknown>
}

export type ProcessNode = {
  node_id: string
  node_type: string
  process_unit_type: string
  ports: Array<Record<string, string>>
  volume: number
  initial_conditions: Record<string, number>
  model_binding: Record<string, string>
  parameter_binding: Record<string, unknown>
  unit_metadata: Record<string, unknown>
}

export type ProcessEdge = {
  edge_id: string
  source_node_id: string
  target_node_id: string
  source_port: string
  target_port: string
  flow_rate: number
  concentration_transform: Record<string, { a: number; b: number }>
  time_segment_overrides: Array<Record<string, unknown>>
}

export type SimulationInput = {
  schema_version: "simulation_input.v1"
  simulation_input_id: string
  process_graph_id: string
  process_graph_version: number
  job_type: typeof SUPPORTED_JOB_TYPE
  component_schema: ProcessGraph["component_schema"]
  nodes: Array<Record<string, unknown>>
  edges: Array<Record<string, unknown>>
  time_segments: Array<Record<string, unknown>>
  parameters: Record<string, unknown>
  runtime_options: Record<string, unknown>
  metadata?: Record<string, unknown>
}

export function legacyFlowExportToCanvasGraph(
  flowExport: LegacyFlowExport,
  graphId = "legacy_flow_export",
  name = "Legacy Flow Export",
): CanvasGraph {
  return {
    schema_version: "canvas_graph.v1",
    graph_id: stringValue(flowExport.graph_id) || graphId,
    name: stringValue(flowExport.name) || name,
    nodes: flowExport.nodes || [],
    edges: flowExport.edges || [],
    exported_at: stringValue(flowExport.exported_at) || stringValue(flowExport.exportedAt) || "1970-01-01T00:00:00Z",
    metadata: {
      component_schema: flowExport.component_schema || {},
      customParameters: flowExport.customParameters || [],
      calculationParameters: flowExport.calculationParameters || {},
      timeSegments: flowExport.timeSegments || flowExport.time_segments || [],
      source_format: "legacy_flow_export",
      version: flowExport.version,
    },
  }
}

const DEFAULT_COMPONENT = "COD"
const DEFAULT_FLOW_RATE = 1000
const DEFAULT_PARAMETERS = {
  hours: 4,
  steps_per_hour: 60,
  solver_method: "scipy_solver",
  tolerance: 0.000001,
  max_iterations: 1000,
  max_memory_mb: 1000,
}

export function buildContractError(
  message: string,
  details: ContractErrorDetail[] | Record<string, unknown> = [],
  traceId = "trace_contract_transform",
) {
  return {
    schema_version: "contract_error.v1",
    error_code: "VALIDATION_FAILED",
    message,
    details: Array.isArray(details) ? { items: details } : details,
    retryable: false,
    trace_id: traceId,
  }
}

export function canvasGraphToProcessGraph(canvasGraph: CanvasGraph): ProcessGraph {
  if (canvasGraph.schema_version !== "canvas_graph.v1") {
    throw new ContractTransformError("Schema version mismatch", [
      detail("$.schema_version", "schema_version must be canvas_graph.v1", undefined),
    ])
  }

  const components = resolveComponents(canvasGraph)
  const timeSegments = resolveTimeSegments(canvasGraph)
  const errors: ContractErrorDetail[] = []
  const warnings: string[] = []
  const nodeIds = new Set<string>()

  canvasGraph.nodes.forEach((node, index) => {
    if (!node.id) {
      errors.push(detail(`$.nodes[${index}].id`, "node id is required", undefined))
    } else if (nodeIds.has(node.id)) {
      errors.push(detail(`$.nodes[${index}].id`, "duplicate node id", node.id))
    }
    nodeIds.add(node.id)
  })

  canvasGraph.edges.forEach((edge, index) => {
    if (!nodeIds.has(edge.source)) {
      errors.push(detail(`$.edges[${index}].source`, "edge references unknown source node", edge.id))
    }
    if (!nodeIds.has(edge.target)) {
      errors.push(detail(`$.edges[${index}].target`, "edge references unknown target node", edge.id))
    }
  })

  if (errors.length > 0) {
    throw new ContractTransformError("CanvasGraph validation failed", errors)
  }

  const processGraph: ProcessGraph = {
    schema_version: "process_graph.v1",
    process_graph_id: `pg_${canvasGraph.graph_id}`,
    version: 1,
    source_canvas_graph_id: canvasGraph.graph_id,
    component_schema: {
      component_schema_id: "material_balance_components.v1",
      components,
      unit: resolveComponentSchema(canvasGraph).unit || "mg/L",
    },
    nodes: canvasGraph.nodes.map((node) => canvasNodeToProcessNode(node, components, warnings)),
    edges: canvasGraph.edges.map((edge) => canvasEdgeToProcessEdge(edge, components, warnings, timeSegments)),
    validation: { status: "valid", errors: [], warnings },
    metadata: {
      source_name: canvasGraph.name,
      source_exported_at: canvasGraph.exported_at,
      source_calculation_parameters: resolveCalculationParameters(canvasGraph),
    },
  }

  const [isValid, validationErrors] = validateProcessGraph(processGraph)
  if (!isValid) {
    throw new ContractTransformError("ProcessGraph validation failed", validationErrors)
  }
  return processGraph
}

export function validateProcessGraph(processGraph: ProcessGraph): [boolean, ContractErrorDetail[]] {
  const errors: ContractErrorDetail[] = []
  const components = processGraph.component_schema?.components || []
  const nodeIds = new Set<string>()

  if (components.length === 0) {
    errors.push(detail("$.component_schema.components", "at least one component is required", undefined))
  }

  processGraph.nodes.forEach((node, index) => {
    if (nodeIds.has(node.node_id)) {
      errors.push(detail(`$.nodes[${index}].node_id`, "duplicate node id", node.node_id))
    }
    nodeIds.add(node.node_id)
  })

  processGraph.edges.forEach((edge, index) => {
    if (!nodeIds.has(edge.source_node_id)) {
      errors.push(detail(`$.edges[${index}].source_node_id`, "edge references unknown source node", edge.edge_id))
    }
    if (!nodeIds.has(edge.target_node_id)) {
      errors.push(detail(`$.edges[${index}].target_node_id`, "edge references unknown target node", edge.edge_id))
    }
    components.forEach((component) => {
      const factor = edge.concentration_transform[component]
      if (!factor || factor.a === undefined || factor.b === undefined) {
        errors.push(detail(`$.edges[${index}].concentration_transform.${component}`, "component transform must include a and b", edge.edge_id))
      }
    })
  })

  return [errors.length === 0, errors]
}

export function processGraphToSimulationInput(
  processGraph: ProcessGraph,
  parameters: Record<string, unknown> = {},
): SimulationInput {
  const [isValid, errors] = validateProcessGraph(processGraph)
  if (!isValid) {
    throw new ContractTransformError("ProcessGraph validation failed", errors)
  }

  return {
    schema_version: "simulation_input.v1",
    simulation_input_id: `si_${processGraph.process_graph_id}`,
    process_graph_id: processGraph.process_graph_id,
    process_graph_version: processGraph.version,
    job_type: SUPPORTED_JOB_TYPE,
    component_schema: { ...processGraph.component_schema },
    nodes: processGraph.nodes.map((node) => ({
      node_id: node.node_id,
      node_type: node.node_type,
      initial_volume: node.volume,
      initial_concentrations: { ...node.initial_conditions },
      is_inlet: node.node_type === "input" || node.node_type === "inlet",
      is_outlet: node.node_type === "output" || node.node_type === "outlet",
    })),
    edges: processGraph.edges.map((edge) => ({
      edge_id: edge.edge_id,
      source_node_id: edge.source_node_id,
      target_node_id: edge.target_node_id,
      flow_rate: edge.flow_rate,
      concentration_transform: { ...edge.concentration_transform },
    })),
    time_segments: collectTimeSegments(processGraph),
    parameters: {
      ...DEFAULT_PARAMETERS,
      ...(isRecord(processGraph.metadata?.source_calculation_parameters)
        ? processGraph.metadata?.source_calculation_parameters
        : {}),
      ...parameters,
    },
    runtime_options: {
      numerical_tolerance: { rtol: 0.000001, atol: 0.000000001 },
    },
    metadata: {
      source_canvas_graph_id: processGraph.source_canvas_graph_id,
      transform: "process_graph_to_simulation_input.v1",
    },
  }
}

function canvasNodeToProcessNode(
  node: CanvasGraph["nodes"][number],
  components: string[],
  warnings: string[],
): ProcessNode {
  const isInput = node.type === "input" || node.type === "inlet"
  const isOutput = node.type === "output" || node.type === "outlet"
  const volume = nodeVolume(node, isInput, isOutput)
  const initialConditions: Record<string, number> = {}

  components.forEach((component) => {
    const raw = node.data[component]
    if (raw === undefined || raw === null || raw === "") {
      warnings.push(`Node ${node.id} missing ${component}; defaulted to 0.0`)
    }
    initialConditions[component] = numberValue(raw, 0)
  })

  return {
    node_id: node.id,
    node_type: node.type,
    process_unit_type: isInput ? "influent" : isOutput ? "effluent" : "storage",
    ports: isInput
      ? [{ port_id: "out", direction: "out" }]
      : isOutput
        ? [{ port_id: "in", direction: "in" }]
        : [{ port_id: "in", direction: "in" }, { port_id: "out", direction: "out" }],
    volume,
    initial_conditions: initialConditions,
    model_binding: { model_key: "material_balance", model_version: "v1" },
    parameter_binding: {},
    unit_metadata: {
      volume: "m3",
      concentration: "mg/L",
      position: node.position,
      label: node.data.label || node.id,
    },
  }
}

function canvasEdgeToProcessEdge(
  edge: CanvasGraph["edges"][number],
  components: string[],
  warnings: string[],
  timeSegments: Array<Record<string, unknown>>,
): ProcessEdge {
  const data = edge.data || {}
  const rawFlow = data.flow_rate ?? data.flow
  if (rawFlow === undefined || rawFlow === null || rawFlow === "") {
    warnings.push(`Edge ${edge.id} missing flow; defaulted to ${DEFAULT_FLOW_RATE}`)
  }

  const concentrationTransform: ProcessEdge["concentration_transform"] = {}
  const nestedTransform = isRecord(data.concentration_transform) ? data.concentration_transform : {}
  components.forEach((component) => {
    const rawNestedFactor = nestedTransform[component]
    const nestedFactor: Record<string, unknown> = isRecord(rawNestedFactor) ? rawNestedFactor : {}
    concentrationTransform[component] = {
      a: numberValue(nestedFactor.a ?? data[`${component}_a`], 1),
      b: numberValue(nestedFactor.b ?? data[`${component}_b`], 0),
    }
  })

  return {
    edge_id: edge.id,
    source_node_id: edge.source,
    target_node_id: edge.target,
    source_port: edge.sourceHandle || "out",
    target_port: edge.targetHandle || "in",
    flow_rate: numberValue(rawFlow, DEFAULT_FLOW_RATE),
    concentration_transform: concentrationTransform,
    time_segment_overrides: timeSegmentOverridesForEdge(edge.id, timeSegments),
  }
}

function resolveComponents(canvasGraph: CanvasGraph): string[] {
  const schemaComponents = resolveComponentSchema(canvasGraph).components || []
  if (schemaComponents.length > 0) return schemaComponents
  const customParameters = canvasGraph.customParameters || canvasGraph.metadata?.customParameters || []
  const components = customParameters.map((item) => item.name || "").filter(Boolean)
  return components.length > 0 ? components : [DEFAULT_COMPONENT]
}

function resolveComponentSchema(canvasGraph: CanvasGraph): { components?: string[]; unit?: string } {
  return canvasGraph.component_schema || canvasGraph.metadata?.component_schema || {}
}

function resolveCalculationParameters(canvasGraph: CanvasGraph): Record<string, unknown> {
  return canvasGraph.calculationParameters || canvasGraph.metadata?.calculationParameters || {}
}

function resolveTimeSegments(canvasGraph: CanvasGraph): Array<Record<string, unknown>> {
  return canvasGraph.timeSegments || canvasGraph.time_segments || canvasGraph.metadata?.timeSegments || canvasGraph.metadata?.time_segments || []
}

function timeSegmentOverridesForEdge(
  edgeId: string,
  timeSegments: Array<Record<string, unknown>>,
): Array<Record<string, unknown>> {
  return timeSegments.flatMap((segment, index) => {
    const edgeOverrides = isRecord(segment.edgeOverrides)
      ? segment.edgeOverrides
      : isRecord(segment.edge_overrides)
        ? segment.edge_overrides
        : {}
    const rawOverride = edgeOverrides[edgeId]
    if (!isRecord(rawOverride)) return []
    const segmentId = stringValue(segment.id) || `seg_${index + 1}`
    return [{
      segment_id: segmentId,
      start_hour: numberValue(segment.startHour ?? segment.start_hour, 0),
      end_hour: numberValue(segment.endHour ?? segment.end_hour, 0),
      flow: rawOverride.flow,
      factors: isRecord(rawOverride.factors) ? { ...rawOverride.factors } : {},
    }]
  })
}

function collectTimeSegments(processGraph: ProcessGraph): Array<Record<string, unknown>> {
  const segments = new Map<string, Record<string, unknown> & { edge_overrides: Record<string, unknown> }>()
  processGraph.edges.forEach((edge) => {
    edge.time_segment_overrides.forEach((rawOverride, index) => {
      const segmentId = stringValue(rawOverride.segment_id ?? rawOverride.id) || `seg_${index + 1}`
      const segment = segments.get(segmentId) || {
        id: segmentId,
        start_hour: numberValue(rawOverride.start_hour ?? rawOverride.startHour, 0),
        end_hour: numberValue(rawOverride.end_hour ?? rawOverride.endHour, 0),
        edge_overrides: {},
      }
      const override: Record<string, unknown> = {
        factors: isRecord(rawOverride.factors) ? { ...rawOverride.factors } : {},
      }
      if (rawOverride.flow !== undefined && rawOverride.flow !== null) {
        override.flow = numberValue(rawOverride.flow, 0)
      }
      segment.edge_overrides[edge.edge_id] = override
      segments.set(segmentId, segment)
    })
  })
  return Array.from(segments.values()).sort((left, right) => {
    const leftStart = numberValue(left.start_hour, 0)
    const rightStart = numberValue(right.start_hour, 0)
    return leftStart - rightStart
  })
}

function nodeVolume(node: CanvasGraph["nodes"][number], isInput: boolean, isOutput: boolean): number {
  const rawVolume = node.data.volume
  if ((rawVolume === undefined || rawVolume === null || rawVolume === "") && (isInput || isOutput)) {
    return 1
  }
  if (rawVolume === undefined || rawVolume === null || rawVolume === "") {
    throw new ContractTransformError("CanvasGraph validation failed", [
      detail(`$.nodes[${node.id}].data.volume`, "reactor volume is required", node.id),
    ])
  }
  return numberValue(rawVolume, 1)
}

function numberValue(value: unknown, defaultValue: number): number {
  if (value === undefined || value === null || value === "") return defaultValue
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) {
    throw new ContractTransformError("Numeric conversion failed", [
      detail("$", "value must be numeric", undefined),
    ])
  }
  return numericValue
}

function stringValue(value: unknown): string {
  return value === undefined || value === null ? "" : String(value).trim()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function detail(path: string, reason: string, sourceId: unknown): ContractErrorDetail {
  return { path, reason, source_id: sourceId }
}
