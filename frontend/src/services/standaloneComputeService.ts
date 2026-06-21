import type {
  ArtifactRecord,
  ComputeJob,
  GetComputeJobResultResponse,
  JobSnapshot,
} from "@/client/compute"
import {
  ASM1_CONFIG,
  ASM1_SLIM_CONFIG,
  ASM3_CONFIG,
} from "@/config/modelConfigs"
import { computeJobApi } from "@/features/compute-jobs/api"
import { computeArtifactsApi } from "@/features/lifecycle/api"

import type {
  MaterialBalanceInput,
  MaterialBalanceJobPublic,
  MaterialBalanceJobStatus,
  MaterialBalanceResultSummary,
  MaterialBalanceTimeSeriesResponse,
  MaterialBalanceValidationResponse,
  Message,
} from "../client/types.gen"

export type StandaloneComputeModelKey =
  | "materialBalance"
  | "asm1slim"
  | "asm1"
  | "asm3"
  | "udm"

type RuntimeNode = {
  node_id: string
  node_type: string
  initial_volume: number
  initial_concentrations: Record<string, number>
  is_inlet: boolean
  is_outlet: boolean
  asm1slim_parameters?: number[]
  asm1_parameters?: number[]
  asm3_parameters?: number[]
  udm_model_id?: string
  udm_model_version?: number
  udm_model_hash?: string
  udm_component_names?: string[]
  udm_processes?: Array<Record<string, unknown>>
  udm_parameter_values?: Record<string, number>
  udm_variable_bindings?: Array<Record<string, string>>
  udm_model_snapshot?: Record<string, unknown>
}

type RuntimeEdge = {
  edge_id: string
  source_node_id: string
  target_node_id: string
  flow_rate: number
  concentration_transform: Record<string, { a: number; b: number }>
}

type SimulationInputDocument = {
  schema_version: "simulation_input.v1"
  simulation_input_id: string
  process_graph_id: string
  process_graph_version: number
  job_type: string
  component_schema: {
    component_schema_id: string
    components: string[]
    unit: string
  }
  nodes: RuntimeNode[]
  edges: RuntimeEdge[]
  time_segments?: Array<Record<string, unknown>>
  parameters: Record<string, unknown>
  runtime_options: Record<string, unknown>
  metadata: Record<string, unknown>
}

type TimeSeriesArtifact = {
  timestamps?: unknown
  node_data?: unknown
  edge_data?: unknown
  segment_markers?: unknown
  parameter_change_events?: unknown
}

type BuildContext = {
  model: StandaloneComputeModelKey
  suffix: string
  originalInput?: MaterialBalanceInput
  originalFlowchart?: Record<string, unknown>
}

const MODEL_DEFS: Record<
  StandaloneComputeModelKey,
  {
    capability: string
    componentSchemaId: string
    jobType: string
    modelFamily: string
    parameterField?: "asm1slim_parameters" | "asm1_parameters" | "asm3_parameters"
  }
> = {
  materialBalance: {
    capability: "material_balance",
    componentSchemaId: "material_balance_components.v1",
    jobType: "simulation.material_balance.v1",
    modelFamily: "material_balance",
  },
  asm1slim: {
    capability: "asm1slim",
    componentSchemaId: "asm1slim_components.v1",
    jobType: "simulation.asm1slim.v1",
    modelFamily: "asm1slim",
    parameterField: "asm1slim_parameters",
  },
  asm1: {
    capability: "asm1",
    componentSchemaId: "asm1_components.v1",
    jobType: "simulation.asm1.v1",
    modelFamily: "asm1",
    parameterField: "asm1_parameters",
  },
  asm3: {
    capability: "asm3",
    componentSchemaId: "asm3_components.v1",
    jobType: "simulation.asm3.v1",
    modelFamily: "asm3",
    parameterField: "asm3_parameters",
  },
  udm: {
    capability: "udm",
    componentSchemaId: "udm_components.v1",
    jobType: "simulation.udm.v1",
    modelFamily: "udm",
  },
}

const ASM1SLIM_COMPONENT_MAP: Record<string, string> = {
  S_O: "dissolvedOxygen",
  S_S: "cod",
  S_NO: "nitrate",
  S_NH: "ammonia",
  S_ALK: "totalAlkalinity",
}

const ASM1SLIM_PARAM_ORDER = [
  "empiricalDenitrificationRate",
  "empiricalNitrificationRate",
  "empiricalCNRatio",
  "codDenitrificationInfluence",
  "nitrateDenitrificationInfluence",
  "ammoniaNitrificationInfluence",
  "aerobicCODDegradationRate",
] as const

const ASM1_PARAM_ORDER = [
  "u_H",
  "K_S",
  "K_OH",
  "K_NO",
  "n_g",
  "b_H",
  "u_A",
  "K_NH",
  "K_OA",
  "b_A",
  "Y_H",
  "Y_A",
  "i_XB",
  "i_XP",
  "f_P",
  "n_h",
  "K_a",
  "K_h",
  "K_x",
] as const

const ASM3_PARAM_ORDER = [
  ["k_H"],
  ["K_X"],
  ["k_STO"],
  ["ny_NOX"],
  ["K_O2", "K_O2H"],
  ["K_NOX", "K_NO"],
  ["K_S"],
  ["K_STO"],
  ["mu_H"],
  ["K_NH4", "K_NH4H"],
  ["K_ALK", "K_ALKH"],
  ["b_HO2"],
  ["b_HNOX"],
  ["b_STOO2"],
  ["b_STONOX"],
  ["mu_A"],
  ["K_ANH4", "K_NH4A"],
  ["K_AO2", "K_O2A"],
  ["K_AALK", "K_ALKA"],
  ["b_AO2"],
  ["b_ANOX"],
  ["f_SI"],
  ["Y_STOO2"],
  ["Y_STONOX"],
  ["Y_HO2"],
  ["Y_HNOX"],
  ["Y_A"],
  ["f_XI"],
  ["i_NSI"],
  ["i_NSS"],
  ["i_NXI"],
  ["i_NXS"],
  ["i_NBM"],
  ["i_SSXI"],
  ["i_SSXS"],
  ["i_SSBM"],
  ["i_SSSTO"],
] as const

const DEFAULT_PARAMETERS = {
  hours: 4,
  steps_per_hour: 60,
  solver_method: "scipy_solver",
  tolerance: 0.000001,
  max_iterations: 1000,
  max_memory_mb: 1000,
}

const uniqueSuffix = (): string => {
  const uuid = globalThis.crypto?.randomUUID?.()
  if (uuid) return uuid.replace(/-/g, "").slice(0, 12)
  return Date.now().toString(36)
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const recordValue = (value: unknown): Record<string, unknown> =>
  isRecord(value) ? value : {}

const arrayValue = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : []

const stringValue = (value: unknown, fallback = ""): string => {
  if (value === undefined || value === null) return fallback
  const text = String(value).trim()
  return text || fallback
}

const numberValue = (value: unknown, fallback: number): number => {
  if (value === undefined || value === null || value === "") return fallback
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

const integerValue = (value: unknown): number | undefined => {
  const numeric = Number(value)
  return Number.isInteger(numeric) && numeric > 0 ? numeric : undefined
}

const rawArray = (value: unknown): number[] | null => {
  if (!Array.isArray(value)) return null
  const values = value.map((item) => numberValue(item, 0))
  return values.length > 0 ? values : null
}

const timestamp = (): string => new Date().toISOString()

const modelDisplayName = (model: StandaloneComputeModelKey): string => {
  switch (model) {
    case "asm1slim":
      return "ASM1 Slim"
    case "asm1":
      return "ASM1"
    case "asm3":
      return "ASM3"
    case "udm":
      return "UDM"
    default:
      return "Material Balance"
  }
}

const modelFixedComponents = (model: StandaloneComputeModelKey): string[] => {
  switch (model) {
    case "asm1slim":
      return Object.keys(ASM1SLIM_COMPONENT_MAP)
    case "asm1":
      return ASM1_CONFIG.fixedParameters.map((param) => param.name)
    case "asm3":
      return ASM3_CONFIG.fixedParameters.map((param) => param.name)
    default:
      return []
  }
}

const defaultForParam = (
  config: typeof ASM1_SLIM_CONFIG | typeof ASM1_CONFIG | typeof ASM3_CONFIG,
  aliases: readonly string[],
): number => {
  const params = [
    ...config.fixedParameters,
    ...config.enhancedCalculationParameters,
  ]
  const match = params.find((param) => aliases.includes(param.name))
  return numberValue(match?.defaultValue, 0)
}

const readParam = (
  source: Record<string, unknown>,
  aliases: readonly string[],
  fallback: number,
): number => {
  for (const name of aliases) {
    if (source[name] !== undefined) return numberValue(source[name], fallback)
  }
  return fallback
}

const resolveModelParameterArray = (
  model: StandaloneComputeModelKey,
  node: Record<string, unknown>,
  nodeData: Record<string, unknown>,
): number[] | undefined => {
  const source = {
    ...recordValue(nodeData.modelParameters),
    ...recordValue(nodeData.asm1slimParameters),
    ...recordValue(nodeData.asm1Parameters),
    ...recordValue(nodeData.asm3Parameters),
    ...recordValue(node.modelParameters),
    ...recordValue(node.asm1slimParameters),
    ...recordValue(node.asm1Parameters),
    ...recordValue(node.asm3Parameters),
    ...nodeData,
  }

  if (model === "asm1slim") {
    const existing = rawArray(node.asm1slim_parameters ?? node.asm1slimParameters)
    if (existing) return existing
    return ASM1SLIM_PARAM_ORDER.map((name) =>
      readParam(source, [name], defaultForParam(ASM1_SLIM_CONFIG, [name])),
    )
  }

  if (model === "asm1") {
    const existing = rawArray(node.asm1_parameters ?? node.asm1Parameters)
    if (existing) return existing
    return ASM1_PARAM_ORDER.map((name) =>
      readParam(source, [name], defaultForParam(ASM1_CONFIG, [name])),
    )
  }

  if (model === "asm3") {
    const existing = rawArray(node.asm3_parameters ?? node.asm3Parameters)
    if (existing) return existing
    return ASM3_PARAM_ORDER.map((aliases) =>
      readParam(source, aliases, defaultForParam(ASM3_CONFIG, aliases)),
    )
  }

  return undefined
}

const normalizeNodeType = (
  model: StandaloneComputeModelKey,
  rawType: unknown,
  data: Record<string, unknown>,
): string => {
  const type = stringValue(rawType, "default").toLowerCase()
  if (type === "input" || type === "inlet") return "input"
  if (type === "output" || type === "outlet") return "output"
  if (model === "asm1slim" && (type === "asm1slim" || type === "asmslim")) {
    return "asm1slim"
  }
  if (model === "asm1" && type === "asm1") return "asm1"
  if (model === "asm3" && type === "asm3") return "asm3"
  if (model === "udm" && (type === "udm" || data.udmModelId || data.udmModel)) {
    return "udm"
  }
  return model === "materialBalance" ? "tank" : "tank"
}

const legacyComponentName = (
  model: StandaloneComputeModelKey,
  component: string,
): string => {
  if (model === "asm1slim") return ASM1SLIM_COMPONENT_MAP[component] || component
  return component
}

const componentNamesFromDefinitions = (items: unknown): string[] =>
  arrayValue(items)
    .map((item) => stringValue(recordValue(item).name))
    .filter(Boolean)

const resolveComponents = (
  model: StandaloneComputeModelKey,
  source: Record<string, unknown>,
  input?: MaterialBalanceInput,
): string[] => {
  const fixed = modelFixedComponents(model)
  if (fixed.length > 0) return fixed

  const schema = recordValue(source.component_schema ?? input?.component_schema)
  const schemaComponents = arrayValue(schema.components)
    .map((item) => stringValue(item))
    .filter(Boolean)
  if (schemaComponents.length > 0) return schemaComponents

  const customParameters = arrayValue(source.customParameters ?? input?.customParameters)
    .map((item) => stringValue(recordValue(item).name))
    .filter(Boolean)
  if (customParameters.length > 0) return customParameters

  if (model === "udm") {
    for (const rawNode of arrayValue(source.nodes ?? input?.nodes)) {
      const node = recordValue(rawNode)
      const data = recordValue(node.data)
      const names = arrayValue(
        data.udmComponentNames ?? node.udmComponentNames ?? data.udm_component_names,
      )
        .map((item) => stringValue(item))
        .filter(Boolean)
      if (names.length > 0) return names

      const definitions = componentNamesFromDefinitions(
        data.udmComponents ??
          node.udmComponents ??
          recordValue(data.udmModelSnapshot).components ??
          recordValue(data.udmModel).components,
      )
      if (definitions.length > 0) return definitions
    }
  }

  return ["COD"]
}

const concentrationMapFromValue = (
  raw: unknown,
  components: string[],
): Record<string, number> => {
  const values: Record<string, number> = {}
  if (Array.isArray(raw)) {
    components.forEach((component, index) => {
      values[component] = numberValue(raw[index], 0)
    })
    return values
  }
  const record = recordValue(raw)
  components.forEach((component) => {
    values[component] = numberValue(record[component], 0)
  })
  return values
}

const nodeConcentrations = (
  model: StandaloneComputeModelKey,
  node: Record<string, unknown>,
  data: Record<string, unknown>,
  components: string[],
): Record<string, number> => {
  if (node.initial_concentrations !== undefined) {
    return concentrationMapFromValue(node.initial_concentrations, components)
  }
  if (node.initialConcentrations !== undefined) {
    return concentrationMapFromValue(node.initialConcentrations, components)
  }
  const values: Record<string, number> = {}
  components.forEach((component) => {
    const legacyName = legacyComponentName(model, component)
    values[component] = numberValue(
      data[component] ?? data[legacyName] ?? node[component] ?? node[legacyName],
      0,
    )
  })
  return values
}

const edgeTransform = (
  model: StandaloneComputeModelKey,
  edge: Record<string, unknown>,
  data: Record<string, unknown>,
  components: string[],
): Record<string, { a: number; b: number }> => {
  const nested = recordValue(edge.concentration_transform ?? data.concentration_transform)
  const rawA = rawArray(edge.concentration_factor_a ?? edge.concentrationFactorA)
  const rawB = rawArray(edge.concentration_factor_b ?? edge.concentrationFactorB)
  const transform: Record<string, { a: number; b: number }> = {}
  components.forEach((component, index) => {
    const legacyName = legacyComponentName(model, component)
    const nestedFactor = recordValue(nested[component] ?? nested[legacyName])
    transform[component] = {
      a: numberValue(
        nestedFactor.a ??
          data[`${component}_a`] ??
          data[`${legacyName}_a`] ??
          rawA?.[index],
        1,
      ),
      b: numberValue(
        nestedFactor.b ??
          data[`${component}_b`] ??
          data[`${legacyName}_b`] ??
          rawB?.[index],
        0,
      ),
    }
  })
  return transform
}

const buildUdmFields = (
  node: Record<string, unknown>,
  data: Record<string, unknown>,
  components: string[],
): Partial<RuntimeNode> => {
  const model = recordValue(data.udmModel ?? node.udmModel)
  const snapshot = recordValue(
    data.udmModelSnapshot ??
      node.udmModelSnapshot ??
      data.udm_model_snapshot ??
      node.udm_model_snapshot,
  )
  const componentNames = arrayValue(
    data.udmComponentNames ??
      node.udmComponentNames ??
      data.udm_component_names ??
      node.udm_component_names ??
      snapshot.components,
  )
    .map((item) =>
      typeof item === "string" ? item : stringValue(recordValue(item).name),
    )
    .filter(Boolean)
  const udmComponents = arrayValue(
    data.udmComponents ??
      node.udmComponents ??
      data.udm_components ??
      node.udm_components,
  )
  const snapshotComponents = arrayValue(snapshot.components || model.components)
  const localNames =
    componentNames.length > 0
      ? componentNames
      : componentNamesFromDefinitions(
          udmComponents.length > 0 ? udmComponents : snapshotComponents,
        )
  const bindings = localNames.map((name, index) => ({
    local_var: name,
    canonical_var: components[index] || name,
  }))
  const parameterValues = recordValue(
    data.udmParameterValues ??
      data.udmParameters ??
      data.udm_parameter_values ??
      node.udmParameterValues ??
      node.udmParameters ??
      node.udm_parameter_values,
  )
  const numericParameterValues: Record<string, number> = {}
  Object.entries(parameterValues).forEach(([key, value]) => {
    numericParameterValues[key] = numberValue(value, 0)
  })
  const explicitBindings = arrayValue(
    data.udmVariableBindings ??
      node.udmVariableBindings ??
      data.udm_variable_bindings ??
      node.udm_variable_bindings,
  )
    .map((item) => {
      const record = recordValue(item)
      return {
        local_var: stringValue(record.local_var ?? record.localVar),
        canonical_var: stringValue(record.canonical_var ?? record.canonicalVar),
      }
    })
    .filter((item) => item.local_var && item.canonical_var)

  return {
    udm_model_id: stringValue(
      data.udmModelId ??
        node.udmModelId ??
        data.udm_model_id ??
        node.udm_model_id ??
        snapshot.id ??
        model.id,
    ),
    udm_model_version: integerValue(
      data.udmModelVersion ??
        node.udmModelVersion ??
        data.udm_model_version ??
        node.udm_model_version ??
        snapshot.version ??
        model.version ??
        model.currentVersion,
    ),
    udm_model_hash: stringValue(
      data.udmModelHash ??
        node.udmModelHash ??
        data.udm_model_hash ??
        node.udm_model_hash ??
        snapshot.hash ??
        snapshot.content_hash ??
        model.hash ??
        model.contentHash ??
        model.content_hash,
    ),
    udm_component_names: localNames.length > 0 ? localNames : components,
    udm_processes: arrayValue(
      data.udmProcesses ??
        node.udmProcesses ??
        data.udm_processes ??
        node.udm_processes ??
        snapshot.processes ??
        model.processes,
    ).map((item) => recordValue(item)),
    udm_parameter_values: numericParameterValues,
    udm_variable_bindings:
      explicitBindings.length > 0 ? explicitBindings : bindings,
    udm_model_snapshot:
      Object.keys(snapshot).length > 0
        ? snapshot
        : Object.keys(model).length > 0
          ? model
          : undefined,
  }
}

const runtimeNode = (
  node: Record<string, unknown>,
  components: string[],
  context: BuildContext,
  index: number,
): RuntimeNode => {
  const data = recordValue(node.data)
  const nodeType = normalizeNodeType(context.model, node.type ?? node.node_type, data)
  const isInput = nodeType === "input"
  const isOutput = nodeType === "output"
  const result: RuntimeNode = {
    node_id: stringValue(node.id ?? node.node_id, `n_${index + 1}`),
    node_type: nodeType,
    initial_volume: numberValue(
      data.volume ?? node.initial_volume ?? node.initialVolume,
      isInput || isOutput ? 1 : 0.001,
    ),
    initial_concentrations: nodeConcentrations(
      context.model,
      node,
      data,
      components,
    ),
    is_inlet: Boolean(node.is_inlet ?? node.isInlet ?? isInput),
    is_outlet: Boolean(node.is_outlet ?? node.isOutlet ?? isOutput),
  }

  const parameters = resolveModelParameterArray(context.model, node, data)
  const parameterField = MODEL_DEFS[context.model].parameterField
  if (parameters && parameterField && result.node_type === MODEL_DEFS[context.model].modelFamily) {
    result[parameterField] = parameters
  }

  if (context.model === "udm" && result.node_type === "udm") {
    Object.assign(result, buildUdmFields(node, data, components))
  }

  return result
}

const runtimeEdge = (
  edge: Record<string, unknown>,
  components: string[],
  context: BuildContext,
  index: number,
): RuntimeEdge => {
  const data = recordValue(edge.data)
  return {
    edge_id: stringValue(edge.id ?? edge.edge_id, `e_${index + 1}`),
    source_node_id: stringValue(edge.source ?? edge.source_node_id),
    target_node_id: stringValue(edge.target ?? edge.target_node_id),
    flow_rate: numberValue(data.flow_rate ?? data.flow ?? edge.flow_rate, 100),
    concentration_transform: edgeTransform(context.model, edge, data, components),
  }
}

const normalizeParameters = (raw: unknown): Record<string, unknown> => ({
  ...DEFAULT_PARAMETERS,
  ...recordValue(raw),
})

const normalizeTimeSegments = (raw: unknown): Array<Record<string, unknown>> =>
  arrayValue(raw).map((item) => recordValue(item))

const buildSimulationInput = (
  source: Record<string, unknown>,
  context: BuildContext,
  input?: MaterialBalanceInput,
): SimulationInputDocument => {
  const def = MODEL_DEFS[context.model]
  const components = resolveComponents(context.model, source, input)
  const nodes = arrayValue(source.nodes ?? input?.nodes).map((node, index) =>
    runtimeNode(recordValue(node), components, context, index),
  )
  const edges = arrayValue(source.edges ?? input?.edges).map((edge, index) =>
    runtimeEdge(recordValue(edge), components, context, index),
  )
  if (nodes.length < 2) {
    throw new Error("At least two nodes are required")
  }
  if (edges.length < 1) {
    throw new Error("At least one edge is required")
  }

  const metadata: Record<string, unknown> = {
    original_legacy_model: context.model,
    standalone_adapter_version: "phase5",
  }
  if (context.originalFlowchart) {
    metadata.original_flowchart_data = context.originalFlowchart
  }
  if (context.originalInput) {
    metadata.original_legacy_input = context.originalInput
  }

  return {
    schema_version: "simulation_input.v1",
    simulation_input_id: `si_web_${context.model}_${context.suffix}`,
    process_graph_id: `pg_web_${context.model}_${context.suffix}`,
    process_graph_version: 1,
    job_type: def.jobType,
    component_schema: {
      component_schema_id: def.componentSchemaId,
      components,
      unit: stringValue(recordValue(source.component_schema).unit, "mg/L"),
    },
    nodes,
    edges,
    time_segments: normalizeTimeSegments(
      source.time_segments ?? source.timeSegments ?? input?.time_segments,
    ),
    parameters: normalizeParameters(source.calculationParameters ?? input?.parameters),
    runtime_options:
      context.model === "materialBalance" ? {} : { model_family: def.modelFamily },
    metadata,
  }
}

const buildComputeJob = (
  model: StandaloneComputeModelKey,
  simulationInput: SimulationInputDocument,
  suffix: string,
  jobName?: string,
): { job: ComputeJob; idempotencyKey: string } => {
  const def = MODEL_DEFS[model]
  const jobId = `job_web_${model}_${suffix}`
  const idempotencyKey = `idem_web_${model}_${suffix}`
  return {
    idempotencyKey,
    job: {
      schema_version: "compute_job.v1",
      job_id: jobId,
      job_type: def.jobType,
      queue: "simulation",
      request_id: `req_web_${model}_${suffix}`,
      idempotency_key: idempotencyKey,
      payload: simulationInput,
      context: {
        source_system: "autowatersimu-web",
        requested_by: "user:standalone-ui",
        trace_id: `trace_web_${model}_${suffix}`,
      },
      execution: {
        time_limit_sec: 600,
        priority: "normal",
        required_capabilities: [def.capability, "ode"],
      },
      created_at: timestamp(),
      metadata: {
        job_name: jobName || `${modelDisplayName(model)} job`,
        source: "legacy_ui_standalone_adapter",
      },
    },
  }
}

const asLegacyStatus = (status: unknown): MaterialBalanceJobStatus => {
  switch (stringValue(status).toLowerCase()) {
    case "created":
    case "queued":
      return "pending"
    case "running":
      return "running"
    case "succeeded":
      return "success"
    case "cancelled":
    case "canceled":
      return "cancelled"
    case "failed":
    case "timed_out":
    case "timeout":
      return "failed"
    default:
      return "pending"
  }
}

const parseInputJSON = (snapshot: JobSnapshot): Record<string, unknown> => {
  const raw = snapshot.job.input_json
  if (isRecord(raw)) return raw
  if (typeof raw === "string") {
    try {
      return recordValue(JSON.parse(raw))
    } catch {
      return {}
    }
  }
  return {}
}

const jobNameFromSnapshot = (snapshot: JobSnapshot): string => {
  const input = parseInputJSON(snapshot)
  const metadata = recordValue(input.metadata)
  return stringValue(
    metadata.job_name ?? recordValue(input.metadata).name,
    `${modelDisplayName(modelFromJobType(snapshot.job.job_type))} ${snapshot.job.job_id}`,
  )
}

const modelFromJobType = (jobType: unknown): StandaloneComputeModelKey => {
  const type = stringValue(jobType)
  const found = Object.entries(MODEL_DEFS).find(([, def]) => def.jobType === type)
  return (found?.[0] as StandaloneComputeModelKey | undefined) || "materialBalance"
}

const legacyJobFromSnapshot = (
  snapshot: JobSnapshot,
  result?: GetComputeJobResultResponse | null,
): MaterialBalanceJobPublic & { result_data?: Record<string, unknown> | null } => {
  const summary = recordValue(result?.summary)
  const startedAt = stringValue(snapshot.job.started_at)
  const finishedAt = stringValue(snapshot.job.finished_at)
  return {
    id: snapshot.job.job_id,
    job_id: snapshot.job.job_id,
    job_name: jobNameFromSnapshot(snapshot),
    status: asLegacyStatus(snapshot.job.status),
    created_at: stringValue(snapshot.job.created_at, timestamp()),
    started_at: startedAt || null,
    completed_at: finishedAt || null,
    error_message:
      stringValue(snapshot.job.error_message || summary.error_message) || null,
    result_data: result ? recordValue(result) : null,
  }
}

const safeGetResult = async (
  jobId: string,
): Promise<GetComputeJobResultResponse | null> => {
  try {
    return await computeJobApi.getJobResult(jobId)
  } catch {
    return null
  }
}

const artifactsFromResult = (
  result: GetComputeJobResultResponse | null,
): ArtifactRecord[] => {
  const items = arrayValue(result?.artifacts)
  return items.map((item) => item as ArtifactRecord)
}

const pickTimeSeriesArtifact = (
  result: GetComputeJobResultResponse | null,
  snapshot?: JobSnapshot,
): ArtifactRecord | null => {
  const artifacts = [
    ...artifactsFromResult(result),
    ...(snapshot?.artifacts || []),
  ]
  return (
    artifacts.find((artifact) =>
      stringValue(artifact.artifact_type ?? artifact.object_key)
        .toLowerCase()
        .includes("time_series"),
    ) || null
  )
}

const arrayOfNumbers = (value: unknown): number[] =>
  arrayValue(value).map((item) => numberValue(item, 0))

const sliceSeriesMap = (
  value: unknown,
  from: number,
  to: number,
  ids?: string[],
): Record<string, Record<string, number[]>> => {
  const result: Record<string, Record<string, number[]>> = {}
  const wanted = ids && ids.length > 0 ? new Set(ids) : null
  Object.entries(recordValue(value)).forEach(([id, series]) => {
    if (wanted && !wanted.has(id)) return
    const values: Record<string, number[]> = {}
    Object.entries(recordValue(series)).forEach(([name, raw]) => {
      values[name] = arrayOfNumbers(raw).slice(from, to)
    })
    result[id] = values
  })
  return result
}

const normalizeTimeSeries = (
  jobId: string,
  artifact: TimeSeriesArtifact,
  params: {
    startTime?: number
    endTime?: number
    page?: number
    pageSize?: number
    nodeIds?: string[]
    edgeIds?: string[]
  },
): MaterialBalanceTimeSeriesResponse => {
  const timestamps = arrayOfNumbers(artifact.timestamps)
  let filteredIndices = timestamps.map((_, index) => index)
  if (params.startTime !== undefined) {
    filteredIndices = filteredIndices.filter(
      (index) => timestamps[index] >= Number(params.startTime),
    )
  }
  if (params.endTime !== undefined) {
    filteredIndices = filteredIndices.filter(
      (index) => timestamps[index] <= Number(params.endTime),
    )
  }
  const pageSize = params.pageSize && params.pageSize > 0 ? params.pageSize : 500
  const page = params.page && params.page > 0 ? params.page : 1
  const offset = (page - 1) * pageSize
  const pageIndices = filteredIndices.slice(offset, offset + pageSize)
  const from = pageIndices[0] ?? 0
  const to = pageIndices.length > 0 ? pageIndices[pageIndices.length - 1] + 1 : 0
  const pageTimestamps = pageIndices.map((index) => timestamps[index])

  return {
    job_id: jobId,
    timestamps: pageTimestamps,
    node_data: sliceSeriesMap(artifact.node_data, from, to, params.nodeIds),
    edge_data: sliceSeriesMap(artifact.edge_data, from, to, params.edgeIds),
    pagination: {
      page,
      page_size: pageSize,
      total_items: filteredIndices.length,
      total_pages: Math.max(1, Math.ceil(filteredIndices.length / pageSize)),
      has_next: offset + pageSize < filteredIndices.length,
      has_previous: page > 1,
    },
  }
}

const finalSeriesValues = (
  series: Record<string, Record<string, number[]>>,
): Record<string, Record<string, number>> => {
  const result: Record<string, Record<string, number>> = {}
  Object.entries(series).forEach(([id, values]) => {
    const entry: Record<string, number> = {}
    Object.entries(values).forEach(([name, items]) => {
      entry[name] = items.length > 0 ? items[items.length - 1] : 0
    })
    result[id] = entry
  })
  return result
}

const summaryFromResult = (
  jobId: string,
  status: MaterialBalanceJobStatus,
  result: GetComputeJobResultResponse | null,
): MaterialBalanceResultSummary => {
  const summary = recordValue(result?.summary)
  return {
    job_id: jobId,
    status,
    total_time: numberValue(
      summary.total_time ?? summary.total_hours ?? summary.hours,
      0,
    ),
    total_steps: Math.trunc(numberValue(summary.total_steps, 0)),
    calculation_time_seconds: numberValue(
      summary.calculation_time_seconds ?? summary.duration_seconds,
      0,
    ),
    convergence_status: stringValue(
      summary.convergence_status ?? (status === "success" ? "converged" : status),
      status,
    ),
    final_mass_balance_error:
      summary.final_mass_balance_error === undefined
        ? null
        : numberValue(summary.final_mass_balance_error, 0),
    final_total_volume: numberValue(summary.final_total_volume, 0),
    solver_method: stringValue(summary.solver_method) || null,
    segment_count:
      summary.segment_count === undefined
        ? null
        : Math.trunc(numberValue(summary.segment_count, 0)),
    parameter_change_event_count:
      summary.parameter_change_event_count === undefined
        ? null
        : Math.trunc(numberValue(summary.parameter_change_event_count, 0)),
    error_message: stringValue(summary.error_message) || null,
  }
}

const legacyInputFromSnapshot = (snapshot: JobSnapshot): Record<string, unknown> => {
  const inputJSON = parseInputJSON(snapshot)
  const payload = recordValue(inputJSON.payload)
  const metadata = recordValue(payload.metadata)
  const originalFlowchart = recordValue(metadata.original_flowchart_data)
  if (Object.keys(originalFlowchart).length > 0) return originalFlowchart
  const originalInput = recordValue(metadata.original_legacy_input)
  if (Object.keys(originalInput).length > 0) return originalInput
  return payload
}

const runBuild = (
  model: StandaloneComputeModelKey,
  input: MaterialBalanceInput | Record<string, unknown>,
  fromFlowchart: boolean,
) => {
  const suffix = uniqueSuffix()
  const source = recordValue(input)
  const context: BuildContext = {
    model,
    suffix,
    originalFlowchart: fromFlowchart ? source : undefined,
    originalInput: fromFlowchart ? undefined : (input as MaterialBalanceInput),
  }
  const simulationInput = buildSimulationInput(
    source,
    context,
    fromFlowchart ? undefined : (input as MaterialBalanceInput),
  )
  const name = stringValue(source.name, `${modelDisplayName(model)} job`)
  return buildComputeJob(model, simulationInput, suffix, name)
}

class StandaloneComputeService {
  createCalculationJob<TJob = MaterialBalanceJobPublic>(
    model: StandaloneComputeModelKey,
    input: MaterialBalanceInput,
  ): Promise<TJob> {
    const { job, idempotencyKey } = runBuild(model, input, false)
    return computeJobApi
      .createJob(job, idempotencyKey)
      .then((snapshot) => legacyJobFromSnapshot(snapshot) as TJob)
  }

  createCalculationJobFromFlowchart<TJob = MaterialBalanceJobPublic>(
    model: StandaloneComputeModelKey,
    flowchartData: Record<string, unknown>,
  ): Promise<TJob> {
    const { job, idempotencyKey } = runBuild(model, flowchartData, true)
    return computeJobApi
      .createJob(job, idempotencyKey)
      .then((snapshot) => legacyJobFromSnapshot(snapshot) as TJob)
  }

  async getCalculationStatus<TJob = MaterialBalanceJobPublic>(
    jobId: string,
  ): Promise<TJob> {
    const [snapshot, result] = await Promise.all([
      computeJobApi.getJob(jobId),
      safeGetResult(jobId),
    ])
    return legacyJobFromSnapshot(snapshot, result) as TJob
  }

  async getCalculationResultSummary(
    jobId: string,
  ): Promise<MaterialBalanceResultSummary> {
    const snapshot = await computeJobApi.getJob(jobId)
    const result = await safeGetResult(jobId)
    return summaryFromResult(jobId, asLegacyStatus(snapshot.job.status), result)
  }

  async getCalculationTimeseries(params: {
    jobId: string
    startTime?: number
    endTime?: number
    page?: number
    pageSize?: number
    nodeIds?: string[]
    edgeIds?: string[]
  }): Promise<MaterialBalanceTimeSeriesResponse> {
    const [snapshot, result] = await Promise.all([
      computeJobApi.getJob(params.jobId),
      safeGetResult(params.jobId),
    ])
    const artifact = pickTimeSeriesArtifact(result, snapshot)
    if (!artifact) {
      return normalizeTimeSeries(params.jobId, {}, params)
    }
    const payload = await computeArtifactsApi.readArtifactJson<TimeSeriesArtifact>(
      artifact,
    )
    return normalizeTimeSeries(params.jobId, payload, params)
  }

  async getCalculationFinalValues(jobId: string): Promise<Record<string, unknown>> {
    const data = await this.getCalculationTimeseries({
      jobId,
      page: 1,
      pageSize: Number.MAX_SAFE_INTEGER,
    })
    const nodes = finalSeriesValues(data.node_data)
    const edges = finalSeriesValues(data.edge_data)
    return {
      job_id: jobId,
      final_values: { nodes, edges },
      node_data: nodes,
      edge_data: edges,
    }
  }

  async validateCalculationInput(
    model: StandaloneComputeModelKey,
    input: MaterialBalanceInput,
  ): Promise<MaterialBalanceValidationResponse> {
    try {
      runBuild(model, input, false)
      const nodeCount = input.nodes?.length || 0
      const edgeCount = input.edges?.length || 0
      const steps =
        numberValue(input.parameters?.hours, 1) *
        numberValue(input.parameters?.steps_per_hour, 60)
      return {
        is_valid: true,
        errors: [],
        warnings: [],
        estimated_memory_mb: Math.max(1, Math.ceil((nodeCount + edgeCount) * 2)),
        estimated_time_seconds: Math.max(1, Math.ceil(steps / 100)),
      }
    } catch (error) {
      return {
        is_valid: false,
        errors: [error instanceof Error ? error.message : String(error)],
        warnings: [],
        estimated_memory_mb: 0,
        estimated_time_seconds: 0,
      }
    }
  }

  async getUserCalculationJobs<TJob = MaterialBalanceJobPublic>(
    model: StandaloneComputeModelKey,
    skip = 0,
    limit = 100,
  ): Promise<{ data: TJob[]; count: number }> {
    const def = MODEL_DEFS[model]
    const response = await computeJobApi.listJobs({
      jobType: def.jobType,
      limit: Math.min(skip + limit, 200),
    })
    const data = response.items
      .slice(skip, skip + limit)
      .map((snapshot) => legacyJobFromSnapshot(snapshot) as TJob)
    return { data, count: response.total_estimate ?? data.length }
  }

  async deleteCalculationJob(jobId: string): Promise<Message> {
    await computeJobApi.cancelJob(jobId)
    return { message: "Compute job cancelled" }
  }

  async getJobInputData(
    jobId: string,
  ): Promise<{
    job_id: string
    input_data: Record<string, unknown>
    result_data: Record<string, unknown>
    status: MaterialBalanceJobStatus
  }> {
    const [snapshot, result] = await Promise.all([
      computeJobApi.getJob(jobId),
      safeGetResult(jobId),
    ])
    return {
      job_id: jobId,
      input_data: legacyInputFromSnapshot(snapshot),
      result_data: result ? recordValue(result) : {},
      status: asLegacyStatus(snapshot.job.status),
    }
  }
}

export const standaloneComputeService = new StandaloneComputeService()
