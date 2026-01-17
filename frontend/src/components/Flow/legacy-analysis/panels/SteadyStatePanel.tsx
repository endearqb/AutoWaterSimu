import { Card, SimpleGrid, Table, Text, VStack } from "@chakra-ui/react"
import React, { useMemo, useState } from "react"
import { getModelConfig } from "../../../../config/modelConfigs"
import { Radio, RadioGroup } from "../../../ui/radio"
import type { ASM1ResultData } from "../asm1-analysis"

interface SteadyStatePanelProps {
  resultData: ASM1ResultData
  modelType?: "asm1" | "asm1slim" | "asm3" // 添加模型类型参数
}

const SteadyStatePanel: React.FC<SteadyStatePanelProps> = ({
  resultData,
  modelType = "asm1",
}) => {
  // 可用节点列表
  const availableNodes = useMemo(() => {
    return Object.keys(resultData.node_data || {})
  }, [resultData])

  // 节点筛选状态 - 默认选择第一个节点
  const [selectedSteadyNode, setSelectedSteadyNode] = useState<string>(() => {
    const nodes = Object.keys(resultData.node_data || {})
    return nodes.length > 0 ? nodes[0] : ""
  })

  // 当resultData变化时，更新默认选择
  React.useEffect(() => {
    const nodes = Object.keys(resultData.node_data || {})
    if (nodes.length > 0 && !selectedSteadyNode) {
      setSelectedSteadyNode(nodes[0])
    }
  }, [resultData, selectedSteadyNode])

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

  // 稳态检查计算
  const steadyChecksByNode = useMemo(() => {
    if (!resultData.node_data || !selectedSteadyNode) {
      return {}
    }

    const results: {
      [nodeId: string]: Array<{
        variable: string
        variableLabel: string
        relativeSlope: number
        status: string
      }>
    } = {}

    const nodeData = resultData.node_data[selectedSteadyNode]
    if (!nodeData) return {}

    const nodeResults: Array<{
      variable: string
      variableLabel: string
      relativeSlope: number
      status: string
    }> = []

    availableVariables.forEach((variable) => {
      const timeSeries = nodeData[
        variable.name as keyof typeof nodeData
      ] as number[]
      if (!timeSeries || !Array.isArray(timeSeries) || timeSeries.length < 10)
        return

      // 计算末段斜率（最后20%的数据点）
      const endIndex = timeSeries.length - 1
      const startIndex = Math.max(0, Math.floor(timeSeries.length * 0.8))

      if (startIndex >= endIndex) return

      const endValue = timeSeries[endIndex]
      const startValue = timeSeries[startIndex]
      const timeSpan =
        (endIndex - startIndex) *
        (resultData.timestamps?.[1] - resultData.timestamps?.[0] || 1)

      if (timeSpan === 0) return

      const slope = (endValue - startValue) / timeSpan

      // 计算中值作为参考
      const sortedValues = [...timeSeries].sort((a, b) => a - b)
      const median = sortedValues[Math.floor(sortedValues.length / 2)]

      if (median === 0) return

      const relativeSlope = Math.abs(slope / median) * 100

      let status = "unstable"
      if (relativeSlope < 1) {
        status = "stable"
      } else if (relativeSlope < 5) {
        status = "approaching"
      }

      nodeResults.push({
        variable: variable.name,
        variableLabel: variable.label,
        relativeSlope,
        status,
      })
    })

    if (nodeResults.length > 0) {
      results[selectedSteadyNode] = nodeResults
    }

    return results
  }, [resultData, selectedSteadyNode, availableVariables])

  return (
    <Card.Root>
      {/* <Card.Header>
        <Card.Title>稳态检查</Card.Title>
      </Card.Header> */}
      <Card.Body>
        <VStack align="start" gap={6}>
          {/* 节点选择 */}
          <VStack align="start" gap={4} w="full">
            <Text fontWeight="bold">节点选择</Text>
            <RadioGroup
              value={selectedSteadyNode}
              onValueChange={(e) => e.value && setSelectedSteadyNode(e.value)}
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

          {/* 稳态检查结果展示 */}
          {Object.keys(steadyChecksByNode).length > 0 ? (
            Object.entries(steadyChecksByNode).map(([nodeId, nodeResults]) => {
              const nodeLabel = resultData.node_data[nodeId]?.label || nodeId
              return (
                <VStack key={nodeId} align="start" gap={2} w="full">
                  <Text fontWeight="bold" color="blue.600">
                    节点: {nodeLabel}
                  </Text>
                  <Table.Root size="sm">
                    <Table.Header>
                      <Table.Row>
                        <Table.ColumnHeader>指标</Table.ColumnHeader>
                        <Table.ColumnHeader>相对斜率 (%)</Table.ColumnHeader>
                        <Table.ColumnHeader>状态</Table.ColumnHeader>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {nodeResults.map((result, index) => (
                        <Table.Row key={index}>
                          <Table.Cell>{result.variableLabel}</Table.Cell>
                          <Table.Cell>
                            {result.relativeSlope.toFixed(3)}
                          </Table.Cell>
                          <Table.Cell>
                            <Text
                              color={
                                result.status === "stable"
                                  ? "green.600"
                                  : result.status === "approaching"
                                    ? "yellow.600"
                                    : "red.600"
                              }
                              fontWeight="bold"
                            >
                              {result.status === "stable"
                                ? "稳定"
                                : result.status === "approaching"
                                  ? "接近稳定"
                                  : "不稳定"}
                            </Text>
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Root>
                </VStack>
              )
            })
          ) : (
            <Text fontSize="sm" color="gray.500">
              {!selectedSteadyNode
                ? "请选择节点进行稳态检查"
                : "所选节点无可用的稳态检查数据"}
            </Text>
          )}

          <Text mt={4} fontSize="sm" color="gray.600">
            注: 相对斜率 = 末段斜率 / 中值 ×
            100%。小于1%为稳定，1-5%为接近稳定，大于5%为不稳定。
          </Text>
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}

export default SteadyStatePanel
