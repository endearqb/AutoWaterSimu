import { Box, Field, HStack, Input, Stack, Text } from "@chakra-ui/react"
import { useEffect, useState } from "react"
import { ASM1_CONFIG } from "../../../config/modelConfigs"
import { useI18n } from "../../../i18n"
import type { ModelFlowState } from "../../../stores/createModelFlowStore"

interface ASM1PropertyPanelProps {
  isNode: boolean
  store?: () => ModelFlowState<any, any, any> // 可选的自定义store
}

const volumeParam = {
  name: "volume",
  label: "flow.modelParams.asm1.volume.label",
  description: "flow.modelParams.asm1.volume.description",
}

function ASM1PropertyPanel({ isNode, store }: ASM1PropertyPanelProps) {
  if (!store) {
    throw new Error("ASM1PropertyPanel requires a store prop")
  }

  const { t } = useI18n()
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

  useEffect(() => {
    if (selectedEdge?.data?.flow !== undefined) {
      setTempFlowValue(String(selectedEdge.data.flow))
    } else {
      setTempFlowValue("")
    }
  }, [selectedEdge?.id, selectedEdge?.data?.flow])

  const getParamLabel = (param: { label: string }) => t(param.label)
  const getParamDescription = (param: { description?: string }) =>
    param.description ? t(param.description) : ""

  const handleNodeInputChange = (paramName: string, value: any) => {
    if (selectedNode) {
      if (paramName === "label" && !value.trim()) {
        setNameError(t("flow.propertyPanel.errors.nameRequired"))
      } else {
        setNameError("")
      }

      if (paramName === "volume") {
        const numValue = Number.parseFloat(value)
        if (Number.isNaN(numValue) || numValue < 0) {
          setVolumeError(t("flow.propertyPanel.errors.volumeNonNegative"))
        } else {
          setVolumeError("")
        }
        if (numValue === 0) {
          value = "1e-3"
        }
      }

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
            [paramName]: t("flow.propertyPanel.errors.paramNonNegative"),
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
      setTempFlowValue(value)

      if (value === "") {
        setFlowRateError("")
        updateEdgeFlow(selectedEdge.id, 0)
      } else {
        const numValue = Number.parseFloat(value)
        if (Number.isNaN(numValue) || numValue < 0) {
          setFlowRateError(t("flow.propertyPanel.errors.flowNonNegative"))
        } else {
          setFlowRateError("")
          updateEdgeFlow(selectedEdge.id, numValue)
        }
      }
    }
  }

  const allParameters = [volumeParam, ...ASM1_CONFIG.fixedParameters]

  if (isNode && selectedNode) {
    const isASM1Node = selectedNode.type === "asm1"

    return (
      <Stack gap={4} align="stretch">
        <Box>
          <Stack gap={3}>
            <Field.Root required invalid={!!nameError}>
              <HStack align="flex-start" gap={4}>
                <Field.Label minW="100px" pt={2}>
                  {t("flow.propertyPanel.nameLabel")}
                </Field.Label>
                <Box flex={1}>
                  <Input
                    value={(selectedNode.data?.label as string) || ""}
                    onChange={(e) =>
                      handleNodeInputChange("label", e.target.value)
                    }
                    className="nodrag"
                    placeholder={t("flow.propertyPanel.namePlaceholder")}
                  />
                  {nameError && <Field.ErrorText>{nameError}</Field.ErrorText>}
                </Box>
              </HStack>
            </Field.Root>

            {isASM1Node &&
              allParameters.map((param) => {
                const nodeValue = selectedNode.data?.[param.name] as string
                const currentValue = nodeValue || ""
                const hasError = paramErrors[param.name]
                const label = getParamLabel(param)
                const description = getParamDescription(param)

                return (
                  <Field.Root
                    key={param.name}
                    invalid={
                      !!hasError || (param.name === "volume" && !!volumeError)
                    }
                  >
                    <HStack align="flex-start" gap={4}>
                      <Field.Label minW="100px" pt={2}>
                        {label}
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
                          placeholder={description}
                        />
                        {hasError && (
                          <Field.ErrorText>{hasError}</Field.ErrorText>
                        )}
                      </Box>
                    </HStack>
                  </Field.Root>
                )
              })}

            {!isASM1Node &&
              allParameters.map((param) => {
                const nodeValue = selectedNode.data?.[param.name] as string
                const currentValue = nodeValue || ""
                const hasError = paramErrors[param.name]
                const label = getParamLabel(param)
                const description = getParamDescription(param)

                return (
                  <Field.Root
                    key={param.name}
                    invalid={
                      !!hasError || (param.name === "volume" && !!volumeError)
                    }
                  >
                    <HStack align="flex-start" gap={4}>
                      <Field.Label minW="100px" pt={2}>
                        {label}
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
                          placeholder={description}
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
              {t("flow.propertyPanel.notes.asm1")}
            </Text>
          </Box>
        )}
      </Stack>
    )
  }

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

      if (field === "a" && numValue !== 0) {
        newConfig.b = 0
      } else if (field === "b" && numValue !== 0) {
        newConfig.a = 0
      }

      updateEdgeParameterConfig(selectedEdge.id, paramName, newConfig)
    }

    const fixedParameters = ASM1_CONFIG.fixedParameters

    const renderEdgeParameters = () => {
      return fixedParameters.map((param) => {
        const config = edgeConfigs[param.name] || { a: 1, b: 0 }
        const sourceParamValue = sourceNode?.data?.[param.name]
          ? Number.parseFloat(sourceNode.data[param.name] as string) || 0
          : 0
        const calculatedValue = config.a * sourceParamValue + config.b
        const label = getParamLabel(param)
        const description = getParamDescription(param)

        return (
          <Field.Root key={param.name}>
            <HStack align="flex-start" gap={4}>
              <Field.Label minW="80px" pt={2} fontSize="sm">
                {label}
              </Field.Label>
              <Box flex={1}>
                <Input
                  value={calculatedValue.toFixed(2)}
                  readOnly
                  placeholder={description || label}
                  style={{ backgroundColor: "#f7fafc", cursor: "not-allowed" }}
                />

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
                  {t("flow.propertyPanel.flowLabel")}
                </Field.Label>
                <Box flex={1}>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={tempFlowValue}
                    onChange={(e) => handleEdgeFlowChange(e.target.value)}
                    placeholder={t("flow.propertyPanel.flowPlaceholder")}
                  />
                  {flowRateError && (
                    <Field.ErrorText>{flowRateError}</Field.ErrorText>
                  )}
                </Box>
              </HStack>
            </Field.Root>
          </Stack>
        </Box>

        <Box>
          <Stack gap={3}>{renderEdgeParameters()}</Stack>
        </Box>
      </Stack>
    )
  }

  return null
}

export default ASM1PropertyPanel
