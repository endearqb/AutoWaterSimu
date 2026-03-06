import {
  Box,
  Button,
  Field,
  HStack,
  IconButton,
  Input,
  Separator,
  Text,
  VStack,
} from "@chakra-ui/react"
import type { Edge, Node } from "@xyflow/react"
import { useMemo, useState } from "react"
import {
  FiChevronDown,
  FiChevronUp,
  FiCopy,
  FiLink,
  FiTrash2,
} from "react-icons/fi"
import type { EdgeParameterConfig } from "../../../config/modelConfigs"
import { useI18n } from "../../../i18n"
import {
  asFiniteNumber,
  normalizeOverride,
  parseOptionalNumber,
  toInputValue,
} from "../../../utils/timeSegmentHelpers"
import {
  type SegmentEdgeOverride,
  type TimeSegment,
  validateTimeSegments,
} from "../../../utils/timeSegmentValidation"

interface TimeSegmentPlanEditorProps {
  timeSegments: TimeSegment[]
  edges: Edge[]
  nodes: Node[]
  parameterNames: string[]
  simulationHours: number
  edgeParameterConfigs?: Record<string, Record<string, EdgeParameterConfig>>
  setTimeSegments?: (segments: TimeSegment[]) => void
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

const getNodeDisplayName = (node: Node): string => {
  const data = (node.data || {}) as Record<string, unknown>
  const label = typeof data.label === "string" ? data.label.trim() : ""
  if (label) return label
  const name = typeof data.name === "string" ? data.name.trim() : ""
  if (name) return name
  return node.id
}

const buildEdgeLabel = (
  edge: Edge,
  nodeNameById: Map<string, string>,
): string => {
  const sourceName = nodeNameById.get(edge.source) || edge.source
  const targetName = nodeNameById.get(edge.target) || edge.target
  return `${sourceName} -> ${targetName}`
}

function TimeSegmentPlanEditor(props: TimeSegmentPlanEditorProps) {
  const {
    timeSegments,
    edges,
    nodes,
    parameterNames,
    simulationHours,
    edgeParameterConfigs = {},
    setTimeSegments,
    addTimeSegment,
    updateTimeSegment,
    removeTimeSegment,
    copyTimeSegment,
    reorderTimeSegments,
  } = props
  const { t } = useI18n()

  const [isSplitMode, setIsSplitMode] = useState(false)
  const [splitCount, setSplitCount] = useState(3)

  const edgeIdList = useMemo(
    () =>
      edges
        .map((edge) => edge.id || `${edge.source}-${edge.target}`)
        .filter(Boolean),
    [edges],
  )

  const nodeNameById = useMemo(() => {
    const map = new Map<string, string>()
    nodes.forEach((node) => {
      map.set(node.id, getNodeDisplayName(node))
    })
    return map
  }, [nodes])

  const edgeLabelById = useMemo(() => {
    const map = new Map<string, string>()
    edges.forEach((edge) => {
      const edgeId = edge.id || `${edge.source}-${edge.target}`
      map.set(edgeId, buildEdgeLabel(edge, nodeNameById))
    })
    return map
  }, [edges, nodeNameById])

  const validationErrors = useMemo(
    () =>
      validateTimeSegments({
        timeSegments,
        hours: simulationHours,
        edgeIds: edgeIdList,
        parameterNames,
      }),
    [timeSegments, simulationHours, edgeIdList, parameterNames],
  )

  const segmentMap = useMemo(() => {
    const map = new Map<string, TimeSegment>()
    timeSegments.forEach((segment) => map.set(segment.id, segment))
    return map
  }, [timeSegments])

  const edgeById = useMemo(() => {
    const map = new Map<string, Edge>()
    edges.forEach((edge) => {
      const edgeId = edge.id || `${edge.source}-${edge.target}`
      map.set(edgeId, edge)
    })
    return map
  }, [edges])

  const effectiveValueByEdgeAndSegment = useMemo(() => {
    const edgeMap = new Map<string, Map<string, EffectiveSegmentValues>>()

    edgeIdList.forEach((edgeId) => {
      const edge = edgeById.get(edgeId)
      const baseFlow = asFiniteNumber(
        (edge?.data as Record<string, unknown> | undefined)?.flow,
        0,
      )

      const edgeConfig = edgeParameterConfigs[edgeId] || {}
      let currentFlow = baseFlow
      let currentFactors: Record<string, { a: number; b: number }> = {}

      parameterNames.forEach((parameterName) => {
        const config = edgeConfig[parameterName]
        currentFactors[parameterName] = {
          a: asFiniteNumber(config?.a, 1),
          b: asFiniteNumber(config?.b, 0),
        }
      })

      const segmentValues = new Map<string, EffectiveSegmentValues>()
      timeSegments.forEach((segment) => {
        const override = segment.edgeOverrides?.[edgeId]
        if (
          typeof override?.flow === "number" &&
          Number.isFinite(override.flow)
        ) {
          currentFlow = override.flow
        }

        const nextFactors: Record<string, { a: number; b: number }> = {}
        parameterNames.forEach((parameterName) => {
          const prev = currentFactors[parameterName] || { a: 1, b: 0 }
          const overrideFactor = override?.factors?.[parameterName]
          nextFactors[parameterName] = {
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
        currentFactors = nextFactors
        segmentValues.set(segment.id, {
          flow: currentFlow,
          factors: nextFactors,
        })
      })

      edgeMap.set(edgeId, segmentValues)
    })

    return edgeMap
  }, [edgeById, edgeIdList, edgeParameterConfigs, parameterNames, timeSegments])

  const handleAddSegment = () => {
    if (!addTimeSegment) return
    const sorted = [...timeSegments].sort((a, b) => a.startHour - b.startHour)
    const lastEndHour =
      sorted.length > 0 ? sorted[sorted.length - 1].endHour : 0
    addTimeSegment({
      startHour: lastEndHour,
      endHour: simulationHours,
      edgeOverrides: {},
    })
  }

  const MAX_SPLIT_COUNT = 100
  const isSplitValid =
    Number.isFinite(splitCount) &&
    splitCount >= 1 &&
    splitCount <= MAX_SPLIT_COUNT

  const handleQuickSplit = () => {
    if (!setTimeSegments || simulationHours <= 0 || !isSplitValid) return
    const n = Math.max(1, Math.round(splitCount))
    const step = simulationHours / n
    const segments: Partial<TimeSegment>[] = Array.from(
      { length: n },
      (_, i) => ({
        startHour: Math.round(step * i * 1e6) / 1e6,
        endHour:
          i === n - 1
            ? simulationHours
            : Math.round(step * (i + 1) * 1e6) / 1e6,
        edgeOverrides: {},
      }),
    )
    setTimeSegments(
      segments.map((s, i) => ({
        id: `seg-${Date.now()}-${i}`,
        startHour: s.startHour ?? 0,
        endHour: s.endHour ?? simulationHours,
        edgeOverrides: s.edgeOverrides ?? {},
      })),
    )
    setIsSplitMode(false)
  }

  const updateSegmentField = (
    segmentId: string,
    field: "startHour" | "endHour",
    raw: string,
  ) => {
    if (!updateTimeSegment) return
    const parsed = parseOptionalNumber(raw)
    if (parsed === undefined) return
    updateTimeSegment(segmentId, { [field]: parsed } as Partial<TimeSegment>)
  }

  const withUpdatedEdgeOverride = (
    segmentId: string,
    edgeId: string,
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

  const setEdgeFlowOverride = (
    segmentId: string,
    edgeId: string,
    raw: string,
  ) => {
    withUpdatedEdgeOverride(segmentId, edgeId, (current) => {
      const next: SegmentEdgeOverride = {
        flow: current?.flow,
        factors: { ...(current?.factors || {}) },
      }
      const parsed = parseOptionalNumber(raw)
      next.flow = parsed
      return next
    })
  }

  const setEdgeFactorOverride = (
    segmentId: string,
    edgeId: string,
    parameterName: string,
    field: "a" | "b",
    raw: string,
  ) => {
    withUpdatedEdgeOverride(segmentId, edgeId, (current) => {
      const next: SegmentEdgeOverride = {
        flow: current?.flow,
        factors: { ...(current?.factors || {}) },
      }
      const nextFactor = {
        ...(next.factors?.[parameterName] || {}),
      }
      const parsed = parseOptionalNumber(raw)
      nextFactor[field] = parsed
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

  return (
    <VStack align="stretch" gap={3}>
      <Box
        position="sticky"
        top="0"
        zIndex={10}
        bg="hsla(0,0%,100%,0.96)"
        borderBottomWidth="1px"
        borderColor="gray.100"
        pt={1}
        pb={3}
      >
        <VStack align="stretch" gap={3}>
          <HStack justify="space-between" align="center">
            <VStack align="start" gap={0}>
              <Text fontSize="sm" fontWeight="bold">
                {t("flow.simulation.timeSegments.title")}
              </Text>
              <Text fontSize="xs" color="gray.600">
                {t("flow.simulation.timeSegments.subtitle", {
                  hours: simulationHours.toFixed(2),
                })}
              </Text>
            </VStack>
            <HStack gap={1}>
              {isSplitMode ? (
                <>
                  <Input
                    size="xs"
                    type="number"
                    min={1}
                    max={MAX_SPLIT_COUNT}
                    w="60px"
                    value={splitCount}
                    onChange={(e) => {
                      const val = Number(e.target.value)
                      setSplitCount(Number.isFinite(val) ? val : 1)
                    }}
                  />
                  <Button
                    size="xs"
                    onClick={handleQuickSplit}
                    disabled={
                      !setTimeSegments || simulationHours <= 0 || !isSplitValid
                    }
                  >
                    {t("flow.simulation.timeSegments.splitConfirm")}
                  </Button>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => setIsSplitMode(false)}
                  >
                    {t("flow.simulation.timeSegments.splitCancel")}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => setIsSplitMode(true)}
                    disabled={!setTimeSegments || simulationHours <= 0}
                  >
                    {t("flow.simulation.timeSegments.quickSplit")}
                  </Button>
                  <Button
                    size="xs"
                    onClick={handleAddSegment}
                    disabled={!addTimeSegment}
                  >
                    {t("flow.simulation.timeSegments.addSegment")}
                  </Button>
                </>
              )}
            </HStack>
          </HStack>

          {validationErrors.length > 0 ? (
            <Box
              borderWidth="1px"
              borderColor="red.200"
              bg="red.50"
              borderRadius="md"
              p={2}
            >
              <Text fontSize="xs" color="red.700" fontWeight="bold" mb={1}>
                {t("flow.simulation.timeSegments.validationFailed", {
                  count: validationErrors.length,
                })}
              </Text>
              <VStack align="start" gap={1}>
                {validationErrors.map((error, index) => (
                  <Text
                    key={`${error.code}-${index}`}
                    fontSize="xs"
                    color="red.700"
                  >
                    {error.code}: {error.message}
                  </Text>
                ))}
              </VStack>
            </Box>
          ) : (
            <Box
              borderWidth="1px"
              borderColor="green.200"
              bg="green.50"
              borderRadius="md"
              p={2}
            >
              <Text fontSize="xs" color="green.700" fontWeight="bold">
                {timeSegments.length > 0
                  ? t("flow.simulation.timeSegments.validationPassed")
                  : t("flow.simulation.timeSegments.emptyHint")}
              </Text>
            </Box>
          )}

          {timeSegments.length === 0 && (
            <Box
              borderWidth="1px"
              borderStyle="dashed"
              borderColor="gray.300"
              p={3}
            >
              <Text fontSize="sm" color="gray.600">
                {t("flow.simulation.timeSegments.empty")}
              </Text>
            </Box>
          )}

          {timeSegments.length > 0 && (
            <Box overflowX="auto">
              <HStack align="stretch" gap={3} minW="max-content">
                {timeSegments.map((segment, index) => (
                  <Box
                    key={segment.id}
                    minW="300px"
                    borderWidth="1px"
                    borderColor="gray.200"
                    p={3}
                  >
                    <VStack align="stretch" gap={3}>
                      <HStack justify="space-between" align="center">
                        <Text fontSize="sm" fontWeight="bold">
                          {t("flow.simulation.timeSegments.segmentLabel", {
                            index: index + 1,
                          })}
                        </Text>
                        <HStack gap={1}>
                          <IconButton
                            size="xs"
                            variant="ghost"
                            aria-label={t(
                              "flow.simulation.timeSegments.moveUp",
                            )}
                            onClick={() =>
                              reorderTimeSegments?.(index, index - 1)
                            }
                            disabled={!reorderTimeSegments || index === 0}
                          >
                            <FiChevronUp />
                          </IconButton>
                          <IconButton
                            size="xs"
                            variant="ghost"
                            aria-label={t(
                              "flow.simulation.timeSegments.moveDown",
                            )}
                            onClick={() =>
                              reorderTimeSegments?.(index, index + 1)
                            }
                            disabled={
                              !reorderTimeSegments ||
                              index >= timeSegments.length - 1
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
                            aria-label={t(
                              "flow.simulation.timeSegments.remove",
                            )}
                            onClick={() => removeTimeSegment?.(segment.id)}
                            disabled={!removeTimeSegment}
                          >
                            <FiTrash2 />
                          </IconButton>
                        </HStack>
                      </HStack>
                      <HStack align="end" wrap="wrap">
                        <Field.Root maxW="140px">
                          <Field.Label fontSize="xs">
                            {t("flow.simulation.timeSegments.startHour")}
                          </Field.Label>
                          <Input
                            size="xs"
                            type="number"
                            step="any"
                            value={segment.startHour}
                            onChange={(event) =>
                              updateSegmentField(
                                segment.id,
                                "startHour",
                                event.target.value,
                              )
                            }
                          />
                        </Field.Root>
                        <Field.Root maxW="140px">
                          <Field.Label fontSize="xs">
                            {t("flow.simulation.timeSegments.endHour")}
                          </Field.Label>
                          <Input
                            size="xs"
                            type="number"
                            step="any"
                            value={segment.endHour}
                            onChange={(event) =>
                              updateSegmentField(
                                segment.id,
                                "endHour",
                                event.target.value,
                              )
                            }
                          />
                        </Field.Root>
                      </HStack>
                    </VStack>
                  </Box>
                ))}
              </HStack>
            </Box>
          )}
        </VStack>
      </Box>

      {timeSegments.length > 0 && (
        <>
          <Separator />

          {edgeIdList.length === 0 ? (
            <Text fontSize="xs" color="gray.500">
              {t("flow.simulation.timeSegments.noEdgeOverride")}
            </Text>
          ) : (
            <VStack align="stretch" gap={3}>
              {edgeIdList.map((edgeId) => (
                <Box
                  key={edgeId}
                  borderWidth="1px"
                  borderColor="gray.200"
                  borderRadius="md"
                  p={2}
                >
                  <VStack align="stretch" gap={2}>
                    <Text fontSize="sm" fontWeight="semibold">
                      {edgeLabelById.get(edgeId) || edgeId}
                    </Text>

                    <Box overflowX="auto">
                      <HStack align="stretch" gap={3} minW="max-content">
                        {timeSegments.map((segment, index) => {
                          const override = segment.edgeOverrides?.[edgeId]
                          const effectiveValues = effectiveValueByEdgeAndSegment
                            .get(edgeId)
                            ?.get(segment.id)
                          const flowInherited = override?.flow === undefined
                          const flowValue = flowInherited
                            ? toInputValue(effectiveValues?.flow)
                            : toInputValue(override?.flow)
                          return (
                            <Box
                              key={`${edgeId}-${segment.id}`}
                              minW="260px"
                              borderWidth="1px"
                              borderColor="gray.100"
                              bg="gray.50"
                              p={2}
                            >
                              <VStack align="stretch" gap={2}>
                                <Text fontSize="xs" color="gray.600">
                                  {t(
                                    "flow.simulation.timeSegments.segmentLabel",
                                    {
                                      index: index + 1,
                                    },
                                  )}
                                </Text>
                                <Field.Root>
                                  <HStack
                                    justify="space-between"
                                    align="center"
                                  >
                                    <Field.Label fontSize="xs">
                                      {t(
                                        "flow.simulation.timeSegments.flowOverride",
                                      )}
                                    </Field.Label>
                                    {flowInherited && (
                                      <HStack gap={0.5}>
                                        <FiLink
                                          size={10}
                                          color="var(--chakra-colors-gray-500)"
                                        />
                                        <Text fontSize="xs" color="gray.500">
                                          {t(
                                            "flow.simulation.timeSegments.inheritedBadge",
                                          )}
                                        </Text>
                                      </HStack>
                                    )}
                                  </HStack>
                                  <Input
                                    size="xs"
                                    type="number"
                                    step="any"
                                    min={0}
                                    value={flowValue}
                                    onFocus={(event) =>
                                      event.currentTarget.select()
                                    }
                                    onChange={(event) =>
                                      setEdgeFlowOverride(
                                        segment.id,
                                        edgeId,
                                        event.target.value,
                                      )
                                    }
                                    color={
                                      flowInherited ? "gray.500" : "gray.900"
                                    }
                                    bg={flowInherited ? "gray.100" : "white"}
                                    borderStyle={
                                      flowInherited ? "dashed" : "solid"
                                    }
                                    borderColor={
                                      flowInherited ? "gray.300" : undefined
                                    }
                                  />
                                </Field.Root>

                                {parameterNames.length > 0 && (
                                  <VStack align="stretch" gap={1}>
                                    {parameterNames.map((parameterName) => {
                                      const factorOverride =
                                        override?.factors?.[parameterName]
                                      const effectiveFactor =
                                        effectiveValues?.factors?.[
                                          parameterName
                                        ]
                                      const aInherited =
                                        factorOverride?.a === undefined
                                      const bInherited =
                                        factorOverride?.b === undefined
                                      const aValue = aInherited
                                        ? toInputValue(effectiveFactor?.a)
                                        : toInputValue(factorOverride?.a)
                                      const bValue = bInherited
                                        ? toInputValue(effectiveFactor?.b)
                                        : toInputValue(factorOverride?.b)
                                      return (
                                        <HStack
                                          key={`${edgeId}-${segment.id}-${parameterName}`}
                                          align="end"
                                          wrap="wrap"
                                        >
                                          <Text
                                            fontSize="xs"
                                            color="gray.600"
                                            minW="70px"
                                            pt={1}
                                          >
                                            {parameterName}
                                          </Text>
                                          <Field.Root maxW="92px">
                                            <HStack
                                              justify="space-between"
                                              align="center"
                                            >
                                              <Field.Label fontSize="xs">
                                                {t(
                                                  "flow.simulation.timeSegments.factorA",
                                                )}
                                              </Field.Label>
                                              {aInherited && (
                                                <HStack gap={0.5}>
                                                  <FiLink
                                                    size={10}
                                                    color="var(--chakra-colors-gray-500)"
                                                  />
                                                  <Text
                                                    fontSize="xs"
                                                    color="gray.500"
                                                  >
                                                    {t(
                                                      "flow.simulation.timeSegments.inheritedBadge",
                                                    )}
                                                  </Text>
                                                </HStack>
                                              )}
                                            </HStack>
                                            <Input
                                              size="xs"
                                              type="number"
                                              step="any"
                                              value={aValue}
                                              onFocus={(event) =>
                                                event.currentTarget.select()
                                              }
                                              onChange={(event) =>
                                                setEdgeFactorOverride(
                                                  segment.id,
                                                  edgeId,
                                                  parameterName,
                                                  "a",
                                                  event.target.value,
                                                )
                                              }
                                              color={
                                                aInherited
                                                  ? "gray.500"
                                                  : "gray.900"
                                              }
                                              bg={
                                                aInherited
                                                  ? "gray.100"
                                                  : "white"
                                              }
                                              borderStyle={
                                                aInherited ? "dashed" : "solid"
                                              }
                                              borderColor={
                                                aInherited
                                                  ? "gray.300"
                                                  : undefined
                                              }
                                            />
                                          </Field.Root>
                                          <Field.Root maxW="92px">
                                            <HStack
                                              justify="space-between"
                                              align="center"
                                            >
                                              <Field.Label fontSize="xs">
                                                {t(
                                                  "flow.simulation.timeSegments.factorB",
                                                )}
                                              </Field.Label>
                                              {bInherited && (
                                                <HStack gap={0.5}>
                                                  <FiLink
                                                    size={10}
                                                    color="var(--chakra-colors-gray-500)"
                                                  />
                                                  <Text
                                                    fontSize="xs"
                                                    color="gray.500"
                                                  >
                                                    {t(
                                                      "flow.simulation.timeSegments.inheritedBadge",
                                                    )}
                                                  </Text>
                                                </HStack>
                                              )}
                                            </HStack>
                                            <Input
                                              size="xs"
                                              type="number"
                                              step="any"
                                              value={bValue}
                                              onFocus={(event) =>
                                                event.currentTarget.select()
                                              }
                                              onChange={(event) =>
                                                setEdgeFactorOverride(
                                                  segment.id,
                                                  edgeId,
                                                  parameterName,
                                                  "b",
                                                  event.target.value,
                                                )
                                              }
                                              color={
                                                bInherited
                                                  ? "gray.500"
                                                  : "gray.900"
                                              }
                                              bg={
                                                bInherited
                                                  ? "gray.100"
                                                  : "white"
                                              }
                                              borderStyle={
                                                bInherited ? "dashed" : "solid"
                                              }
                                              borderColor={
                                                bInherited
                                                  ? "gray.300"
                                                  : undefined
                                              }
                                            />
                                          </Field.Root>
                                        </HStack>
                                      )
                                    })}
                                  </VStack>
                                )}
                              </VStack>
                            </Box>
                          )
                        })}
                      </HStack>
                    </Box>
                  </VStack>
                </Box>
              ))}
            </VStack>
          )}
        </>
      )}

      {setTimeSegments && timeSegments.length > 0 && (
        <HStack justify="flex-end">
          <Button
            size="xs"
            variant="ghost"
            onClick={() =>
              setTimeSegments(
                [...timeSegments].sort((a, b) => a.startHour - b.startHour),
              )
            }
          >
            {t("flow.simulation.timeSegments.sortByTime")}
          </Button>
        </HStack>
      )}
    </VStack>
  )
}

export default TimeSegmentPlanEditor
