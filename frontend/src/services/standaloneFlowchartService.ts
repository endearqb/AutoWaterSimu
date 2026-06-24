import { legacyFlowExportToCanvasGraph } from "@/contracts"
import { computeWorkspaceApi } from "@/features/workspace/api"

type FlowchartPayload = {
  name?: string | null
  description?: string | null
  flow_data?: Record<string, unknown> | null
}

type LegacyFlowchart = {
  id: string
  name: string
  description?: string | null
  owner_id?: string
  created_at: string
  updated_at: string
  flow_data: Record<string, unknown>
}

type LegacyFlowcharts = {
  data: LegacyFlowchart[]
  count: number
}

type CanvasGraphRecordLike = {
  graph_id: string
  name: string
  version: number
  payload: Record<string, unknown>
  metadata?: Record<string, unknown>
  requested_by?: string
  created_at: string
  archived_at?: string
}

const uniqueSuffix = () => {
  const uuid = globalThis.crypto?.randomUUID?.()
  if (uuid) return uuid.replace(/-/g, "").slice(0, 12)
  return Date.now().toString(36)
}

const graphIdFor = (modelFamily: string, requested?: unknown) => {
  const text = typeof requested === "string" ? requested.trim() : ""
  return text || `graph_${modelFamily}_${uniqueSuffix()}`
}

const scenarioIdForGraph = (graphId: string) => `scenario_${graphId}`

const canvasPayloadToFlowData = (payload: Record<string, unknown>) => ({
  ...payload,
  customParameters:
    payload.customParameters ??
    (payload.metadata as Record<string, unknown> | undefined)
      ?.customParameters ??
    [],
  calculationParameters:
    payload.calculationParameters ??
    (payload.metadata as Record<string, unknown> | undefined)
      ?.calculationParameters,
  timeSegments:
    payload.timeSegments ??
    (payload.metadata as Record<string, unknown> | undefined)?.timeSegments ??
    [],
  hybrid_config:
    payload.hybrid_config ??
    payload.hybridConfig ??
    (payload.metadata as Record<string, unknown> | undefined)?.hybrid_config ??
    null,
})

const isModelFamilyRecord = (
  record: CanvasGraphRecordLike,
  modelFamily: string,
) => {
  const metadataFamily = record.metadata?.model_family
  const payloadMetadata = record.payload?.metadata as
    | Record<string, unknown>
    | undefined
  const payloadFamily = payloadMetadata?.model_family
  return metadataFamily === modelFamily || payloadFamily === modelFamily
}

const flowchartFromCanvasRecord = (
  record: CanvasGraphRecordLike,
): LegacyFlowchart => ({
  id: record.graph_id,
  name: record.name,
  description:
    typeof record.metadata?.description === "string"
      ? record.metadata.description
      : "",
  owner_id: record.requested_by || "standalone:developer",
  created_at: record.created_at,
  updated_at: record.created_at,
  flow_data: canvasPayloadToFlowData(record.payload),
})

const ensureScenario = async (
  modelFamily: string,
  graphId: string,
  name: string,
  version = 1,
) => {
  const scenarioId = scenarioIdForGraph(graphId)
  try {
    await computeWorkspaceApi.createScenario({
      scenario_id: scenarioId,
      name,
      model_family: modelFamily,
      current_canvas_graph_id: graphId,
      current_canvas_graph_version: version,
    })
  } catch {
    try {
      await computeWorkspaceApi.updateScenario(scenarioId, {
        name,
        current_canvas_graph_id: graphId,
        current_canvas_graph_version: version,
      })
    } catch {
      // Best-effort Scenario linkage; CanvasGraph persistence is the source of truth.
    }
  }
  return scenarioId
}

const saveGraph = async (
  modelFamily: string,
  payload: FlowchartPayload,
  graphId?: string,
) => {
  const name = String(payload.name || "Untitled")
  const resolvedGraphId = graphIdFor(modelFamily, graphId)
  const flowData = {
    ...(payload.flow_data || {}),
    graph_id: resolvedGraphId,
    name,
  }
  const canvasGraph = legacyFlowExportToCanvasGraph(
    flowData,
    resolvedGraphId,
    name,
  )
  canvasGraph.metadata = {
    ...(canvasGraph.metadata || {}),
    model_family: modelFamily,
  } as typeof canvasGraph.metadata

  const metadata = {
    description: payload.description || "",
    model_family: modelFamily,
  }
  const scenarioId = await ensureScenario(modelFamily, resolvedGraphId, name)
  const response = graphId
    ? await computeWorkspaceApi.updateCanvasGraph({
        graphId: resolvedGraphId,
        name,
        scenarioId,
        canvasGraph,
        metadata,
      })
    : await computeWorkspaceApi.saveCanvasGraph({
        graphId: resolvedGraphId,
        name,
        scenarioId,
        canvasGraph,
        metadata,
      })
  await ensureScenario(modelFamily, response.graph_id, response.name, response.version)
  return flowchartFromCanvasRecord(response as CanvasGraphRecordLike)
}

export const standaloneFlowchartService = {
  async list(modelFamily: string, skip = 0, limit = 50): Promise<LegacyFlowcharts> {
    const response = await computeWorkspaceApi.listCanvasGraphs({ limit: 500 })
    const latestByGraphId = new Map<string, CanvasGraphRecordLike>()
    ;(response.items || []).forEach((item) => {
      const record = item as CanvasGraphRecordLike
      if (record.archived_at || !isModelFamilyRecord(record, modelFamily)) {
        return
      }
      const existing = latestByGraphId.get(record.graph_id)
      if (!existing || record.version > existing.version) {
        latestByGraphId.set(record.graph_id, record)
      }
    })
    const all = Array.from(latestByGraphId.values())
      .sort((left, right) => right.created_at.localeCompare(left.created_at))
      .map(flowchartFromCanvasRecord)
    return { data: all.slice(skip, skip + limit), count: all.length }
  },

  create(modelFamily: string, payload: FlowchartPayload) {
    return saveGraph(modelFamily, payload)
  },

  async get(modelFamily: string, id: string) {
    const response = (await computeWorkspaceApi.getCanvasGraph(
      id,
    )) as CanvasGraphRecordLike
    if (!isModelFamilyRecord(response, modelFamily)) {
      throw new Error(`Flowchart ${id} does not belong to ${modelFamily}`)
    }
    return flowchartFromCanvasRecord(response)
  },

  update(modelFamily: string, id: string, payload: FlowchartPayload) {
    return saveGraph(modelFamily, payload, id)
  },

  async delete(_modelFamily: string, id: string) {
    await computeWorkspaceApi.archiveCanvasGraph(id)
    return { message: "Flowchart archived" }
  },
}
