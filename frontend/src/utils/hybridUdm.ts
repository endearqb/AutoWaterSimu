import type { UDMModelDetailPublic } from "@/client/types.gen"
import type { CustomParameter } from "../config/modelConfigs"
import type { HybridUDMConfig, HybridUDMSelectedModel } from "../types/hybridUdm"

export const LOCAL_EXEMPT_TOKEN = "__local__"

export const buildHybridModelKey = (modelId: string, version: number) =>
  `${modelId}@${version}`

export const buildHybridPairKey = (
  sourceModelId: string,
  sourceVersion: number,
  targetModelId: string,
  targetVersion: number,
) =>
  `${buildHybridModelKey(sourceModelId, sourceVersion)}->${buildHybridModelKey(
    targetModelId,
    targetVersion,
  )}`

export const uniqueStrings = (items: string[]) => {
  const seen = new Set<string>()
  const output: string[] = []
  items.forEach((item) => {
    const normalized = String(item || "").trim()
    if (!normalized || seen.has(normalized)) return
    seen.add(normalized)
    output.push(normalized)
  })
  return output
}

export const extractHybridComponentsFromDetail = (
  detail: UDMModelDetailPublic | undefined,
): Array<Record<string, unknown>> => {
  const latest = (detail?.latest_version || {}) as Record<string, unknown>
  const components = latest.components
  return Array.isArray(components)
    ? (components.filter((item) => !!item && typeof item === "object") as Array<
        Record<string, unknown>
      >)
    : []
}

export const extractHybridProcessesFromDetail = (
  detail: UDMModelDetailPublic | undefined,
): Array<Record<string, unknown>> => {
  const latest = (detail?.latest_version || {}) as Record<string, unknown>
  const processes = latest.processes
  return Array.isArray(processes)
    ? (processes.filter((item) => !!item && typeof item === "object") as Array<
        Record<string, unknown>
      >)
    : []
}

export const extractHybridComponentNamesFromDetail = (
  detail: UDMModelDetailPublic | undefined,
): string[] =>
  uniqueStrings(
    extractHybridComponentsFromDetail(detail).map((component) =>
      String(component.name || "").trim(),
    ),
  )

export const extractHybridFocalVarsFromDetail = (
  detail: UDMModelDetailPublic | undefined,
): string[] => {
  const componentNames = new Set(extractHybridComponentNamesFromDetail(detail))
  if (componentNames.size === 0) return []

  const ids = new Set<string>()
  const regex = /[A-Za-z_][A-Za-z0-9_]*/g
  extractHybridProcessesFromDetail(detail).forEach((processRow) => {
    const rawExpr = processRow.rate_expr ?? processRow.rateExpr
    const expr = String(rawExpr || "").trim()
    if (!expr) return
    const matches = expr.match(regex) || []
    matches.forEach((token) => {
      if (componentNames.has(token)) {
        ids.add(token)
      }
    })
  })
  return Array.from(ids)
}

export const toHybridSelectedModel = (
  detail: UDMModelDetailPublic,
): HybridUDMSelectedModel => {
  const latest = (detail.latest_version || {}) as Record<string, unknown>
  return {
    model_id: detail.id,
    version: detail.current_version,
    name: detail.name,
    hash: String(latest.content_hash || latest.hash || "").trim(),
    components: extractHybridComponentsFromDetail(detail),
    parameters: Array.isArray(latest.parameters)
      ? (latest.parameters as Array<Record<string, unknown>>)
      : [],
    processes: extractHybridProcessesFromDetail(detail),
    meta:
      latest.meta && typeof latest.meta === "object"
        ? (latest.meta as Record<string, unknown>)
        : null,
  }
}

const toParameterFromComponent = (
  component: Record<string, unknown>,
): CustomParameter | null => {
  const name = String(component.name || "").trim()
  if (!name) return null
  const defaultValueRaw = Number.parseFloat(
    String(component.default_value ?? component.defaultValue ?? "0"),
  )
  const defaultValue = Number.isFinite(defaultValueRaw) ? defaultValueRaw : 0
  const unit = String(component.unit || "").trim()
  return {
    name,
    label: String(component.label || name),
    description: unit ? `Unit: ${unit}` : undefined,
    defaultValue,
  }
}

export const buildCanonicalParametersFromSelectedModels = (
  selectedModels: HybridUDMSelectedModel[],
): CustomParameter[] => {
  const paramMap = new Map<string, CustomParameter>()
  selectedModels.forEach((model) => {
    const components = Array.isArray(model.components)
      ? (model.components as Array<Record<string, unknown>>)
      : []
    components.forEach((component) => {
      const param = toParameterFromComponent(component)
      if (!param || paramMap.has(param.name)) return
      paramMap.set(param.name, param)
    })
  })
  return Array.from(paramMap.values())
}

export const buildCanonicalParametersFromModelDetails = (
  details: UDMModelDetailPublic[],
): CustomParameter[] => {
  const selected = details.map((detail) => toHybridSelectedModel(detail))
  return buildCanonicalParametersFromSelectedModels(selected)
}

export const toHybridConfigFromUnknown = (
  value: unknown,
): HybridUDMConfig | null => {
  if (!value || typeof value !== "object") return null
  const raw = value as Record<string, unknown>
  if (raw.mode !== "udm_only") return null
  const selected_models = Array.isArray(raw.selected_models)
    ? (raw.selected_models as HybridUDMSelectedModel[])
    : []
  const model_pair_mappings =
    raw.model_pair_mappings && typeof raw.model_pair_mappings === "object"
      ? (raw.model_pair_mappings as HybridUDMConfig["model_pair_mappings"])
      : {}
  return {
    mode: "udm_only",
    selected_models,
    model_pair_mappings,
  }
}
