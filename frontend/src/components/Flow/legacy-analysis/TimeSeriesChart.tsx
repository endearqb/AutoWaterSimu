import { Box, HStack, Slider, Text, VStack } from "@chakra-ui/react"
import type React from "react"
import { useMemo } from "react"
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { useI18n } from "../../../i18n"
import { type ASM1ResultData, getAvailableVariables } from "./asm1-analysis"
import {
  type ASM1SlimResultData,
  getSlimAvailableVariables,
} from "./asm1slim-analysis"
import {
  getUDMAvailableVariables,
  type UDMResultData,
} from "./udm-analysis"
import { normalizeIndexRange } from "./sliderUtils"

type AnalyzerModelType = "asm1" | "asm1slim" | "asm3" | "udm"

interface TimeSeriesChartProps {
  resultData: ASM1ResultData | ASM1SlimResultData | UDMResultData
  selectedNodes: string[]
  selectedVariables: string[]
  timeRange: [number, number]
  onTimeRangeChange: (range: [number, number]) => void
  showTimeRangeSlider?: boolean
  chartHeight?: string | number
  yAxisHeight?: number
  modelType?: AnalyzerModelType
}

const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({
  resultData,
  selectedNodes,
  selectedVariables,
  timeRange,
  onTimeRangeChange,
  showTimeRangeSlider = true,
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

  const timeSeriesData = useMemo(() => {
    if (
      !resultData.timestamps ||
      selectedNodes.length === 0 ||
      selectedVariables.length === 0
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

      selectedNodes.forEach((nodeName) => {
        const nodeData = resultData.node_data?.[nodeName]
        if (!nodeData) return

        selectedVariables.forEach((variable) => {
          const variableSeries = nodeData[variable]
          if (Array.isArray(variableSeries) && variableSeries[i] !== undefined) {
            point[`${nodeName}_${variable}`] = variableSeries[i]
          }
        })
      })

      data.push(point)
    }

    return data
  }, [
    resultData,
    selectedNodes,
    selectedVariables,
    safeTimeRange,
    maxTimeIndex,
  ])

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

    selectedNodes.forEach((nodeName) => {
      selectedVariables.forEach((variable) => {
        const key = `${nodeName}_${variable}`
        const variableInfo = availableVariables.find((v) => v.name === variable)
        const nodeLabel = resultData.node_data?.[nodeName]?.label || nodeName
        const variableLabel = (() => {
          if (!variableInfo) return variable
          const translated = t(variableInfo.label)
          return translated === variableInfo.label ? variable : translated
        })()
        const label =
          variableLabel === variable
            ? `${nodeLabel} - ${variable}`
            : `${nodeLabel} - ${variableLabel} (${variable})`
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
    resultData.node_data,
    selectedNodes,
    selectedVariables,
    t,
  ])

  if (selectedNodes.length === 0 || selectedVariables.length === 0) {
    return (
      <Box
        w="full"
        h={chartAreaHeight}
        border="1px"
        borderColor="gray.200"
        borderRadius="md"
      >
        <VStack align="center" justify="center" h="full">
          <Text color="gray.500" textAlign="center">
            {t("flow.analysis.selectNodesAndMetrics")}
          </Text>
        </VStack>
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

      <Box
        w="full"
        h={chartAreaHeight}
        border="1px"
        borderColor="gray.200"
        borderRadius="md"
      >
        {timeSeriesData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timeSeriesData} margin={chartMargin}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="time"
                type="number"
                scale="linear"
                domain={["dataMin", "dataMax"]}
                height={xAxisHeight}
                label={{
                  value: t("flow.analysis.timeAxisLabel"),
                  position: "insideBottomRight",
                  offset: -10,
                }}
              />
              <YAxis
                label={{
                  value: t("flow.analysis.concentrationAxisLabel"),
                  angle: -90,
                  position: "insideLeft",
                }}
              />
              <Tooltip
                labelFormatter={(value) =>
                  t("flow.analysis.timeTooltipLabel", {
                    value: Number(value).toFixed(2),
                  })
                }
                formatter={(value: any, name: string) => [
                  Number(value).toFixed(3),
                  name,
                ]}
              />
              {chartSeries.lines}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <VStack align="center" justify="center" h="full">
            <Text color="gray.500" textAlign="center">
              {t("flow.analysis.emptyRange")}
            </Text>
          </VStack>
        )}
      </Box>

      {chartSeries.legendItems.length > 0 && (
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
      )}
    </VStack>
  )
}

export default TimeSeriesChart
