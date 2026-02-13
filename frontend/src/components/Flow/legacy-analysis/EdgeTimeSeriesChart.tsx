import { Box, HStack, Slider, Text, VStack } from "@chakra-ui/react"
import type { Edge } from "@xyflow/react"
import type React from "react"
import { useMemo } from "react"
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { useI18n } from "../../../i18n"
import {
  type ASM1ResultData,
  getAvailableVariables,
} from "./asm1-analysis"
import {
  type ASM1SlimResultData,
  getSlimAvailableVariables,
} from "./asm1slim-analysis"
import {
  getUDMAvailableVariables,
  type UDMResultData,
} from "./udm-analysis"
import { normalizeIndexRange } from "./sliderUtils"

interface LinearEdgeParameterConfig {
  a: number
  b: number
}

type AnalyzerModelType = "asm1" | "asm1slim" | "asm3" | "udm"

interface EdgeTimeSeriesChartProps {
  resultData: ASM1ResultData | ASM1SlimResultData | UDMResultData
  selectedEdges: string[]
  selectedVariables: string[]
  timeRange: [number, number]
  onTimeRangeChange: (range: [number, number]) => void
  edgeParameterConfigs?: Record<string, Record<string, LinearEdgeParameterConfig>>
  edges?: Edge[]
  showTimeRangeSlider?: boolean
  showSegmentLines?: boolean
  showParamChangeAnnotations?: boolean
  chartHeight?: string | number
  yAxisHeight?: number
  modelType?: AnalyzerModelType
}

type ParameterChangeEvent = {
  atHour: number
  edgeId: string
  changed: string[]
}

const toFiniteNumber = (value: unknown): number | undefined => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

const EdgeTimeSeriesChart: React.FC<EdgeTimeSeriesChartProps> = ({
  resultData,
  selectedEdges,
  selectedVariables,
  timeRange,
  onTimeRangeChange,
  edgeParameterConfigs,
  edges = [],
  showTimeRangeSlider = true,
  showSegmentLines = true,
  showParamChangeAnnotations = true,
  chartHeight = "500px",
  yAxisHeight,
  modelType = "asm1",
}) => {
  const { t, language } = useI18n()

  const plotAreaHeight = useMemo(() => {
    if (typeof yAxisHeight === "number") return yAxisHeight
    if (typeof chartHeight === "number") return chartHeight
    return 450
  }, [chartHeight, yAxisHeight])

  const xAxisHeight = 50
  const chartMargin = useMemo(
    () => ({ top: 20, right: 30, left: 20, bottom: 10 }),
    [],
  )
  const chartAreaHeight = useMemo(
    () => plotAreaHeight + chartMargin.top + chartMargin.bottom + xAxisHeight,
    [chartMargin.bottom, chartMargin.top, plotAreaHeight],
  )

  const filteredSelectedVariables = useMemo(
    () =>
      selectedVariables.filter(
        (value) => value !== "flow_rate" && value !== "flowrate" && value !== "flow",
      ),
    [selectedVariables],
  )

  const availableVariables = useMemo(() => {
    if (modelType === "udm") {
      return getUDMAvailableVariables(resultData as UDMResultData)
    }
    if (modelType === "asm1slim") {
      return getSlimAvailableVariables(resultData as ASM1SlimResultData)
    }
    return getAvailableVariables(resultData as ASM1ResultData)
  }, [resultData, modelType, language])

  const timestampsLength = resultData.timestamps?.length || 0
  const maxTimeIndex = timestampsLength > 1 ? timestampsLength - 1 : 1
  const isSliderDisabled = timestampsLength <= 1

  const minStepsBetween = useMemo(() => Math.min(2, maxTimeIndex), [maxTimeIndex])
  const effectiveMinStepsBetween = useMemo(
    () => (isSliderDisabled ? 0 : minStepsBetween),
    [isSliderDisabled, minStepsBetween],
  )
  const safeTimeRange = useMemo(
    () =>
      normalizeIndexRange(timeRange, maxTimeIndex, effectiveMinStepsBetween),
    [timeRange, maxTimeIndex, effectiveMinStepsBetween],
  )

  const edgeTimeSeriesData = useMemo(() => {
    if (
      !resultData.timestamps ||
      selectedEdges.length === 0 ||
      filteredSelectedVariables.length === 0
    ) {
      return []
    }

    const startIndex = Math.max(0, safeTimeRange[0])
    const endIndex = Math.min(maxTimeIndex, safeTimeRange[1])
    const data: Array<Record<string, any>> = []

    for (let i = startIndex; i <= endIndex; i++) {
      const point: Record<string, any> = {
        time: resultData.timestamps[i],
        timeIndex: i,
      }

      selectedEdges.forEach((edgeId) => {
        const edge = edges.find((item) => (item.id || `${item.source}-${item.target}`) === edgeId)
        if (!edge) return

        const sourceData = resultData.node_data?.[edge.source]
        if (!sourceData) return

        filteredSelectedVariables.forEach((variable) => {
          const sourceSeries = sourceData[variable]
          if (!Array.isArray(sourceSeries) || sourceSeries[i] === undefined) return

          const edgeConfig = edgeParameterConfigs?.[edgeId]?.[variable] || {
            a: 1,
            b: 0,
          }
          point[`${edgeId}_${variable}`] =
            Number(sourceSeries[i]) * edgeConfig.a + edgeConfig.b
        })
      })

      data.push(point)
    }

    return data
  }, [
    resultData,
    selectedEdges,
    filteredSelectedVariables,
    safeTimeRange,
    maxTimeIndex,
    edges,
    edgeParameterConfigs,
  ])

  const visibleRangeHours = useMemo(() => {
    const startHour = toFiniteNumber(resultData.timestamps?.[safeTimeRange[0]])
    const endHour = toFiniteNumber(resultData.timestamps?.[safeTimeRange[1]])
    if (startHour === undefined || endHour === undefined) {
      return null
    }
    return {
      start: Math.min(startHour, endHour),
      end: Math.max(startHour, endHour),
    }
  }, [resultData.timestamps, safeTimeRange])

  const visibleSegmentMarkers = useMemo(() => {
    const rawMarkers = Array.isArray((resultData as any).segment_markers)
      ? ((resultData as any).segment_markers as unknown[])
      : []
    const markers = rawMarkers
      .map(toFiniteNumber)
      .filter((value): value is number => value !== undefined)

    if (!visibleRangeHours) {
      return markers
    }

    return markers.filter(
      (marker) =>
        marker >= visibleRangeHours.start && marker <= visibleRangeHours.end,
    )
  }, [resultData, visibleRangeHours])

  const visibleChangeEvents = useMemo(() => {
    const rawEvents = Array.isArray((resultData as any).parameter_change_events)
      ? ((resultData as any).parameter_change_events as any[])
      : []
    const parsedEvents: ParameterChangeEvent[] = rawEvents
      .map((event) => {
        const atHour = toFiniteNumber(event?.atHour ?? event?.at_hour)
        if (atHour === undefined) return null
        return {
          atHour,
          edgeId: String(event?.edgeId ?? event?.edge_id ?? ""),
          changed: Array.isArray(event?.changed)
            ? event.changed.map((item: unknown) => String(item))
            : [],
        }
      })
      .filter((event): event is ParameterChangeEvent => !!event)

    if (!visibleRangeHours) {
      return parsedEvents
    }

    return parsedEvents.filter(
      (event) =>
        event.atHour >= visibleRangeHours.start &&
        event.atHour <= visibleRangeHours.end,
    )
  }, [resultData, visibleRangeHours])

  const groupedChangeEvents = useMemo(() => {
    const grouped = new Map<
      string,
      { atHour: number; edgeCount: number; changedCount: number; label: string }
    >()

    visibleChangeEvents.forEach((event) => {
      const key = event.atHour.toFixed(6)
      const current = grouped.get(key)
      const changeCount = event.changed.length
      if (!current) {
        grouped.set(key, {
          atHour: event.atHour,
          edgeCount: event.edgeId ? 1 : 0,
          changedCount: changeCount,
          label: "",
        })
        return
      }
      current.edgeCount += event.edgeId ? 1 : 0
      current.changedCount += changeCount
    })

    return Array.from(grouped.values())
      .map((item, idx) => ({
        ...item,
        label: t("flow.analysis.segmentDisplay.changeMarkerLabel", {
          index: idx + 1,
        }),
      }))
      .sort((a, b) => a.atHour - b.atHour)
  }, [visibleChangeEvents, t])

  const chartSeries = useMemo(() => {
    const colors = [
      "#8884d8",
      "#82ca9d",
      "#ffc658",
      "#ff7c7c",
      "#8dd1e1",
      "#d084d0",
      "#ffb347",
      "#87ceeb",
    ]
    const lines: JSX.Element[] = []
    const legendItems: Array<{ key: string; label: string; color: string }> = []
    let colorIndex = 0

    selectedEdges.forEach((edgeId) => {
      filteredSelectedVariables.forEach((variable) => {
        const key = `${edgeId}_${variable}`
        const variableInfo = availableVariables.find((item) => item.name === variable)

        const edge = edges.find((item) => (item.id || `${item.source}-${item.target}`) === edgeId)
        const sourceNode = edge ? resultData.node_data?.[edge.source] : null
        const targetNode = edge ? resultData.node_data?.[edge.target] : null
        const edgeLabel =
          sourceNode && targetNode && edge
            ? `${sourceNode.label || edge.source} -> ${targetNode.label || edge.target}`
            : edgeId

        const variableLabel = (() => {
          if (!variableInfo) return variable
          const translated = t(variableInfo.label)
          return translated === variableInfo.label ? variable : translated
        })()

        const label =
          variableLabel === variable
            ? `${edgeLabel} - ${variable}`
            : `${edgeLabel} - ${variableLabel} (${variable})`
        const color = colors[colorIndex % colors.length]

        lines.push(
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            name={label}
            stroke={color}
            dot={false}
            strokeWidth={2}
          />,
        )

        legendItems.push({ key, label, color })
        colorIndex += 1
      })
    })

    return { lines, legendItems }
  }, [
    availableVariables,
    edges,
    resultData.node_data,
    selectedEdges,
    filteredSelectedVariables,
    t,
  ])

  if (edgeTimeSeriesData.length === 0) {
    return (
      <Box
        h={chartAreaHeight}
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Text color="gray.500" fontSize="lg">
          {t("flow.analysis.selectEdgesAndMetrics")}
        </Text>
      </Box>
    )
  }

  return (
    <VStack w="full" align="start" gap={4}>
      {showTimeRangeSlider && (
        <VStack align="start" gap={2} w="full">
          <Text fontWeight="bold">{t("flow.analysis.timeRange")}</Text>
          <HStack w="full" gap={4}>
            <Text minW="60px">{t("flow.analysis.timeLabel")}</Text>
            <Slider.Root
              value={safeTimeRange}
              onValueChange={(details) =>
                onTimeRangeChange([details.value[0], details.value[1]])
              }
              min={0}
              max={maxTimeIndex}
              step={1}
              minStepsBetweenThumbs={effectiveMinStepsBetween}
              flex={1}
              disabled={isSliderDisabled}
            >
              <Slider.Control>
                <Slider.Track>
                  <Slider.Range />
                </Slider.Track>
                <Slider.Thumbs />
              </Slider.Control>
            </Slider.Root>
            <Text minW="150px">
              {resultData.timestamps?.[safeTimeRange[0]]?.toFixed(2) || 0} -{" "}
              {resultData.timestamps?.[safeTimeRange[1]]?.toFixed(2) || 0}{" "}
              {t("flow.simulation.unit.hours")}
            </Text>
          </HStack>
        </VStack>
      )}

      <Box w="full" h={chartAreaHeight}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={edgeTimeSeriesData} margin={chartMargin}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="time"
              type="number"
              scale="linear"
              domain={["dataMin", "dataMax"]}
              height={xAxisHeight}
              tickFormatter={(value) => value.toFixed(1)}
            />
            <YAxis />
            <Tooltip
              labelFormatter={(value) =>
                t("flow.analysis.timeTooltipLabel", {
                  value: Number(value).toFixed(2),
                })
              }
              formatter={(value: any, name: string) => [
                Number(value).toFixed(4),
                name,
              ]}
            />
            {showSegmentLines &&
              visibleSegmentMarkers.map((marker, index) => (
                <ReferenceLine
                  key={`segment-marker-${marker}-${index}`}
                  x={marker}
                  stroke="#2563eb"
                  strokeDasharray="5 4"
                  ifOverflow="visible"
                  label={{
                    value: t("flow.analysis.segmentDisplay.segmentMarkerLabel", {
                      index: index + 1,
                    }),
                    position: "top",
                    fill: "#1d4ed8",
                    fontSize: 10,
                  }}
                />
              ))}
            {showParamChangeAnnotations &&
              groupedChangeEvents.map((event, index) => (
                <ReferenceLine
                  key={`param-change-${event.atHour}-${index}`}
                  x={event.atHour}
                  stroke="#f97316"
                  strokeDasharray="2 2"
                  ifOverflow="visible"
                  label={{
                    value: event.label,
                    position: "insideTopRight",
                    fill: "#c2410c",
                    fontSize: 10,
                  }}
                />
              ))}
            {chartSeries.lines}
          </LineChart>
        </ResponsiveContainer>
      </Box>

      {showParamChangeAnnotations && groupedChangeEvents.length > 0 && (
        <Box
          w="full"
          px={2}
          py={1}
          borderWidth="1px"
          borderColor="orange.100"
          bg="orange.50"
          borderRadius="md"
          display="flex"
          flexWrap="wrap"
          gap={2}
        >
          {groupedChangeEvents.map((event) => (
            <Text key={`event-desc-${event.atHour}`} fontSize="xs" color="orange.800">
              {t("flow.analysis.segmentDisplay.changeMarkerSummary", {
                hour: event.atHour.toFixed(2),
                edgeCount: event.edgeCount,
                changedCount: event.changedCount,
              })}
            </Text>
          ))}
        </Box>
      )}

      <Box w="full" display="flex" flexWrap="wrap" gap={2}>
        {chartSeries.legendItems.map((item) => (
          <HStack
            key={item.key}
            gap={2}
            px={2}
            py={1}
            bg="gray.50"
            borderRadius="sm"
          >
            <Box w="12px" h="3px" bg={item.color} borderRadius="full" />
            <Text fontSize="sm" color="gray.700">
              {item.label}
            </Text>
          </HStack>
        ))}
      </Box>
    </VStack>
  )
}

export default EdgeTimeSeriesChart
