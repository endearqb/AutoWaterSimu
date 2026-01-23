import {
  Card,
  CheckboxGroup,
  HStack,
  Separator,
  SimpleGrid,
  Slider,
  Text,
  VStack,
} from "@chakra-ui/react"
import React, { useMemo, useState } from "react"
import { getModelConfig } from "../../../../config/modelConfigs"
import { useI18n } from "../../../../i18n"
import { Checkbox } from "../../../ui/checkbox"
import EdgeTimeSeriesChart from "../EdgeTimeSeriesChart"
import ExternalLegendBarChart from "../ExternalLegendBarChart"
import {
  type ASM1ResultData,
  calculateEdgeConcentrations,
} from "../asm1-analysis"
import { normalizeIndex, normalizeIndexRange } from "../sliderUtils"

interface EdgeConcentrationPanelProps {
  resultData: ASM1ResultData
  edges: Array<{ id: string; source: string; target: string }>
  edgeParameterConfigs: { [key: string]: any }
  modelType?: "asm1" | "asm1slim" | "asm3" // 添加模型类型参数
}

const EdgeConcentrationPanel: React.FC<EdgeConcentrationPanelProps> = ({
  resultData,
  edges,
  edgeParameterConfigs,
  modelType = "asm1",
}) => {
  const { t, language } = useI18n()
  const yAxisPlotHeight = 450

  const prevTimestampsLengthRef = React.useRef(0)
  const userTouchedTimeRef = React.useRef(false)
  const userTouchedRangeRef = React.useRef(false)

  // 状态管理
  const [selectedTimeIndex, setSelectedTimeIndex] = useState(0)
  const [selectedEdges, setSelectedEdges] = useState<string[]>([])
  const [selectedVariables, setSelectedVariables] = useState<string[]>([])
  const [edgeTimeSeriesRange, setEdgeTimeSeriesRange] = useState<
    [number, number]
  >([0, 0])

  // 可用连接线列表
  const availableEdges = useMemo(() => {
    return Object.keys(resultData.edge_data || {})
  }, [resultData])

  // 可用变量列表 - 从模型配置中动态获取，并添加流量作为第一个变量，过滤掉体积变量
  const availableVariables = useMemo(() => {
    const modelConfig = getModelConfig(modelType)
    const modelVariables =
      modelConfig?.availableVariables
        .filter((variable) => variable.name !== "volume") // 过滤掉体积变量
        .map((variable) => ({
          name: variable.name,
          label: (() => {
            const translated = t(variable.label)
            return translated === variable.label ? variable.name : translated
          })(),
        })) || []

    // 添加流量作为第一个变量
    return [
      { name: "flow_rate", label: t("flow.analysis.flowRate") },
      ...modelVariables,
    ]
  }, [modelType, language, t])

  const timestampsLength = resultData.timestamps?.length || 0
  const maxTimeIndex = timestampsLength > 1 ? timestampsLength - 1 : 1
  const lastDataIndex = timestampsLength > 0 ? timestampsLength - 1 : 0
  const isSliderDisabled = timestampsLength <= 1

  const minStepsBetween = useMemo(() => {
    return Math.min(2, maxTimeIndex)
  }, [maxTimeIndex])
  const effectiveMinStepsBetween = useMemo(() => {
    return isSliderDisabled ? 0 : minStepsBetween
  }, [isSliderDisabled, minStepsBetween])
  const safeSelectedTimeIndex = useMemo(() => {
    return normalizeIndex(selectedTimeIndex, maxTimeIndex)
  }, [selectedTimeIndex, maxTimeIndex])
  const safeEdgeTimeSeriesRange = useMemo(() => {
    return normalizeIndexRange(
      edgeTimeSeriesRange,
      maxTimeIndex,
      effectiveMinStepsBetween,
    )
  }, [edgeTimeSeriesRange, maxTimeIndex, effectiveMinStepsBetween])

  React.useEffect(() => {
    const prevLen = prevTimestampsLengthRef.current
    if (timestampsLength === 0) {
      prevTimestampsLengthRef.current = 0
      userTouchedTimeRef.current = false
      userTouchedRangeRef.current = false
      return
    }

    if (timestampsLength < prevLen) {
      userTouchedTimeRef.current = false
      userTouchedRangeRef.current = false
    }

    prevTimestampsLengthRef.current = timestampsLength

    if (!userTouchedTimeRef.current) setSelectedTimeIndex(lastDataIndex)
    if (!userTouchedRangeRef.current) setEdgeTimeSeriesRange([0, lastDataIndex])
  }, [lastDataIndex, timestampsLength])

  React.useEffect(() => {
    if (selectedEdges.length === 0 && availableEdges.length > 0) {
      const defaultEdges = availableEdges.slice(0, 3)
      setSelectedEdges(defaultEdges)
    }

    if (selectedVariables.length === 0 && availableVariables.length > 0) {
      const nonFlowVariables = availableVariables.filter(
        (v) => v.name !== "flow_rate",
      )
      const variablesSource =
        nonFlowVariables.length > 0 ? nonFlowVariables : availableVariables
      const defaultVariables = variablesSource
        .slice(0, Math.min(5, variablesSource.length))
        .map((v) => v.name)
      setSelectedVariables(defaultVariables)
    }
  }, [
    availableEdges,
    availableVariables,
    selectedEdges.length,
    selectedVariables.length,
  ])

  const handleSelectedTimeIndexChange = React.useCallback((next: number) => {
    userTouchedTimeRef.current = true
    setSelectedTimeIndex(next)
  }, [])

  const handleEdgeTimeSeriesRangeChange = React.useCallback(
    (range: [number, number]) => {
      userTouchedRangeRef.current = true
      setEdgeTimeSeriesRange(range)
    },
    [],
  )

  // 连接线浓度数据
  const edgeConcentrationData = useMemo(() => {
    if (
      !resultData.timestamps ||
      selectedEdges.length === 0 ||
      selectedVariables.length === 0
    ) {
      return []
    }

    // DEBUG: 打印EdgeConcentrationPanel传入的参数
    console.log(
      "🔍 [DEBUG] EdgeConcentrationPanel 调用 calculateEdgeConcentrations:",
    )
    console.log(
      "  - resultData.edge_data keys:",
      Object.keys(resultData.edge_data || {}),
    )
    console.log("  - edgeParameterConfigs:", edgeParameterConfigs)
    console.log("  - selectedVariables:", selectedVariables)
    console.log("  - selectedTimeIndex:", selectedTimeIndex)
    console.log("  - edges:", edges)
    console.log("  - selectedEdges:", selectedEdges)

    // 使用calculateEdgeConcentrations函数计算连接线浓度
    return calculateEdgeConcentrations(
      resultData,
      edgeParameterConfigs || {},
      selectedVariables,
      safeSelectedTimeIndex,
      edges,
      selectedEdges,
    )
  }, [
    resultData,
    selectedEdges,
    selectedVariables,
    safeSelectedTimeIndex,
    edges,
    edgeParameterConfigs,
  ])

  const xAxisHeight = useMemo(() => {
    const maxLen = edgeConcentrationData.reduce((acc, item) => {
      const label = String((item as { edge?: unknown }).edge ?? "")
      return Math.max(acc, label.length)
    }, 0)

    if (maxLen <= 8) return 70
    if (maxLen <= 14) return 95
    if (maxLen <= 22) return 120
    return 150
  }, [edgeConcentrationData])

  const barSeries = useMemo(() => {
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
    return selectedVariables.map((variable, index) => {
      const variableInfo = availableVariables.find((v) => v.name === variable)
      return {
        key: variable,
        dataKey: variable,
        name: variableInfo
          ? variableInfo.name === "flow_rate"
            ? variableInfo.label
            : `${variableInfo.label} (${variable})`
          : variable,
        color: colors[index % colors.length],
      }
    })
  }, [availableVariables, selectedVariables])

  return (
    <Card.Root>
      {/* <Card.Header>
        <Card.Title>连接线浓度剖面</Card.Title>
      </Card.Header> */}
      <Card.Body>
        {/* 时间选择滑块 */}
        {/* <VStack align="start" gap={4} mb={6}>
          <Text fontWeight="bold">时间选择</Text>
          <HStack w="full" gap={4}>
            <Text minW="60px">时间:</Text>
            <Slider.Root
              value={[safeSelectedTimeIndex]}
              onValueChange={(details) => setSelectedTimeIndex(details.value[0])}
              min={0}
              max={maxTimeIndex}
              step={1}
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
            <Text minW="100px">
              {resultData.timestamps?.[selectedTimeIndex]?.toFixed(2) || 0} h
            </Text>
          </HStack>
        </VStack> */}

        {/* 连接线选择 */}
        <VStack align="start" gap={4} mb={6}>
          <Text fontWeight="bold">{t("flow.analysis.edgeSelection")}</Text>
          <CheckboxGroup
            value={selectedEdges}
            onValueChange={(values) => setSelectedEdges(values)}
          >
            <SimpleGrid
              columns={{ base: 1, sm: 2, md: 3, lg: 12 }}
              gap={2}
              w="full"
            >
              {availableEdges.map((edgeId) => {
                const edge = edges.find((e) => e.id === edgeId)
                const sourceNode = edge
                  ? resultData.node_data[edge.source]
                  : null
                const targetNode = edge
                  ? resultData.node_data[edge.target]
                  : null
                const edgeLabel =
                  sourceNode && targetNode && edge
                    ? `${sourceNode.label || edge.source} → ${targetNode.label || edge.target}`
                    : edgeId
                return (
                  <Checkbox key={edgeId} value={edgeId}>
                    {edgeLabel}
                  </Checkbox>
                )
              })}
            </SimpleGrid>
          </CheckboxGroup>
        </VStack>

        {/* 变量选择 */}
        <VStack align="start" gap={4} mb={6}>
          <Text fontWeight="bold">{t("flow.analysis.metricSelection")}</Text>
          <CheckboxGroup
            value={selectedVariables}
            onValueChange={(values) => setSelectedVariables(values)}
          >
            <SimpleGrid
              columns={{ base: 1, sm: 2, md: 3, lg: 12 }}
              gap={2}
              w="full"
            >
              {availableVariables.map((variable) => (
                <Checkbox key={variable.name} value={variable.name}>
                  {variable.label}
                </Checkbox>
              ))}
            </SimpleGrid>
          </CheckboxGroup>
        </VStack>

        <Separator my={4} />

        <SimpleGrid columns={{ base: 1, md: 2 }} gap={6} alignItems="stretch">
          <VStack align="start" gap={4}>
            {/* 条形图：时间选择 */}
            <VStack align="start" gap={2} w="full">
              <Text fontWeight="bold">{t("flow.analysis.timeSelection")}</Text>
              <HStack w="full" gap={4}>
                <Text minW="60px">{t("flow.analysis.timeLabel")}</Text>
                <Slider.Root
                  value={[safeSelectedTimeIndex]}
                  onValueChange={(details) =>
                    handleSelectedTimeIndexChange(details.value[0])
                  }
                  min={0}
                  max={maxTimeIndex}
                  step={1}
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
                <Text minW="100px">
                  {resultData.timestamps?.[safeSelectedTimeIndex]?.toFixed(2) ||
                    0}{" "}
                  {t("flow.simulation.unit.hours")}
                </Text>
              </HStack>
            </VStack>

            {/* 条形图 */}
            <ExternalLegendBarChart
              data={edgeConcentrationData}
              xDataKey="edge"
              xAxisHeight={xAxisHeight}
              series={barSeries}
              plotAreaHeight={yAxisPlotHeight}
              xAxisAngle={-45}
              xAxisTextAnchor="end"
              emptyText={t("flow.analysis.emptyData")}
            />
          </VStack>

          {/* 折线图：时间范围选择 + 时序图 */}
          <EdgeTimeSeriesChart
            resultData={resultData}
            selectedEdges={selectedEdges}
            selectedVariables={selectedVariables}
            timeRange={safeEdgeTimeSeriesRange}
            onTimeRangeChange={handleEdgeTimeSeriesRangeChange}
            edges={edges}
            edgeParameterConfigs={edgeParameterConfigs}
            yAxisHeight={yAxisPlotHeight}
            modelType={modelType}
          />
        </SimpleGrid>
      </Card.Body>
    </Card.Root>
  )
}

export default EdgeConcentrationPanel
