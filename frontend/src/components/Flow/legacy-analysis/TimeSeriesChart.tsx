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
import { type ASM1ResultData, getAvailableVariables } from "./asm1-analysis"
import {
  type ASM1SlimResultData,
  getSlimAvailableVariables,
} from "./asm1slim-analysis"
import { normalizeIndexRange } from "./sliderUtils"

interface TimeSeriesChartProps {
  /** 计算结果数据 */
  resultData: ASM1ResultData | ASM1SlimResultData
  /** 选中的节点 */
  selectedNodes: string[]
  /** 选中的变量 */
  selectedVariables: string[]
  /** 时间范围 */
  timeRange: [number, number]
  /** 时间范围变化回调 */
  onTimeRangeChange: (range: [number, number]) => void
  /** 是否显示时间范围选择滑块 */
  showTimeRangeSlider?: boolean
  /** 绘图区高度 */
  chartHeight?: string | number
  /** y 轴绘图区高度 */
  yAxisHeight?: number
  /** 模型类型 */
  modelType?: "asm1" | "asm1slim" | "asm3"
}

/**
 * 时序图组件
 * 用于显示选定节点和变量在指定时间范围内的时序变化
 */
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
  const plotAreaHeight = useMemo(() => {
    if (typeof yAxisHeight === "number") return yAxisHeight
    if (typeof chartHeight === "number") return chartHeight
    return 450
  }, [chartHeight, yAxisHeight])

  const xAxisHeight = 50

  const chartMargin = useMemo(() => {
    return { top: 20, right: 30, left: 20, bottom: 10 }
  }, [])

  const chartAreaHeight = useMemo(() => {
    return plotAreaHeight + chartMargin.top + chartMargin.bottom + xAxisHeight
  }, [chartMargin.bottom, chartMargin.top, plotAreaHeight])

  // 获取可用变量信息
  const availableVariables = useMemo(() => {
    if (modelType === "asm1slim") {
      return getSlimAvailableVariables(resultData as ASM1SlimResultData)
    }
    return getAvailableVariables(resultData as ASM1ResultData)
  }, [resultData, modelType])

  const timestampsLength = resultData.timestamps?.length || 0
  const maxTimeIndex = timestampsLength > 1 ? timestampsLength - 1 : 1
  const isSliderDisabled = timestampsLength <= 1

  const minStepsBetween = useMemo(() => {
    return Math.min(2, maxTimeIndex)
  }, [maxTimeIndex])
  const effectiveMinStepsBetween = useMemo(() => {
    return isSliderDisabled ? 0 : minStepsBetween
  }, [isSliderDisabled, minStepsBetween])
  const safeTimeRange = useMemo(() => {
    return normalizeIndexRange(
      timeRange,
      maxTimeIndex,
      effectiveMinStepsBetween,
    )
  }, [timeRange, maxTimeIndex, effectiveMinStepsBetween])

  // 生成时序图数据
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

    const data: any[] = []

    for (let i = startIndex; i <= endIndex; i++) {
      const point: any = {
        time: resultData.timestamps[i],
        timeIndex: i,
      }

      // 为每个选中的节点和变量添加数据
      selectedNodes.forEach((nodeName) => {
        const nodeData = resultData.node_data?.[nodeName]
        if (nodeData) {
          selectedVariables.forEach((variable) => {
            const variableData = nodeData[variable]
            if (variableData && variableData[i] !== undefined) {
              const key = `${nodeName}_${variable}`
              point[key] = variableData[i]
            }
          })
        }
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

  // 生成图表线条
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
        const label = `${nodeLabel} - ${variableInfo?.label || variable}`
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

        colorIndex++
      })
    })

    return { lines, legendItems }
  }, [
    availableVariables,
    resultData.node_data,
    selectedNodes,
    selectedVariables,
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
            请选择节点和指标以显示时序图
          </Text>
        </VStack>
      </Box>
    )
  }

  return (
    <VStack w="full" align="start" gap={4}>
      {/* 时间范围选择滑块 */}
      {showTimeRangeSlider && (
        <VStack align="start" gap={2} w="full">
          <Text fontWeight="bold">时间范围选择</Text>
          <HStack w="full" gap={4}>
            <Text minW="60px">时间:</Text>
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
              {resultData.timestamps?.[safeTimeRange[1]]?.toFixed(2) || 0} h
            </Text>
          </HStack>
        </VStack>
      )}

      {/* 时序图 */}
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
                  value: "时间 (h)",
                  position: "insideBottomRight",
                  offset: -10,
                }}
              />
              <YAxis
                label={{
                  value: "浓度 (mg/L)",
                  angle: -90,
                  position: "insideLeft",
                }}
              />
              <Tooltip
                labelFormatter={(value) =>
                  `时间: ${Number(value).toFixed(2)} h`
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
              所选时间范围内暂无数据
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
