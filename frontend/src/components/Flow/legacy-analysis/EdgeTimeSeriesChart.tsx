import { Box, HStack, Slider, Text, VStack } from "@chakra-ui/react"
import type { Edge } from "@xyflow/react"
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
import {
  type ASM1ResultData,
  type EdgeParameterConfig,
  getAvailableVariables,
} from "./asm1-analysis"
import {
  type ASM1SlimResultData,
  type EdgeParameterConfig as SlimEdgeParameterConfig,
  getSlimAvailableVariables,
} from "./asm1slim-analysis"
import { normalizeIndexRange } from "./sliderUtils"

interface EdgeTimeSeriesChartProps {
  /** 计算结果数据 */
  resultData: ASM1ResultData | ASM1SlimResultData
  /** 选中的连接线 */
  selectedEdges: string[]
  /** 选中的变量 */
  selectedVariables: string[]
  /** 时间范围 */
  timeRange: [number, number]
  /** 时间范围变化回调 */
  onTimeRangeChange: (range: [number, number]) => void
  /** 连接线配置 */
  edgeParameterConfigs?: Record<
    string,
    Record<string, EdgeParameterConfig | SlimEdgeParameterConfig>
  >
  /** 连接线数据 */
  edges?: Edge[]
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
 * 连接线时序图组件
 * 用于显示选定连接线和变量在指定时间范围内的时序变化
 */
const EdgeTimeSeriesChart: React.FC<EdgeTimeSeriesChartProps> = ({
  resultData,
  selectedEdges,
  selectedVariables,
  timeRange,
  onTimeRangeChange,
  edgeParameterConfigs,
  edges = [],
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

  const chartMargin = useMemo(() => {
    return { top: 20, right: 30, left: 20, bottom: 10 }
  }, [])

  const chartAreaHeight = useMemo(() => {
    return plotAreaHeight + chartMargin.top + chartMargin.bottom + xAxisHeight
  }, [chartMargin.bottom, chartMargin.top, plotAreaHeight])

  const filteredSelectedVariables = useMemo(() => {
    return selectedVariables.filter(
      (v) => v !== "flow_rate" && v !== "flowrate" && v !== "flow",
    )
  }, [selectedVariables])

  // 获取可用变量信息
  const availableVariables = useMemo(() => {
    if (modelType === "asm1slim") {
      return getSlimAvailableVariables(resultData as ASM1SlimResultData)
    }
    return getAvailableVariables(resultData as ASM1ResultData)
  }, [resultData, modelType, language])

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

  // 生成连接线时序图数据
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

    const data: any[] = []

    for (let i = startIndex; i <= endIndex; i++) {
      const point: any = {
        time: resultData.timestamps[i],
        timeIndex: i,
      }

      // 为每个选中的连接线和变量计算数据
      selectedEdges.forEach((edgeId) => {
        const edge = edges.find(
          (e) => (e.id || `${e.source}-${e.target}`) === edgeId,
        )
        if (edge) {
          const sourceNode = edge.source
          const sourceData = resultData.node_data?.[sourceNode]

          filteredSelectedVariables.forEach((variable) => {
            // 使用连接线浓度计算逻辑：基于源节点数据和连接线参数配置
            if (
              sourceData &&
              sourceData[variable] &&
              sourceData[variable][i] !== undefined
            ) {
              const key = `${edgeId}_${variable}`
              const sourceConcentration = sourceData[variable][i]

              // 获取连接线参数配置，如果没有配置则使用默认值（a=1, b=0）
              const edgeConfig = edgeParameterConfigs?.[edgeId]?.[variable] || {
                a: 1,
                b: 0,
              }
              const calculatedValue =
                sourceConcentration * edgeConfig.a + edgeConfig.b

              // DEBUG: 打印EdgeTimeSeriesChart中的浓度计算详细信息
              if (i === 0) {
                // 只在第一个时间点打印，避免日志过多
                console.log(
                  `🔍 [DEBUG] EdgeTimeSeriesChart - 边 ${edgeId}, 变量 ${variable}:`,
                )
                console.log("  - sourceConcentration:", sourceConcentration)
                console.log(
                  `  - edgeParameterConfigs[${edgeId}]:`,
                  edgeParameterConfigs?.[edgeId],
                )
                console.log(`  - edgeConfig for ${variable}:`, edgeConfig)
                console.log("  - edgeConfig.a:", edgeConfig.a)
                console.log("  - edgeConfig.b:", edgeConfig.b)
                console.log(
                  `  - 计算公式: ${sourceConcentration} * ${edgeConfig.a} + ${edgeConfig.b} = ${calculatedValue}`,
                )
              }

              point[key] = calculatedValue
            }
          })
        }
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

    selectedEdges.forEach((edgeId) => {
      filteredSelectedVariables.forEach((variable) => {
        const key = `${edgeId}_${variable}`
        const variableInfo = availableVariables.find((v) => v.name === variable)

        const edge = edges.find(
          (e) => (e.id || `${e.source}-${e.target}`) === edgeId,
        )
        const sourceNode = edge ? resultData.node_data?.[edge.source] : null
        const targetNode = edge ? resultData.node_data?.[edge.target] : null
        const edgeLabel =
          sourceNode && targetNode && edge
            ? `${sourceNode.label || edge.source} → ${targetNode.label || edge.target}`
            : edgeId

        const label = `${edgeLabel} - ${variableInfo?.label || variable}`
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
    edges,
    resultData.node_data,
    selectedEdges,
    filteredSelectedVariables,
  ])

  // 如果没有数据，显示提示信息
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
      {/* 双滑块时间范围选择 */}
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

      {/* 时序图 */}
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
            {chartSeries.lines}
          </LineChart>
        </ResponsiveContainer>
      </Box>

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
