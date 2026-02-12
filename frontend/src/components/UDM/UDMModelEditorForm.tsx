import {
  Badge,
  Box,
  Button,
  Container,
  Flex,
  Heading,
  HStack,
  Input,
  Switch,
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
import { useI18n } from "@/i18n"
import { getDefaultCalculationParams } from "../../config/simulationConfig"
import { udmService } from "../../services/udmService"
import { useUDMFlowStore } from "../../stores/udmFlowStore"
import ExpressionCellEditorDialog from "./ExpressionCellEditorDialog"

type ComponentRow = {
  name: string
  label: string
  unit: string
  defaultValue: string
  isFixed: boolean
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

type ProcessEditorTarget =
  | {
      cellType: "rateExpr"
      rowIndex: number
    }
  | {
      cellType: "stoich"
      rowIndex: number
      componentName: string
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
  isFixed: false,
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

const PROCESS_NAME_COL_W = "180px"
const RATE_EXPR_COL_W = "320px"
const STOICH_COL_MIN_W = "140px"
const NOTE_COL_W = "180px"
const ACTION_COL_W = "96px"

export function UDMModelEditorForm({
  modelId,
  onModelIdChange,
  onModelSaved,
  onBack,
  onGeneratedFlowchart,
  headingText,
  descriptionText,
  hideBackButton = false,
  containerMaxW = "full",
}: UDMModelEditorFormProps) {
  const { t } = useI18n()
  const { showErrorToast, showSuccessToast, showWarningToast } = useCustomToast()

  const resolvedHeadingText =
    headingText ?? t("flow.udmEditor.form.headingDefault")
  const resolvedDescriptionText =
    descriptionText ?? t("flow.udmEditor.form.descriptionDefault")

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
  const [editorTarget, setEditorTarget] = useState<ProcessEditorTarget | null>(
    null,
  )

  const processNameInputRefs = useRef<Record<number, HTMLInputElement | null>>(
    {},
  )
  const stoichInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const rateExprInputRefs = useRef<Record<number, HTMLInputElement | null>>({})

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
          isFixed: Boolean(item?.is_fixed ?? item?.isFixed ?? false),
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
  const parameterNames = useMemo(
    () => parameterRows.map((row) => row.name.trim()).filter(Boolean),
    [parameterRows],
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

  useEffect(() => {
    if (!editorTarget) return
    if (editorTarget.rowIndex >= processRows.length) {
      setEditorTarget(null)
      return
    }
    if (
      editorTarget.cellType === "stoich" &&
      !componentNames.includes(editorTarget.componentName)
    ) {
      setEditorTarget(null)
    }
  }, [editorTarget, processRows.length, componentNames])

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
          is_fixed: row.isFixed,
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
        errors.push(
          t("flow.udmEditor.form.rangeErrors.minLessThanMax", {
            name: paramName,
          }),
        )
      }
      if (
        minV !== null &&
        maxV !== null &&
        defaultV !== null &&
        !(minV < defaultV && defaultV < maxV)
      ) {
        errors.push(
          t("flow.udmEditor.form.rangeErrors.minDefaultMaxOrder", {
            name: paramName,
          }),
        )
      }
      if (row.scale === "log" && minV !== null && minV <= 0) {
        errors.push(
          t("flow.udmEditor.form.rangeErrors.logScaleMinPositive", {
            name: paramName,
          }),
        )
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
        showSuccessToast(t("flow.udmEditor.validation.toast.validationPassed"))
      } else {
        showWarningToast(t("flow.udmEditor.validation.toast.validationHasIssues"))
      }
    } catch (error) {
      showErrorToast(
        error instanceof Error
          ? error.message
          : t("flow.udmEditor.validation.toast.validationFailed"),
      )
    }
  }

  const mergeExtractedParameters = () => {
    const extracted = validation?.extracted_parameters || []
    if (extracted.length === 0) {
      showWarningToast(t("flow.udmEditor.validation.toast.noExtractedParameters"))
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
    showSuccessToast(t("flow.udmEditor.validation.toast.parametersMerged"))
  }

  const saveModel = async (): Promise<UDMModelDetailPublic | null> => {
    const rangeErrors = validateParameterRanges()
    if (rangeErrors.length > 0) {
      showErrorToast(rangeErrors[0])
      return null
    }

    const draft = buildDraft()
    if (!draft.name.trim()) {
      showErrorToast(t("flow.udmEditor.form.toast.modelNameRequired"))
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
      showSuccessToast(t("flow.udmEditor.form.toast.saveSuccess"))
      onModelSaved?.(saved)
      setBaselineSignature(currentSignature)
      return saved
    } catch (error) {
      showErrorToast(
        error instanceof Error
          ? error.message
          : t("flow.udmEditor.form.toast.saveFailed"),
      )
      return null
    } finally {
      setIsSaving(false)
    }
  }

  const buildDefaultFlowData = (model: UDMModelDetailPublic) => {
    const latest = model.latest_version
    if (!latest) {
      throw new Error(t("flow.udmEditor.form.toast.missingVersionForFlow"))
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
        description: t("flow.udmEditor.form.flowchart.autoDescription"),
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

      showSuccessToast(t("flow.udmEditor.form.toast.generateFlowSuccess"))
      onGeneratedFlowchart?.({
        savedModel,
        flowData: flowData as Record<string, unknown>,
        flowchart: createdFlowchart,
      })
    } catch (error) {
      showErrorToast(
        error instanceof Error
          ? error.message
          : t("flow.udmEditor.form.toast.generateFlowFailed"),
      )
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

  const openRateExprEditor = (rowIndex: number) => {
    setEditorTarget({
      cellType: "rateExpr",
      rowIndex,
    })
  }

  const openStoichEditor = (rowIndex: number, componentName: string) => {
    setEditorTarget({
      cellType: "stoich",
      rowIndex,
      componentName,
    })
  }

  const closeEditor = () => {
    setEditorTarget(null)
  }

  const saveEditorValue = (nextValue: string) => {
    if (!editorTarget) return
    setProcessRows((prev) =>
      prev.map((item, idx) => {
        if (idx !== editorTarget.rowIndex) return item
        if (editorTarget.cellType === "rateExpr") {
          return { ...item, rateExpr: nextValue }
        }
        return {
          ...item,
          stoich: {
            ...item.stoich,
            [editorTarget.componentName]: nextValue,
          },
        }
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
    const zhMatch = message.match(/组分\s*([^\s的，,:]+)/)
    if (zhMatch?.[1]) return zhMatch[1]
    const enMatch = message.match(/component\s+([A-Za-z_][A-Za-z0-9_]*)/i)
    return enMatch?.[1] || null
  }

  const jumpToIssue = (issue: ValidationIssue) => {
    const processIndex = resolveProcessIndex(issue)
    if (processIndex < 0) return

    const componentName = resolveComponentNameFromMessage(issue.message || "")
    if (componentName) {
      const stoichKey = `${processIndex}:${componentName}`
      const targetCell = stoichInputRefs.current[stoichKey]
      if (targetCell) {
        targetCell.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "center",
        })
        targetCell.focus()
        openStoichEditor(processIndex, componentName)
        return
      }
    }

    if (!componentName && issue.code.startsWith("STOICH_") && componentNames[0]) {
      const fallbackComponent = componentNames[0]
      const fallbackCell = stoichInputRefs.current[
        `${processIndex}:${fallbackComponent}`
      ]
      if (fallbackCell) {
        fallbackCell.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "center",
        })
        fallbackCell.focus()
      }
      openStoichEditor(processIndex, fallbackComponent)
      return
    }

    if (issue.code !== "DUPLICATE_PROCESS") {
      const rateExprInput = rateExprInputRefs.current[processIndex]
      if (rateExprInput) {
        rateExprInput.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "center",
        })
        rateExprInput.focus()
        openRateExprEditor(processIndex)
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
    const confirmed = window.confirm(
      t("flow.udmEditor.form.confirm.unsavedChangesLeave"),
    )
    if (confirmed) {
      onBack()
    }
  }

  const editorInitialValue = useMemo(() => {
    if (!editorTarget) return ""
    const currentRow = processRows[editorTarget.rowIndex]
    if (!currentRow) return ""
    if (editorTarget.cellType === "rateExpr") {
      return currentRow.rateExpr || ""
    }
    return currentRow.stoich[editorTarget.componentName] || "0"
  }, [editorTarget, processRows])

  const editorProcessName = useMemo(() => {
    if (!editorTarget) return ""
    return processRows[editorTarget.rowIndex]?.name || ""
  }, [editorTarget, processRows])

  return (
    <Container maxW={containerMaxW} pb={10}>
      {resolvedHeadingText ? (
        <Heading size="lg" pt={12}>
          {resolvedHeadingText}
        </Heading>
      ) : null}
      {resolvedDescriptionText ? (
        <Text mt={2} color="gray.600">
          {resolvedDescriptionText}
        </Text>
      ) : null}

      {detailQuery.isLoading && currentModelId ? (
        <Text mt={4} color="gray.500">
          {t("flow.udmEditor.form.loading")}
        </Text>
      ) : null}

      <Box mt={6} borderWidth="1px" borderRadius="md" p={4}>
        <Heading size="sm" mb={3}>
          {t("flow.udmEditor.form.sections.basicInfo")}
        </Heading>
        <VStack align="stretch" gap={3}>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("flow.udmEditor.form.placeholders.modelName")}
          />
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("flow.udmEditor.form.placeholders.modelDescription")}
            rows={3}
          />
          <Input
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            placeholder={t("flow.udmEditor.form.placeholders.tags")}
          />
        </VStack>
      </Box>

      <Box mt={6} borderWidth="1px" borderRadius="md" p={4}>
        <Flex align="center" justify="space-between" mb={3}>
          <Heading size="sm">{t("flow.udmEditor.form.sections.components")}</Heading>
          <Button size="sm" onClick={() => setComponentRows((prev) => [...prev, emptyComponent()])}>
            {t("flow.udmEditor.form.actions.addComponent")}
          </Button>
        </Flex>
        <Table.Root size="sm">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>{t("flow.udmEditor.form.columns.name")}</Table.ColumnHeader>
              <Table.ColumnHeader>{t("flow.udmEditor.form.columns.label")}</Table.ColumnHeader>
              <Table.ColumnHeader>{t("flow.udmEditor.form.columns.unit")}</Table.ColumnHeader>
              <Table.ColumnHeader>{t("flow.udmEditor.form.columns.defaultValue")}</Table.ColumnHeader>
              <Table.ColumnHeader>{t("flow.udmEditor.form.columns.allowChange")}</Table.ColumnHeader>
              <Table.ColumnHeader>{t("flow.udmEditor.form.columns.actions")}</Table.ColumnHeader>
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
                  <Switch.Root
                    checked={!row.isFixed}
                    onCheckedChange={(details) =>
                      setComponentRows((prev) =>
                        prev.map((item, idx) =>
                          idx === index ? { ...item, isFixed: !details.checked } : item,
                        ),
                      )
                    }
                  >
                    <Switch.HiddenInput
                      aria-label={t("flow.udmEditor.form.aria.allowChange", {
                        index: index + 1,
                      })}
                    />
                    <Switch.Control />
                  </Switch.Root>
                </Table.Cell>
                <Table.Cell>
                  <Button
                    size="xs"
                    variant="subtle"
                    colorPalette="red"
                    onClick={() => removeComponent(index)}
                    disabled={componentRows.length <= 1}
                  >
                    {t("common.delete")}
                  </Button>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Box>

      <Box mt={6} borderWidth="1px" borderRadius="md" p={4}>
        <Flex align="center" justify="space-between" mb={3}>
          <Heading size="sm">{t("flow.udmEditor.form.sections.processes")}</Heading>
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
              {t("flow.udmEditor.form.actions.clearAllStoich")}
            </Button>
            <Button
              size="sm"
              onClick={() => setProcessRows((prev) => [...prev, emptyProcess()])}
            >
              {t("flow.udmEditor.form.actions.addProcess")}
            </Button>
          </HStack>
        </Flex>
        <Table.ScrollArea borderWidth="1px" rounded="md" maxW="100%" maxH="520px">
          <Table.Root
            size="sm"
            stickyHeader
            css={{
              "& [data-sticky]": {
                position: "sticky",
                bg: "bg",
              },
              "& thead [data-sticky]": {
                zIndex: 4,
              },
              "& tbody [data-sticky]": {
                zIndex: 2,
              },
              "& [data-sticky='start-last']": {
                _after: {
                  content: '""',
                  position: "absolute",
                  insetInlineEnd: "0",
                  top: "0",
                  bottom: "-1px",
                  width: "24px",
                  translate: "100% 0",
                  pointerEvents: "none",
                  boxShadow: "inset 8px 0px 8px -8px rgba(0, 0, 0, 0.22)",
                },
              },
            }}
          >
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader
                  minW={PROCESS_NAME_COL_W}
                  data-sticky="start-first"
                  left="0"
                >
                  {t("flow.udmEditor.form.columns.processName")}
                </Table.ColumnHeader>
                <Table.ColumnHeader
                  minW={RATE_EXPR_COL_W}
                  data-sticky="start-last"
                  left={PROCESS_NAME_COL_W}
                >
                  {t("flow.udmEditor.form.columns.rateExpr")}
                </Table.ColumnHeader>
                {componentNames.map((compName) => (
                  <Table.ColumnHeader
                    key={`stoich-header-${compName}`}
                    minW={STOICH_COL_MIN_W}
                  >
                    {compName}
                  </Table.ColumnHeader>
                ))}
                <Table.ColumnHeader minW={NOTE_COL_W}>
                  {t("flow.udmEditor.form.columns.note")}
                </Table.ColumnHeader>
                <Table.ColumnHeader minW={ACTION_COL_W}>
                  {t("flow.udmEditor.form.columns.actions")}
                </Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {processRows.map((row, rowIndex) => (
                <Table.Row key={`process-${rowIndex}`}>
                  <Table.Cell minW={PROCESS_NAME_COL_W} data-sticky="start-first" left="0">
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
                    minW={RATE_EXPR_COL_W}
                    data-sticky="start-last"
                    left={PROCESS_NAME_COL_W}
                  >
                    <Input
                      size="sm"
                      readOnly
                      cursor="pointer"
                      value={row.rateExpr}
                      placeholder={t("flow.udmEditor.form.placeholders.clickEditRateExpr")}
                      title={row.rateExpr}
                      ref={(el) => {
                        rateExprInputRefs.current[rowIndex] = el
                      }}
                      onClick={() => openRateExprEditor(rowIndex)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault()
                          openRateExprEditor(rowIndex)
                        }
                      }}
                    />
                  </Table.Cell>
                  {componentNames.map((compName) => (
                    <Table.Cell
                      key={`stoich-cell-${rowIndex}-${compName}`}
                      minW={STOICH_COL_MIN_W}
                    >
                      <Input
                        size="sm"
                        readOnly
                        cursor="pointer"
                        type="text"
                        value={row.stoich[compName] || "0"}
                        placeholder={t("flow.udmEditor.form.placeholders.stoichExample")}
                        title={row.stoich[compName] || "0"}
                        ref={(el) => {
                          stoichInputRefs.current[`${rowIndex}:${compName}`] = el
                        }}
                        onClick={() => openStoichEditor(rowIndex, compName)}
                        onPaste={(event) =>
                          handleStoichPaste(event, rowIndex, compName)
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault()
                            openStoichEditor(rowIndex, compName)
                          }
                        }}
                      />
                    </Table.Cell>
                  ))}
                  <Table.Cell minW={NOTE_COL_W}>
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
                  <Table.Cell minW={ACTION_COL_W}>
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
                      {t("common.delete")}
                    </Button>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Table.ScrollArea>
      </Box>

      <Box mt={6} borderWidth="1px" borderRadius="md" p={4}>
        <Flex align="center" justify="space-between" mb={3}>
          <Heading size="sm">{t("flow.udmEditor.validation.sectionTitle")}</Heading>
          <HStack>
            <Button size="sm" variant="subtle" onClick={runValidate}>
              {t("flow.udmEditor.validation.actions.parseValidate")}
            </Button>
            <Button size="sm" onClick={mergeExtractedParameters}>
              {t("flow.udmEditor.validation.actions.applyExtractedParams")}
            </Button>
          </HStack>
        </Flex>
        {validation ? (
          <VStack align="stretch" gap={2}>
            <HStack>
              <Badge colorPalette={validation.ok ? "green" : "red"}>
                {validation.ok
                  ? t("flow.udmEditor.validation.status.passed")
                  : t("flow.udmEditor.validation.status.failed")}
              </Badge>
              <Text fontSize="sm">
                {t("flow.udmEditor.validation.extractedLabel")}{" "}
                {(validation.extracted_parameters || []).join(", ") || "-"}
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
                title={t("flow.udmEditor.validation.jumpToCellTitle")}
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
                title={t("flow.udmEditor.validation.jumpToCellTitle")}
              >
                [{warn.code}] {warn.message}
                {warn.process ? ` (${warn.process})` : ""}
              </Button>
            ))}
          </VStack>
        ) : (
          <Text color="gray.500" fontSize="sm">
            {t("flow.udmEditor.validation.emptyHint")}
          </Text>
        )}
      </Box>

      <Box mt={6} borderWidth="1px" borderRadius="md" p={4}>
        <Flex align="center" justify="space-between" mb={3}>
          <Heading size="sm">{t("flow.udmEditor.form.sections.parameterWizard")}</Heading>
          <Button size="sm" onClick={() => setParameterRows((prev) => [...prev, emptyParameter()])}>
            {t("flow.udmEditor.form.actions.addParameter")}
          </Button>
        </Flex>
        <Table.Root size="sm">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>{t("flow.udmEditor.form.columns.name")}</Table.ColumnHeader>
              <Table.ColumnHeader>{t("flow.udmEditor.form.columns.unit")}</Table.ColumnHeader>
              <Table.ColumnHeader>{t("flow.udmEditor.form.columns.defaultValue")}</Table.ColumnHeader>
              <Table.ColumnHeader>{t("flow.udmEditor.form.columns.min")}</Table.ColumnHeader>
              <Table.ColumnHeader>{t("flow.udmEditor.form.columns.max")}</Table.ColumnHeader>
              <Table.ColumnHeader>{t("flow.udmEditor.form.columns.scale")}</Table.ColumnHeader>
              <Table.ColumnHeader>{t("flow.udmEditor.form.columns.note")}</Table.ColumnHeader>
              <Table.ColumnHeader>{t("flow.udmEditor.form.columns.actions")}</Table.ColumnHeader>
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
                    {t("common.delete")}
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
            {t("flow.udmEditor.status.unsaved")}
          </Badge>
        ) : (
          <Badge colorPalette="green" variant="subtle" alignSelf="center">
            {t("flow.udmEditor.status.saved")}
          </Badge>
        )}
        <Button loading={isSaving} onClick={saveModel}>
          {t("flow.udmEditor.actions.saveModel")}
        </Button>
        <Button
          colorPalette="blue"
          loading={isSaving}
          onClick={saveAndGenerateFlowchart}
        >
          {t("flow.udmEditor.actions.saveAndGenerateFlow")}
        </Button>
        {!hideBackButton ? (
          <Button variant="subtle" onClick={handleBackClick}>
            {t("flow.udmEditor.actions.backToLibrary")}
          </Button>
        ) : null}
      </Flex>

      {editorTarget ? (
        <ExpressionCellEditorDialog
          open={!!editorTarget}
          cellType={editorTarget.cellType}
          processIndex={editorTarget.rowIndex}
          processName={editorProcessName}
          componentName={
            editorTarget.cellType === "stoich"
              ? editorTarget.componentName
              : undefined
          }
          initialValue={editorInitialValue}
          componentNames={componentNames}
          parameterNames={parameterNames}
          onSave={saveEditorValue}
          onClose={closeEditor}
        />
      ) : null}
    </Container>
  )
}

export default UDMModelEditorForm
