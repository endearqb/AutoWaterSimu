import {
  Box,
  Field,
  HStack,
  Input,
  NativeSelect,
  Stack,
  Text,
} from "@chakra-ui/react"
import { useEffect, useMemo, useState } from "react"
import type { CustomParameter } from "../../../config/modelConfigs"
import { useI18n } from "../../../i18n"
import type { ModelFlowState } from "../../../stores/createModelFlowStore"
import type { HybridUDMSelectedModel } from "../../../types/hybridUdm"
import EdgeTimeSegmentEditor from "./EdgeTimeSegmentEditor"

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

const toInteger = (value: unknown): number | null => {
  const num = Number.parseInt(String(value), 10)
  return Number.isNaN(num) ? null : num
}

const buildModelKey = (modelId: string, version: number) => `${modelId}@${version}`

const extractUDMComponentParameters = (
  sourceData: Record<string, unknown> | undefined,
  formatUnitDescription?: (unit: string) => string,
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
          description: unit
            ? formatUnitDescription
              ? formatUnitDescription(unit)
              : unit
            : undefined,
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

const getSelectedNodeModelKey = (
  sourceData: Record<string, unknown> | undefined,
): string => {
  if (!sourceData) return ""
  const udmModel = (sourceData.udmModel as Record<string, unknown> | undefined) || {}
  const modelId = String(
    sourceData.udmModelId || udmModel.id || udmModel.modelId || "",
  ).trim()
  const version = toInteger(
    sourceData.udmModelVersion || udmModel.version || udmModel.currentVersion,
  )
  if (!modelId || version === null) return ""
  return buildModelKey(modelId, version)
}

const buildNodeModelData = (
  model: HybridUDMSelectedModel,
  currentNodeData: Record<string, unknown>,
): Record<string, unknown> => {
  const modelName = String(model.name || model.model_id || "UDM").trim()
  const components = Array.isArray(model.components) ? model.components : []
  const parameters = Array.isArray(model.parameters) ? model.parameters : []
  const processes = Array.isArray(model.processes) ? model.processes : []

  const parameterValues: Record<string, number> = {}
  parameters.forEach((param) => {
    if (!param || typeof param !== "object") return
    const raw = param as Record<string, unknown>
    const name = String(raw.name || "").trim()
    if (!name) return
    const defaultValue =
      toNumber(raw.default_value) ?? toNumber(raw.defaultValue) ?? 0
    parameterValues[name] = defaultValue
  })

  const componentValues: Record<string, string> = {}
  const componentNames: string[] = []
  components.forEach((component) => {
    if (!component || typeof component !== "object") return
    const raw = component as Record<string, unknown>
    const name = String(raw.name || "").trim()
    if (!name) return
    componentNames.push(name)
    const existingValue = currentNodeData[name]
    if (existingValue !== undefined && existingValue !== null && existingValue !== "") {
      componentValues[name] = String(existingValue)
      return
    }
    const defaultValue =
      toNumber(raw.default_value) ?? toNumber(raw.defaultValue) ?? 0
    componentValues[name] = String(defaultValue)
  })

  return {
    ...componentValues,
    udmModel: {
      id: model.model_id,
      name: modelName,
      version: model.version,
      hash: model.hash || "",
      components,
      parameters,
      processes,
      parameterValues,
    },
    udmModelSnapshot: {
      id: model.model_id,
      name: modelName,
      version: model.version,
      hash: model.hash || "",
      components,
      parameters,
      processes,
      meta: model.meta || {},
    },
    udmComponents: components,
    udmComponentNames: componentNames,
    udmProcesses: processes,
    udmParameters: parameterValues,
    udmParameterValues: parameterValues,
    udmModelId: model.model_id,
    udmModelVersion: model.version,
    udmModelHash: model.hash || "",
  }
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
    edges,
    customParameters,
    nodes,
    timeSegments,
    addTimeSegment,
    updateTimeSegment,
    removeTimeSegment,
    copyTimeSegment,
    reorderTimeSegments,
    calculationParameters,
    isEdgeTimeSegmentMode,
    hybridConfig,
    setNodes,
    setSelectedNode,
  } = store()

  const [nameError, setNameError] = useState("")
  const [volumeError, setVolumeError] = useState("")
  const [flowRateError, setFlowRateError] = useState("")
  const [tempFlowValue, setTempFlowValue] = useState("")
  const [paramErrors, setParamErrors] = useState<Record<string, string>>({})
  const [hybridModelError, setHybridModelError] = useState("")

  const currentEdge = useMemo(
    () =>
      selectedEdge
        ? edges.find((edge) => edge.id === selectedEdge.id) || selectedEdge
        : null,
    [edges, selectedEdge],
  )

  useEffect(() => {
    if (currentEdge?.data?.flow !== undefined) {
      setTempFlowValue(String(currentEdge.data.flow))
    } else {
      setTempFlowValue("")
    }
  }, [currentEdge?.id, currentEdge?.data?.flow])

  const hybridModels = useMemo<HybridUDMSelectedModel[]>(() => {
    if (hybridConfig?.mode !== "udm_only") return []
    return (hybridConfig.selected_models || []).filter(
      (model) =>
        !!model &&
        typeof model === "object" &&
        !!String(model.model_id || "").trim() &&
        Number.isInteger(model.version),
    )
  }, [hybridConfig])

  const hybridModelMap = useMemo(() => {
    const next = new Map<string, HybridUDMSelectedModel>()
    hybridModels.forEach((model) => {
      const key = buildModelKey(model.model_id, model.version)
      next.set(key, model)
    })
    return next
  }, [hybridModels])

  const selectedNodeModelKey = useMemo(
    () =>
      getSelectedNodeModelKey(
        (selectedNode?.data as Record<string, unknown> | undefined) || undefined,
      ),
    [selectedNode?.id, selectedNode?.data],
  )

  useEffect(() => {
    if (!selectedNode || selectedNode.type !== "udm") {
      setHybridModelError("")
      return
    }
    if (hybridModels.length === 0) {
      setHybridModelError("")
      return
    }
    if (!selectedNodeModelKey) {
      setHybridModelError(t("flow.propertyPanel.hybrid.errors.bindModelRequired"))
      return
    }
    if (!hybridModelMap.has(selectedNodeModelKey)) {
      setHybridModelError(
        t("flow.propertyPanel.hybrid.errors.currentModelNotInSetup"),
      )
      return
    }
    setHybridModelError("")
  }, [
    selectedNode?.id,
    selectedNode?.type,
    hybridModels.length,
    hybridModelMap,
    selectedNodeModelKey,
    t,
  ])

  const udmParameters = useMemo<CustomParameter[]>(() => {
    const formatUnitDescription = (unit: string) =>
      t("flow.propertyPanel.unitWithValue", { unit })

    if (customParameters && customParameters.length > 0) {
      return customParameters
    }

    const fromSelected = extractUDMComponentParameters(
      selectedNode?.data as Record<string, unknown> | undefined,
      formatUnitDescription,
    )
    if (fromSelected.length > 0) {
      return fromSelected
    }

    const firstUdmNode = nodes.find((node) => node.type === "udm")
    return extractUDMComponentParameters(
      firstUdmNode?.data as Record<string, unknown> | undefined,
      formatUnitDescription,
    )
  }, [customParameters, selectedNode?.id, selectedNode?.data, nodes, t])

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
    if (param.description.startsWith("Unit: ")) {
      const unitValue = param.description.slice("Unit: ".length).trim()
      return t("flow.propertyPanel.unitWithValue", { unit: unitValue })
    }
    return param.description
  }

  const handleHybridModelChange = (nextModelKey: string) => {
    if (!selectedNode || selectedNode.type !== "udm") return
    const model = hybridModelMap.get(nextModelKey)
    if (!model) {
      setHybridModelError(t("flow.propertyPanel.hybrid.errors.selectedModelInvalid"))
      return
    }

    const currentNodeData =
      (selectedNode.data as Record<string, unknown> | undefined) || {}
    const nodeModelData = buildNodeModelData(model, currentNodeData)

    const updatedNodes = nodes.map((node) => {
      if (node.id !== selectedNode.id) return node
      return {
        ...node,
        data: {
          ...(node.data as Record<string, unknown>),
          ...nodeModelData,
        },
      }
    })
    setNodes(updatedNodes)

    const updatedSelectedNode =
      updatedNodes.find((node) => node.id === selectedNode.id) || null
    setSelectedNode(updatedSelectedNode)
    setHybridModelError("")
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
    if (!currentEdge) return

    setTempFlowValue(value)

    if (value === "") {
      setFlowRateError("")
      updateEdgeFlow(currentEdge.id, 0)
      return
    }

    const numValue = Number.parseFloat(value)
    if (Number.isNaN(numValue) || numValue < 0) {
      setFlowRateError(t("flow.propertyPanel.errors.flowNonNegative"))
      return
    }

    setFlowRateError("")
    updateEdgeFlow(currentEdge.id, numValue)
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

            {isUDMNode && hybridModels.length > 0 && (
              <Field.Root invalid={!!hybridModelError}>
                <HStack align="flex-start" gap={4}>
                  <Field.Label minW="100px" pt={2}>
                    {t("flow.propertyPanel.hybrid.modelLabel")}
                  </Field.Label>
                  <Box flex={1}>
                    <NativeSelect.Root>
                      <NativeSelect.Field
                        value={selectedNodeModelKey}
                        onChange={(e) => handleHybridModelChange(e.target.value)}
                      >
                        <option value="" disabled>
                          {t("flow.propertyPanel.hybrid.selectModelPlaceholder")}
                        </option>
                        {hybridModels.map((model) => {
                          const key = buildModelKey(model.model_id, model.version)
                          return (
                            <option key={key} value={key}>
                              {model.name || model.model_id} (v{model.version})
                            </option>
                          )
                        })}
                      </NativeSelect.Field>
                      <NativeSelect.Indicator />
                    </NativeSelect.Root>
                    {hybridModelError && (
                      <Field.ErrorText>{hybridModelError}</Field.ErrorText>
                    )}
                  </Box>
                </HStack>
              </Field.Root>
            )}

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
              {t("flow.propertyPanel.notes.udm")}
            </Text>
          </Box>
        )}
      </Stack>
    )
  }

  if (!isNode && selectedEdge) {
    const activeEdge = currentEdge || selectedEdge
    const sourceNode = nodes.find((node) => node.id === activeEdge.source)
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

    const segmentParameters = udmParameters.map((param) => ({
      name: param.name,
      label: getParamLabel(param),
      description: getParamDescription(param),
    }))

    if (isEdgeTimeSegmentMode) {
      const rawFlow = Number((activeEdge.data as Record<string, unknown>)?.flow)
      return (
        <EdgeTimeSegmentEditor
          edgeId={selectedEdge.id}
          edgeFlow={Number.isFinite(rawFlow) ? rawFlow : 0}
          parameterDescriptors={segmentParameters}
          edgeConfigs={edgeConfigs}
          timeSegments={timeSegments}
          simulationHours={calculationParameters.hours}
          emptyParameterMessage={t("flow.propertyPanel.udmNoComponents")}
          addTimeSegment={addTimeSegment}
          updateTimeSegment={updateTimeSegment}
          removeTimeSegment={removeTimeSegment}
          copyTimeSegment={copyTimeSegment}
          reorderTimeSegments={reorderTimeSegments}
        />
      )
    }

    const renderEdgeParameters = () => {
      if (udmParameters.length === 0) {
        return (
          <Text fontSize="sm" color="gray.500">
            {t("flow.propertyPanel.udmNoComponents")}
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
