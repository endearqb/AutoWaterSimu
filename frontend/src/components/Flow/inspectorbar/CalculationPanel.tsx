import { Box, Field, HStack, Stack, Text } from "@chakra-ui/react"
import { Slider } from "@chakra-ui/react"
import { useState } from "react"
import { useI18n } from "../../../i18n"
import useFlowStore from "../../../stores/flowStore"
import type { RFState } from "../../../stores/flowStore"

interface CalculationPanelProps {
  store?: () => RFState // 可选的自定义store
}

function CalculationPanel({ store }: CalculationPanelProps = {}) {
  const { t } = useI18n()
  const flowStore = store || useFlowStore
  const { selectedNode, updateNodeParameter } = flowStore()
  const [paramErrors, setParamErrors] = useState<Record<string, string>>({})

  const calculationParameters = [
    {
      name: "density",
      label: t("flow.calculationPanel.params.density.label"),
      description: t("flow.calculationPanel.params.density.description"),
      min: 800,
      max: 1200,
      step: 1,
      defaultValue: 1000,
      unit: "kg/m³",
    },
    {
      name: "viscosity",
      label: t("flow.calculationPanel.params.viscosity.label"),
      description: t("flow.calculationPanel.params.viscosity.description"),
      min: 0.001,
      max: 0.01,
      step: 0.0001,
      defaultValue: 0.001,
      unit: "Pa·s",
    },
    {
      name: "temperature",
      label: t("flow.calculationPanel.params.temperature.label"),
      description: t("flow.calculationPanel.params.temperature.description"),
      min: 0,
      max: 100,
      step: 1,
      defaultValue: 20,
      unit: "°C",
    },
    {
      name: "pressure",
      label: t("flow.calculationPanel.params.pressure.label"),
      description: t("flow.calculationPanel.params.pressure.description"),
      min: 80,
      max: 120,
      step: 1,
      defaultValue: 101.325,
      unit: "kPa",
    },
    {
      name: "efficiency",
      label: t("flow.calculationPanel.params.efficiency.label"),
      description: t("flow.calculationPanel.params.efficiency.description"),
      min: 0.1,
      max: 1.0,
      step: 0.01,
      defaultValue: 0.85,
      unit: "-",
    },
  ]

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
        [paramName]: t("flow.calculationPanel.rangeError", { min, max }),
      }))
    } else {
      setParamErrors((prev) => {
        const { [paramName]: removed, ...rest } = prev
        return rest
      })
    }

    if (!Number.isNaN(numValue)) {
      updateNodeParameter(selectedNode.id, paramName, numValue)
    }
  }

  if (!selectedNode) {
    return (
      <Box>
        <Text color="gray.500">{t("flow.calculationPanel.emptyState")}</Text>
      </Box>
    )
  }

  return (
    <Stack gap={6} align="stretch">
      <Box>
        <Text fontSize="lg" fontWeight="semibold" mb={4}>
          {t("flow.calculationPanel.title")}
        </Text>

        <Stack gap={4}>
          {calculationParameters.map((param) => {
            const currentValue = Number(
              selectedNode.data?.[param.name] ?? param.defaultValue,
            )
            const hasError = paramErrors[param.name]

            return (
              <Field.Root key={param.name} invalid={!!hasError}>
                <Slider.Root
                  value={[currentValue]}
                  onValueChange={(details) =>
                    handleParameterChange(
                      param.name,
                      details.value[0].toString(),
                      param.min,
                      param.max,
                    )
                  }
                  min={param.min}
                  max={param.max}
                  step={param.step}
                  width="100%"
                  mb={4}
                >
                  <HStack justify="space-between" mb={2}>
                    <Text fontSize="sm">
                      {param.label} ({param.unit})
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
                  {param.description}
                </Text>

                {hasError && <Field.ErrorText>{hasError}</Field.ErrorText>}
              </Field.Root>
            )
          })}
        </Stack>
      </Box>

      <Box>
        <Text fontSize="sm" color="blue.600" fontStyle="italic">
          {t("flow.calculationPanel.tip")}
        </Text>
      </Box>
    </Stack>
  )
}

export default CalculationPanel
