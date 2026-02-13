import {
  Box,
  Field,
  HStack,
  Slider,
  Stack,
  Switch,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useMemo, useState } from "react"

import { useI18n } from "../../../i18n"
import type { ModelFlowState } from "../../../stores/createModelFlowStore"

interface UDMCalculationPanelProps {
  store?: () => ModelFlowState<any, any, any>
}

interface UDMParameterDef {
  name: string
  label: string
  unit?: string
  defaultValue: number
  min?: number
  max?: number
  scale?: "lin" | "log"
  note?: string
}

const toNumber = (value: unknown): number | null => {
  const parsed = Number.parseFloat(String(value))
  return Number.isFinite(parsed) ? parsed : null
}

const getSliderBounds = (param: UDMParameterDef, value: number) => {
  const min = param.min ?? Math.min(0, param.defaultValue, value)
  const max = param.max ?? Math.max(1, param.defaultValue * 2, value * 2, min + 1)
  const safeMax = max > min ? max : min + 1
  const step = Math.max(
    (safeMax - min) / 200,
    param.scale === "log" ? 0.0001 : 0.01,
  )
  return { min, max: safeMax, step }
}

const extractParameterDefs = (
  sourceData: Record<string, unknown> | undefined,
): UDMParameterDef[] => {
  if (!sourceData) return []

  const candidateSources: unknown[] = [
    (sourceData.udmModelSnapshot as Record<string, unknown> | undefined)
      ?.parameters,
    (sourceData.udmModel as Record<string, unknown> | undefined)?.parameters,
  ]

  for (const source of candidateSources) {
    if (!Array.isArray(source)) continue

    const parsed = source
      .map((item) => {
        if (!item || typeof item !== "object") return null
        const raw = item as Record<string, unknown>
        const name = String(raw.name || "").trim()
        if (!name) return null

        const defaultValue =
          toNumber(raw.defaultValue) ?? toNumber(raw.default_value) ?? 0

        return {
          name,
          label: name,
          unit: String(raw.unit || "").trim() || undefined,
          defaultValue,
          min: toNumber(raw.minValue) ?? toNumber(raw.min_value) ?? undefined,
          max: toNumber(raw.maxValue) ?? toNumber(raw.max_value) ?? undefined,
          scale: raw.scale === "log" ? "log" : "lin",
          note: String(raw.note || "").trim() || undefined,
        } as UDMParameterDef
      })
      .filter((item): item is UDMParameterDef => !!item)

    if (parsed.length > 0) return parsed
  }

  return []
}

const setNodeUdmParameter = (
  updateNodeParameter: (nodeId: string, paramName: string, value: any) => void,
  node: any,
  paramName: string,
  value: number,
) => {
  updateNodeParameter(node.id, paramName, value)
  const currentParamValues =
    (node.data?.udmParameterValues as Record<string, number> | undefined) || {}
  updateNodeParameter(node.id, "udmParameterValues", {
    ...currentParamValues,
    [paramName]: value,
  })
}

function UDMCalculationPanel({ store }: UDMCalculationPanelProps = {}) {
  if (!store) {
    throw new Error("UDMCalculationPanel requires a store prop")
  }

  const { t } = useI18n()
  const { selectedNode, nodes, updateNodeParameter } = store()
  const [syncParameters, setSyncParameters] = useState(true)
  const [paramErrors, setParamErrors] = useState<Record<string, string>>({})

  const parameterDefs = useMemo(() => {
    if (selectedNode?.type !== "udm") return []

    const fromSelected = extractParameterDefs(
      selectedNode.data as Record<string, unknown>,
    )
    if (fromSelected.length > 0) return fromSelected

    const firstUdm = nodes.find((node) => node.type === "udm")
    return extractParameterDefs(firstUdm?.data as Record<string, unknown>)
  }, [selectedNode?.id, selectedNode?.data, nodes])

  const getParameterValue = (param: UDMParameterDef): number => {
    if (!selectedNode?.data) return param.defaultValue

    const paramValues = (selectedNode.data.udmParameterValues as
      | Record<string, number>
      | undefined) ||
      {}
    const fromMap = toNumber(paramValues[param.name])
    if (fromMap !== null) return fromMap

    const fromNodeData = toNumber(selectedNode.data[param.name])
    if (fromNodeData !== null) return fromNodeData

    return param.defaultValue
  }

  const handleParamChange = (param: UDMParameterDef, value: number) => {
    if (!selectedNode || selectedNode.type !== "udm") return

    if (!Number.isFinite(value)) {
      setParamErrors((prev) => ({
        ...prev,
        [param.name]: t("flow.udmCalc.errors.numberRequired"),
      }))
      return
    }

    if (
      param.min !== undefined &&
      param.max !== undefined &&
      (value < param.min || value > param.max)
    ) {
      setParamErrors((prev) => ({
        ...prev,
        [param.name]: t("flow.udmCalc.errors.rangeOutOfBounds", {
          min: param.min ?? "",
          max: param.max ?? "",
        }),
      }))
    } else {
      setParamErrors((prev) => {
        const { [param.name]: removed, ...rest } = prev
        return rest
      })
    }

    if (syncParameters) {
      nodes
        .filter((node) => node.type === "udm")
        .forEach((node) => {
          setNodeUdmParameter(updateNodeParameter, node, param.name, value)
        })
      return
    }

    setNodeUdmParameter(updateNodeParameter, selectedNode, param.name, value)
  }

  if (!selectedNode) {
    return (
      <Box>
        <Text color="gray.500">{t("flow.udmCalc.empty.selectNode")}</Text>
      </Box>
    )
  }

  if (selectedNode.type !== "udm") {
    return (
      <Box>
        <Text color="gray.500">{t("flow.udmCalc.empty.onlyUdmNode")}</Text>
      </Box>
    )
  }

  if (parameterDefs.length === 0) {
    return (
      <Box>
        <Text color="gray.500">{t("flow.udmCalc.empty.noEditableParams")}</Text>
      </Box>
    )
  }

  return (
    <Stack gap={5}>
      <Box>
        <Text fontSize="lg" fontWeight="semibold" mb={2}>
          {t("flow.udmCalc.title")}
        </Text>
        <Text fontSize="sm" color="gray.600">
          {t("flow.udmCalc.description")}
        </Text>
      </Box>

      <Box p={3} borderWidth="1px" borderRadius="md">
        <HStack justify="space-between">
          <Text fontSize="sm" color="gray.700">
            {t("flow.udmCalc.syncAllNodes")}
          </Text>
          <Switch.Root
            checked={syncParameters}
            onCheckedChange={(details) => setSyncParameters(details.checked)}
          >
            <Switch.HiddenInput />
            <Switch.Control />
          </Switch.Root>
        </HStack>
      </Box>

      <VStack align="stretch" gap={4}>
        {parameterDefs.map((param) => {
          const value = getParameterValue(param)
          const error = paramErrors[param.name]
          const bounds = getSliderBounds(param, value)

          return (
            <Field.Root key={param.name} invalid={!!error}>
              <HStack align="flex-start" gap={4}>
                <Field.Label minW="120px" pt={2}>
                  {param.label}
                  {param.unit ? ` (${param.unit})` : ""}
                </Field.Label>
                <Box flex={1}>
                  <Slider.Root
                    value={[value]}
                    onValueChange={(details) =>
                      handleParamChange(param, details.value[0])
                    }
                    min={bounds.min}
                    max={bounds.max}
                    step={bounds.step}
                    width="100%"
                    mb={2}
                  >
                    <HStack justify="space-between" mb={2}>
                      <Text fontSize="sm" color="gray.600">
                        {t("flow.udmCalc.rangeLabel", {
                          min: bounds.min.toFixed(4),
                          max: bounds.max.toFixed(4),
                        })}
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
                  {param.note ? (
                    <Text fontSize="xs" color="gray.500" mt={1}>
                      {param.note}
                    </Text>
                  ) : null}
                  {error ? <Field.ErrorText>{error}</Field.ErrorText> : null}
                </Box>
              </HStack>
            </Field.Root>
          )
        })}
      </VStack>
    </Stack>
  )
}

export default UDMCalculationPanel
