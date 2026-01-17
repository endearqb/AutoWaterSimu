import { Box, Input, Table, Text } from "@chakra-ui/react"
import useFlowStore from "../../../stores/flowStore"
import type { RFState } from "../../../stores/flowStore"
import { Tooltip } from "../../ui/tooltip"

interface DataPanelProps {
  store?: () => RFState // 可选的自定义 store
  modelType?: "asm1" | "asm1slim" | "materialBalance" | "asm3" // 模型类型
}

const DataPanel = ({ store, modelType }: DataPanelProps) => {
  const flowStore = store || useFlowStore
  const { nodes, setNodes, updateNodeParameter } = flowStore()

  // 检测模型类型
  const detectModelType = (): "asm1" | "asm1slim" | "asm3" | "unknown" => {
    // 如果传入了modelType参数，优先使用
    if (modelType && modelType !== "materialBalance") {
      return modelType
    }

    if (nodes.length === 0) return "unknown"

    // 检查是否有ASM1节点类型
    const hasASM1Node = nodes.some((node) => node.type === "asm1")
    if (hasASM1Node) return "asm1"

    // 检查是否有ASM1Slim节点类型
    const hasASM1SlimNode = nodes.some((node) => node.type === "asmslim")
    if (hasASM1SlimNode) return "asm1slim"

    // 检查是否有ASM3节点类型
    const hasASM3Node = nodes.some((node) => node.type === "asm3")
    if (hasASM3Node) return "asm3"

    // 通过参数特征检测
    const firstNode = nodes[0]
    if (firstNode?.data) {
      const paramKeys = Object.keys(firstNode.data)
      // ASM1特征参数
      const asm1Params = [
        "X_BH",
        "X_BA",
        "X_S",
        "X_i",
        "X_ND",
        "S_O",
        "S_S",
        "S_NO",
        "S_NH",
        "S_ND",
        "S_ALK",
      ]
      if (asm1Params.some((param) => paramKeys.includes(param))) {
        return "asm1"
      }
      // ASM1Slim特征参数
      const asm1SlimParams = [
        "dissolvedOxygen",
        "cod",
        "nitrate",
        "ammonia",
        "totalAlkalinity",
      ]
      if (asm1SlimParams.some((param) => paramKeys.includes(param))) {
        return "asm1slim"
      }
      // ASM3特征参数
      const asm3Params = [
        "X_H",
        "X_A",
        "X_S",
        "X_I",
        "X_ND",
        "X_STO",
        "S_O",
        "S_S",
        "S_NO",
        "S_NH",
        "S_ND",
        "S_ALK",
        "S_I",
      ]
      if (asm3Params.some((param) => paramKeys.includes(param))) {
        return "asm3"
      }
    }

    return "unknown"
  }

  // 获取节点参数（排除模型参数）
  const getNodeParameters = (): string[] => {
    const modelType = detectModelType()

    if (modelType === "asm1") {
      // ASM1的节点参数（状态变量）
      return [
        "X_BH",
        "X_BA",
        "X_S",
        "X_i",
        "X_ND",
        "S_O",
        "S_S",
        "S_NO",
        "S_NH",
        "S_ND",
        "S_ALK",
      ]
    }
    if (modelType === "asm1slim") {
      // ASM1Slim的节点参数（固定参数）
      return ["dissolvedOxygen", "cod", "nitrate", "ammonia", "totalAlkalinity"]
    }
    if (modelType === "asm3") {
      // ASM3的节点参数（状态变量）
      return [
        "X_H",
        "X_A",
        "X_S",
        "X_I",
        "X_ND",
        "X_STO",
        "S_O",
        "S_S",
        "S_NO",
        "S_NH",
        "S_ND",
        "S_ALK",
        "S_I",
      ]
    }

    return []
  }

  // 根据模型类型获取节点参数标签映射
  const getParameterLabels = (): Record<string, string> => {
    const modelType = detectModelType()

    if (modelType === "asm1") {
      return {
        // ASM1的节点参数（状态变量）- 使用中文标签
        volume: "体积",
        X_BH: "异养菌浓度",
        X_BA: "自养菌浓度",
        X_S: "缓慢降解COD",
        X_i: "惰性颗粒COD",
        X_ND: "颗粒有机氮",
        S_O: "溶解氧",
        S_S: "易降解COD",
        S_NO: "硝态氮",
        S_NH: "氨氮",
        S_ND: "溶解有机氮",
        S_ALK: "总碱度",
      }
    }
    if (modelType === "asm1slim") {
      return {
        // ASM1Slim节点参数名称映射
        dissolvedOxygen: "溶解氧",
        cod: "COD",
        nitrate: "硝态氮",
        ammonia: "氨氮",
        totalAlkalinity: "总碱度",
      }
    }
    if (modelType === "asm3") {
      return {
        // ASM3的节点参数（状态变量）- 使用中文标签
        volume: "体积",
        X_H: "异养菌生物量",
        X_A: "自养菌生物量",
        X_S: "颗粒可降解基质",
        X_I: "颗粒惰性物质",
        X_ND: "颗粒有机氮",
        X_STO: "储存产物",
        S_O: "溶解氧",
        S_S: "可溶基质",
        S_NO: "硝酸盐和亚硝酸盐",
        S_NH: "氨氮",
        S_ND: "可溶有机氮",
        S_ALK: "碱度",
        S_I: "可溶惰性物质",
      }
    }

    return {}
  }

  // 获取参数的显示名称
  const getParameterLabel = (paramName: string): string => {
    const parameterLabels = getParameterLabels()
    return parameterLabels[paramName] || paramName
  }

  // 截断文本以适应固定列宽（约5个汉字）
  const truncateText = (text: string, maxLength = 8): string => {
    return text.length > maxLength ? text.substring(0, maxLength) : text
  }

  // 数字校验函数
  const validateNumericInput = (value: string): string => {
    // 允许空字符串、数字、小数点和负号
    const numericRegex = /^-?\d*\.?\d*$/
    return numericRegex.test(value) ? value : ""
  }

  return (
    <Box>
      {nodes.length > 0 ? (
        (() => {
          // 获取节点参数（排除模型参数）
          const nodeParameters = getNodeParameters()
          const allParamKeys = new Set<string>()

          nodes.forEach((node) => {
            if (node.data) {
              Object.keys(node.data).forEach((key) => {
                if (key !== "label" && key !== "volume") {
                  // 排除label和volume字段
                  // 如果有定义的节点参数列表，只包含节点参数
                  if (nodeParameters.length > 0) {
                    if (nodeParameters.includes(key)) {
                      allParamKeys.add(key)
                    }
                  } else {
                    // 如果没有定义节点参数列表，包含所有参数（向后兼容）
                    allParamKeys.add(key)
                  }
                }
              })
            }
          })
          const paramKeys = Array.from(allParamKeys)

          return (
            <Table.Root size="sm" variant="outline">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader width="120px">
                    节点名称
                  </Table.ColumnHeader>
                  <Table.ColumnHeader width="80px">体积</Table.ColumnHeader>
                  {paramKeys.map((key) => {
                    const label = getParameterLabel(key)
                    const truncatedLabel = truncateText(label)
                    return (
                      <Table.ColumnHeader key={key} width="80px">
                        <Tooltip content={label} placement="top">
                          <Text cursor="help">{truncatedLabel}</Text>
                        </Tooltip>
                      </Table.ColumnHeader>
                    )
                  })}
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {nodes.map((node) => (
                  <Table.Row key={node.id}>
                    <Table.Cell fontSize="xs" p={1}>
                      <Input
                        size="xs"
                        value={
                          (node.data as any)?.label ||
                          `节点-${node.id.slice(0, 8)}`
                        }
                        onChange={(e) => {
                          const updatedNodes = nodes.map((n) =>
                            n.id === node.id
                              ? {
                                  ...n,
                                  data: { ...n.data, label: e.target.value },
                                }
                              : n,
                          )
                          setNodes(updatedNodes)
                        }}
                        onBlur={(e) => {
                          updateNodeParameter(node.id, "label", e.target.value)
                        }}
                        variant="flushed"
                        fontSize="xs"
                        border="none"
                      />
                    </Table.Cell>
                    <Table.Cell fontSize="xs" p={1}>
                      <Input
                        size="xs"
                        value={(node.data as any)?.volume || ""}
                        onChange={(e) => {
                          const validatedValue = validateNumericInput(
                            e.target.value,
                          )
                          const updatedNodes = nodes.map((n) =>
                            n.id === node.id
                              ? {
                                  ...n,
                                  data: { ...n.data, volume: validatedValue },
                                }
                              : n,
                          )
                          setNodes(updatedNodes)
                        }}
                        onBlur={(e) => {
                          updateNodeParameter(node.id, "volume", e.target.value)
                        }}
                        variant="flushed"
                        fontSize="xs"
                        placeholder="-"
                        border="none"
                      />
                    </Table.Cell>
                    {paramKeys.map((key) => (
                      <Table.Cell key={key} fontSize="xs" p={1}>
                        <Input
                          size="xs"
                          value={(node.data as any)?.[key] || ""}
                          onChange={(e) => {
                            const validatedValue = validateNumericInput(
                              e.target.value,
                            )
                            const updatedNodes = nodes.map((n) =>
                              n.id === node.id
                                ? {
                                    ...n,
                                    data: { ...n.data, [key]: validatedValue },
                                  }
                                : n,
                            )
                            setNodes(updatedNodes)
                          }}
                          onBlur={(e) => {
                            updateNodeParameter(node.id, key, e.target.value)
                          }}
                          variant="flushed"
                          fontSize="xs"
                          placeholder="-"
                          border="none"
                        />
                      </Table.Cell>
                    ))}
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          )
        })()
      ) : (
        <Text fontSize="sm" color="gray.500">
          暂无节点数据
        </Text>
      )}
    </Box>
  )
}

export default DataPanel
