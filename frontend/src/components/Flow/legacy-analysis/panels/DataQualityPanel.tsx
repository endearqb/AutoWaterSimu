import { Card, SimpleGrid, Table, Text, VStack } from "@chakra-ui/react"
import React, { useMemo, useState } from "react"

import { getModelConfig } from "../../../../config/modelConfigs"
import { useI18n } from "../../../../i18n"
import { Radio, RadioGroup } from "../../../ui/radio"
import type { ASM1ResultData } from "../asm1-analysis"
import { getUDMAvailableVariables, type UDMResultData } from "../udm-analysis"

type AnalyzerModelType = "asm1" | "asm1slim" | "asm3" | "udm"

interface DataQualityPanelProps {
  resultData: ASM1ResultData | UDMResultData
  modelType?: AnalyzerModelType
}

const DataQualityPanel: React.FC<DataQualityPanelProps> = ({
  resultData,
  modelType = "asm1",
}) => {
  const { t, language } = useI18n()

  const availableNodes = useMemo(
    () => Object.keys(resultData.node_data || {}),
    [resultData],
  )

  const [selectedQualityNode, setSelectedQualityNode] = useState<string>(() => {
    const nodes = Object.keys(resultData.node_data || {})
    return nodes.length > 0 ? nodes[0] : ""
  })

  React.useEffect(() => {
    const nodes = Object.keys(resultData.node_data || {})
    if (nodes.length === 0) {
      setSelectedQualityNode("")
      return
    }
    if (!selectedQualityNode || !nodes.includes(selectedQualityNode)) {
      setSelectedQualityNode(nodes[0])
    }
  }, [resultData, selectedQualityNode])

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
          const resolved =
            translated === variable.label ? variable.name : translated
          const nameSuffix =
            resolved === variable.name ? "" : ` (${variable.name})`
          const unitSuffix = variable.unit ? ` [${variable.unit}]` : ""
          return `${resolved}${nameSuffix}${unitSuffix}`
        })(),
      })) || []
    )
  }, [modelType, resultData, language, t])

  const analysisResults = useMemo(() => {
    if (!resultData.node_data || !resultData.timestamps || !selectedQualityNode)
      return []

    const nodeData = resultData.node_data[selectedQualityNode]
    if (!nodeData) return []

    const dt =
      resultData.timestamps.length > 1
        ? resultData.timestamps[1] - resultData.timestamps[0]
        : 1

    return availableVariables.flatMap((variable) => {
      const timeSeries = nodeData[
        variable.name as keyof typeof nodeData
      ] as number[]
      if (!Array.isArray(timeSeries) || timeSeries.length === 0) return []

      const finalValue = timeSeries[timeSeries.length - 1]
      const threshold = Math.abs(finalValue) * 0.05

      let t95Index = 0
      for (let i = timeSeries.length - 1; i >= 0; i--) {
        if (Math.abs(timeSeries[i] - finalValue) > threshold) {
          t95Index = i + 1
          break
        }
      }

      const t95Time =
        t95Index >= 0 && t95Index < resultData.timestamps.length
          ? resultData.timestamps[t95Index]
          : null

      let relativeSlope: number | null = null
      let steadyStatus: "stable" | "approaching" | "unstable" | null = null

      if (timeSeries.length >= 10 && dt !== 0) {
        const endIndex = timeSeries.length - 1
        const startIndex = Math.max(0, Math.floor(timeSeries.length * 0.8))
        if (startIndex < endIndex) {
          const endValue = timeSeries[endIndex]
          const startValue = timeSeries[startIndex]
          const timeSpan = (endIndex - startIndex) * dt

          if (timeSpan !== 0) {
            const slope = (endValue - startValue) / timeSpan
            const sortedValues = [...timeSeries].sort((a, b) => a - b)
            const median = sortedValues[Math.floor(sortedValues.length / 2)]

            if (median !== 0) {
              relativeSlope = Math.abs(slope / median) * 100
              if (relativeSlope < 1) steadyStatus = "stable"
              else if (relativeSlope < 5) steadyStatus = "approaching"
              else steadyStatus = "unstable"
            }
          }
        }
      }

      return [
        {
          variable: variable.name,
          variableLabel: variable.label,
          t95: t95Time,
          relativeSlope,
          steadyStatus,
        },
      ]
    })
  }, [resultData, selectedQualityNode, availableVariables])

  return (
    <Card.Root>
      <Card.Body>
        <VStack align="start" gap={4}>
          <Text fontSize="sm" color="gray.600">
            {t("flow.analysis.t95Description")}
          </Text>

          <VStack align="start" gap={2} w="full">
            <Text fontWeight="bold">{t("flow.analysis.nodeFilter")}</Text>
            <RadioGroup
              value={selectedQualityNode}
              onValueChange={(e) => e.value && setSelectedQualityNode(e.value)}
            >
              <SimpleGrid
                columns={{ base: 1, sm: 2, md: 3, lg: 12 }}
                gap={2}
                w="full"
              >
                {availableNodes.map((node) => (
                  <Radio key={node} value={node}>
                    {resultData.node_data[node]?.label || node}
                  </Radio>
                ))}
              </SimpleGrid>
            </RadioGroup>
          </VStack>

          {analysisResults.length > 0 ? (
            <VStack align="start" gap={2} w="full">
              <Text fontWeight="bold" color="blue.600">
                {t("flow.analysis.nodeLabel")}{" "}
                {resultData.node_data[selectedQualityNode]?.label ||
                  selectedQualityNode}
              </Text>
              <Table.Root size="sm">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader>
                      {t("flow.analysis.metricColumn")}
                    </Table.ColumnHeader>
                    <Table.ColumnHeader>
                      {t("flow.analysis.t95Column")}
                    </Table.ColumnHeader>
                    <Table.ColumnHeader>
                      {t("flow.analysis.steadyStateColumn")}
                    </Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {analysisResults.map((result) => (
                    <Table.Row key={result.variable}>
                      <Table.Cell>{result.variableLabel}</Table.Cell>
                      <Table.Cell>
                        {result.t95 !== null
                          ? result.t95.toFixed(2)
                          : t("common.notAvailable")}
                      </Table.Cell>
                      <Table.Cell>
                        {result.steadyStatus ? (
                          <Text
                            color={
                              result.steadyStatus === "stable"
                                ? "green.600"
                                : result.steadyStatus === "approaching"
                                  ? "yellow.600"
                                  : "red.600"
                            }
                            fontWeight="bold"
                          >
                            {result.steadyStatus === "stable"
                              ? t("flow.analysis.steadyState.stable")
                              : result.steadyStatus === "approaching"
                                ? t("flow.analysis.steadyState.approaching")
                                : t("flow.analysis.steadyState.unstable")}
                            {result.relativeSlope !== null
                              ? ` (${result.relativeSlope.toFixed(3)}%)`
                              : null}
                          </Text>
                        ) : (
                          <Text color="gray.500">
                            {t("common.notAvailable")}
                          </Text>
                        )}
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>

              <Text mt={2} fontSize="sm" color="gray.600">
                {t("flow.analysis.steadyStateNote")}
              </Text>
            </VStack>
          ) : (
            <Text fontSize="sm" color="gray.500">
              {!selectedQualityNode
                ? t("flow.analysis.selectNodePrompt")
                : t("flow.analysis.noAnalysisData")}
            </Text>
          )}
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}

export default DataQualityPanel
