import { Box, Field, HStack, Stack, Switch, Text } from "@chakra-ui/react"
import { Slider } from "@chakra-ui/react"
import { useState } from "react"
import type { EnhancedCustomParameter } from "../../../config/modelConfigs"
import { getModelConfig } from "../../../config/modelConfigs"
import { useI18n } from "../../../i18n"
import type { ModelFlowState } from "../../../stores/createModelFlowStore"

interface ModelCalculationPanelProps {
  store?: () => ModelFlowState<any, any, any>
  modelType: string // 模型类型，如 'ASM1Slim', 'ASM1' 等
  nodeType: string // 节点类型，用于过滤节点
}

function ModelCalculationPanel({
  store,
  modelType,
  nodeType,
}: ModelCalculationPanelProps) {
  if (!store) {
    throw new Error("ModelCalculationPanel requires a store prop")
  }

  const { t } = useI18n()
  const { selectedNode, updateNodeParameter, nodes } = store()
  const [paramErrors, setParamErrors] = useState<Record<string, string>>({})
  const [syncParameters, setSyncParameters] = useState(true)

  const modelConfig = getModelConfig(modelType)
  if (!modelConfig) {
    return (
      <Box>
        <Text color="red.500">
          {t("flow.modelCalculation.missingConfig", { model: modelType })}
        </Text>
      </Box>
    )
  }

  const calculationParameters = modelConfig.enhancedCalculationParameters || []

  const handleParameterChange = (
    paramName: string,
    value: string,
    min: number,
    max: number,
  ) => {
    if (!selectedNode) return

    const numValue = Number.parseFloat(value)

    if (!Number.isNaN(numValue) && (numValue < min || numValue > max)) {
      setParamErrors((prev) => ({
        ...prev,
        [paramName]: t("flow.modelCalculation.rangeError", { min, max }),
      }))
    } else {
      setParamErrors((prev) => {
        const { [paramName]: removed, ...rest } = prev
        return rest
      })
    }

    if (!Number.isNaN(numValue)) {
      if (syncParameters) {
        const targetNodes = nodes.filter((node) => node.type === nodeType)
        targetNodes.forEach((node) => {
          updateNodeParameter(node.id, paramName, numValue)
        })
      } else {
        updateNodeParameter(selectedNode.id, paramName, numValue)
      }
    }
  }

  const getParameterValue = (
    paramName: string,
    defaultValue: number,
  ): string => {
    if (!selectedNode) return defaultValue.toString()
    const value = selectedNode.data?.[paramName]
    return value !== undefined && value !== null
      ? value.toString()
      : defaultValue.toString()
  }

  if (!selectedNode) {
    return (
      <Box>
        <Text color="gray.500">{t("flow.modelCalculation.emptyState")}</Text>
      </Box>
    )
  }

  const isTargetNode = selectedNode.type === nodeType

  if (!isTargetNode) {
    return (
      <Box>
        <Text color="gray.500">
          {t("flow.modelCalculation.onlyForModel", {
            model: modelConfig.displayName,
          })}
        </Text>
      </Box>
    )
  }

  if (calculationParameters.length === 0) {
    return (
      <Box>
        <Text color="gray.500">{t("flow.modelCalculation.noParameters")}</Text>
      </Box>
    )
  }

  return (
    <Stack gap={6}>
      <Box>
        <Text fontSize="lg" fontWeight="semibold" mb={4}>
          {t("flow.modelCalculation.title", { model: modelConfig.displayName })}
        </Text>

        <Box mb={6} p={4} bg="gray.50" borderRadius="md">
          <HStack justify="space-between" align="center">
            <Switch.Root
              checked={syncParameters}
              onCheckedChange={(details) => setSyncParameters(details.checked)}
              colorPalette="gray.600"
            >
              <Switch.HiddenInput />
              <Switch.Control />
            </Switch.Root>
            <Box>
              <Text fontSize="xs" color="gray.600">
                {syncParameters
                  ? t("flow.modelCalculation.syncOn", {
                      model: modelConfig.displayName,
                    })
                  : t("flow.modelCalculation.syncOff")}
              </Text>
            </Box>
          </HStack>
        </Box>

        <Text fontSize="sm" color="gray.600" mb={4}>
          {t("flow.modelCalculation.description", {
            model: modelConfig.displayName,
          })}
        </Text>

        <Stack gap={5}>
          {calculationParameters.map((param: EnhancedCustomParameter) => {
            const currentValue = getParameterValue(
              param.name,
              param.defaultValue,
            )
            const parsedValue = Number.parseFloat(currentValue)
            const numValue = Number.isNaN(parsedValue)
              ? param.defaultValue
              : parsedValue
            const hasError = paramErrors[param.name]

            return (
              <Field.Root key={param.name} invalid={!!hasError}>
                <Slider.Root
                  value={[numValue]}
                  onValueChange={(details) => {
                    handleParameterChange(
                      param.name,
                      details.value[0].toString(),
                      param.ui.min,
                      param.ui.max,
                    )
                  }}
                  min={param.ui.min}
                  max={param.ui.max}
                  step={param.ui.step}
                  width="100%"
                  mb={4}
                >
                  <HStack justify="space-between" mb={2}>
                    <Text fontSize="sm">
                      {t(param.label)} ({param.ui.unit})
                    </Text>
                    <Slider.ValueText fontSize="sm" />
                  </HStack>
                  <Slider.Control>
                    <Slider.Track>
                      <Slider.Range />
                    </Slider.Track>
                    <Slider.Thumbs />
                  </Slider.Control>
                </Slider.Root>

                <Text fontSize="xs" color="gray.600" mb={2}>
                  {param.description ? t(param.description) : ""}
                </Text>

                {hasError && <Field.ErrorText>{hasError}</Field.ErrorText>}
              </Field.Root>
            )
          })}
        </Stack>
      </Box>

      <Box>
        <Text fontSize="sm" color="blue.600" fontStyle="italic">
          {t("flow.modelCalculation.tip", { model: modelConfig.displayName })}
        </Text>
      </Box>
    </Stack>
  )
}

export default ModelCalculationPanel
