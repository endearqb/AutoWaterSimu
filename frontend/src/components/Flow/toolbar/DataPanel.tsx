import { Box, Input, Table, Text } from "@chakra-ui/react"
import { getModelConfig } from "../../../config/modelConfigs"
import { useI18n } from "../../../i18n"
import useFlowStore from "../../../stores/flowStore"
import type { RFState } from "../../../stores/flowStore"
import { Tooltip } from "../../ui/tooltip"

interface DataPanelProps {
  store?: () => RFState // 可选的自定义store
  modelType?: "asm1" | "asm1slim" | "materialBalance" | "asm3" | "udm" // 模型类型
}

const DataPanel = ({ store, modelType }: DataPanelProps) => {
  const { t } = useI18n()
  const flowStore = store || useFlowStore
  const { nodes, setNodes, updateNodeParameter } = flowStore()

  const getUdmComponentNames = (): string[] => {
    const names: string[] = []
    const seen = new Set<string>()

    nodes.forEach((node) => {
      if (node.type !== "udm") return
      const nodeData = (node.data || {}) as Record<string, unknown>

      const fromNames = nodeData.udmComponentNames
      if (Array.isArray(fromNames)) {
        fromNames.forEach((item) => {
          const name = String(item || "").trim()
          if (name && !seen.has(name)) {
            seen.add(name)
            names.push(name)
          }
        })
      }

      const fromComponents =
        (nodeData.udmComponents as unknown[]) ||
        ((nodeData.udmModelSnapshot as Record<string, unknown> | undefined)
          ?.components as unknown[]) ||
        ((nodeData.udmModel as Record<string, unknown> | undefined)
          ?.components as unknown[])

      if (Array.isArray(fromComponents)) {
        fromComponents.forEach((item) => {
          if (!item || typeof item !== "object") return
          const name = String((item as Record<string, unknown>).name || "").trim()
          if (name && !seen.has(name)) {
            seen.add(name)
            names.push(name)
          }
        })
      }
    })

    return names
  }

  const detectModelType = ():
    | "asm1"
    | "asm1slim"
    | "asm3"
    | "udm"
    | "unknown" => {
    if (modelType && modelType !== "materialBalance") {
      return modelType
    }

    if (nodes.length === 0) return "unknown"

    const hasASM1Node = nodes.some((node) => node.type === "asm1")
    if (hasASM1Node) return "asm1"

    const hasASM1SlimNode = nodes.some((node) => node.type === "asmslim")
    if (hasASM1SlimNode) return "asm1slim"

    const hasASM3Node = nodes.some((node) => node.type === "asm3")
    if (hasASM3Node) return "asm3"

    const hasUDMNode = nodes.some((node) => node.type === "udm")
    if (hasUDMNode) return "udm"

    const firstNode = nodes[0]
    if (firstNode?.data) {
      const paramKeys = Object.keys(firstNode.data)
      const asm1Params = [
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
      if (asm1Params.some((param) => paramKeys.includes(param))) {
        return "asm1"
      }
      const asm1SlimParams = [
        "dissolvedOxygen",
        "cod",
        "nitrate",
        "ammonia",
        "totalAlkalinity",
      ]
      if (asm1SlimParams.some((param) => paramKeys.includes(param))) {
        return "asm1slim"
      }
      const asm3Params = [
        "X_H",
        "X_A",
        "X_S",
        "X_I",
        "X_ND",
        "X_STO",
        "S_O",
        "S_S",
        "S_NO",
        "S_NH",
        "S_ND",
        "S_ALK",
        "S_I",
      ]
      if (asm3Params.some((param) => paramKeys.includes(param))) {
        return "asm3"
      }
    }

    return "unknown"
  }

  const resolvedModelType = detectModelType()
  const modelConfig =
    resolvedModelType === "unknown"
      ? undefined
      : getModelConfig(resolvedModelType)

  const getNodeParameters = (): string[] => {
    if (resolvedModelType === "udm") {
      return getUdmComponentNames()
    }
    if (!modelConfig) return []
    return modelConfig.fixedParameters.map((param) => param.name)
  }

  const getParameterLabel = (paramName: string): string => {
    const param = modelConfig?.fixedParameters.find((p) => p.name === paramName)
    return param ? t(param.label) : paramName
  }

  const truncateText = (text: string, maxLength = 8): string => {
    return text.length > maxLength ? text.substring(0, maxLength) : text
  }

  const validateNumericInput = (value: string): string => {
    const numericRegex = /^-?\d*\.?\d*$/
    return numericRegex.test(value) ? value : ""
  }

  return (
    <Box>
      {nodes.length > 0 ? (
        (() => {
          const nodeParameters = getNodeParameters()
          const allParamKeys = new Set<string>()

          nodes.forEach((node) => {
            if (node.data) {
              Object.keys(node.data).forEach((key) => {
                if (key !== "label" && key !== "volume") {
                  if (nodeParameters.length > 0) {
                    if (nodeParameters.includes(key)) {
                      allParamKeys.add(key)
                    }
                  } else {
                    allParamKeys.add(key)
                  }
                }
              })
            }
          })
          const paramKeys = Array.from(allParamKeys)

          return (
            <Table.Root size="sm" variant="outline">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader width="120px">
                    {t("flow.dataPanel.nodeNameHeader")}
                  </Table.ColumnHeader>
                  <Table.ColumnHeader width="80px">
                    {t("flow.dataPanel.volumeHeader")}
                  </Table.ColumnHeader>
                  {paramKeys.map((key) => {
                    const label = getParameterLabel(key)
                    const truncatedLabel = truncateText(label)
                    return (
                      <Table.ColumnHeader key={key} width="80px">
                        <Tooltip content={label} placement="top">
                          <Text cursor="help">{truncatedLabel}</Text>
                        </Tooltip>
                      </Table.ColumnHeader>
                    )
                  })}
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {nodes.map((node) => (
                  <Table.Row key={node.id}>
                    <Table.Cell fontSize="xs" p={1}>
                      <Input
                        size="xs"
                        value={
                          (node.data as any)?.label ||
                          t("flow.dataPanel.defaultNodeName", {
                            id: node.id.slice(0, 8),
                          })
                        }
                        onChange={(e) => {
                          const updatedNodes = nodes.map((n) =>
                            n.id === node.id
                              ? {
                                  ...n,
                                  data: { ...n.data, label: e.target.value },
                                }
                              : n,
                          )
                          setNodes(updatedNodes)
                        }}
                        onBlur={(e) => {
                          updateNodeParameter(node.id, "label", e.target.value)
                        }}
                        variant="flushed"
                        fontSize="xs"
                        border="none"
                      />
                    </Table.Cell>
                    <Table.Cell fontSize="xs" p={1}>
                      <Input
                        size="xs"
                        value={(node.data as any)?.volume || ""}
                        onChange={(e) => {
                          const validatedValue = validateNumericInput(
                            e.target.value,
                          )
                          const updatedNodes = nodes.map((n) =>
                            n.id === node.id
                              ? {
                                  ...n,
                                  data: { ...n.data, volume: validatedValue },
                                }
                              : n,
                          )
                          setNodes(updatedNodes)
                        }}
                        onBlur={(e) => {
                          updateNodeParameter(node.id, "volume", e.target.value)
                        }}
                        variant="flushed"
                        fontSize="xs"
                        placeholder="-"
                        border="none"
                      />
                    </Table.Cell>
                    {paramKeys.map((key) => (
                      <Table.Cell key={key} fontSize="xs" p={1}>
                        <Input
                          size="xs"
                          value={(node.data as any)?.[key] || ""}
                          onChange={(e) => {
                            const validatedValue = validateNumericInput(
                              e.target.value,
                            )
                            const updatedNodes = nodes.map((n) =>
                              n.id === node.id
                                ? {
                                    ...n,
                                    data: { ...n.data, [key]: validatedValue },
                                  }
                                : n,
                            )
                            setNodes(updatedNodes)
                          }}
                          onBlur={(e) => {
                            updateNodeParameter(node.id, key, e.target.value)
                          }}
                          variant="flushed"
                          fontSize="xs"
                          placeholder="-"
                          border="none"
                        />
                      </Table.Cell>
                    ))}
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          )
        })()
      ) : (
        <Text fontSize="sm" color="gray.500">
          {t("flow.dataPanel.empty")}
        </Text>
      )}
    </Box>
  )
}

export default DataPanel
