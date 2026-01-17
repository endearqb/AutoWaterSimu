export type IndexRange = [number, number]

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function normalizeIndex(value: number, maxIndex: number): number {
  const safeMax = Number.isFinite(maxIndex)
    ? Math.max(0, Math.floor(maxIndex))
    : 0
  const safeValue = Number.isFinite(value) ? Math.floor(value) : 0
  return clampNumber(safeValue, 0, safeMax)
}

export function normalizeIndexRange(
  range: IndexRange,
  maxIndex: number,
  minStepsBetweenThumbs = 0,
): IndexRange {
  const safeMax = Number.isFinite(maxIndex)
    ? Math.max(0, Math.floor(maxIndex))
    : 0
  const safeMinStepsBetween = Number.isFinite(minStepsBetweenThumbs)
    ? Math.max(0, Math.min(safeMax, Math.floor(minStepsBetweenThumbs)))
    : 0

  const startRaw = Number.isFinite(range[0]) ? Math.floor(range[0]) : 0
  const endRaw = Number.isFinite(range[1]) ? Math.floor(range[1]) : 0

  let start = clampNumber(startRaw, 0, safeMax)
  let end = clampNumber(endRaw, 0, safeMax)

  if (end < start) {
    ;[start, end] = [end, start]
  }

  if (end - start < safeMinStepsBetween) {
    if (start + safeMinStepsBetween <= safeMax) {
      end = start + safeMinStepsBetween
    } else {
      end = safeMax
      start = Math.max(0, end - safeMinStepsBetween)
    }
  }

  return [start, end]
}
