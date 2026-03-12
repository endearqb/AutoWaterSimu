import type {
  UDMComponentDefinition,
  UDMModelDetailPublic,
} from "@/client/types.gen"
import type { UDMNodeData } from "@/types/udmNodeData"

export interface BoundUdmModelSource {
  id: string
  name: string
  version: number
  hash: string
  components: UDMComponentDefinition[]
  parameters: Array<Record<string, unknown>>
  processes: Array<Record<string, unknown>>
  meta?: Record<string, unknown>
}

const toFiniteNumber = (value: unknown): number => {
  const parsed =
    typeof value === "number" ? value : Number.parseFloat(String(value ?? ""))
  return Number.isFinite(parsed) ? parsed : 0
}

const toRecordArray = (value: unknown): Array<Record<string, unknown>> =>
  Array.isArray(value)
    ? value.filter(
        (item): item is Record<string, unknown> =>
          !!item && typeof item === "object",
      )
    : []

const toComponentArray = (value: unknown): UDMComponentDefinition[] =>
  Array.isArray(value)
    ? value.filter(
        (item): item is UDMComponentDefinition =>
          !!item && typeof item === "object",
      )
    : []

const buildParameterValues = (
  parameters: Array<Record<string, unknown>>,
): Record<string, number> => {
  const values: Record<string, number> = {}
  parameters.forEach((param) => {
    const name = String(param.name || "").trim()
    if (!name) return
    values[name] = toFiniteNumber(param.default_value ?? param.defaultValue)
  })
  return values
}

const buildComponentDefaults = (components: UDMComponentDefinition[]) => {
  const values: Record<string, string> = {}
  const names: string[] = []

  components.forEach((component) => {
    const name = String(component.name || "").trim()
    if (!name) return
    names.push(name)
    const componentRecord = component as Record<string, unknown>
    values[name] = String(
      toFiniteNumber(component.default_value ?? componentRecord.defaultValue),
    )
  })

  return { values, names }
}

export const createBoundUdmModelSourceFromDetail = (
  model: UDMModelDetailPublic,
): BoundUdmModelSource | null => {
  const latest = model.latest_version
  if (!latest) return null

  return {
    id: model.id,
    name: String(model.name || "UDM").trim() || "UDM",
    version: model.current_version,
    hash: String(latest.content_hash || "").trim(),
    components: toComponentArray(latest.components),
    parameters: toRecordArray(latest.parameters),
    processes: toRecordArray(latest.processes),
    meta:
      latest.meta && typeof latest.meta === "object"
        ? (latest.meta as Record<string, unknown>)
        : {},
  }
}

export const extractBoundUdmModelSource = (
  sourceData: Record<string, unknown> | UDMNodeData | null | undefined,
): BoundUdmModelSource | null => {
  if (!sourceData) return null

  const udmModel =
    sourceData.udmModel && typeof sourceData.udmModel === "object"
      ? (sourceData.udmModel as Record<string, unknown>)
      : {}
  const snapshot =
    sourceData.udmModelSnapshot && typeof sourceData.udmModelSnapshot === "object"
      ? (sourceData.udmModelSnapshot as Record<string, unknown>)
      : {}

  const id = String(
    sourceData.udmModelId || snapshot.id || udmModel.id || udmModel.modelId || "",
  ).trim()
  const rawVersion =
    sourceData.udmModelVersion ||
    snapshot.version ||
    udmModel.version ||
    udmModel.currentVersion
  const version = Number.parseInt(String(rawVersion ?? ""), 10)

  if (!id || !Number.isInteger(version)) {
    return null
  }

  const components = toComponentArray(
    sourceData.udmComponents || snapshot.components || udmModel.components,
  )
  if (components.length === 0) {
    return null
  }

  return {
    id,
    name:
      String(snapshot.name || udmModel.name || sourceData.label || "UDM").trim() ||
      "UDM",
    version,
    hash: String(
      sourceData.udmModelHash ||
        snapshot.hash ||
        udmModel.hash ||
        udmModel.contentHash ||
        udmModel.content_hash ||
        "",
    ).trim(),
    components,
    parameters: toRecordArray(snapshot.parameters || udmModel.parameters),
    processes: toRecordArray(
      sourceData.udmProcesses || snapshot.processes || udmModel.processes,
    ),
    meta:
      snapshot.meta && typeof snapshot.meta === "object"
        ? (snapshot.meta as Record<string, unknown>)
        : {},
  }
}

export const getBoundUdmModelKey = (
  sourceData: Record<string, unknown> | UDMNodeData | null | undefined,
): string => {
  const source = extractBoundUdmModelSource(sourceData)
  return source ? `${source.id}@${source.version}` : ""
}

export const buildBoundUdmNodeData = ({
  label,
  model,
  volume = "1e-3",
}: {
  label: string
  model: BoundUdmModelSource
  volume?: string | number
}): UDMNodeData & { label: string } => {
  const parameterValues = buildParameterValues(model.parameters)
  const { values: componentValues, names: componentNames } =
    buildComponentDefaults(model.components)

  return {
    label,
    volume: String(volume),
    ...componentValues,
    udmModel: {
      id: model.id,
      name: model.name,
      version: model.version,
      hash: model.hash,
      components: model.components,
      parameters: model.parameters,
      processes: model.processes,
      parameterValues,
    },
    udmModelSnapshot: {
      id: model.id,
      name: model.name,
      version: model.version,
      hash: model.hash,
      components: model.components,
      parameters: model.parameters,
      processes: model.processes,
      meta: model.meta || {},
    },
    udmComponents: model.components,
    udmComponentNames: componentNames,
    udmProcesses: model.processes,
    udmParameters: parameterValues,
    udmParameterValues: parameterValues,
    udmModelId: model.id,
    udmModelVersion: model.version,
    udmModelHash: model.hash,
  }
}
