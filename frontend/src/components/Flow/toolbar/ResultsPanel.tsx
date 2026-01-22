import { Box, Table, Text, VStack } from "@chakra-ui/react"
import type { BaseModelState } from "../../../stores/baseModelStore"
import { getModelConfig } from "../../../config/modelConfigs"
import { useI18n } from "../../../i18n"
import useFlowStore from "../../../stores/flowStore"
import type { RFState } from "../../../stores/flowStore"
import { Tooltip } from "../../ui/tooltip"

interface ResultsPanelProps {
  store?: () => RFState // 流程图store
  modelStore?: () => BaseModelState<any, any, any, any, any> // 模型计算store
  modelType?: "asm1" | "asm1slim" | "materialBalance" | "asm3" // 模型类型
}

const ResultsPanel = ({ store, modelStore, modelType }: ResultsPanelProps) => {
  const { t } = useI18n()
  const flowStore = store || useFlowStore
  const { nodes } = flowStore()

  const finalValues = modelStore ? modelStore().finalValues : null

  const detectModelType = (): "asm1" | "asm1slim" | "asm3" | undefined => {
    if (modelType && modelType !== "materialBalance") {
      return modelType
    }

    const nodeData = finalValues?.final_values?.nodes || finalValues?.node_data
    if (nodeData) {
      const firstNodeData = Object.values(nodeData)[0] as Record<string, any>
      if (
        firstNodeData &&
        (firstNodeData.X_STO !== undefined || firstNodeData.S_A !== undefined)
      ) {
        return "asm3"
      }
      if (
        firstNodeData &&
        (firstNodeData.concentration_X_BH !== undefined ||
          firstNodeData.X_BH !== undefined)
      ) {
        return "asm1"
      }
    }

    return "asm1slim"
  }

  const resolvedModelType = detectModelType()
  const modelConfig = resolvedModelType
    ? getModelConfig(resolvedModelType)
    : undefined

  const getParameterLabel = (paramName: string): string => {
    const normalizedName = paramName.startsWith("concentration_")
      ? paramName.replace("concentration_", "")
      : paramName

    const lookupName =
      normalizedName === "X_i" ? "X_I" : normalizedName

    const param = modelConfig?.fixedParameters.find(
      (item) => item.name === lookupName,
    )
    return param ? t(param.label) : paramName
  }

  const truncateText = (text: string, maxLength = 8): string => {
    return text.length > maxLength ? text.substring(0, maxLength) : text
  }

  const getNodeName = (nodeId: string): string => {
    const node = nodes.find((n) => n.id === nodeId)
    return (node?.data?.label as string) || nodeId
  }

  const getAllParameterNames = () => {
    const nodeData = finalValues?.final_values?.nodes || finalValues?.node_data
    if (!nodeData) return []

    const allParams = new Set<string>()
    Object.values(nodeData).forEach((nodeParams) => {
      Object.keys(nodeParams as Record<string, number>).forEach((param) => {
        if (param !== "volume") {
          allParams.add(param)
        }
      })
    })

    const orderedParams: string[] = []
    const baseParams = modelConfig?.fixedParameters.map((param) => param.name)
    if (baseParams) {
      baseParams.forEach((param) => {
        const concentrationKey = `concentration_${param}`
        if (allParams.has(concentrationKey)) {
          orderedParams.push(concentrationKey)
          allParams.delete(concentrationKey)
        } else if (allParams.has(param)) {
          orderedParams.push(param)
          allParams.delete(param)
        }
      })
    }

    return [...orderedParams, ...Array.from(allParams)]
  }

  return (
    <Box>
      {(() => {
        const nodeData =
          finalValues?.final_values?.nodes || finalValues?.node_data
        return nodeData && Object.keys(nodeData).length > 0
      })() ? (
        <Box>
          <Table.Root size="sm" variant="outline">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader width="120px">
                  {t("flow.resultsPanel.nodeNameHeader")}
                </Table.ColumnHeader>
                <Table.ColumnHeader width="80px">
                  {t("flow.resultsPanel.volumeHeader")}
                </Table.ColumnHeader>
                {getAllParameterNames().map((paramName) => {
                  const label = getParameterLabel(paramName)
                  const truncatedLabel = truncateText(label)
                  return (
                    <Table.ColumnHeader key={paramName} width="80px">
                      <Tooltip content={label} placement="top">
                        <Text cursor="help">{truncatedLabel}</Text>
                      </Tooltip>
                    </Table.ColumnHeader>
                  )
                })}
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {(() => {
                const nodeData =
                  finalValues?.final_values?.nodes || finalValues?.node_data
                return Object.entries(nodeData).map(([nodeId, nodeParams]) => {
                  const params = nodeParams as Record<string, number>
                  return (
                    <Table.Row key={nodeId}>
                      <Table.Cell fontSize="xs">
                        {getNodeName(nodeId)}
                      </Table.Cell>
                      <Table.Cell fontSize="xs">
                        {params.volume ? params.volume.toFixed(3) : "-"}
                      </Table.Cell>
                      {getAllParameterNames().map((paramName) => (
                        <Table.Cell key={paramName} fontSize="xs">
                          {params[paramName] !== undefined
                            ? typeof params[paramName] === "number"
                              ? params[paramName].toFixed(3)
                              : String(params[paramName])
                            : "-"}
                        </Table.Cell>
                      ))}
                    </Table.Row>
                  )
                })
              })()}
            </Table.Body>
          </Table.Root>
        </Box>
      ) : (
        <VStack gap={2} align="center" py={4}>
          <Text fontSize="xs" color="gray.500">
            {t("flow.resultsPanel.empty")}
          </Text>
        </VStack>
      )}
    </Box>
  )
}

export default ResultsPanel
