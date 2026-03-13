import type { Node } from "@xyflow/react"

import type { UDMNodeData } from "@/types/udmNodeData"

type DisplayMap = Map<string, string>

export interface UdmRuntimeDisplayMaps {
  componentLabels: DisplayMap
  parameterLabels: DisplayMap
  variableLabels: DisplayMap
}

const appendDisplayEntry = (
  target: DisplayMap,
  name: unknown,
  label: unknown,
) => {
  const normalizedName = String(name || "").trim()
  if (!normalizedName || target.has(normalizedName)) {
    return
  }

  const normalizedLabel = String(label || "").trim()
  target.set(normalizedName, normalizedLabel || normalizedName)
}

const collectFromDefinitions = (
  items: unknown,
  target: DisplayMap,
  opts?: { includeConcentrationAlias?: boolean },
) => {
  if (!Array.isArray(items)) {
    return
  }

  items.forEach((item) => {
    if (!item || typeof item !== "object") {
      return
    }
    const raw = item as Record<string, unknown>
    const name = String(raw.name || "").trim()
    if (!name) {
      return
    }
    const label = String(raw.label || name).trim() || name
    appendDisplayEntry(target, name, label)
    if (opts?.includeConcentrationAlias) {
      appendDisplayEntry(target, `concentration_${name}`, label)
    }
  })
}

export const extractUdmDisplayMapsFromSourceData = (
  sourceData: Record<string, unknown> | UDMNodeData | null | undefined,
): UdmRuntimeDisplayMaps => {
  const componentLabels: DisplayMap = new Map()
  const parameterLabels: DisplayMap = new Map()

  if (!sourceData) {
    return {
      componentLabels,
      parameterLabels,
      variableLabels: new Map(),
    }
  }

  const snapshot =
    sourceData.udmModelSnapshot && typeof sourceData.udmModelSnapshot === "object"
      ? (sourceData.udmModelSnapshot as Record<string, unknown>)
      : {}
  const udmModel =
    sourceData.udmModel && typeof sourceData.udmModel === "object"
      ? (sourceData.udmModel as Record<string, unknown>)
      : {}

  collectFromDefinitions(
    sourceData.udmComponents || snapshot.components || udmModel.components,
    componentLabels,
    { includeConcentrationAlias: true },
  )
  collectFromDefinitions(snapshot.parameters || udmModel.parameters, parameterLabels)

  return {
    componentLabels,
    parameterLabels,
    variableLabels: new Map([...componentLabels, ...parameterLabels]),
  }
}

export const buildUdmDisplayMapsFromNodes = (
  nodes: Array<Pick<Node, "type" | "data">> | undefined,
): UdmRuntimeDisplayMaps => {
  const componentLabels: DisplayMap = new Map()
  const parameterLabels: DisplayMap = new Map()

  ;(nodes || []).forEach((node) => {
    if (node.type !== "udm") {
      return
    }
    const next = extractUdmDisplayMapsFromSourceData(
      (node.data as Record<string, unknown> | undefined) || undefined,
    )
    next.componentLabels.forEach((label, name) => {
      appendDisplayEntry(componentLabels, name, label)
    })
    next.parameterLabels.forEach((label, name) => {
      appendDisplayEntry(parameterLabels, name, label)
    })
  })

  return {
    componentLabels,
    parameterLabels,
    variableLabels: new Map([...componentLabels, ...parameterLabels]),
  }
}

export const resolveUdmDisplayName = (
  name: string,
  displayMap: DisplayMap | Record<string, string> | null | undefined,
): string => {
  const normalizedName = String(name || "").trim()
  if (!normalizedName) {
    return ""
  }
  if (!displayMap) {
    return normalizedName
  }
  if (displayMap instanceof Map) {
    return displayMap.get(normalizedName) || normalizedName
  }
  return String(displayMap[normalizedName] || normalizedName)
}
