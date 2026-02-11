import { HStack, Stack, Table, Text } from "@chakra-ui/react"
import type React from "react"
import { useMemo } from "react"
import { getModelConfig } from "../../../config/modelConfigs"
import { useI18n } from "../../../i18n"
import type { RFState } from "../../../stores/flowStore"

interface ModelParametersPanelProps {
  modelType: string
  store?: () => RFState
}

interface ParameterRowDef {
  key: string
  name: string
  label: string
  kind: "model" | "static"
}

const getModelTypeFromNode = (nodeType: string): string => {
  switch (nodeType) {
    case "asmslim":
    case "ASMslimNode":
      return "asm1slim"
    case "asm1":
    case "ASM1Node":
      return "asm1"
    case "asm2d":
    case "ASM2dNode":
      return "asm2d"
    case "asm3":
    case "ASM3Node":
      return "asm3"
    case "udm":
    case "UDMNode":
      return "udm"
    case "input":
    case "output":
    case "default":
    case "custom":
    case "editable":
      return ""
    default:
      console.log("未识别的节点类型:", nodeType)
      return ""
  }
}

const getUdmModelParameterDefs = (
  nodeData: Record<string, unknown>,
): Array<{ name: string; label: string }> => {
  const candidates: unknown[] = [
    (nodeData.udmModelSnapshot as Record<string, unknown> | undefined)
      ?.parameters,
    (nodeData.udmModel as Record<string, unknown> | undefined)?.parameters,
  ]

  for (const source of candidates) {
    if (!Array.isArray(source)) continue

    const parsed = source
      .map((item) => {
        if (!item || typeof item !== "object") return null
        const raw = item as Record<string, unknown>
        const name = String(raw.name || "").trim()
        if (!name) return null
        return { name, label: name }
      })
      .filter((item): item is { name: string; label: string } => !!item)

    if (parsed.length > 0) return parsed
  }

  return []
}

const toDisplayValue = (value: unknown): string => {
  if (value === undefined || value === null || value === "") return "-"
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "-"
  if (typeof value === "string") return value
  return String(value)
}

export const ModelParametersPanel: React.FC<ModelParametersPanelProps> = ({
  store,
}) => {
  const { t } = useI18n()
  const allNodes = store ? store().nodes : []

  const modelNodes = useMemo(() => {
    return allNodes.filter((node) => {
      const modelType = getModelTypeFromNode(node.type || "")
      return modelType !== ""
    })
  }, [allNodes])

  const parameterRows = useMemo<ParameterRowDef[]>(() => {
    const rowMap = new Map<string, ParameterRowDef>()

    modelNodes.forEach((node) => {
      const nodeModelType = getModelTypeFromNode(node.type || "")
      const nodeData = (node.data || {}) as Record<string, unknown>

      if (nodeModelType === "udm") {
        const modelParams = getUdmModelParameterDefs(nodeData)
        modelParams.forEach((param) => {
          const key = `model:${param.name}`
          if (!rowMap.has(key)) {
            rowMap.set(key, {
              key,
              name: param.name,
              label: param.label,
              kind: "model",
            })
          }
        })

        return
      }

      const modelConfig = getModelConfig(nodeModelType)
      if (!modelConfig?.enhancedCalculationParameters) return

      modelConfig.enhancedCalculationParameters.forEach((param) => {
        const key = `static:${param.name}`
        if (!rowMap.has(key)) {
          rowMap.set(key, {
            key,
            name: param.name,
            label: param.label,
            kind: "static",
          })
        }
      })
    })

    return Array.from(rowMap.values())
  }, [modelNodes])

  if (modelNodes.length === 0) {
    return (
      <Stack gap={4} align="stretch">
        <Text color="gray.500">{t("flow.modelParametersPanel.empty")}</Text>
      </Stack>
    )
  }

  if (parameterRows.length === 0) {
    return (
      <Stack gap={4} align="stretch">
        <Text color="gray.500">{t("flow.modelParametersPanel.noParameters")}</Text>
      </Stack>
    )
  }

  return (
    <Stack gap={4} align="stretch">
      <HStack justify="space-between">
        <Text fontSize="sm" fontWeight="medium">
          {t("flow.modelParametersPanel.title")}
        </Text>
        <Text fontSize="xs" color="gray.500">
          {t("flow.modelParametersPanel.summary", {
            nodes: modelNodes.length,
            params: parameterRows.length,
          })}
        </Text>
      </HStack>

      <Table.Root size="sm" variant="outline">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>
              {t("flow.modelParametersPanel.paramNameHeader")}
            </Table.ColumnHeader>
            {modelNodes.map((node) => (
              <Table.ColumnHeader key={node.id}>
                {(node.data as any)?.label || node.id}
              </Table.ColumnHeader>
            ))}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {parameterRows.map((row) => (
            <Table.Row key={row.key}>
              <Table.Cell>
                <Text fontSize="sm" fontWeight="medium">
                  {row.kind === "static" && row.label.startsWith("flow.")
                    ? t(row.label)
                    : row.label}
                </Text>
              </Table.Cell>
              {modelNodes.map((node) => {
                const nodeModelType = getModelTypeFromNode(node.type || "")
                const nodeData = (node.data || {}) as Record<string, unknown>

                if (nodeModelType === "udm") {
                  if (row.kind === "model") {
                    const defs = getUdmModelParameterDefs(nodeData)
                    const hasParam = defs.some((item) => item.name === row.name)
                    const valueFromMap = (nodeData.udmParameterValues as
                      | Record<string, unknown>
                      | undefined)?.[row.name]
                    return (
                      <Table.Cell key={`${row.key}-${node.id}`}>
                        <Text fontSize="sm">
                          {hasParam
                            ? toDisplayValue(valueFromMap ?? nodeData[row.name])
                            : "-"}
                        </Text>
                      </Table.Cell>
                    )
                  }

                  return (
                    <Table.Cell key={`${row.key}-${node.id}`}>
                      <Text fontSize="sm">-</Text>
                    </Table.Cell>
                  )
                }

                if (row.kind !== "static") {
                  return (
                    <Table.Cell key={`${row.key}-${node.id}`}>
                      <Text fontSize="sm">-</Text>
                    </Table.Cell>
                  )
                }

                const modelConfig = getModelConfig(nodeModelType)
                const staticParam = modelConfig?.enhancedCalculationParameters?.find(
                  (p) => p.name === row.name,
                )
                const value = staticParam
                  ? ((node.data as any)?.[row.name] ?? staticParam.defaultValue)
                  : "-"

                return (
                  <Table.Cell key={`${row.key}-${node.id}`}>
                    <Text fontSize="sm">{toDisplayValue(value)}</Text>
                  </Table.Cell>
                )
              })}
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Stack>
  )
}

export default ModelParametersPanel
