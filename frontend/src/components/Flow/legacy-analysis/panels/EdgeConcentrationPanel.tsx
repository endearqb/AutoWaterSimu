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
import {
  calculateUDMEdgeConcentrations,
  getUDMAvailableVariables,
  type UDMResultData,
} from "../udm-analysis"
import { normalizeIndex, normalizeIndexRange } from "../sliderUtils"

type AnalyzerModelType = "asm1" | "asm1slim" | "asm3" | "udm"

interface EdgeConcentrationPanelProps {
  resultData: ASM1ResultData | UDMResultData
  edges: Array<{ id: string; source: string; target: string }>
  edgeParameterConfigs: { [key: string]: any }
  modelType?: AnalyzerModelType
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

  const [selectedTimeIndex, setSelectedTimeIndex] = useState(0)
  const [selectedEdges, setSelectedEdges] = useState<string[]>([])
  const [selectedVariables, setSelectedVariables] = useState<string[]>([])
  const [edgeTimeSeriesRange, setEdgeTimeSeriesRange] = useState<
    [number, number]
  >([0, 0])

  const availableEdges = useMemo(
    () => Object.keys(resultData.edge_data || {}),
    [resultData],
  )

  const availableVariables = useMemo(() => {
    if (modelType === "udm") {
      const udmVariables = getUDMAvailableVariables(resultData as UDMResultData, {
        exclude: ["volume"],
      })
      return [{ name: "flow_rate", label: t("flow.analysis.flowRate") }, ...udmVariables]
    }

    const modelConfig = getModelConfig(modelType)
    const modelVariables =
      modelConfig?.availableVariables
        .filter((variable) => variable.name !== "volume")
        .map((variable) => ({
          name: variable.name,
          label: (() => {
            const translated = t(variable.label)
            return translated === variable.label ? variable.name : translated
          })(),
        })) || []

    return [{ name: "flow_rate", label: t("flow.analysis.flowRate") }, ...modelVariables]
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
  const safeEdgeTimeSeriesRange = useMemo(
    () =>
      normalizeIndexRange(
        edgeTimeSeriesRange,
        maxTimeIndex,
        effectiveMinStepsBetween,
      ),
    [edgeTimeSeriesRange, maxTimeIndex, effectiveMinStepsBetween],
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
    if (!userTouchedRangeRef.current) setEdgeTimeSeriesRange([0, lastDataIndex])
  }, [lastDataIndex, timestampsLength])

  React.useEffect(() => {
    const validEdgeSet = new Set(availableEdges)
    const validVariableSet = new Set(availableVariables.map((v) => v.name))

    setSelectedEdges((prev) => {
      const filtered = prev.filter((edge) => validEdgeSet.has(edge))
      if (filtered.length > 0 || availableEdges.length === 0) return filtered
      return availableEdges.slice(0, 3)
    })

    setSelectedVariables((prev) => {
      const filtered = prev.filter((variable) => validVariableSet.has(variable))
      if (filtered.length > 0 || availableVariables.length === 0) return filtered

      const nonFlowVariables = availableVariables.filter(
        (item) => item.name !== "flow_rate",
      )
      const variablesSource =
        nonFlowVariables.length > 0 ? nonFlowVariables : availableVariables
      return variablesSource
        .slice(0, Math.min(5, variablesSource.length))
        .map((v) => v.name)
    })
  }, [availableEdges, availableVariables])

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

  const edgeConcentrationData = useMemo(() => {
    if (
      !resultData.timestamps ||
      selectedEdges.length === 0 ||
      selectedVariables.length === 0
    ) {
      return []
    }

    if (modelType === "udm") {
      return calculateUDMEdgeConcentrations(
        resultData as UDMResultData,
        edgeParameterConfigs || {},
        selectedVariables,
        safeSelectedTimeIndex,
        edges,
        selectedEdges,
      )
    }

    return calculateEdgeConcentrations(
      resultData as ASM1ResultData,
      edgeParameterConfigs || {},
      selectedVariables,
      safeSelectedTimeIndex,
      edges,
      selectedEdges,
    )
  }, [
    resultData,
    modelType,
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
            : variableInfo.label !== variable
              ? `${variableInfo.label} (${variable})`
              : variable
          : variable,
        color: colors[index % colors.length],
      }
    })
  }, [availableVariables, selectedVariables])

  return (
    <Card.Root>
      <Card.Body>
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
                const edge = edges.find((item) => item.id === edgeId)
                const sourceNode = edge ? resultData.node_data[edge.source] : null
                const targetNode = edge ? resultData.node_data[edge.target] : null
                const edgeLabel =
                  sourceNode && targetNode && edge
                    ? `${sourceNode.label || edge.source} -> ${targetNode.label || edge.target}`
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
