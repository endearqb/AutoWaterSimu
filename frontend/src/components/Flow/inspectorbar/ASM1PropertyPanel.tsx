import { Box, Field, HStack, Input, Stack, Text } from "@chakra-ui/react"
import { useEffect, useState } from "react"
import { ASM1_CONFIG } from "../../../config/modelConfigs"
import type { ModelFlowState } from "../../../stores/createModelFlowStore"

interface ASM1PropertyPanelProps {
  isNode: boolean
  store?: () => ModelFlowState<any, any, any> // 可选的自定义 store
}

function ASM1PropertyPanel({ isNode, store }: ASM1PropertyPanelProps) {
  if (!store) {
    throw new Error("ASM1PropertyPanel requires a store prop")
  }

  const {
    selectedNode,
    selectedEdge,
    updateNodeParameter,
    updateEdgeFlow,
    updateEdgeParameterConfig,
    edgeParameterConfigs,
    nodes,
  } = store()

  const [nameError, setNameError] = useState("")
  const [volumeError, setVolumeError] = useState("")
  const [flowRateError, setFlowRateError] = useState("")
  const [tempFlowValue, setTempFlowValue] = useState("")
  const [paramErrors, setParamErrors] = useState<Record<string, string>>({})

  // 同步tempFlowValue与selectedEdge的flow值
  useEffect(() => {
    if (selectedEdge?.data?.flow !== undefined) {
      setTempFlowValue(String(selectedEdge.data.flow))
    } else {
      setTempFlowValue("")
    }
  }, [selectedEdge?.id, selectedEdge?.data?.flow])

  const handleNodeInputChange = (paramName: string, value: any) => {
    if (selectedNode) {
      if (paramName === "label" && !value.trim()) {
        setNameError("名称不能为空")
      } else {
        setNameError("")
      }

      if (paramName === "volume") {
        const numValue = Number.parseFloat(value)
        if (Number.isNaN(numValue) || numValue < 0) {
          setVolumeError("体积必须是非负数")
        } else {
          setVolumeError("")
        }
        // 如果输入为0，自动设置为默认的最小值
        if (numValue === 0) {
          value = "1e-3"
        }
      }

      // 验证ASM1数值参数
      const asm1Parameters = [
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
      if (asm1Parameters.includes(paramName)) {
        const numValue = Number.parseFloat(value)
        if (value && (Number.isNaN(numValue) || numValue < 0)) {
          setParamErrors((prev) => ({
            ...prev,
            [paramName]: "参数值必须是非负数",
          }))
        } else {
          setParamErrors((prev) => {
            const { [paramName]: removed, ...rest } = prev
            return rest
          })
        }
      }

      updateNodeParameter(selectedNode.id, paramName, value)
    }
  }

  const handleEdgeFlowChange = (value: string) => {
    if (selectedEdge) {
      // 更新临时输入值
      setTempFlowValue(value)

      // 验证输入
      if (value === "") {
        setFlowRateError("")
        updateEdgeFlow(selectedEdge.id, 0)
      } else {
        const numValue = Number.parseFloat(value)
        if (Number.isNaN(numValue) || numValue < 0) {
          setFlowRateError("流量必须是非负数")
        } else {
          setFlowRateError("")
          updateEdgeFlow(selectedEdge.id, numValue)
        }
      }
    }
  }

  // 统一从ASM1_CONFIG获取所有参数配置（包括体积参数）
  const allParameters = [
    { name: "volume", label: "体积(m³)", description: "反应器体积，立方米" },
    ...ASM1_CONFIG.fixedParameters,
  ]

  if (isNode && selectedNode) {
    const isASM1Node = selectedNode.type === "asm1"

    return (
      <Stack gap={4} align="stretch">
        <Box>
          {/* 所有节点参数 */}
          <Stack gap={3}>
            <Field.Root required invalid={!!nameError}>
              <HStack align="flex-start" gap={4}>
                <Field.Label minW="100px" pt={2}>
                  名称
                </Field.Label>
                <Box flex={1}>
                  <Input
                    value={(selectedNode.data?.label as string) || ""}
                    onChange={(e) =>
                      handleNodeInputChange("label", e.target.value)
                    }
                    className="nodrag"
                    placeholder="节点名称"
                  />
                  {nameError && <Field.ErrorText>{nameError}</Field.ErrorText>}
                </Box>
              </HStack>
            </Field.Root>

            {/* ASM1节点的固定参数 */}
            {isASM1Node &&
              allParameters.map((param) => {
                // 修改参数值获取逻辑：只有当节点数据中有值时才使用，否则为空字符串以显示placeholder
                const nodeValue = selectedNode.data?.[param.name] as string
                const currentValue = nodeValue || ""
                const hasError = paramErrors[param.name]

                return (
                  <Field.Root
                    key={param.name}
                    invalid={
                      !!hasError || (param.name === "volume" && !!volumeError)
                    }
                  >
                    <HStack align="flex-start" gap={4}>
                      <Field.Label minW="100px" pt={2}>
                        {param.label}
                      </Field.Label>
                      <Box flex={1}>
                        <Input
                          type="number"
                          step={param.name === "volume" ? "1e-3" : "0.01"}
                          min={param.name === "volume" ? "1e-3" : "0"}
                          value={currentValue}
                          onChange={(e) =>
                            handleNodeInputChange(param.name, e.target.value)
                          }
                          className="nodrag"
                          placeholder={param.description || ""}
                        />
                        {hasError && (
                          <Field.ErrorText>{hasError}</Field.ErrorText>
                        )}
                      </Box>
                    </HStack>
                  </Field.Root>
                )
              })}

            {/* 非ASM1节点显示所有参数 - 使用统一的allParameters配置 */}
            {!isASM1Node &&
              allParameters.map((param) => {
                // 修改参数值获取逻辑：只有当节点数据中有值时才使用，否则为空字符串以显示placeholder
                const nodeValue = selectedNode.data?.[param.name] as string
                const currentValue = nodeValue || ""
                const hasError = paramErrors[param.name]

                return (
                  <Field.Root
                    key={param.name}
                    invalid={
                      !!hasError || (param.name === "volume" && !!volumeError)
                    }
                  >
                    <HStack align="flex-start" gap={4}>
                      <Field.Label minW="100px" pt={2}>
                        {param.label}
                      </Field.Label>
                      <Box flex={1}>
                        <Input
                          type="number"
                          step={param.name === "volume" ? "1e-3" : "0.01"}
                          min={param.name === "volume" ? "1e-3" : "0"}
                          value={currentValue}
                          onChange={(e) =>
                            handleNodeInputChange(param.name, e.target.value)
                          }
                          className="nodrag"
                          placeholder={param.description || ""}
                        />
                        {hasError && (
                          <Field.ErrorText>{hasError}</Field.ErrorText>
                        )}
                      </Box>
                    </HStack>
                  </Field.Root>
                )
              })}
          </Stack>
        </Box>

        {isASM1Node && (
          <Box>
            <Text fontSize="sm" color="gray.600" fontStyle="italic">
              注意：ASM1节点只支持上述固定参数，不能添加自定义参数。
            </Text>
          </Box>
        )}
      </Stack>
    )
  }

  // 连接线参数设置
  if (!isNode && selectedEdge) {
    const sourceNode = nodes.find((node) => node.id === selectedEdge.source)
    const edgeConfigs = edgeParameterConfigs[selectedEdge.id] || {}

    const handleConfigChange = (
      paramName: string,
      field: "a" | "b",
      value: string,
    ) => {
      const numValue = Number.parseFloat(value) || 0
      const currentConfig = edgeConfigs[paramName] || { a: 1, b: 0 }

      const newConfig = { ...currentConfig }
      newConfig[field] = numValue

      // a和b互斥逻辑：只能有一个不为0
      if (field === "a" && numValue !== 0) {
        newConfig.b = 0
      } else if (field === "b" && numValue !== 0) {
        newConfig.a = 0
      }

      updateEdgeParameterConfig(selectedEdge.id, paramName, newConfig)
    }

    // 从ASM1_CONFIG动态获取固定参数
    const fixedParameters = ASM1_CONFIG.fixedParameters.map((param) => ({
      name: param.name,
      label: param.label,
      description: param.description || "",
    }))

    const renderEdgeParameters = () => {
      return fixedParameters.map((param) => {
        const config = edgeConfigs[param.name] || { a: 1, b: 0 }
        const sourceParamValue = sourceNode?.data?.[param.name]
          ? Number.parseFloat(sourceNode.data[param.name] as string) || 0
          : 0
        const calculatedValue = config.a * sourceParamValue + config.b

        return (
          <Field.Root key={param.name}>
            <HStack align="flex-start" gap={4}>
              <Field.Label minW="80px" pt={2} fontSize="sm">
                {param.label}
              </Field.Label>
              <Box flex={1}>
                {/* 显示计算后的具体数值（不可修改） */}
                <Input
                  value={calculatedValue.toFixed(2)}
                  readOnly
                  placeholder={param.description || `${param.label}`}
                  style={{ backgroundColor: "#f7fafc", cursor: "not-allowed" }}
                />

                {/* a和b系数标签和输入框在同一行 */}
                <HStack gap={2} mt={2} align="center">
                  <Text fontSize="sm" minW="12px">
                    a
                  </Text>
                  <Input
                    type="number"
                    step="0.01"
                    value={config.a}
                    onChange={(e) =>
                      handleConfigChange(param.name, "a", e.target.value)
                    }
                    placeholder="1"
                    size="sm"
                    flex={1}
                  />
                  <Text fontSize="sm" minW="12px">
                    b
                  </Text>
                  <Input
                    type="number"
                    step="0.01"
                    value={config.b}
                    onChange={(e) =>
                      handleConfigChange(param.name, "b", e.target.value)
                    }
                    placeholder="0"
                    size="sm"
                    flex={1}
                  />
                </HStack>
              </Box>
            </HStack>
          </Field.Root>
        )
      })
    }

    return (
      <Stack gap={4} align="stretch">
        <Box>
          <Stack gap={3}>
            <Field.Root invalid={!!flowRateError}>
              <HStack align="flex-start" gap={4}>
                <Field.Label minW="80px" pt={2}>
                  流量(m³/h)
                </Field.Label>
                <Box flex={1}>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={tempFlowValue}
                    onChange={(e) => handleEdgeFlowChange(e.target.value)}
                    placeholder="连接线的流量参数，单位：立方米/小时"
                  />
                  {flowRateError && (
                    <Field.ErrorText>{flowRateError}</Field.ErrorText>
                  )}
                </Box>
              </HStack>
            </Field.Root>
          </Stack>
        </Box>

        {/* ASM1参数配置 */}
        <Box>
          <Stack gap={3}>{renderEdgeParameters()}</Stack>
        </Box>
      </Stack>
    )
  }

  return null
}

export default ASM1PropertyPanel
