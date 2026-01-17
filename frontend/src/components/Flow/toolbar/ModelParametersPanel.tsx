import { HStack, Stack, Table, Text } from "@chakra-ui/react"
import type React from "react"
import { useMemo } from "react"
import { getModelConfig } from "../../../config/modelConfigs"
import type { RFState } from "../../../stores/flowStore"

interface ModelParametersPanelProps {
  modelType: string
  store?: () => RFState
}

// 根据节点类型获取模型配置名称
const getModelTypeFromNode = (nodeType: string): string => {
  switch (nodeType) {
    case "asmslim":
    case "ASMslimNode":
      return "asm1slim"
    case "asm1":
    case "ASM1Node":
      return "asm1"
    case "asm2d":
    case "ASM2dNode":
      return "asm2d"
    case "asm3":
    case "ASM3Node":
      return "asm3"
    // 基础节点类型不是模型节点，返回空字符串
    case "input":
    case "output":
    case "default":
    case "custom":
    case "editable":
      return ""
    default:
      console.log("未识别的节点类型:", nodeType)
      return ""
  }
}

export const ModelParametersPanel: React.FC<ModelParametersPanelProps> = ({
  store,
}) => {
  // 获取所有节点信息
  const allNodes = store ? store().nodes : []

  // 过滤出有模型类型的节点
  const modelNodes = useMemo(() => {
    return allNodes.filter((node) => {
      const modelType = getModelTypeFromNode(node.type || "")
      return modelType !== ""
    })
  }, [allNodes])

  // 获取所有模型类型的参数
  const allModelParameters = useMemo(() => {
    const parameterMap = new Map<string, any>()

    modelNodes.forEach((node) => {
      const nodeModelType = getModelTypeFromNode(node.type || "")
      const modelConfig = getModelConfig(nodeModelType)

      if (modelConfig?.enhancedCalculationParameters) {
        modelConfig.enhancedCalculationParameters.forEach((param) => {
          if (!parameterMap.has(param.name)) {
            parameterMap.set(param.name, param)
          }
        })
      }
    })

    return Array.from(parameterMap.values())
  }, [modelNodes])

  if (modelNodes.length === 0) {
    return (
      <Stack gap={4} align="stretch">
        <Text color="gray.500">当前流程图中没有拥有模型参数的节点</Text>
        {/* <Text fontSize="xs" color="gray.400">
          请添加以下类型的节点：ASM1Slim (asmslim)、ASM1 (asm1)、ASM2D (asm2d)、ASM3 (asm3)
        </Text>
        <Text fontSize="xs" color="gray.400">
          当前节点数量：{allNodes.length} 个
        </Text>
        {allNodes.length > 0 && (
          <Text fontSize="xs" color="gray.400">
            节点类型：{allNodes.map(node => node.type || '未知').join(', ')}
          </Text> */}
        {/* )} */}
      </Stack>
    )
  }

  if (allModelParameters.length === 0) {
    return (
      <Stack gap={4} align="stretch">
        <Text color="gray.500">没有找到模型参数配置</Text>
        <Text fontSize="xs" color="gray.400">
          找到 {modelNodes.length} 个模型节点，但无法获取参数配置
        </Text>
        <Text fontSize="xs" color="gray.400">
          模型节点类型：
          {modelNodes
            .map(
              (node) =>
                `${node.type} (${getModelTypeFromNode(node.type || "")})`,
            )
            .join(", ")}
        </Text>
      </Stack>
    )
  }

  return (
    <Stack gap={4} align="stretch">
      <HStack justify="space-between">
        <Text fontSize="sm" fontWeight="medium">
          模型参数表
        </Text>
        <Text fontSize="xs" color="gray.500">
          共 {modelNodes.length} 个模型节点，{allModelParameters.length} 个参数
        </Text>
      </HStack>

      <Table.Root size="sm" variant="outline">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>参数名称</Table.ColumnHeader>
            {/* <Table.ColumnHeader>描述</Table.ColumnHeader> */}
            {modelNodes.map((node) => (
              <Table.ColumnHeader key={node.id}>
                {(node.data as any)?.label || node.id}
              </Table.ColumnHeader>
            ))}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {allModelParameters.map((param) => (
            <Table.Row key={param.label}>
              <Table.Cell>
                <Text fontSize="sm" fontWeight="medium">
                  {param.label}
                </Text>
              </Table.Cell>
              {/* <Table.Cell>
                <Text fontSize="xs" color="gray.600">
                  {param.description || '-'}
                </Text>
              </Table.Cell> */}
              {modelNodes.map((node) => {
                const nodeModelType = getModelTypeFromNode(node.type || "")
                const modelConfig = getModelConfig(nodeModelType)
                const hasParameter =
                  modelConfig?.enhancedCalculationParameters?.some(
                    (p) => p.name === param.name,
                  )
                const paramValue = hasParameter
                  ? ((node.data as any)?.[param.name] ?? param.defaultValue)
                  : "-"

                return (
                  <Table.Cell key={`${param.name}-${node.id}`}>
                    <Text fontSize="sm">{hasParameter ? paramValue : "-"}</Text>
                  </Table.Cell>
                )
              })}
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Stack>
  )
}

export default ModelParametersPanel
