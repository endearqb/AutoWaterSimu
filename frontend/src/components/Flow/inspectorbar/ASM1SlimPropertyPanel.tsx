import { Box, Field, HStack, Input, Stack, Text } from "@chakra-ui/react"
import { useEffect, useState } from "react"
import type { ModelFlowState } from "../../../stores/createModelFlowStore"

interface ASM1SlimPropertyPanelProps {
  isNode: boolean
  store?: () => ModelFlowState<any, any, any> // 可选的自定义 store
}

function ASM1SlimPropertyPanel({ isNode, store }: ASM1SlimPropertyPanelProps) {
  if (!store) {
    throw new Error("ASM1SlimPropertyPanel requires a store prop")
  }

  const {
    selectedNode,
    selectedEdge,
    updateNodeParameter,
    updateEdgeFlow,
    updateEdgeParameterConfig,
    edgeParameterConfigs,
    nodes,
    customParameters,
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

      // 验证其他数值参数
      if (
        [
          "dissolvedOxygen",
          "cod",
          "nitrate",
          "ammonia",
          "totalAlkalinity",
        ].includes(paramName)
      ) {
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

  // ASMslim节点的固定参数配置
  const asmParameters = [
    { name: "volume", label: "体积", description: "反应器体积，立方米" },
    { name: "dissolvedOxygen", label: "溶解氧", description: "mg/L" },
    { name: "cod", label: "COD", description: "mg/L" },
    { name: "nitrate", label: "硝态氮", description: "mg/L" },
    { name: "ammonia", label: "氨氮", description: "mg/L" },
    { name: "totalAlkalinity", label: "总碱度 ", description: "mmol/L" },
  ]

  if (isNode && selectedNode) {
    const isASMNode = selectedNode.type === "asmslim"

    return (
      <Stack gap={4} align="stretch">
        <Box>
          {/* <Text fontSize="lg" fontWeight="semibold" mb={3}>
            {isASMNode ? 'ASMslim节点参数' : '节点参数'}
          </Text> */}

          {/* 所有节点参数 */}
          <Stack gap={3}>
            <Field.Root required invalid={!!nameError}>
              <HStack align="flex-start" gap={4}>
                <Field.Label minW="80px" pt={2}>
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

            {/* ASMslim节点的固定参数 */}
            {isASMNode &&
              asmParameters.map((param) => {
                const currentValue =
                  (selectedNode.data?.[param.name] as string) || ""
                const hasError = paramErrors[param.name]

                return (
                  <Field.Root
                    key={param.name}
                    invalid={
                      !!hasError || (param.name === "volume" && !!volumeError)
                    }
                  >
                    <HStack align="flex-start" gap={4}>
                      <Field.Label minW="80px" pt={2}>
                        {param.label}
                      </Field.Label>
                      <Box flex={1}>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={currentValue}
                          onChange={(e) =>
                            handleNodeInputChange(param.name, e.target.value)
                          }
                          className="nodrag"
                          placeholder={param.description}
                        />
                        {hasError && (
                          <Field.ErrorText>{hasError}</Field.ErrorText>
                        )}
                        {param.name === "volume" && volumeError && (
                          <Field.ErrorText>{volumeError}</Field.ErrorText>
                        )}
                      </Box>
                    </HStack>
                  </Field.Root>
                )
              })}

            {/* 非ASM节点显示体积参数和ASM1Slim固定参数 */}
            {!isASMNode && (
              <>
                <Field.Root invalid={!!volumeError}>
                  <HStack align="flex-start" gap={4}>
                    <Field.Label minW="80px" pt={2}>
                      体积(m³)
                    </Field.Label>
                    <Box flex={1}>
                      <Input
                        type="number"
                        step="1e-3"
                        min="1e-3"
                        value={(selectedNode.data?.volume as string) || ""}
                        onChange={(e) =>
                          handleNodeInputChange("volume", e.target.value)
                        }
                        className="nodrag"
                        placeholder="节点的体积参数，单位：立方米，最小值：1e-3"
                      />
                      {volumeError && (
                        <Field.ErrorText>{volumeError}</Field.ErrorText>
                      )}
                    </Box>
                  </HStack>
                </Field.Root>

                {/* ASM1Slim固定参数 */}
                {customParameters
                  .filter((param: any) =>
                    [
                      "dissolvedOxygen",
                      "cod",
                      "nitrate",
                      "ammonia",
                      "totalAlkalinity",
                    ].includes(param.name),
                  )
                  .map((param: any) => {
                    const currentValue =
                      (selectedNode.data?.[param.name] as string) || ""
                    const hasError = paramErrors[param.name]

                    return (
                      <Field.Root key={param.name} invalid={!!hasError}>
                        <HStack align="flex-start" gap={4}>
                          <Field.Label minW="80px" pt={2}>
                            {param.label}
                          </Field.Label>
                          <Box flex={1}>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={currentValue}
                              onChange={(e) =>
                                handleNodeInputChange(
                                  param.name,
                                  e.target.value,
                                )
                              }
                              className="nodrag"
                              placeholder={param.description}
                            />
                            {hasError && (
                              <Field.ErrorText>{hasError}</Field.ErrorText>
                            )}
                          </Box>
                        </HStack>
                      </Field.Root>
                    )
                  })}
              </>
            )}
          </Stack>
        </Box>

        {isASMNode && (
          <Box>
            <Text fontSize="sm" color="gray.600" fontStyle="italic">
              注意：ASMslim节点只支持上述固定参数，不能添加自定义参数。
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

    // 只显示ASM1slim的5个固定参数
    const fixedParameters = [
      {
        name: "dissolvedOxygen",
        label: "溶解氧",
        description: "溶解氧浓度 (mg/L)",
      },
      { name: "cod", label: "COD", description: "化学需氧量 (mg/L)" },
      { name: "nitrate", label: "硝态氮", description: "硝态氮浓度 (mg/L)" },
      { name: "ammonia", label: "氨氮", description: "氨氮浓度 (mg/L)" },
      {
        name: "totalAlkalinity",
        label: "总碱度",
        description: "总碱度 (mg/L)",
      },
    ]

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
                  placeholder={param.description || `${param.label}，mg/L`}
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
          {/* <Text fontSize="lg" fontWeight="semibold" mb={3}>连接参数</Text> */}

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

        {/* ASM1Slim参数配置 */}
        <Box>
          {/* <Text fontSize="lg" fontWeight="semibold" mb={3}>ASM1Slim参数配置</Text>
          <Text fontSize="sm" color="gray.600" mb={3}>
            计算公式：输出值 = a × 源节点参数值 + b（a和b只能有一个不为0）
          </Text> */}
          <Stack gap={3}>{renderEdgeParameters()}</Stack>
        </Box>
      </Stack>
    )
  }

  return null
}

export default ASM1SlimPropertyPanel
