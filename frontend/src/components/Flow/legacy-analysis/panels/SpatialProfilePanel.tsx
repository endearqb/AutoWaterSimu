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
import { Checkbox } from "../../../ui/checkbox"
import ExternalLegendBarChart from "../ExternalLegendBarChart"
import TimeSeriesChart from "../TimeSeriesChart"
import type { ASM1ResultData } from "../asm1-analysis"
import { normalizeIndex, normalizeIndexRange } from "../sliderUtils"

interface SpatialProfilePanelProps {
  resultData: ASM1ResultData
  modelType?: "asm1" | "asm1slim" | "asm3" // 添加模型类型参数
}

const SpatialProfilePanel: React.FC<SpatialProfilePanelProps> = ({
  resultData,
  modelType = "asm1",
}) => {
  const yAxisPlotHeight = 450

  const prevTimestampsLengthRef = React.useRef(0)
  const userTouchedTimeRef = React.useRef(false)
  const userTouchedRangeRef = React.useRef(false)

  // 状态管理
  const [selectedTimeIndex, setSelectedTimeIndex] = useState(0)
  const [selectedNodes, setSelectedNodes] = useState<string[]>([])
  const [selectedVariables, setSelectedVariables] = useState<string[]>([])
  const [timeSeriesRange, setTimeSeriesRange] = useState<[number, number]>([
    0, 0,
  ])

  // 可用节点列表
  const availableNodes = useMemo(() => {
    return Object.keys(resultData.node_data || {})
  }, [resultData])

  // 可用变量列表 - 从模型配置中动态获取
  const availableVariables = useMemo(() => {
    const modelConfig = getModelConfig(modelType)
    return (
      modelConfig?.availableVariables.map((variable) => ({
        name: variable.name,
        label: variable.label,
      })) || []
    )
  }, [modelType])

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

  const safeTimeSeriesRange = useMemo(() => {
    return normalizeIndexRange(
      timeSeriesRange,
      maxTimeIndex,
      effectiveMinStepsBetween,
    )
  }, [timeSeriesRange, maxTimeIndex, effectiveMinStepsBetween])

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
    if (!userTouchedRangeRef.current) setTimeSeriesRange([0, lastDataIndex])
  }, [lastDataIndex, timestampsLength])

  React.useEffect(() => {
    if (selectedNodes.length === 0 && availableNodes.length > 0) {
      const defaultNodes = availableNodes.slice(0, 3)
      setSelectedNodes(defaultNodes)
    }

    if (selectedVariables.length === 0 && availableVariables.length > 0) {
      const defaultVariables = availableVariables
        .slice(0, Math.min(5, availableVariables.length))
        .map((v) => v.name)
      setSelectedVariables(defaultVariables)
    }
  }, [
    availableNodes,
    availableVariables,
    selectedNodes.length,
    selectedVariables.length,
  ])

  const handleSelectedTimeIndexChange = React.useCallback((next: number) => {
    userTouchedTimeRef.current = true
    setSelectedTimeIndex(next)
  }, [])

  const handleTimeSeriesRangeChange = React.useCallback(
    (range: [number, number]) => {
      userTouchedRangeRef.current = true
      setTimeSeriesRange(range)
    },
    [],
  )

  // 当前时间点的空间剖面数据
  const currentProfileData = useMemo(() => {
    if (!resultData.node_data || !resultData.timestamps) return []

    const data: Array<{ node: string; [key: string]: any }> = []

    selectedNodes.forEach((nodeId) => {
      const nodeData = resultData.node_data[nodeId]
      if (!nodeData) return

      const nodeLabel = nodeData.label || nodeId
      const dataPoint: { node: string; [key: string]: any } = {
        node: nodeLabel,
      }

      selectedVariables.forEach((variable) => {
        const variableData = nodeData[
          variable as keyof typeof nodeData
        ] as number[]
        if (variableData && safeSelectedTimeIndex < variableData.length) {
          dataPoint[variable] = variableData[safeSelectedTimeIndex]
        }
      })

      data.push(dataPoint)
    })

    return data
  }, [resultData, selectedNodes, selectedVariables, safeSelectedTimeIndex])

  const xAxisHeight = useMemo(() => {
    const maxLen = currentProfileData.reduce((acc, item) => {
      const label = String((item as { node?: unknown }).node ?? "")
      return Math.max(acc, label.length)
    }, 0)

    if (maxLen <= 6) return 45
    if (maxLen <= 10) return 60
    if (maxLen <= 18) return 80
    return 100
  }, [currentProfileData])

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
        name: variableInfo?.label || variable,
        color: colors[index % colors.length],
      }
    })
  }, [availableVariables, selectedVariables])

  return (
    <Card.Root>
      {/* <Card.Header>
        <Card.Title>空间剖面分析</Card.Title>
      </Card.Header> */}
      <Card.Body>
        {/* 时间选择滑块 */}
        {/* <VStack align="start" gap={4} mb={6}>
          <Text fontWeight="bold">时间选择</Text>
          <HStack w="full" gap={4}>
            <Text minW="60px">时间:</Text>
            <Slider.Root
              value={[selectedTimeIndex]}
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
                <Slider.Thumbs/>
              </Slider.Control>
            </Slider.Root>
            <Text minW="100px">
              {resultData.timestamps?.[safeSelectedTimeIndex]?.toFixed(2) || 0} h
            </Text>
          </HStack>
        </VStack> */}

        {/* 节点选择 */}
        <VStack align="start" gap={4} mb={6}>
          <Text fontWeight="bold">节点选择</Text>
          <CheckboxGroup
            value={selectedNodes}
            onValueChange={(values) => setSelectedNodes(values)}
          >
            <SimpleGrid
              columns={{ base: 1, sm: 2, md: 3, lg: 12 }}
              gap={2}
              w="full"
            >
              {availableNodes.map((node) => (
                <Checkbox key={node} value={node}>
                  {resultData.node_data[node]?.label || node}
                </Checkbox>
              ))}
            </SimpleGrid>
          </CheckboxGroup>
        </VStack>

        {/* 变量选择 */}
        <VStack align="start" gap={4} mb={6}>
          <Text fontWeight="bold">指标选择</Text>
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
              <Text fontWeight="bold">时间选择</Text>
              <HStack w="full" gap={4}>
                <Text minW="60px">时间:</Text>
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
                  h
                </Text>
              </HStack>
            </VStack>

            {/* 条形图 */}
            <ExternalLegendBarChart
              data={currentProfileData}
              xDataKey="node"
              xAxisHeight={xAxisHeight}
              series={barSeries}
              plotAreaHeight={yAxisPlotHeight}
              emptyText="暂无数据"
            />
          </VStack>

          {/* 折线图：时间范围选择 + 时序图 */}
          <TimeSeriesChart
            resultData={resultData}
            selectedNodes={selectedNodes}
            selectedVariables={selectedVariables}
            timeRange={safeTimeSeriesRange}
            onTimeRangeChange={handleTimeSeriesRangeChange}
            yAxisHeight={yAxisPlotHeight}
            modelType={modelType}
          />
        </SimpleGrid>
      </Card.Body>
    </Card.Root>
  )
}

export default SpatialProfilePanel
