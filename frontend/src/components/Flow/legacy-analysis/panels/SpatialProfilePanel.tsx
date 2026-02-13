import {
  Button,
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
import ExternalLegendBarChart from "../ExternalLegendBarChart"
import TimeSeriesChart from "../TimeSeriesChart"
import type { ASM1ResultData } from "../asm1-analysis"
import {
  getUDMAvailableVariables,
  type UDMResultData,
} from "../udm-analysis"
import { normalizeIndex, normalizeIndexRange } from "../sliderUtils"

type AnalyzerModelType = "asm1" | "asm1slim" | "asm3" | "udm"

interface SpatialProfilePanelProps {
  resultData: ASM1ResultData | UDMResultData
  modelType?: AnalyzerModelType
}

const SpatialProfilePanel: React.FC<SpatialProfilePanelProps> = ({
  resultData,
  modelType = "asm1",
}) => {
  const { t, language } = useI18n()
  const yAxisPlotHeight = 450

  const prevTimestampsLengthRef = React.useRef(0)
  const userTouchedTimeRef = React.useRef(false)
  const userTouchedRangeRef = React.useRef(false)

  const [selectedTimeIndex, setSelectedTimeIndex] = useState(0)
  const [selectedNodes, setSelectedNodes] = useState<string[]>([])
  const [selectedVariables, setSelectedVariables] = useState<string[]>([])
  const [showSegmentLines, setShowSegmentLines] = useState(true)
  const [showParamChangeAnnotations, setShowParamChangeAnnotations] =
    useState(true)
  const [timeSeriesRange, setTimeSeriesRange] = useState<[number, number]>([
    0, 0,
  ])

  const availableNodes = useMemo(
    () => Object.keys(resultData.node_data || {}),
    [resultData],
  )

  const availableVariables = useMemo(() => {
    if (modelType === "udm") {
      return getUDMAvailableVariables(resultData as UDMResultData, {
        exclude: ["volume"],
      })
    }

    const modelConfig = getModelConfig(modelType)
    return (
      modelConfig?.availableVariables.map((variable) => ({
        name: variable.name,
        label: (() => {
          const translated = t(variable.label)
          return translated === variable.label ? variable.name : translated
        })(),
      })) || []
    )
  }, [modelType, resultData, language, t])

  const timestampsLength = resultData.timestamps?.length || 0
  const maxTimeIndex = timestampsLength > 1 ? timestampsLength - 1 : 1
  const lastDataIndex = timestampsLength > 0 ? timestampsLength - 1 : 0
  const isSliderDisabled = timestampsLength <= 1

  const minStepsBetween = useMemo(() => Math.min(2, maxTimeIndex), [maxTimeIndex])
  const effectiveMinStepsBetween = useMemo(
    () => (isSliderDisabled ? 0 : minStepsBetween),
    [isSliderDisabled, minStepsBetween],
  )

  const safeSelectedTimeIndex = useMemo(
    () => normalizeIndex(selectedTimeIndex, maxTimeIndex),
    [selectedTimeIndex, maxTimeIndex],
  )

  const safeTimeSeriesRange = useMemo(
    () =>
      normalizeIndexRange(
        timeSeriesRange,
        maxTimeIndex,
        effectiveMinStepsBetween,
      ),
    [timeSeriesRange, maxTimeIndex, effectiveMinStepsBetween],
  )

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
    const validNodeSet = new Set(availableNodes)
    const validVariableSet = new Set(availableVariables.map((v) => v.name))

    setSelectedNodes((prev) => {
      const filtered = prev.filter((node) => validNodeSet.has(node))
      if (filtered.length > 0 || availableNodes.length === 0) return filtered
      return availableNodes.slice(0, 3)
    })

    setSelectedVariables((prev) => {
      const filtered = prev.filter((variable) => validVariableSet.has(variable))
      if (filtered.length > 0 || availableVariables.length === 0) return filtered
      return availableVariables
        .slice(0, Math.min(5, availableVariables.length))
        .map((v) => v.name)
    })
  }, [availableNodes, availableVariables])

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
        if (Array.isArray(variableData) && safeSelectedTimeIndex < variableData.length) {
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
        name:
          variableInfo && variableInfo.label !== variable
            ? `${variableInfo.label} (${variable})`
            : variable,
        color: colors[index % colors.length],
      }
    })
  }, [availableVariables, selectedVariables])

  return (
    <Card.Root>
      <Card.Body>
        <VStack align="start" gap={4} mb={6}>
          <Text fontWeight="bold">{t("flow.analysis.nodeSelection")}</Text>
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

        <HStack gap={2} wrap="wrap" mb={2}>
          <Text fontWeight="bold" fontSize="sm">
            {t("flow.analysis.segmentDisplay.title")}
          </Text>
          <Button
            size="xs"
            variant={showSegmentLines ? "solid" : "outline"}
            onClick={() => setShowSegmentLines((previous) => !previous)}
          >
            {t("flow.analysis.segmentDisplay.showSegmentLines")}
          </Button>
          <Button
            size="xs"
            variant={showParamChangeAnnotations ? "solid" : "outline"}
            onClick={() =>
              setShowParamChangeAnnotations((previous) => !previous)
            }
          >
            {t("flow.analysis.segmentDisplay.showParamChanges")}
          </Button>
        </HStack>

        <Separator my={4} />

        <SimpleGrid columns={{ base: 1, md: 2 }} gap={6} alignItems="stretch">
          <VStack align="start" gap={4}>
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
                  {resultData.timestamps?.[safeSelectedTimeIndex]?.toFixed(2) || 0}{" "}
                  {t("flow.simulation.unit.hours")}
                </Text>
              </HStack>
            </VStack>

            <ExternalLegendBarChart
              data={currentProfileData}
              xDataKey="node"
              xAxisHeight={xAxisHeight}
              series={barSeries}
              plotAreaHeight={yAxisPlotHeight}
              emptyText={t("flow.analysis.emptyData")}
            />
          </VStack>

          <TimeSeriesChart
            resultData={resultData}
            selectedNodes={selectedNodes}
            selectedVariables={selectedVariables}
            timeRange={safeTimeSeriesRange}
            onTimeRangeChange={handleTimeSeriesRangeChange}
            showSegmentLines={showSegmentLines}
            showParamChangeAnnotations={showParamChangeAnnotations}
            yAxisHeight={yAxisPlotHeight}
            modelType={modelType}
          />
        </SimpleGrid>
      </Card.Body>
    </Card.Root>
  )
}

export default SpatialProfilePanel
