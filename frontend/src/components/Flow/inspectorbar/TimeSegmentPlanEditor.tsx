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
import type { Edge } from "@xyflow/react"
import { useMemo, useState } from "react"
import { useI18n } from "../../../i18n"
import {
  type SegmentEdgeOverride,
  type TimeSegment,
  validateTimeSegments,
} from "../../../utils/timeSegmentValidation"

interface TimeSegmentPlanEditorProps {
  timeSegments: TimeSegment[]
  edges: Edge[]
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

const removeEmptyOverride = (
  override?: SegmentEdgeOverride,
): SegmentEdgeOverride | undefined => {
  if (!override) return undefined
  const factors = override.factors || {}
  const hasFactor = Object.keys(factors).length > 0
  const hasFlow = typeof override.flow === "number"
  if (!hasFactor && !hasFlow) {
    return undefined
  }
  return override
}

const buildEdgeLabel = (edge: Edge): string => {
  const fallbackId = edge.id || `${edge.source}-${edge.target}`
  return `${fallbackId} (${edge.source} -> ${edge.target})`
}

function TimeSegmentPlanEditor(props: TimeSegmentPlanEditorProps) {
  const {
    timeSegments,
    edges,
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
  const [edgePickerBySegment, setEdgePickerBySegment] = useState<
    Record<string, string>
  >({})

  const edgeIdList = useMemo(
    () =>
      edges
        .map((edge) => edge.id || `${edge.source}-${edge.target}`)
        .filter(Boolean),
    [edges],
  )

  const edgeLabelById = useMemo(() => {
    const map = new Map<string, string>()
    edges.forEach((edge) => {
      const edgeId = edge.id || `${edge.source}-${edge.target}`
      map.set(edgeId, buildEdgeLabel(edge))
    })
    return map
  }, [edges])

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
    const nextOverride = removeEmptyOverride(updater(nextOverrides[edgeId]))

    if (!nextOverride) {
      delete nextOverrides[edgeId]
    } else {
      nextOverrides[edgeId] = nextOverride
    }

    updateTimeSegment(segmentId, { edgeOverrides: nextOverrides })
  }

  const addEdgeOverrideToSegment = (segmentId: string) => {
    const segment = segmentMap.get(segmentId)
    if (!segment || !updateTimeSegment) return

    const usedEdgeIds = new Set(Object.keys(segment.edgeOverrides || {}))
    const selectedEdgeId =
      edgePickerBySegment[segmentId] ||
      edgeIdList.find((edgeId) => !usedEdgeIds.has(edgeId)) ||
      ""

    if (!selectedEdgeId) return

    withUpdatedEdgeOverride(segmentId, selectedEdgeId, (current) => current || {})
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

  const removeEdgeOverrideFromSegment = (segmentId: string, edgeId: string) => {
    withUpdatedEdgeOverride(segmentId, edgeId, () => undefined)
  }

  return (
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

      {timeSegments.map((segment, index) => {
        const edgeOverrides = segment.edgeOverrides || {}
        const usedEdgeIds = new Set(Object.keys(edgeOverrides))
        const selectableEdgeIds = edgeIdList.filter(
          (edgeId) => !usedEdgeIds.has(edgeId),
        )
        const selectedEdgeId =
          edgePickerBySegment[segment.id] || selectableEdgeIds[0] || ""
        return (
          <Box key={segment.id} borderWidth="1px" borderColor="gray.200" p={3}>
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
                <Field.Root maxW="160px">
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
                <Field.Root maxW="160px">
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
                <Field.Root maxW="260px">
                  <Field.Label fontSize="xs">
                    {t("flow.simulation.timeSegments.selectEdge")}
                  </Field.Label>
                  <HStack>
                    <select
                      value={selectedEdgeId}
                      onChange={(event) =>
                        setEdgePickerBySegment((previous) => ({
                          ...previous,
                          [segment.id]: event.target.value,
                        }))
                      }
                      style={{
                        fontSize: "12px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "6px",
                        padding: "0 8px",
                        height: "32px",
                        flex: 1,
                        minWidth: "180px",
                      }}
                    >
                      {selectableEdgeIds.length === 0 && (
                        <option value="">
                          {t("flow.simulation.timeSegments.noMoreEdges")}
                        </option>
                      )}
                      {selectableEdgeIds.map((edgeId) => (
                        <option key={edgeId} value={edgeId}>
                          {edgeLabelById.get(edgeId) || edgeId}
                        </option>
                      ))}
                    </select>
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => addEdgeOverrideToSegment(segment.id)}
                      disabled={selectableEdgeIds.length === 0}
                    >
                      {t("flow.simulation.timeSegments.addEdgeOverride")}
                    </Button>
                  </HStack>
                </Field.Root>
              </HStack>

              <Separator />

              {Object.keys(edgeOverrides).length === 0 ? (
                <Text fontSize="xs" color="gray.500">
                  {t("flow.simulation.timeSegments.noEdgeOverride")}
                </Text>
              ) : (
                <VStack align="stretch" gap={2}>
                  {Object.entries(edgeOverrides).map(([edgeId, override]) => (
                    <Box
                      key={edgeId}
                      borderWidth="1px"
                      borderColor="gray.100"
                      bg="gray.50"
                      p={2}
                    >
                      <VStack align="stretch" gap={2}>
                        <HStack justify="space-between" align="center">
                          <Text fontSize="xs" fontWeight="semibold">
                            {edgeLabelById.get(edgeId) || edgeId}
                          </Text>
                          <Button
                            size="xs"
                            variant="subtle"
                            colorPalette="red"
                            onClick={() =>
                              removeEdgeOverrideFromSegment(segment.id, edgeId)
                            }
                          >
                            {t("flow.simulation.timeSegments.removeEdgeOverride")}
                          </Button>
                        </HStack>

                        <Field.Root maxW="160px">
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
                            value={override.flow ?? ""}
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
                              const factor = override.factors?.[parameterName] || {}
                              return (
                                <HStack
                                  key={`${edgeId}-${parameterName}`}
                                  align="end"
                                  wrap="wrap"
                                >
                                  <Text
                                    fontSize="xs"
                                    color="gray.600"
                                    minW="80px"
                                    pt={1}
                                  >
                                    {parameterName}
                                  </Text>
                                  <Field.Root maxW="120px">
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
                                  <Field.Root maxW="120px">
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
                  ))}
                </VStack>
              )}
            </VStack>
          </Box>
        )
      })}

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
