import {
  Box,
  Button,
  Field,
  HStack,
  IconButton,
  Input,
  Stack,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useMemo } from "react"
import { FiChevronDown, FiChevronUp, FiCopy, FiTrash2 } from "react-icons/fi"
import type { EdgeParameterConfig } from "../../../config/modelConfigs"
import { useI18n } from "../../../i18n"
import type {
  SegmentEdgeOverride,
  TimeSegment,
} from "../../../utils/timeSegmentValidation"

type SegmentParameterDescriptor = {
  name: string
  label: string
  description?: string
}

interface EdgeTimeSegmentEditorProps {
  edgeId: string
  edgeFlow: number
  parameterDescriptors: SegmentParameterDescriptor[]
  edgeConfigs: Record<string, EdgeParameterConfig>
  timeSegments: TimeSegment[]
  simulationHours: number
  emptyParameterMessage?: string
  addTimeSegment?: (segment?: Partial<TimeSegment>) => void
  updateTimeSegment?: (segmentId: string, patch: Partial<TimeSegment>) => void
  removeTimeSegment?: (segmentId: string) => void
  copyTimeSegment?: (segmentId: string) => void
  reorderTimeSegments?: (fromIndex: number, toIndex: number) => void
}

type EffectiveSegmentValues = {
  flow: number
  factors: Record<string, { a: number; b: number }>
}

const parseOptionalNumber = (raw: string): number | undefined => {
  if (raw.trim() === "") {
    return undefined
  }
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : undefined
}

const asFiniteNumber = (value: unknown, fallback: number): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const toInputValue = (value: number | undefined): string => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return ""
  }
  return String(value)
}

const normalizeOverride = (
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

function EdgeTimeSegmentEditor(props: EdgeTimeSegmentEditorProps) {
  const {
    edgeId,
    edgeFlow,
    parameterDescriptors,
    edgeConfigs,
    timeSegments,
    simulationHours,
    emptyParameterMessage,
    addTimeSegment,
    updateTimeSegment,
    removeTimeSegment,
    copyTimeSegment,
    reorderTimeSegments,
  } = props
  const { t } = useI18n()

  const segmentMap = useMemo(() => {
    const map = new Map<string, TimeSegment>()
    timeSegments.forEach((segment) => map.set(segment.id, segment))
    return map
  }, [timeSegments])

  const effectiveValueBySegmentId = useMemo(() => {
    const map = new Map<string, EffectiveSegmentValues>()
    const initialFactors: Record<string, { a: number; b: number }> = {}
    parameterDescriptors.forEach((parameter) => {
      const config = edgeConfigs[parameter.name]
      initialFactors[parameter.name] = {
        a: asFiniteNumber(config?.a, 1),
        b: asFiniteNumber(config?.b, 0),
      }
    })

    let currentFlow = asFiniteNumber(edgeFlow, 0)
    let currentFactors = initialFactors

    timeSegments.forEach((segment) => {
      const override = segment.edgeOverrides?.[edgeId]
      const nextFlow =
        typeof override?.flow === "number" && Number.isFinite(override.flow)
          ? override.flow
          : currentFlow

      const nextFactors: Record<string, { a: number; b: number }> = {}
      parameterDescriptors.forEach((parameter) => {
        const prev = currentFactors[parameter.name] || { a: 1, b: 0 }
        const overrideFactor = override?.factors?.[parameter.name]
        nextFactors[parameter.name] = {
          a:
            typeof overrideFactor?.a === "number" &&
            Number.isFinite(overrideFactor.a)
              ? overrideFactor.a
              : prev.a,
          b:
            typeof overrideFactor?.b === "number" &&
            Number.isFinite(overrideFactor.b)
              ? overrideFactor.b
              : prev.b,
        }
      })

      currentFlow = nextFlow
      currentFactors = nextFactors
      map.set(segment.id, { flow: nextFlow, factors: nextFactors })
    })

    return map
  }, [edgeId, edgeFlow, edgeConfigs, parameterDescriptors, timeSegments])

  const withUpdatedEdgeOverride = (
    segmentId: string,
    updater: (current?: SegmentEdgeOverride) => SegmentEdgeOverride | undefined,
  ) => {
    if (!updateTimeSegment) return
    const segment = segmentMap.get(segmentId)
    if (!segment) return

    const nextOverrides = { ...(segment.edgeOverrides || {}) }
    const nextOverride = normalizeOverride(updater(nextOverrides[edgeId]))

    if (!nextOverride) {
      delete nextOverrides[edgeId]
    } else {
      nextOverrides[edgeId] = nextOverride
    }

    updateTimeSegment(segmentId, { edgeOverrides: nextOverrides })
  }

  const handleSegmentFieldChange = (
    segmentId: string,
    field: "startHour" | "endHour",
    raw: string,
  ) => {
    if (!updateTimeSegment) return
    const parsed = parseOptionalNumber(raw)
    if (parsed === undefined) return
    updateTimeSegment(segmentId, { [field]: parsed } as Partial<TimeSegment>)
  }

  const handleFlowOverrideChange = (
    segmentId: string,
    raw: string,
  ) => {
    withUpdatedEdgeOverride(segmentId, (current) => {
      const next: SegmentEdgeOverride = {
        flow: current?.flow,
        factors: { ...(current?.factors || {}) },
      }
      next.flow = parseOptionalNumber(raw)
      return next
    })
  }

  const handleFactorOverrideChange = (
    segmentId: string,
    parameterName: string,
    field: "a" | "b",
    raw: string,
  ) => {
    withUpdatedEdgeOverride(segmentId, (current) => {
      const next: SegmentEdgeOverride = {
        flow: current?.flow,
        factors: { ...(current?.factors || {}) },
      }
      const nextFactor = {
        ...(next.factors?.[parameterName] || {}),
      }
      nextFactor[field] = parseOptionalNumber(raw)

      if (
        nextFactor.a === undefined &&
        nextFactor.b === undefined &&
        next.factors
      ) {
        delete next.factors[parameterName]
      } else if (next.factors) {
        next.factors[parameterName] = nextFactor
      }
      return next
    })
  }

  const handleAddSegment = () => {
    if (!addTimeSegment) return
    const sorted = [...timeSegments].sort((a, b) => a.startHour - b.startHour)
    const lastEndHour = sorted.length > 0 ? sorted[sorted.length - 1].endHour : 0
    addTimeSegment({
      startHour: lastEndHour,
      endHour: simulationHours,
      edgeOverrides: {},
    })
  }

  return (
    <VStack align="stretch" gap={3}>
      <HStack justify="space-between" align="center">
        <Text fontSize="sm" fontWeight="bold">
          {t("flow.simulation.timeSegments.title")}
        </Text>
        <Button size="xs" onClick={handleAddSegment} disabled={!addTimeSegment}>
          {t("flow.simulation.timeSegments.addSegment")}
        </Button>
      </HStack>

      {timeSegments.length === 0 ? (
        <Box borderWidth="1px" borderStyle="dashed" borderColor="gray.300" p={3}>
          <Text fontSize="sm" color="gray.600">
            {t("flow.simulation.timeSegments.empty")}
          </Text>
        </Box>
      ) : (
        <Box overflowX="auto">
          <HStack align="stretch" gap={3} minW="max-content">
            {timeSegments.map((segment, index) => {
              const override = segment.edgeOverrides?.[edgeId]
              const effectiveValues = effectiveValueBySegmentId.get(segment.id)
              const flowInherited = override?.flow === undefined
              const flowValue = flowInherited
                ? toInputValue(effectiveValues?.flow)
                : toInputValue(override?.flow)

              return (
                <Stack
                  key={segment.id}
                  minW="320px"
                  borderWidth="1px"
                  borderColor="gray.200"
                  borderRadius="md"
                  bg="gray.50"
                  p={3}
                  gap={3}
                >
                  <HStack justify="space-between" align="center">
                    <Text fontSize="sm" fontWeight="semibold">
                      {t("flow.simulation.timeSegments.segmentLabel", {
                        index: index + 1,
                      })}
                    </Text>
                    <HStack gap={1}>
                      <IconButton
                        size="xs"
                        variant="ghost"
                        aria-label={t("flow.simulation.timeSegments.moveUp")}
                        onClick={() => reorderTimeSegments?.(index, index - 1)}
                        disabled={!reorderTimeSegments || index === 0}
                      >
                        <FiChevronUp />
                      </IconButton>
                      <IconButton
                        size="xs"
                        variant="ghost"
                        aria-label={t("flow.simulation.timeSegments.moveDown")}
                        onClick={() => reorderTimeSegments?.(index, index + 1)}
                        disabled={
                          !reorderTimeSegments || index >= timeSegments.length - 1
                        }
                      >
                        <FiChevronDown />
                      </IconButton>
                      <IconButton
                        size="xs"
                        variant="ghost"
                        aria-label={t("flow.simulation.timeSegments.copy")}
                        onClick={() => copyTimeSegment?.(segment.id)}
                        disabled={!copyTimeSegment}
                      >
                        <FiCopy />
                      </IconButton>
                      <IconButton
                        size="xs"
                        variant="ghost"
                        colorPalette="red"
                        aria-label={t("flow.simulation.timeSegments.remove")}
                        onClick={() => removeTimeSegment?.(segment.id)}
                        disabled={!removeTimeSegment}
                      >
                        <FiTrash2 />
                      </IconButton>
                    </HStack>
                  </HStack>

                  <HStack align="end" wrap="wrap">
                    <Field.Root maxW="150px">
                      <Field.Label fontSize="xs">
                        {t("flow.simulation.timeSegments.startHour")}
                      </Field.Label>
                      <Input
                        size="xs"
                        type="number"
                        step="any"
                        value={segment.startHour}
                        onChange={(event) =>
                          handleSegmentFieldChange(
                            segment.id,
                            "startHour",
                            event.target.value,
                          )
                        }
                      />
                    </Field.Root>
                    <Field.Root maxW="150px">
                      <Field.Label fontSize="xs">
                        {t("flow.simulation.timeSegments.endHour")}
                      </Field.Label>
                      <Input
                        size="xs"
                        type="number"
                        step="any"
                        value={segment.endHour}
                        onChange={(event) =>
                          handleSegmentFieldChange(
                            segment.id,
                            "endHour",
                            event.target.value,
                          )
                        }
                      />
                    </Field.Root>
                  </HStack>

                  <Field.Root>
                    <HStack justify="space-between" align="center">
                      <Field.Label fontSize="xs">
                        {t("flow.simulation.timeSegments.flowOverride")}
                      </Field.Label>
                      {flowInherited && (
                        <Text fontSize="xs" color="gray.500">
                          {t("flow.simulation.timeSegments.inheritedBadge")}
                        </Text>
                      )}
                    </HStack>
                    <Input
                      size="xs"
                      type="number"
                      step="any"
                      min={0}
                      value={flowValue}
                      onFocus={(event) => event.currentTarget.select()}
                      onChange={(event) =>
                        handleFlowOverrideChange(segment.id, event.target.value)
                      }
                      color={flowInherited ? "gray.500" : "gray.900"}
                      bg={flowInherited ? "gray.100" : "white"}
                    />
                  </Field.Root>

                  {parameterDescriptors.length > 0 ? (
                    <VStack align="stretch" gap={2}>
                      {parameterDescriptors.map((parameter) => {
                        const factorOverride = override?.factors?.[parameter.name]
                        const factorValues = effectiveValues?.factors?.[parameter.name]
                        const aInherited = factorOverride?.a === undefined
                        const bInherited = factorOverride?.b === undefined
                        const aValue = aInherited
                          ? toInputValue(factorValues?.a)
                          : toInputValue(factorOverride?.a)
                        const bValue = bInherited
                          ? toInputValue(factorValues?.b)
                          : toInputValue(factorOverride?.b)

                        return (
                          <Box
                            key={`${segment.id}-${parameter.name}`}
                            borderWidth="1px"
                            borderColor="gray.200"
                            borderRadius="sm"
                            bg="white"
                            p={2}
                          >
                            <Text fontSize="xs" fontWeight="medium" mb={1}>
                              {parameter.label}
                            </Text>
                            <HStack align="end" gap={2} wrap="wrap">
                              <Field.Root maxW="130px">
                                <HStack justify="space-between" align="center">
                                  <Field.Label fontSize="xs">
                                    {t("flow.simulation.timeSegments.factorA")}
                                  </Field.Label>
                                  {aInherited && (
                                    <Text fontSize="xs" color="gray.500">
                                      {t("flow.simulation.timeSegments.inheritedBadge")}
                                    </Text>
                                  )}
                                </HStack>
                                <Input
                                  size="xs"
                                  type="number"
                                  step="any"
                                  value={aValue}
                                  onFocus={(event) => event.currentTarget.select()}
                                  onChange={(event) =>
                                    handleFactorOverrideChange(
                                      segment.id,
                                      parameter.name,
                                      "a",
                                      event.target.value,
                                    )
                                  }
                                  color={aInherited ? "gray.500" : "gray.900"}
                                  bg={aInherited ? "gray.100" : "white"}
                                />
                              </Field.Root>

                              <Field.Root maxW="130px">
                                <HStack justify="space-between" align="center">
                                  <Field.Label fontSize="xs">
                                    {t("flow.simulation.timeSegments.factorB")}
                                  </Field.Label>
                                  {bInherited && (
                                    <Text fontSize="xs" color="gray.500">
                                      {t("flow.simulation.timeSegments.inheritedBadge")}
                                    </Text>
                                  )}
                                </HStack>
                                <Input
                                  size="xs"
                                  type="number"
                                  step="any"
                                  value={bValue}
                                  onFocus={(event) => event.currentTarget.select()}
                                  onChange={(event) =>
                                    handleFactorOverrideChange(
                                      segment.id,
                                      parameter.name,
                                      "b",
                                      event.target.value,
                                    )
                                  }
                                  color={bInherited ? "gray.500" : "gray.900"}
                                  bg={bInherited ? "gray.100" : "white"}
                                />
                              </Field.Root>
                            </HStack>
                          </Box>
                        )
                      })}
                    </VStack>
                  ) : (
                    emptyParameterMessage && (
                      <Text fontSize="xs" color="gray.500">
                        {emptyParameterMessage}
                      </Text>
                    )
                  )}
                </Stack>
              )
            })}
          </HStack>
        </Box>
      )}
    </VStack>
  )
}

export default EdgeTimeSegmentEditor
