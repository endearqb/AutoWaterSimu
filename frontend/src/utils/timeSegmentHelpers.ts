import type { SegmentEdgeOverride } from "./timeSegmentValidation"

export const parseOptionalNumber = (raw: string): number | undefined => {
  if (raw.trim() === "") {
    return undefined
  }
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : undefined
}

export const asFiniteNumber = (value: unknown, fallback: number): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export const toInputValue = (value: number | undefined): string => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return ""
  }
  return String(value)
}

export const normalizeOverride = (
  override?: SegmentEdgeOverride,
): SegmentEdgeOverride | undefined => {
  if (!override) return undefined

  const hasFlow = typeof override.flow === "number" && Number.isFinite(override.flow)
  const normalizedFactors: Record<string, { a?: number; b?: number }> = {}

  Object.entries(override.factors || {}).forEach(([paramName, factor]) => {
    if (!factor) return
    const nextFactor: { a?: number; b?: number } = {}
    if (typeof factor.a === "number" && Number.isFinite(factor.a)) {
      nextFactor.a = factor.a
    }
    if (typeof factor.b === "number" && Number.isFinite(factor.b)) {
      nextFactor.b = factor.b
    }
    if (nextFactor.a !== undefined || nextFactor.b !== undefined) {
      normalizedFactors[paramName] = nextFactor
    }
  })

  const hasFactors = Object.keys(normalizedFactors).length > 0
  if (!hasFlow && !hasFactors) return undefined

  const normalized: SegmentEdgeOverride = {}
  if (hasFlow) normalized.flow = override.flow
  if (hasFactors) normalized.factors = normalizedFactors
  return normalized
}
