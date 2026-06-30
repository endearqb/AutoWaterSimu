import type { NetworkV2Diagnostic } from "./semanticValidation"

export type NetworkV2InspectorTarget = {
  tab: "node" | "edge" | "graph"
  elementId?: string
  fieldPath?: string
}

export function mapDiagnosticToInspectorTarget(
  diagnostic: NetworkV2Diagnostic,
): NetworkV2InspectorTarget {
  if (diagnostic.element?.kind === "node") {
    return {
      tab: "node",
      elementId: diagnostic.element.id,
      fieldPath: diagnostic.fieldPath,
    }
  }

  if (diagnostic.element?.kind === "edge") {
    return {
      tab: "edge",
      elementId: diagnostic.element.id,
      fieldPath: diagnostic.fieldPath,
    }
  }

  return {
    tab: "graph",
    elementId: diagnostic.element?.id,
    fieldPath: diagnostic.fieldPath || diagnostic.schemaInstancePath,
  }
}

export function diagnosticMatchesField(
  diagnostic: NetworkV2Diagnostic,
  fieldPath: string,
  elementId?: string,
) {
  if (elementId && diagnostic.element?.id !== elementId) {
    return false
  }
  return diagnostic.fieldPath === fieldPath
}
