import {
  Box,
  Button,
  Field,
  HStack,
  Input,
  Separator,
  Text,
  VStack,
} from "@chakra-ui/react"
import type { Edge, Node } from "@xyflow/react"
import { useMemo } from "react"
import { useI18n } from "../../../i18n"
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
  setTimeSegments?: (segments: TimeSegment[]) => void
  addTimeSegment?: (segment?: Partial<TimeSegment>) => void
  updateTimeSegment?: (segmentId: string, patch: Partial<TimeSegment>) => void
  removeTimeSegment?: (segmentId: string) => void
  copyTimeSegment?: (segmentId: string) => void
  reorderTimeSegments?: (fromIndex: number, toIndex: number) => void
}

const parseOptionalNumber = (raw: string): number | undefined => {
  if (raw.trim() === "") {
    return undefined
  }
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : undefined
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

const normalizeOverride = (
  override?: SegmentEdgeOverride,
): SegmentEdgeOverride | undefined => {
  if (!override) return undefined

  const hasFlow = typeof override.flow === "number"
  const normalizedFactors: Record<string, { a?: number; b?: number }> = {}

  Object.entries(override.factors || {}).forEach(([paramName, factor]) => {
    if (!factor) return
    const nextFactor: { a?: number; b?: number } = {}
    if (typeof factor.a === "number") nextFactor.a = factor.a
    if (typeof factor.b === "number") nextFactor.b = factor.b
    if (typeof nextFactor.a === "number" || typeof nextFactor.b === "number") {
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

function TimeSegmentPlanEditor(props: TimeSegmentPlanEditorProps) {
  const {
    timeSegments,
    edges,
    nodes,
    parameterNames,
    simulationHours,
    setTimeSegments,
    addTimeSegment,
    updateTimeSegment,
    removeTimeSegment,
    copyTimeSegment,
    reorderTimeSegments,
  } = props
  const { t } = useI18n()

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
            <Button size="xs" onClick={handleAddSegment} disabled={!addTimeSegment}>
              {t("flow.simulation.timeSegments.addSegment")}
            </Button>
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
                  <Text key={`${error.code}-${index}`} fontSize="xs" color="red.700">
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
            <Box borderWidth="1px" borderStyle="dashed" borderColor="gray.300" p={3}>
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
                            id: segment.id,
                          })}
                        </Text>
                        <HStack gap={1}>
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => reorderTimeSegments?.(index, index - 1)}
                            disabled={!reorderTimeSegments || index === 0}
                          >
                            {t("flow.simulation.timeSegments.moveUp")}
                          </Button>
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => reorderTimeSegments?.(index, index + 1)}
                            disabled={
                              !reorderTimeSegments || index >= timeSegments.length - 1
                            }
                          >
                            {t("flow.simulation.timeSegments.moveDown")}
                          </Button>
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => copyTimeSegment?.(segment.id)}
                            disabled={!copyTimeSegment}
                          >
                            {t("flow.simulation.timeSegments.copy")}
                          </Button>
                          <Button
                            size="xs"
                            colorPalette="red"
                            variant="subtle"
                            onClick={() => removeTimeSegment?.(segment.id)}
                            disabled={!removeTimeSegment}
                          >
                            {t("flow.simulation.timeSegments.remove")}
                          </Button>
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
                              updateSegmentField(segment.id, "endHour", event.target.value)
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
                                  {t("flow.simulation.timeSegments.segmentLabel", {
                                    index: index + 1,
                                    id: segment.id,
                                  })}
                                </Text>
                                <Field.Root>
                                  <Field.Label fontSize="xs">
                                    {t("flow.simulation.timeSegments.flowOverride")}
                                  </Field.Label>
                                  <Input
                                    size="xs"
                                    type="number"
                                    step="any"
                                    min={0}
                                    placeholder={t(
                                      "flow.simulation.timeSegments.inheritPlaceholder",
                                    )}
                                    value={override?.flow ?? ""}
                                    onChange={(event) =>
                                      setEdgeFlowOverride(
                                        segment.id,
                                        edgeId,
                                        event.target.value,
                                      )
                                    }
                                  />
                                </Field.Root>

                                {parameterNames.length > 0 && (
                                  <VStack align="stretch" gap={1}>
                                    {parameterNames.map((parameterName) => {
                                      const factor =
                                        override?.factors?.[parameterName] || {}
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
                                            <Field.Label fontSize="xs">
                                              {t("flow.simulation.timeSegments.factorA")}
                                            </Field.Label>
                                            <Input
                                              size="xs"
                                              type="number"
                                              step="any"
                                              placeholder={t(
                                                "flow.simulation.timeSegments.inheritPlaceholder",
                                              )}
                                              value={factor.a ?? ""}
                                              onChange={(event) =>
                                                setEdgeFactorOverride(
                                                  segment.id,
                                                  edgeId,
                                                  parameterName,
                                                  "a",
                                                  event.target.value,
                                                )
                                              }
                                            />
                                          </Field.Root>
                                          <Field.Root maxW="92px">
                                            <Field.Label fontSize="xs">
                                              {t("flow.simulation.timeSegments.factorB")}
                                            </Field.Label>
                                            <Input
                                              size="xs"
                                              type="number"
                                              step="any"
                                              placeholder={t(
                                                "flow.simulation.timeSegments.inheritPlaceholder",
                                              )}
                                              value={factor.b ?? ""}
                                              onChange={(event) =>
                                                setEdgeFactorOverride(
                                                  segment.id,
                                                  edgeId,
                                                  parameterName,
                                                  "b",
                                                  event.target.value,
                                                )
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
