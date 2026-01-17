import { Card, SimpleGrid, Table, Text, VStack } from "@chakra-ui/react"
import React, { useMemo, useState } from "react"
import { getModelConfig } from "../../../../config/modelConfigs"
import { Radio, RadioGroup } from "../../../ui/radio"
import type { ASM1ResultData } from "../asm1-analysis"

interface DataQualityPanelProps {
  resultData: ASM1ResultData
  modelType?: "asm1" | "asm1slim" | "asm3" // 添加模型类型参数
}

const DataQualityPanel: React.FC<DataQualityPanelProps> = ({
  resultData,
  modelType = "asm1",
}) => {
  // 可用节点列表
  const availableNodes = useMemo(() => {
    return Object.keys(resultData.node_data || {})
  }, [resultData])

  // 节点筛选状态 - 默认选择第一个节点
  const [selectedQualityNode, setSelectedQualityNode] = useState<string>(() => {
    const nodes = Object.keys(resultData.node_data || {})
    return nodes.length > 0 ? nodes[0] : ""
  })

  // 当resultData变化时，更新默认选择
  React.useEffect(() => {
    const nodes = Object.keys(resultData.node_data || {})
    if (nodes.length > 0 && !selectedQualityNode) {
      setSelectedQualityNode(nodes[0])
    }
  }, [resultData, selectedQualityNode])

  // 可用变量列表 - 从模型配置中动态获取
  const availableVariables = useMemo(() => {
    const modelConfig = getModelConfig(modelType)
    return (
      modelConfig?.availableVariables.map((variable) => ({
        name: variable.name,
        label: `${variable.label} (${variable.name})${variable.unit ? ` [${variable.unit}]` : ""}`,
      })) || []
    )
  }, [modelType])

  const analysisResults = useMemo(() => {
    if (!resultData.node_data || !resultData.timestamps) return []
    if (!selectedQualityNode) return []

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
      if (!timeSeries || !Array.isArray(timeSeries) || timeSeries.length === 0)
        return []

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
              if (relativeSlope < 1) {
                steadyStatus = "stable"
              } else if (relativeSlope < 5) {
                steadyStatus = "approaching"
              } else {
                steadyStatus = "unstable"
              }
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
      {/* <Card.Header>
        <Card.Title>T95 时间分析</Card.Title>
      </Card.Header> */}
      <Card.Body>
        <VStack align="start" gap={4}>
          <Text fontSize="sm" color="gray.600">
            T95时间用于评估变量进入并保持在最终值±5%范围内的速度；稳态检查基于最后20%时间段的相对斜率判断趋势稳定性。
          </Text>

          {/* 节点筛选 */}
          <VStack align="start" gap={2} w="full">
            <Text fontWeight="bold">节点筛选</Text>
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
                节点:{" "}
                {resultData.node_data[selectedQualityNode]?.label ||
                  selectedQualityNode}
              </Text>
              <Table.Root size="sm">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader>指标</Table.ColumnHeader>
                    <Table.ColumnHeader>T95时间 (h)</Table.ColumnHeader>
                    <Table.ColumnHeader>稳态检查</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {analysisResults.map((result) => (
                    <Table.Row key={result.variable}>
                      <Table.Cell>{result.variableLabel}</Table.Cell>
                      <Table.Cell>
                        {result.t95 !== null ? result.t95.toFixed(2) : "N/A"}
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
                              ? "稳定"
                              : result.steadyStatus === "approaching"
                                ? "接近稳定"
                                : "不稳定"}
                            {result.relativeSlope !== null
                              ? `（${result.relativeSlope.toFixed(3)}%）`
                              : null}
                          </Text>
                        ) : (
                          <Text color="gray.500">N/A</Text>
                        )}
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>

              <Text mt={2} fontSize="sm" color="gray.600">
                注: 相对斜率 = 末段斜率 / 中值 ×
                100%。小于1%为稳定，1-5%为接近稳定，大于5%为不稳定。
              </Text>
            </VStack>
          ) : (
            <Text fontSize="sm" color="gray.500">
              {!selectedQualityNode
                ? "请选择节点进行分析"
                : "所选节点无可用的分析数据"}
            </Text>
          )}
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}

export default DataQualityPanel
