import { Box, Field, HStack, Input, Stack, Text } from "@chakra-ui/react"
import { useEffect, useMemo, useState } from "react"
import type { CustomParameter } from "../../../config/modelConfigs"
import { useI18n } from "../../../i18n"
import type { ModelFlowState } from "../../../stores/createModelFlowStore"

interface UDMPropertyPanelProps {
  isNode: boolean
  store?: () => ModelFlowState<any, any, any>
}

const volumeParam: CustomParameter = {
  name: "volume",
  label: "flow.propertyPanel.volumeLabel",
  description: "flow.propertyPanel.volumePlaceholder",
  defaultValue: 1e-3,
}

const toNumber = (value: unknown): number | null => {
  const num = Number.parseFloat(String(value))
  return Number.isNaN(num) ? null : num
}

const extractUDMComponentParameters = (
  sourceData: Record<string, unknown> | undefined,
): CustomParameter[] => {
  if (!sourceData) return []

  const componentSources: unknown[] = [
    sourceData.udmComponents,
    (sourceData.udmModelSnapshot as Record<string, unknown> | undefined)
      ?.components,
    (sourceData.udmModel as Record<string, unknown> | undefined)?.components,
  ]

  for (const source of componentSources) {
    if (!Array.isArray(source)) continue

    const parsed = source
      .map((item) => {
        if (!item || typeof item !== "object") return null
        const raw = item as Record<string, unknown>
        const name = String(raw.name || "").trim()
        if (!name) return null

        const defaultValue =
          toNumber(raw.defaultValue) ?? toNumber(raw.default_value) ?? 0
        const label = String(raw.label || name)
        const unit = String(raw.unit || "").trim()

        return {
          name,
          label,
          description: unit ? `Unit: ${unit}` : undefined,
          defaultValue,
        } as CustomParameter
      })
      .filter((item): item is CustomParameter => !!item)

    if (parsed.length > 0) {
      return parsed
    }
  }

  return []
}

function UDMPropertyPanel({ isNode, store }: UDMPropertyPanelProps) {
  if (!store) {
    throw new Error("UDMPropertyPanel requires a store prop")
  }

  const { t } = useI18n()
  const {
    selectedNode,
    selectedEdge,
    updateNodeParameter,
    updateEdgeFlow,
    updateEdgeParameterConfig,
    edgeParameterConfigs,
    customParameters,
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

  const udmParameters = useMemo<CustomParameter[]>(() => {
    if (customParameters && customParameters.length > 0) {
      return customParameters
    }

    const fromSelected = extractUDMComponentParameters(
      selectedNode?.data as Record<string, unknown> | undefined,
    )
    if (fromSelected.length > 0) {
      return fromSelected
    }

    const firstUdmNode = nodes.find((node) => node.type === "udm")
    return extractUDMComponentParameters(
      firstUdmNode?.data as Record<string, unknown> | undefined,
    )
  }, [customParameters, selectedNode?.id, selectedNode?.data, nodes])

  const allParameters = useMemo(
    () => [volumeParam, ...udmParameters],
    [udmParameters],
  )

  const getParamLabel = (param: { label: string }) => {
    if (param.label.startsWith("flow.")) {
      return t(param.label)
    }
    return param.label
  }

  const getParamDescription = (param: { description?: string }) => {
    if (!param.description) return ""
    if (param.description.startsWith("flow.")) {
      return t(param.description)
    }
    return param.description
  }

  const handleNodeInputChange = (paramName: string, value: string) => {
    if (!selectedNode) return

    if (paramName === "label") {
      if (!value.trim()) {
        setNameError(t("flow.propertyPanel.errors.nameRequired"))
      } else {
        setNameError("")
      }
      updateNodeParameter(selectedNode.id, "label", value)
      return
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
      updateNodeParameter(selectedNode.id, paramName, value)
      return
    }

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

    updateNodeParameter(selectedNode.id, paramName, value)
  }

  const handleEdgeFlowChange = (value: string) => {
    if (!selectedEdge) return

    setTempFlowValue(value)

    if (value === "") {
      setFlowRateError("")
      updateEdgeFlow(selectedEdge.id, 0)
      return
    }

    const numValue = Number.parseFloat(value)
    if (Number.isNaN(numValue) || numValue < 0) {
      setFlowRateError(t("flow.propertyPanel.errors.flowNonNegative"))
      return
    }

    setFlowRateError("")
    updateEdgeFlow(selectedEdge.id, numValue)
  }

  if (isNode && selectedNode) {
    const isUDMNode = selectedNode.type === "udm"

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

            {allParameters.map((param) => {
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

        {isUDMNode && (
          <Box>
            <Text fontSize="sm" color="gray.600" fontStyle="italic">
              UDM node parameters are driven by the current UDM model
              definition.
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

    const renderEdgeParameters = () => {
      if (udmParameters.length === 0) {
        return (
          <Text fontSize="sm" color="gray.500">
            No UDM components detected. Load a UDM model flowchart first.
          </Text>
        )
      }

      return udmParameters.map((param) => {
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

export default UDMPropertyPanel
