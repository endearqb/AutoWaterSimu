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

  const allModelParameters = useMemo(() => {
    const parameterMap = new Map<string, any>()

    modelNodes.forEach((node) => {
      const nodeModelType = getModelTypeFromNode(node.type || "")
      const modelConfig = getModelConfig(nodeModelType)

      if (modelConfig?.enhancedCalculationParameters) {
        modelConfig.enhancedCalculationParameters.forEach((param) => {
          if (!parameterMap.has(param.name)) {
            parameterMap.set(param.name, param)
          }
        })
      }
    })

    return Array.from(parameterMap.values())
  }, [modelNodes])

  if (modelNodes.length === 0) {
    return (
      <Stack gap={4} align="stretch">
        <Text color="gray.500">{t("flow.modelParametersPanel.empty")}</Text>
      </Stack>
    )
  }

  if (allModelParameters.length === 0) {
    return (
      <Stack gap={4} align="stretch">
        <Text color="gray.500">
          {t("flow.modelParametersPanel.noParameters")}
        </Text>
        <Text fontSize="xs" color="gray.400">
          {t("flow.modelParametersPanel.noParametersDetail", {
            count: modelNodes.length,
          })}
        </Text>
        <Text fontSize="xs" color="gray.400">
          {t("flow.modelParametersPanel.modelNodeTypes", {
            types: modelNodes
              .map(
                (node) =>
                  `${node.type} (${getModelTypeFromNode(node.type || "")})`,
              )
              .join(", "),
          })}
        </Text>
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
            params: allModelParameters.length,
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
          {allModelParameters.map((param) => (
            <Table.Row key={param.label}>
              <Table.Cell>
                <Text fontSize="sm" fontWeight="medium">
                  {t(param.label)}
                </Text>
              </Table.Cell>
              {modelNodes.map((node) => {
                const nodeModelType = getModelTypeFromNode(node.type || "")
                const modelConfig = getModelConfig(nodeModelType)
                const hasParameter =
                  modelConfig?.enhancedCalculationParameters?.some(
                    (p) => p.name === param.name,
                  )
                const paramValue = hasParameter
                  ? ((node.data as any)?.[param.name] ?? param.defaultValue)
                  : "-"

                return (
                  <Table.Cell key={`${param.name}-${node.id}`}>
                    <Text fontSize="sm">{hasParameter ? paramValue : "-"}</Text>
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
