import {
  Badge,
  Box,
  Button,
  Container,
  Flex,
  Heading,
  HStack,
  Input,
  Table,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react"
import { useQuery } from "@tanstack/react-query"
import type { UDMFlowChartPublic } from "@/client/types.gen"
import { type ClipboardEvent, useEffect, useMemo, useRef, useState } from "react"

import type {
  UDMModelCreate,
  UDMModelDefinitionDraft,
  UDMModelDetailPublic,
  UDMModelUpdate,
  UDMParameterDefinition,
  UDMValidationResponse,
} from "@/client/types.gen"
import useCustomToast from "@/hooks/useCustomToast"
import { getDefaultCalculationParams } from "../../config/simulationConfig"
import { udmService } from "../../services/udmService"
import { useUDMFlowStore } from "../../stores/udmFlowStore"

type ComponentRow = {
  name: string
  label: string
  unit: string
  defaultValue: string
}

type ParameterRow = {
  name: string
  unit: string
  defaultValue: string
  minValue: string
  maxValue: string
  scale: "lin" | "log"
  note: string
}

type ProcessRow = {
  name: string
  rateExpr: string
  note: string
  stoich: Record<string, string>
}

interface UDMModelEditorFormProps {
  modelId?: string
  onModelIdChange?: (modelId: string) => void
  onModelSaved?: (model: UDMModelDetailPublic) => void
  onBack?: () => void
  onGeneratedFlowchart?: (payload: {
    savedModel: UDMModelDetailPublic
    flowData: Record<string, unknown>
    flowchart: UDMFlowChartPublic
  }) => void
  headingText?: string
  descriptionText?: string
  hideBackButton?: boolean
  containerMaxW?: string
}

const parseNumOrNull = (value: string): number | null => {
  const v = Number.parseFloat(value)
  return Number.isFinite(v) ? v : null
}

const emptyComponent = (): ComponentRow => ({
  name: "",
  label: "",
  unit: "",
  defaultValue: "0",
})

const emptyParameter = (): ParameterRow => ({
  name: "",
  unit: "",
  defaultValue: "1",
  minValue: "0.1",
  maxValue: "10",
  scale: "lin",
  note: "",
})

const emptyProcess = (): ProcessRow => ({
  name: "",
  rateExpr: "",
  note: "",
  stoich: {},
})

type ValidationIssue = NonNullable<UDMValidationResponse["errors"]>[number]

const buildFormSignature = (payload: {
  name: string
  description: string
  tagsText: string
  componentRows: ComponentRow[]
  processRows: ProcessRow[]
  parameterRows: ParameterRow[]
}) => JSON.stringify(payload)

const INITIAL_FORM_SIGNATURE = buildFormSignature({
  name: "",
  description: "",
  tagsText: "",
  componentRows: [emptyComponent()],
  processRows: [emptyProcess()],
  parameterRows: [],
})

export function UDMModelEditorForm({
  modelId,
  onModelIdChange,
  onModelSaved,
  onBack,
  onGeneratedFlowchart,
  headingText = "UDM 模型编辑器",
  descriptionText = "在此维护 Petersen 矩阵、速率表达式、参数范围，并一键生成默认画布。",
  hideBackButton = false,
  containerMaxW = "full",
}: UDMModelEditorFormProps) {
  const { showErrorToast, showSuccessToast, showWarningToast } = useCustomToast()

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [tagsText, setTagsText] = useState("")
  const [componentRows, setComponentRows] = useState<ComponentRow[]>([
    emptyComponent(),
  ])
  const [processRows, setProcessRows] = useState<ProcessRow[]>([emptyProcess()])
  const [parameterRows, setParameterRows] = useState<ParameterRow[]>([])
  const [validation, setValidation] = useState<UDMValidationResponse | null>(
    null,
  )
  const [isSaving, setIsSaving] = useState(false)
  const [currentModelId, setCurrentModelId] = useState<string | undefined>(
    modelId,
  )
  const [baselineSignature, setBaselineSignature] = useState(
    INITIAL_FORM_SIGNATURE,
  )

  const processNameInputRefs = useRef<Record<number, HTMLInputElement | null>>(
    {},
  )
  const stoichInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  useEffect(() => {
    setCurrentModelId(modelId)
  }, [modelId])

  const detailQuery = useQuery({
    queryKey: ["udm-model-detail", currentModelId],
    queryFn: () => udmService.getModel(currentModelId!),
    enabled: !!currentModelId,
  })

  useEffect(() => {
    const detail = detailQuery.data
    if (!detail) return

    const loadedName = detail.name || ""
    const loadedDescription = detail.description || ""
    const loadedTagsText = (detail.tags || []).join(", ")

    setName(loadedName)
    setDescription(loadedDescription)
    setTagsText(loadedTagsText)

    const latest = detail.latest_version
    if (!latest) return

    const loadedComponents: ComponentRow[] = (latest.components || [])
      .map((item: any) => {
        const compName = String(item?.name || "").trim()
        if (!compName) return null
        return {
          name: compName,
          label: String(item?.label || compName),
          unit: String(item?.unit || ""),
          defaultValue: String(
            item?.default_value ?? item?.defaultValue ?? "0",
          ),
        }
      })
      .filter((item): item is ComponentRow => !!item)

    const nextComponentRows = loadedComponents.length
      ? loadedComponents
      : [emptyComponent()]
    setComponentRows(nextComponentRows)

    const loadedProcesses: ProcessRow[] = (latest.processes || [])
      .map((item: any) => ({
        name: String(item?.name || ""),
        rateExpr: String(item?.rate_expr ?? item?.rateExpr ?? ""),
        note: String(item?.note || ""),
        stoich: Object.fromEntries(
          Object.entries(
            ((item?.stoich_expr || item?.stoichExpr || item?.stoich || {}) as Record<
              string,
              unknown
            >),
          ).map(([k, v]) => [k, String(v)]),
        ),
      }))
      .filter((item: ProcessRow) => item.name || item.rateExpr || item.note)

    const nextProcessRows = loadedProcesses.length
      ? loadedProcesses
      : [emptyProcess()]
    setProcessRows(nextProcessRows)

    const loadedParameters: ParameterRow[] = (latest.parameters || [])
      .map((item: any) => {
        const paramName = String(item?.name || "").trim()
        if (!paramName) return null
        return {
          name: paramName,
          unit: String(item?.unit || ""),
          defaultValue: String(
            item?.default_value ?? item?.defaultValue ?? "1",
          ),
          minValue: String(item?.min_value ?? item?.minValue ?? "0.1"),
          maxValue: String(item?.max_value ?? item?.maxValue ?? "10"),
          scale: item?.scale === "log" ? "log" : "lin",
          note: String(item?.note || ""),
        }
      })
      .filter((item): item is ParameterRow => !!item)

    setParameterRows(loadedParameters)
    setBaselineSignature(
      buildFormSignature({
        name: loadedName,
        description: loadedDescription,
        tagsText: loadedTagsText,
        componentRows: nextComponentRows,
        processRows: nextProcessRows,
        parameterRows: loadedParameters,
      }),
    )
  }, [detailQuery.data])

  const componentNames = useMemo(
    () => componentRows.map((row) => row.name.trim()).filter(Boolean),
    [componentRows],
  )

  const currentSignature = useMemo(
    () =>
      buildFormSignature({
        name,
        description,
        tagsText,
        componentRows,
        processRows,
        parameterRows,
      }),
    [
      name,
      description,
      tagsText,
      componentRows,
      processRows,
      parameterRows,
    ],
  )
  const isDirty = currentSignature !== baselineSignature

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) return
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [isDirty])

  const buildDraft = (): UDMModelDefinitionDraft => {
    const normalizedComponents = componentRows
      .map((row) => {
        const compName = row.name.trim()
        if (!compName) return null
        return {
          name: compName,
          label: row.label.trim() || compName,
          unit: row.unit.trim() || null,
          default_value: parseNumOrNull(row.defaultValue) ?? 0,
        }
      })
      .filter((item): item is NonNullable<typeof item> => !!item)

    const normalizedProcesses = processRows
      .map((row) => {
        const processName = row.name.trim()
        const rateExpr = row.rateExpr.trim()
        if (!processName && !rateExpr) return null
        const stoichExpr: Record<string, string> = {}
        const stoich: Record<string, number> = {}
        componentNames.forEach((compName) => {
          const raw = (row.stoich[compName] || "0").trim()
          stoichExpr[compName] = raw || "0"
          const num = Number.parseFloat(raw)
          const isNumeric =
            raw.length > 0 &&
            /^[-+]?\\d*\\.?\\d+(?:[eE][-+]?\\d+)?$/.test(raw)
          stoich[compName] = isNumeric && Number.isFinite(num) ? num : 0
        })
        return {
          name: processName || "unnamed_process",
          rate_expr: rateExpr,
          stoich,
          stoich_expr: stoichExpr,
          note: row.note.trim() || null,
        }
      })
      .filter((item): item is NonNullable<typeof item> => !!item)

    const normalizedParameters = parameterRows
      .map((row) => {
        const paramName = row.name.trim()
        if (!paramName) return null
        return {
          name: paramName,
          unit: row.unit.trim() || null,
          default_value: parseNumOrNull(row.defaultValue),
          min_value: parseNumOrNull(row.minValue),
          max_value: parseNumOrNull(row.maxValue),
          scale: row.scale,
          note: row.note.trim() || null,
        }
      })
      .filter((item): item is NonNullable<typeof item> => !!item)

    return {
      name: name.trim() || "Unnamed UDM Model",
      description: description.trim() || null,
      tags: tagsText
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      components: normalizedComponents,
      parameters: normalizedParameters as UDMParameterDefinition[],
      processes: normalizedProcesses,
      meta: {
        source: "manual",
      },
    }
  }

  const validateParameterRanges = (): string[] => {
    const errors: string[] = []
    parameterRows.forEach((row) => {
      const paramName = row.name.trim()
      if (!paramName) return
      const defaultV = parseNumOrNull(row.defaultValue)
      const minV = parseNumOrNull(row.minValue)
      const maxV = parseNumOrNull(row.maxValue)
      if (minV !== null && maxV !== null && minV >= maxV) {
        errors.push(`${paramName}: min must be smaller than max`)
      }
      if (
        minV !== null &&
        maxV !== null &&
        defaultV !== null &&
        !(minV < defaultV && defaultV < maxV)
      ) {
        errors.push(`${paramName}: require min < default < max`)
      }
      if (row.scale === "log" && minV !== null && minV <= 0) {
        errors.push(`${paramName}: min must be > 0 for log scale`)
      }
    })
    return errors
  }

  const runValidate = async () => {
    try {
      const draft = buildDraft()
      const result = await udmService.validateModelDefinition(draft)
      setValidation(result)
      if (result.ok) {
        showSuccessToast("模型定义校验通过")
      } else {
        showWarningToast("模型定义存在问题，请修正后再保存")
      }
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : "校验失败")
    }
  }

  const mergeExtractedParameters = () => {
    const extracted = validation?.extracted_parameters || []
    if (extracted.length === 0) {
      showWarningToast("当前没有可应用的抽取参数")
      return
    }
    const existing = new Map(parameterRows.map((row) => [row.name, row]))
    extracted.forEach((paramName) => {
      if (!existing.has(paramName)) {
        existing.set(paramName, {
          ...emptyParameter(),
          name: paramName,
        })
      }
    })
    setParameterRows(Array.from(existing.values()))
    showSuccessToast("已按抽取结果补齐参数表")
  }

  const saveModel = async (): Promise<UDMModelDetailPublic | null> => {
    const rangeErrors = validateParameterRanges()
    if (rangeErrors.length > 0) {
      showErrorToast(rangeErrors[0])
      return null
    }

    const draft = buildDraft()
    if (!draft.name.trim()) {
      showErrorToast("模型名称不能为空")
      return null
    }

    setIsSaving(true)
    try {
      let saved: UDMModelDetailPublic
      if (currentModelId) {
        const updatePayload: UDMModelUpdate = {
          name: draft.name,
          description: draft.description,
          tags: draft.tags,
          components: draft.components,
          parameters: draft.parameters,
          processes: draft.processes,
          meta: draft.meta,
        }
        saved = await udmService.updateModel(currentModelId, updatePayload)
      } else {
        const createPayload: UDMModelCreate = {
          ...draft,
          seed_source: null,
        }
        saved = await udmService.createModel(createPayload)
        setCurrentModelId(saved.id)
        onModelIdChange?.(saved.id)
      }
      showSuccessToast("模型保存成功")
      onModelSaved?.(saved)
      setBaselineSignature(currentSignature)
      return saved
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : "模型保存失败")
      return null
    } finally {
      setIsSaving(false)
    }
  }

  const buildDefaultFlowData = (model: UDMModelDetailPublic) => {
    const latest = model.latest_version
    if (!latest) {
      throw new Error("模型没有版本数据，无法生成画布")
    }

    const components = (latest.components || []) as Array<Record<string, any>>
    const parameters = (latest.parameters || []) as Array<Record<string, any>>
    const processes = (latest.processes || []) as Array<Record<string, any>>

    const customParameters = components
      .map((item) => {
        const compName = String(item.name || "").trim()
        if (!compName) return null
        const defaultValue = Number.parseFloat(
          String(item.default_value ?? item.defaultValue ?? "0"),
        )
        return {
          name: compName,
          label: String(item.label || compName),
          description: item.unit ? `Unit: ${String(item.unit)}` : undefined,
          defaultValue: Number.isFinite(defaultValue) ? defaultValue : 0,
        }
      })
      .filter((item): item is NonNullable<typeof item> => !!item)

    const parameterValues: Record<string, number> = {}
    parameters.forEach((param) => {
      const paramName = String(param.name || "").trim()
      if (!paramName) return
      const value = Number.parseFloat(
        String(param.default_value ?? param.defaultValue ?? "0"),
      )
      parameterValues[paramName] = Number.isFinite(value) ? value : 0
    })

    const buildNodeData = (label: string) => {
      const base: Record<string, unknown> = {
        label,
        volume: "1e-3",
      }
      customParameters.forEach((p) => {
        base[p.name] = String(p.defaultValue ?? 0)
      })
      return base
    }

    const edgeParamConfig = Object.fromEntries(
      customParameters.map((param) => [param.name, { a: 1, b: 0 }]),
    )

    const edgeData = Object.fromEntries(
      customParameters.flatMap((param) => [
        [`${param.name}_a`, 1],
        [`${param.name}_b`, 0],
      ]),
    )

    const calculationParameters = getDefaultCalculationParams("udm")
    const modelSnapshot = {
      id: model.id,
      name: model.name,
      version: model.current_version,
      hash: latest.content_hash,
      components,
      parameters,
      processes,
      meta: latest.meta || {},
    }

    return {
      nodes: [
        {
          id: "udm-input-1",
          type: "input",
          position: { x: 40, y: 220 },
          data: buildNodeData("Influent"),
        },
        {
          id: "udm-reactor-1",
          type: "udm",
          position: { x: 360, y: 220 },
          data: {
            ...buildNodeData("UDM Reactor"),
            udmModel: {
              id: model.id,
              name: model.name,
              version: model.current_version,
              hash: latest.content_hash,
              components,
              parameters,
              processes,
              parameterValues,
            },
            udmModelSnapshot: modelSnapshot,
            udmComponents: components,
            udmComponentNames: customParameters.map((p) => p.name),
            udmProcesses: processes,
            udmParameters: parameterValues,
            udmParameterValues: parameterValues,
            udmModelId: model.id,
            udmModelVersion: model.current_version,
            udmModelHash: latest.content_hash,
          },
        },
        {
          id: "udm-output-1",
          type: "output",
          position: { x: 690, y: 220 },
          data: buildNodeData("Effluent"),
        },
      ],
      edges: [
        {
          id: "udm-edge-1",
          source: "udm-input-1",
          target: "udm-reactor-1",
          type: "editable",
          data: {
            flow: 1000,
            ...edgeData,
          },
        },
        {
          id: "udm-edge-2",
          source: "udm-reactor-1",
          target: "udm-output-1",
          type: "editable",
          data: {
            flow: 1000,
            ...edgeData,
          },
        },
      ],
      edgeParameterConfigs: {
        "udm-edge-1": edgeParamConfig,
        "udm-edge-2": edgeParamConfig,
      },
      customParameters,
      calculationParameters,
      exportedAt: new Date().toISOString(),
      version: "1.0",
    }
  }

  const saveAndGenerateFlowchart = async () => {
    const savedModel = await saveModel()
    if (!savedModel) return

    try {
      const flowData = buildDefaultFlowData(savedModel)
      const flowName = `${savedModel.name}-default-flow`
      const createdFlowchart = await udmService.createFlowchart({
        name: flowName,
        description: "Auto generated from UDM model editor",
        flow_data: flowData,
      })

      const flowStore = useUDMFlowStore.getState()
      flowStore.newFlowChart()
      const importResult = flowStore.importFlowData(flowData)
      if (!importResult.success) {
        throw new Error(importResult.message)
      }
      flowStore.setCurrentFlowChartId(createdFlowchart.id)
      flowStore.setCurrentFlowChartName(createdFlowchart.name)

      showSuccessToast("已生成并应用默认画布")
      onGeneratedFlowchart?.({
        savedModel,
        flowData: flowData as Record<string, unknown>,
        flowchart: createdFlowchart,
      })
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : "生成画布失败")
    }
  }

  const setComponentName = (index: number, newName: string) => {
    const oldName = componentRows[index]?.name || ""
    setComponentRows((prev) =>
      prev.map((row, idx) => (idx === index ? { ...row, name: newName } : row)),
    )
    if (!oldName || oldName === newName) return
    setProcessRows((prev) =>
      prev.map((processRow) => {
        const nextStoich = { ...processRow.stoich }
        if (Object.prototype.hasOwnProperty.call(nextStoich, oldName)) {
          nextStoich[newName] = nextStoich[oldName]
          delete nextStoich[oldName]
        }
        return { ...processRow, stoich: nextStoich }
      }),
    )
  }

  const removeComponent = (index: number) => {
    const removed = componentRows[index]?.name
    setComponentRows((prev) => prev.filter((_, idx) => idx !== index))
    if (!removed) return
    setProcessRows((prev) =>
      prev.map((row) => {
        const stoich = { ...row.stoich }
        delete stoich[removed]
        return { ...row, stoich }
      }),
    )
  }

  const resolveProcessIndex = (issue: ValidationIssue): number => {
    if (issue.process) {
      const byName = processRows.findIndex(
        (row) => row.name.trim() === issue.process?.trim(),
      )
      if (byName >= 0) return byName

      const match = issue.process.match(/process_(\d+)/i)
      if (match) {
        const idx = Number.parseInt(match[1], 10) - 1
        if (idx >= 0 && idx < processRows.length) return idx
      }
    }
    return -1
  }

  const resolveComponentNameFromMessage = (message: string): string | null => {
    const match = message.match(/组分\s*([^\s的，,:]+)/)
    return match?.[1] || null
  }

  const jumpToIssue = (issue: ValidationIssue) => {
    const processIndex = resolveProcessIndex(issue)
    if (processIndex < 0) return

    const componentName = resolveComponentNameFromMessage(issue.message || "")
    if (componentName) {
      const stoichKey = `${processIndex}:${componentName}`
      const targetInput = stoichInputRefs.current[stoichKey]
      if (targetInput) {
        targetInput.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "center",
        })
        targetInput.focus()
        targetInput.select()
        return
      }
    }

    const processInput = processNameInputRefs.current[processIndex]
    if (processInput) {
      processInput.scrollIntoView({ behavior: "smooth", block: "center" })
      processInput.focus()
      processInput.select()
    }
  }

  const handleStoichPaste = (
    event: ClipboardEvent<HTMLInputElement>,
    rowIndex: number,
    componentName: string,
  ) => {
    const text = event.clipboardData.getData("text")
    if (!text) return

    const startCol = componentNames.indexOf(componentName)
    if (startCol < 0) return

    const parsedRows = text
      .replace(/\r/g, "")
      .split("\n")
      .filter((row) => row.length > 0)
      .map((row) => row.split(/\t|,/).map((cell) => cell.trim()))

    if (parsedRows.length === 0) return

    event.preventDefault()
    setProcessRows((prev) => {
      const next = [...prev]

      while (next.length < rowIndex + parsedRows.length) {
        next.push(emptyProcess())
      }

      parsedRows.forEach((rowCells, rOffset) => {
        const targetRowIndex = rowIndex + rOffset
        const baseRow = next[targetRowIndex] || emptyProcess()
        const nextStoich = { ...baseRow.stoich }

        rowCells.forEach((cellValue, cOffset) => {
          const targetColIndex = startCol + cOffset
          if (targetColIndex < 0 || targetColIndex >= componentNames.length) {
            return
          }
          const targetCompName = componentNames[targetColIndex]
          nextStoich[targetCompName] = cellValue
        })

        next[targetRowIndex] = {
          ...baseRow,
          stoich: nextStoich,
        }
      })

      return next
    })
  }

  const handleBackClick = () => {
    if (!onBack) return
    if (!isDirty) {
      onBack()
      return
    }
    const confirmed = window.confirm("存在未保存改动，确认离开当前页面吗？")
    if (confirmed) {
      onBack()
    }
  }

  return (
    <Container maxW={containerMaxW} pb={10}>
      {headingText ? (
        <Heading size="lg" pt={12}>
          {headingText}
        </Heading>
      ) : null}
      {descriptionText ? (
        <Text mt={2} color="gray.600">
          {descriptionText}
        </Text>
      ) : null}

      {detailQuery.isLoading && currentModelId ? (
        <Text mt={4} color="gray.500">
          模型加载中...
        </Text>
      ) : null}

      <Box mt={6} borderWidth="1px" borderRadius="md" p={4}>
        <Heading size="sm" mb={3}>
          模型基础信息
        </Heading>
        <VStack align="stretch" gap={3}>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="模型名称"
          />
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="模型描述"
            rows={3}
          />
          <Input
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            placeholder="标签，逗号分隔"
          />
        </VStack>
      </Box>

      <Box mt={6} borderWidth="1px" borderRadius="md" p={4}>
        <Flex align="center" justify="space-between" mb={3}>
          <Heading size="sm">Components（列）</Heading>
          <Button size="sm" onClick={() => setComponentRows((prev) => [...prev, emptyComponent()])}>
            新增 Component
          </Button>
        </Flex>
        <Table.Root size="sm">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>name</Table.ColumnHeader>
              <Table.ColumnHeader>label</Table.ColumnHeader>
              <Table.ColumnHeader>unit</Table.ColumnHeader>
              <Table.ColumnHeader>default</Table.ColumnHeader>
              <Table.ColumnHeader>操作</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {componentRows.map((row, index) => (
              <Table.Row key={`component-${index}`}>
                <Table.Cell>
                  <Input
                    size="sm"
                    value={row.name}
                    onChange={(e) => setComponentName(index, e.target.value)}
                  />
                </Table.Cell>
                <Table.Cell>
                  <Input
                    size="sm"
                    value={row.label}
                    onChange={(e) =>
                      setComponentRows((prev) =>
                        prev.map((item, idx) =>
                          idx === index ? { ...item, label: e.target.value } : item,
                        ),
                      )
                    }
                  />
                </Table.Cell>
                <Table.Cell>
                  <Input
                    size="sm"
                    value={row.unit}
                    onChange={(e) =>
                      setComponentRows((prev) =>
                        prev.map((item, idx) =>
                          idx === index ? { ...item, unit: e.target.value } : item,
                        ),
                      )
                    }
                  />
                </Table.Cell>
                <Table.Cell>
                  <Input
                    size="sm"
                    type="number"
                    value={row.defaultValue}
                    onChange={(e) =>
                      setComponentRows((prev) =>
                        prev.map((item, idx) =>
                          idx === index
                            ? { ...item, defaultValue: e.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                </Table.Cell>
                <Table.Cell>
                  <Button
                    size="xs"
                    variant="subtle"
                    colorPalette="red"
                    onClick={() => removeComponent(index)}
                    disabled={componentRows.length <= 1}
                  >
                    删除
                  </Button>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Box>

      <Box
        mt={6}
        borderWidth="1px"
        borderRadius="md"
        p={4}
        overflow="auto"
        maxH="520px"
      >
        <Flex align="center" justify="space-between" mb={3}>
          <Heading size="sm">Processes（行）+ Stoich + rateExpr</Heading>
          <HStack>
            <Button
              size="sm"
              variant="subtle"
              onClick={() =>
                setProcessRows((prev) =>
                  prev.map((row) => ({
                    ...row,
                    stoich: Object.fromEntries(
                      componentNames.map((compName) => [compName, "0"]),
                    ),
                  })),
                )
              }
            >
              Stoich 全部清零
            </Button>
            <Button
              size="sm"
              onClick={() => setProcessRows((prev) => [...prev, emptyProcess()])}
            >
              新增 Process
            </Button>
          </HStack>
        </Flex>
        <Table.Root size="sm" style={{ tableLayout: "fixed" }}>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader
                minW="160px"
                position="sticky"
                top={0}
                left={0}
                zIndex={4}
                bg="white"
              >
                process name
              </Table.ColumnHeader>
              <Table.ColumnHeader
                minW="260px"
                position="sticky"
                top={0}
                left="160px"
                zIndex={4}
                bg="white"
              >
                rateExpr
              </Table.ColumnHeader>
              {componentNames.map((compName) => (
                <Table.ColumnHeader
                  key={`stoich-header-${compName}`}
                  minW="120px"
                  position="sticky"
                  top={0}
                  zIndex={3}
                  bg="white"
                >
                  {compName}
                </Table.ColumnHeader>
              ))}
              <Table.ColumnHeader
                minW="160px"
                position="sticky"
                top={0}
                zIndex={3}
                bg="white"
              >
                note
              </Table.ColumnHeader>
              <Table.ColumnHeader
                minW="80px"
                position="sticky"
                top={0}
                zIndex={3}
                bg="white"
              >
                操作
              </Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {processRows.map((row, rowIndex) => (
              <Table.Row key={`process-${rowIndex}`}>
                <Table.Cell
                  minW="160px"
                  position="sticky"
                  left={0}
                  zIndex={2}
                  bg="white"
                >
                  <Input
                    size="sm"
                    value={row.name}
                    ref={(el) => {
                      processNameInputRefs.current[rowIndex] = el
                    }}
                    onChange={(e) =>
                      setProcessRows((prev) =>
                        prev.map((item, idx) =>
                          idx === rowIndex ? { ...item, name: e.target.value } : item,
                        ),
                      )
                    }
                  />
                </Table.Cell>
                <Table.Cell
                  minW="260px"
                  position="sticky"
                  left="160px"
                  zIndex={2}
                  bg="white"
                >
                  <Input
                    size="sm"
                    value={row.rateExpr}
                    onChange={(e) =>
                      setProcessRows((prev) =>
                        prev.map((item, idx) =>
                          idx === rowIndex
                            ? { ...item, rateExpr: e.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                </Table.Cell>
                {componentNames.map((compName) => (
                  <Table.Cell key={`stoich-cell-${rowIndex}-${compName}`}>
                    <Input
                      size="sm"
                      type="text"
                      value={row.stoich[compName] || "0"}
                      placeholder="e.g. -1, Y_A, 1/Y_H"
                      ref={(el) => {
                        stoichInputRefs.current[`${rowIndex}:${compName}`] = el
                      }}
                      onPaste={(event) =>
                        handleStoichPaste(event, rowIndex, compName)
                      }
                      onChange={(e) =>
                        setProcessRows((prev) =>
                          prev.map((item, idx) =>
                            idx === rowIndex
                              ? {
                                  ...item,
                                  stoich: {
                                    ...item.stoich,
                                    [compName]: e.target.value,
                                  },
                                }
                              : item,
                          ),
                        )
                      }
                    />
                  </Table.Cell>
                ))}
                <Table.Cell>
                  <Input
                    size="sm"
                    value={row.note}
                    onChange={(e) =>
                      setProcessRows((prev) =>
                        prev.map((item, idx) =>
                          idx === rowIndex ? { ...item, note: e.target.value } : item,
                        ),
                      )
                    }
                  />
                </Table.Cell>
                <Table.Cell>
                  <Button
                    size="xs"
                    variant="subtle"
                    colorPalette="red"
                    onClick={() =>
                      setProcessRows((prev) =>
                        prev.length > 1
                          ? prev.filter((_, idx) => idx !== rowIndex)
                          : prev,
                      )
                    }
                    disabled={processRows.length <= 1}
                  >
                    删除
                  </Button>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Box>

      <Box mt={6} borderWidth="1px" borderRadius="md" p={4}>
        <Flex align="center" justify="space-between" mb={3}>
          <Heading size="sm">模型校验与参数抽取</Heading>
          <HStack>
            <Button size="sm" variant="subtle" onClick={runValidate}>
              解析 / 校验
            </Button>
            <Button size="sm" onClick={mergeExtractedParameters}>
              应用抽取参数
            </Button>
          </HStack>
        </Flex>
        {validation ? (
          <VStack align="stretch" gap={2}>
            <HStack>
              <Badge colorPalette={validation.ok ? "green" : "red"}>
                {validation.ok ? "校验通过" : "校验失败"}
              </Badge>
              <Text fontSize="sm">
                extracted: {(validation.extracted_parameters || []).join(", ") || "-"}
              </Text>
            </HStack>
            {(validation.errors || []).map((err, idx) => (
              <Button
                key={`err-${idx}`}
                size="xs"
                variant="ghost"
                justifyContent="flex-start"
                colorPalette="red"
                onClick={() => jumpToIssue(err)}
                title="点击跳转到对应 process / stoich 单元格"
              >
                [{err.code}] {err.message}
                {err.process ? ` (${err.process})` : ""}
              </Button>
            ))}
            {(validation.warnings || []).map((warn, idx) => (
              <Button
                key={`warn-${idx}`}
                size="xs"
                variant="ghost"
                justifyContent="flex-start"
                colorPalette="orange"
                onClick={() => jumpToIssue(warn)}
                title="点击跳转到对应 process / stoich 单元格"
              >
                [{warn.code}] {warn.message}
                {warn.process ? ` (${warn.process})` : ""}
              </Button>
            ))}
          </VStack>
        ) : (
          <Text color="gray.500" fontSize="sm">
            点击“解析 / 校验”后查看错误、警告和抽取参数。
          </Text>
        )}
      </Box>

      <Box mt={6} borderWidth="1px" borderRadius="md" p={4}>
        <Flex align="center" justify="space-between" mb={3}>
          <Heading size="sm">参数范围向导</Heading>
          <Button size="sm" onClick={() => setParameterRows((prev) => [...prev, emptyParameter()])}>
            新增参数
          </Button>
        </Flex>
        <Table.Root size="sm">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>name</Table.ColumnHeader>
              <Table.ColumnHeader>unit</Table.ColumnHeader>
              <Table.ColumnHeader>default</Table.ColumnHeader>
              <Table.ColumnHeader>min</Table.ColumnHeader>
              <Table.ColumnHeader>max</Table.ColumnHeader>
              <Table.ColumnHeader>scale</Table.ColumnHeader>
              <Table.ColumnHeader>note</Table.ColumnHeader>
              <Table.ColumnHeader>操作</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {parameterRows.map((row, rowIndex) => (
              <Table.Row key={`parameter-${rowIndex}`}>
                <Table.Cell>
                  <Input
                    size="sm"
                    value={row.name}
                    onChange={(e) =>
                      setParameterRows((prev) =>
                        prev.map((item, idx) =>
                          idx === rowIndex ? { ...item, name: e.target.value } : item,
                        ),
                      )
                    }
                  />
                </Table.Cell>
                <Table.Cell>
                  <Input
                    size="sm"
                    value={row.unit}
                    onChange={(e) =>
                      setParameterRows((prev) =>
                        prev.map((item, idx) =>
                          idx === rowIndex ? { ...item, unit: e.target.value } : item,
                        ),
                      )
                    }
                  />
                </Table.Cell>
                <Table.Cell>
                  <Input
                    size="sm"
                    type="number"
                    value={row.defaultValue}
                    onChange={(e) =>
                      setParameterRows((prev) =>
                        prev.map((item, idx) =>
                          idx === rowIndex
                            ? { ...item, defaultValue: e.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                </Table.Cell>
                <Table.Cell>
                  <Input
                    size="sm"
                    type="number"
                    value={row.minValue}
                    onChange={(e) =>
                      setParameterRows((prev) =>
                        prev.map((item, idx) =>
                          idx === rowIndex ? { ...item, minValue: e.target.value } : item,
                        ),
                      )
                    }
                  />
                </Table.Cell>
                <Table.Cell>
                  <Input
                    size="sm"
                    type="number"
                    value={row.maxValue}
                    onChange={(e) =>
                      setParameterRows((prev) =>
                        prev.map((item, idx) =>
                          idx === rowIndex ? { ...item, maxValue: e.target.value } : item,
                        ),
                      )
                    }
                  />
                </Table.Cell>
                <Table.Cell>
                  <select
                    value={row.scale}
                    onChange={(e) =>
                      setParameterRows((prev) =>
                        prev.map((item, idx) =>
                          idx === rowIndex
                            ? { ...item, scale: e.target.value as "lin" | "log" }
                            : item,
                        ),
                      )
                    }
                    style={{
                      width: "100%",
                      border: "1px solid #CBD5E0",
                      borderRadius: "6px",
                      padding: "4px 8px",
                      height: "32px",
                    }}
                  >
                    <option value="lin">lin</option>
                    <option value="log">log</option>
                  </select>
                </Table.Cell>
                <Table.Cell>
                  <Input
                    size="sm"
                    value={row.note}
                    onChange={(e) =>
                      setParameterRows((prev) =>
                        prev.map((item, idx) =>
                          idx === rowIndex ? { ...item, note: e.target.value } : item,
                        ),
                      )
                    }
                  />
                </Table.Cell>
                <Table.Cell>
                  <Button
                    size="xs"
                    variant="subtle"
                    colorPalette="red"
                    onClick={() =>
                      setParameterRows((prev) =>
                        prev.filter((_, idx) => idx !== rowIndex),
                      )
                    }
                  >
                    删除
                  </Button>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Box>

      <Flex mt={8} gap={3} wrap="wrap">
        {isDirty ? (
          <Badge colorPalette="orange" variant="subtle" alignSelf="center">
            有未保存变更
          </Badge>
        ) : (
          <Badge colorPalette="green" variant="subtle" alignSelf="center">
            已保存
          </Badge>
        )}
        <Button loading={isSaving} onClick={saveModel}>
          保存模型
        </Button>
        <Button
          colorPalette="blue"
          loading={isSaving}
          onClick={saveAndGenerateFlowchart}
        >
          保存并生成默认画布
        </Button>
        {!hideBackButton ? (
          <Button variant="subtle" onClick={handleBackClick}>
            返回模型库
          </Button>
        ) : null}
      </Flex>
    </Container>
  )
}

export default UDMModelEditorForm
