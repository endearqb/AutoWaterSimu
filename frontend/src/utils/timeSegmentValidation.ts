export type SegmentFactorAB = {
  a?: number
  b?: number
}

export type SegmentEdgeOverride = {
  flow?: number
  factors?: Record<string, SegmentFactorAB>
}

export type TimeSegment = {
  id: string
  startHour: number
  endHour: number
  edgeOverrides: Record<string, SegmentEdgeOverride>
}

export type TimeSegmentValidationError = {
  code:
    | "SEGMENT_EMPTY"
    | "SEGMENT_START_NOT_ZERO"
    | "SEGMENT_END_NOT_EQUAL_HOURS"
    | "SEGMENT_GAP"
    | "SEGMENT_OVERLAP"
    | "SEGMENT_EDGE_NOT_FOUND"
    | "SEGMENT_PARAM_NOT_FOUND"
    | "SEGMENT_INVALID_VALUE"
  message: string
  segmentId?: string
  edgeId?: string
  paramName?: string
}

const EPSILON = 1e-9

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value)

const isClose = (a: number, b: number): boolean => Math.abs(a - b) <= EPSILON

export const normalizeTimeSegments = (raw: unknown): TimeSegment[] => {
  if (!Array.isArray(raw)) return []

  return raw.map((item, idx) => {
    const source = item && typeof item === "object" ? (item as any) : {}
    const edgeOverridesSource =
      source.edgeOverrides ?? source.edge_overrides ?? {}
    const edgeOverrides: Record<string, SegmentEdgeOverride> = {}

    if (edgeOverridesSource && typeof edgeOverridesSource === "object") {
      Object.entries(edgeOverridesSource).forEach(([edgeId, override]) => {
        const overrideObj =
          override && typeof override === "object" ? (override as any) : {}
        const factorsSource = overrideObj.factors ?? {}
        const factors: Record<string, SegmentFactorAB> = {}

        if (factorsSource && typeof factorsSource === "object") {
          Object.entries(factorsSource).forEach(([paramName, factor]) => {
            const factorObj =
              factor && typeof factor === "object" ? (factor as any) : {}
            factors[paramName] = {
              a: factorObj.a,
              b: factorObj.b,
            }
          })
        }

        edgeOverrides[edgeId] = {
          flow: overrideObj.flow,
          factors,
        }
      })
    }

    return {
      id: String(source.id ?? `seg_${idx + 1}`),
      startHour: Number(source.startHour ?? source.start_hour),
      endHour: Number(source.endHour ?? source.end_hour),
      edgeOverrides,
    }
  })
}

export const validateTimeSegments = (params: {
  timeSegments?: TimeSegment[] | null
  hours: number
  edgeIds?: string[]
  parameterNames?: string[]
}): TimeSegmentValidationError[] => {
  const { timeSegments, hours, edgeIds = [], parameterNames = [] } = params
  if (!timeSegments || timeSegments.length === 0) return []

  const errors: TimeSegmentValidationError[] = []
  const validEdgeIds = new Set(edgeIds.map((id) => String(id)))
  const validParamNames = new Set(
    parameterNames.map((paramName) => String(paramName)),
  )

  const parsedHours = Number(hours)
  if (!isFiniteNumber(parsedHours) || parsedHours <= 0) {
    return [
      {
        code: "SEGMENT_END_NOT_EQUAL_HOURS",
        message: "Invalid simulation hours",
      },
    ]
  }

  const parsedSegments = timeSegments.map((segment, idx) => {
    const segmentId = String(segment.id ?? `seg_${idx + 1}`)
    const startHour = Number(segment.startHour)
    const endHour = Number(segment.endHour)

    if (!isFiniteNumber(startHour) || !isFiniteNumber(endHour)) {
      errors.push({
        code: "SEGMENT_INVALID_VALUE",
        message: "Segment startHour/endHour must be finite numbers",
        segmentId,
      })
    } else {
      if (startHour < 0) {
        errors.push({
          code: "SEGMENT_INVALID_VALUE",
          message: "Segment startHour must be >= 0",
          segmentId,
        })
      }
      if (endHour <= startHour) {
        errors.push({
          code: "SEGMENT_INVALID_VALUE",
          message: "Segment endHour must be greater than startHour",
          segmentId,
        })
      }
    }

    Object.entries(segment.edgeOverrides || {}).forEach(([edgeId, override]) => {
      if (validEdgeIds.size > 0 && !validEdgeIds.has(edgeId)) {
        errors.push({
          code: "SEGMENT_EDGE_NOT_FOUND",
          message: `Edge override references unknown edge: ${edgeId}`,
          segmentId,
          edgeId,
        })
      }

      if (!override || typeof override !== "object") {
        errors.push({
          code: "SEGMENT_INVALID_VALUE",
          message: "Edge override must be an object",
          segmentId,
          edgeId,
        })
        return
      }

      if (override.flow !== undefined) {
        const parsedFlow = Number(override.flow)
        if (!isFiniteNumber(parsedFlow) || parsedFlow < 0) {
          errors.push({
            code: "SEGMENT_INVALID_VALUE",
            message: "Override flow must be a finite number >= 0",
            segmentId,
            edgeId,
          })
        }
      }

      Object.entries(override.factors || {}).forEach(([paramName, factor]) => {
        if (validParamNames.size > 0 && !validParamNames.has(paramName)) {
          errors.push({
            code: "SEGMENT_PARAM_NOT_FOUND",
            message: `Override references unknown parameter: ${paramName}`,
            segmentId,
            edgeId,
            paramName,
          })
          return
        }

        if (!factor || typeof factor !== "object") {
          errors.push({
            code: "SEGMENT_INVALID_VALUE",
            message: "Override factor must be an object",
            segmentId,
            edgeId,
            paramName,
          })
          return
        }

        if (factor.a !== undefined && !isFiniteNumber(Number(factor.a))) {
          errors.push({
            code: "SEGMENT_INVALID_VALUE",
            message: "Override factor 'a' must be a finite number",
            segmentId,
            edgeId,
            paramName,
          })
        }
        if (factor.b !== undefined && !isFiniteNumber(Number(factor.b))) {
          errors.push({
            code: "SEGMENT_INVALID_VALUE",
            message: "Override factor 'b' must be a finite number",
            segmentId,
            edgeId,
            paramName,
          })
        }
      })
    })

    return {
      id: segmentId,
      startHour,
      endHour,
    }
  })

  if (errors.length > 0) return errors

  parsedSegments.sort((a, b) => a.startHour - b.startHour)
  if (!parsedSegments.length) {
    return [
      {
        code: "SEGMENT_EMPTY",
        message: "At least one segment is required",
      },
    ]
  }

  if (!isClose(parsedSegments[0].startHour, 0)) {
    errors.push({
      code: "SEGMENT_START_NOT_ZERO",
      message: "First segment must start at 0",
      segmentId: parsedSegments[0].id,
    })
  }

  for (let idx = 1; idx < parsedSegments.length; idx += 1) {
    const prev = parsedSegments[idx - 1]
    const current = parsedSegments[idx]
    if (current.startHour > prev.endHour + EPSILON) {
      errors.push({
        code: "SEGMENT_GAP",
        message: "Segments contain gap",
        segmentId: current.id,
      })
    } else if (current.startHour < prev.endHour - EPSILON) {
      errors.push({
        code: "SEGMENT_OVERLAP",
        message: "Segments overlap",
        segmentId: current.id,
      })
    }
  }

  const lastSegment = parsedSegments[parsedSegments.length - 1]
  if (!isClose(lastSegment.endHour, parsedHours)) {
    errors.push({
      code: "SEGMENT_END_NOT_EQUAL_HOURS",
      message: "Segments must end exactly at simulation hours",
      segmentId: lastSegment.id,
    })
  }

  return errors
}
