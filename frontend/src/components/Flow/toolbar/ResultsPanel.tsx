import { Box, Table, Text, VStack } from "@chakra-ui/react"
import type { BaseModelState } from "../../../stores/baseModelStore"
import useFlowStore from "../../../stores/flowStore"
import type { RFState } from "../../../stores/flowStore"
import { Tooltip } from "../../ui/tooltip"

interface ResultsPanelProps {
  store?: () => RFState // 流程图store
  modelStore?: () => BaseModelState<any, any, any, any, any> // 模型计算store
  modelType?: "asm1" | "asm1slim" | "materialBalance" | "asm3" // 模型类型
}

const ResultsPanel = ({ store, modelStore, modelType }: ResultsPanelProps) => {
  const flowStore = store || useFlowStore
  const { nodes } = flowStore()

  // 使用传入的modelStore获取计算结果，如果没有传入则返回null
  const finalValues = modelStore ? modelStore().finalValues : null

  // 根据modelStore类型确定参数标签映射
  const getParameterLabels = (): Record<string, string> => {
    // 如果传入了modelType参数，优先使用
    if (modelType === "asm1") {
      return {
        // ASM1的11个状态变量
        concentration_X_BH: "异养菌生物量",
        concentration_X_BA: "自养菌生物量",
        concentration_X_S: "缓慢降解基质",
        concentration_X_i: "惰性颗粒物",
        concentration_X_ND: "颗粒有机氮",
        concentration_S_O: "溶解氧",
        concentration_S_S: "易降解基质",
        concentration_S_NO: "硝态氮",
        concentration_S_NH: "氨氮",
        concentration_S_ND: "溶解有机氮",
        concentration_S_ALK: "碱度",
        // 兼容不带concentration_前缀的格式
        X_BH: "异养菌生物量",
        X_BA: "自养菌生物量",
        X_S: "缓慢降解基质",
        X_i: "惰性颗粒物",
        X_ND: "颗粒有机氮",
        S_O: "溶解氧",
        S_S: "易降解基质",
        S_NO: "硝态氮",
        S_NH: "氨氮",
        S_ND: "溶解有机氮",
        S_ALK: "碱度",
      }
    }

    if (modelType === "asm1slim") {
      return {
        // ASM1Slim的5个状态变量
        dissolvedOxygen: "溶解氧",
        cod: "COD",
        nitrate: "硝态氮",
        ammonia: "氨氮",
        totalAlkalinity: "总碱度",
      }
    }

    if (modelType === "asm3") {
      return {
        // ASM3的13个状态变量
        X_H: "异养菌生物量",
        X_A: "自养菌生物量",
        X_STO: "储存物质",
        X_S: "缓慢降解基质",
        X_i: "惰性颗粒物",
        X_ND: "颗粒有机氮",
        S_O: "溶解氧",
        S_S: "易降解基质",
        S_NO: "硝态氮",
        S_NH: "氨氮",
        S_ND: "溶解有机氮",
        S_ALK: "碱度",
        S_A: "发酵产物",
      }
    }

    // 检查是否为ASM1模型（通过检查finalValues中是否包含ASM1特有的参数）
    const nodeData = finalValues?.final_values?.nodes || finalValues?.node_data
    if (nodeData) {
      const firstNodeData = Object.values(nodeData)[0] as Record<string, any>
      // 如果包含ASM3的特征参数，使用ASM3标签
      if (
        firstNodeData &&
        (firstNodeData.X_STO !== undefined || firstNodeData.S_A !== undefined)
      ) {
        return {
          // ASM3的13个状态变量
          X_H: "异养菌生物量",
          X_A: "自养菌生物量",
          X_STO: "储存物质",
          X_S: "缓慢降解基质",
          X_i: "惰性颗粒物",
          X_ND: "颗粒有机氮",
          S_O: "溶解氧",
          S_S: "易降解基质",
          S_NO: "硝态氮",
          S_NH: "氨氮",
          S_ND: "溶解有机氮",
          S_ALK: "碱度",
          S_A: "发酵产物",
        }
      }

      // 如果包含ASM1的特征参数，使用ASM1标签
      if (
        firstNodeData &&
        (firstNodeData.concentration_X_BH !== undefined ||
          firstNodeData.X_BH !== undefined)
      ) {
        return {
          // ASM1的11个状态变量
          concentration_X_BH: "异养菌生物量",
          concentration_X_BA: "自养菌生物量",
          concentration_X_S: "缓慢降解基质",
          concentration_X_i: "惰性颗粒物",
          concentration_X_ND: "颗粒有机氮",
          concentration_S_O: "溶解氧",
          concentration_S_S: "易降解基质",
          concentration_S_NO: "硝态氮",
          concentration_S_NH: "氨氮",
          concentration_S_ND: "溶解有机氮",
          concentration_S_ALK: "碱度",
          // 兼容不带concentration_前缀的格式
          X_BH: "异养菌生物量",
          X_BA: "自养菌生物量",
          X_S: "缓慢降解基质",
          X_i: "惰性颗粒物",
          X_ND: "颗粒有机氮",
          S_O: "溶解氧",
          S_S: "易降解基质",
          S_NO: "硝态氮",
          S_NH: "氨氮",
          S_ND: "溶解有机氮",
          S_ALK: "碱度",
        }
      }
    }

    // 默认使用ASM1Slim参数标签
    return {
      dissolvedOxygen: "溶解氧",
      cod: "COD",
      nitrate: "硝态氮",
      ammonia: "氨氮",
      totalAlkalinity: "总碱度",
    }
  }

  const parameterLabels = getParameterLabels()

  // 获取参数的显示名称
  const getParameterLabel = (paramName: string): string => {
    return parameterLabels[paramName] || paramName
  }

  // 截断文本以适应固定列宽（约5个汉字）
  const truncateText = (text: string, maxLength = 8): string => {
    return text.length > maxLength ? text.substring(0, maxLength) : text
  }

  // 获取节点名称
  const getNodeName = (nodeId: string): string => {
    const node = nodes.find((n) => n.id === nodeId)
    return (node?.data?.label as string) || nodeId
  }

  // 获取所有参数名（不包含体积）
  const getAllParameterNames = () => {
    // 处理新的API数据格式：finalValues.final_values.nodes
    const nodeData = finalValues?.final_values?.nodes || finalValues?.node_data
    if (!nodeData) return []

    const allParams = new Set<string>()
    Object.values(nodeData).forEach((nodeParams) => {
      Object.keys(nodeParams as Record<string, number>).forEach((param) => {
        // 排除体积参数，包含所有其他参数
        if (param !== "volume") {
          allParams.add(param)
        }
      })
    })

    // 按照parameterLabels中定义的顺序返回参数，未定义的参数放在最后
    const definedParams = Object.keys(parameterLabels).filter((param) =>
      allParams.has(param),
    )
    const undefinedParams = Array.from(allParams).filter(
      (param) => !parameterLabels[param],
    )

    return [...definedParams, ...undefinedParams]
  }

  return (
    <Box>
      {/* 节点计算结果表格 */}
      {(() => {
        // 处理新的API数据格式：finalValues.final_values.nodes
        const nodeData =
          finalValues?.final_values?.nodes || finalValues?.node_data
        return nodeData && Object.keys(nodeData).length > 0
      })() ? (
        <Box>
          <Table.Root size="sm" variant="outline">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader width="120px">节点名称</Table.ColumnHeader>
                <Table.ColumnHeader width="80px">体积</Table.ColumnHeader>
                {getAllParameterNames().map((paramName) => {
                  const label = getParameterLabel(paramName)
                  const truncatedLabel = truncateText(label)
                  return (
                    <Table.ColumnHeader key={paramName} width="80px">
                      <Tooltip content={label} placement="top">
                        <Text cursor="help">{truncatedLabel}</Text>
                      </Tooltip>
                    </Table.ColumnHeader>
                  )
                })}
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {(() => {
                // 处理新的API数据格式：finalValues.final_values.nodes
                const nodeData =
                  finalValues?.final_values?.nodes || finalValues?.node_data
                return Object.entries(nodeData).map(([nodeId, nodeParams]) => {
                  const params = nodeParams as Record<string, number>
                  return (
                    <Table.Row key={nodeId}>
                      <Table.Cell fontSize="xs">
                        {getNodeName(nodeId)}
                      </Table.Cell>
                      <Table.Cell fontSize="xs">
                        {params.volume ? params.volume.toFixed(3) : "-"}
                      </Table.Cell>
                      {getAllParameterNames().map((paramName) => (
                        <Table.Cell key={paramName} fontSize="xs">
                          {params[paramName] !== undefined
                            ? typeof params[paramName] === "number"
                              ? params[paramName].toFixed(3)
                              : String(params[paramName])
                            : "-"}
                        </Table.Cell>
                      ))}
                    </Table.Row>
                  )
                })
              })()}
            </Table.Body>
          </Table.Root>
        </Box>
      ) : (
        <VStack gap={2} align="center" py={4}>
          <Text fontSize="xs" color="gray.500">
            暂无计算结果数据
          </Text>
        </VStack>
      )}
    </Box>
  )
}

export default ResultsPanel
