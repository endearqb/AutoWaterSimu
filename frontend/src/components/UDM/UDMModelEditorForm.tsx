import type { UDMFlowChartPublic } from "@/client/types.gen"
import {
  Badge,
  Box,
  Button,
  Container,
  Flex,
  HStack,
  Heading,
  Input,
  NativeSelect,
  Switch,
  Table,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react"
import { useQuery } from "@tanstack/react-query"
import {
  type ClipboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import type {
  ContinuityCheckItem as ApiContinuityCheckItem,
  UDMComponentDefinition,
  UDMModelCreate,
  UDMModelDefinitionDraft,
  UDMModelDetailPublic,
  UDMModelUpdate,
  UDMParameterDefinition,
  UDMProcessDefinition,
  UDMValidationResponse,
} from "@/client/types.gen"
import {
  type TutorialMode,
  type TutorialProcessTeaching,
  type TutorialRecipe,
  type TutorialStep,
  getEnabledTutorialSteps,
  getTutorialLesson,
} from "@/data/tutorialLessons"
import useCustomToast from "@/hooks/useCustomToast"
import { useI18n } from "@/i18n"
import { useTutorialProgressStore } from "@/stores/tutorialProgressStore"
import {
  resolveTutorialComponentDisplay,
  resolveTutorialModelDescription,
  resolveTutorialModelDisplayName,
  resolveTutorialParameterDisplay,
  resolveTutorialProcessDisplay,
} from "@/utils/udmTutorialLocalization"
import { getDefaultCalculationParams } from "../../config/simulationConfig"
import { getTutorialFlowPreset } from "../../data/tutorialFlowPresets"
import { udmService } from "../../services/udmService"
import { useUDMFlowStore } from "../../stores/udmFlowStore"
import ExpressionCellEditorDialog from "./ExpressionCellEditorDialog"
import ArrowMatrixView from "./tutorial/ArrowMatrixView"
import ContinuityCheckPanel, {
  type ContinuityCheckItemData,
} from "./tutorial/ContinuityCheckPanel"
import ProcessTeachingPopover from "./tutorial/ProcessTeachingPopover"
import RecipeBar from "./tutorial/RecipeBar"
import TutorialGuidePanel from "./tutorial/TutorialGuidePanel"
import TutorialStepper from "./tutorial/TutorialStepper"

type ComponentRow = {
  _rowId: string
  name: string
  label: string
  unit: string
  defaultValue: string
  isFixed: boolean
  conversion_factors?: Record<string, number> | null
}

type ParameterRow = {
  _rowId: string
  name: string
  unit: string
  defaultValue: string
  minValue: string
  maxValue: string
  scale: "lin" | "log"
  note: string
}

type ProcessRow = {
  _rowId: string
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
  lessonKey?: string
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

const STOICH_NUMBER_PATTERN = /^[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?$/

const toFiniteNumber = (value: unknown): number => {
  const parsed =
    typeof value === "number" ? value : Number.parseFloat(String(value ?? ""))
  return Number.isFinite(parsed) ? parsed : 0
}

const extractContinuityProfiles = (learningMeta: unknown): string[] | undefined => {
  if (!learningMeta || typeof learningMeta !== "object") {
    return undefined
  }

  const rawProfiles = (learningMeta as Record<string, unknown>).continuityProfiles
  if (!Array.isArray(rawProfiles)) {
    return undefined
  }

  const profiles = rawProfiles
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean)

  return profiles.length > 0 ? Array.from(new Set(profiles)) : undefined
}

const normalizeContinuityCheckDetails = (
  details: unknown,
): ContinuityCheckItemData["details"] => {
  if (!details || typeof details !== "object") {
    return null
  }

  const rawContributions = (details as Record<string, unknown>).contributions
  if (!Array.isArray(rawContributions)) {
    return null
  }

  const contributions = rawContributions
    .filter(
      (item): item is Record<string, unknown> =>
        !!item && typeof item === "object",
    )
    .map((item) => ({
      component: String(item.component ?? ""),
      stoich: toFiniteNumber(item.stoich),
      factor: toFiniteNumber(item.factor),
      contribution: toFiniteNumber(item.contribution),
      expr: String(item.expr ?? ""),
    }))

  return contributions.length > 0 ? { contributions } : null
}

const normalizeContinuityCheckItem = (
  item: ApiContinuityCheckItem,
): ContinuityCheckItemData => ({
  process_name: item.process_name,
  dimension: item.dimension,
  balance_value: item.balance_value,
  status:
    item.status === "pass" || item.status === "warn" || item.status === "error"
      ? item.status
      : "warn",
  explanation: item.explanation,
  suggestion: item.suggestion,
  details: normalizeContinuityCheckDetails(item.details),
})

const emptyComponent = (): ComponentRow => ({
  _rowId: crypto.randomUUID() as string,
  name: "",
  label: "",
  unit: "",
  defaultValue: "0",
  isFixed: false,
  conversion_factors: null,
})

const emptyParameter = (): ParameterRow => ({
  _rowId: crypto.randomUUID() as string,
  name: "",
  unit: "",
  defaultValue: "1",
  minValue: "0.1",
  maxValue: "10",
  scale: "lin",
  note: "",
})

const emptyProcess = (): ProcessRow => ({
  _rowId: crypto.randomUUID() as string,
  name: "",
  rateExpr: "",
  note: "",
  stoich: {},
})

type ValidationIssue = NonNullable<UDMValidationResponse["errors"]>[number]
type ValidationLocation = NonNullable<ValidationIssue["location"]>

const buildFormSignature = (payload: {
  name: string
  description: string
  tagsText: string
  componentRows: ComponentRow[]
  processRows: ProcessRow[]
  parameterRows: ParameterRow[]
}) =>
  JSON.stringify({
    ...payload,
    componentRows: payload.componentRows.map(({ _rowId, ...rest }) => rest),
    processRows: payload.processRows.map(({ _rowId, ...rest }) => rest),
    parameterRows: payload.parameterRows.map(({ _rowId, ...rest }) => rest),
  })

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
  lessonKey: _lessonKey,
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
  const { showErrorToast, showSuccessToast, showWarningToast } =
    useCustomToast()

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
  const [lessonKeyFromMeta, setLessonKeyFromMeta] = useState<
    string | undefined
  >()
  const [readonlyFromMeta, setReadonlyFromMeta] = useState(false)
  const [tutorialMode, setTutorialMode] = useState<TutorialMode>("expert")
  const [currentTutorialStep, setCurrentTutorialStep] =
    useState<TutorialStep>(1)

  const tutorialLessonKey = _lessonKey ?? lessonKeyFromMeta
  const tutorialLesson = useMemo(
    () => getTutorialLesson(tutorialLessonKey),
    [tutorialLessonKey],
  )
  const enabledTutorialSteps = useMemo(
    () => (tutorialLesson ? getEnabledTutorialSteps(tutorialLesson) : []),
    [tutorialLesson],
  )
  const tutorialProgress = useTutorialProgressStore((state) =>
    tutorialLesson ? state.lessonProgress[tutorialLesson.lessonKey] : undefined,
  )
  const startTutorialLesson = useTutorialProgressStore(
    (state) => state.startLesson,
  )
  const attachLessonModel = useTutorialProgressStore(
    (state) => state.attachLessonModel,
  )
  const updateLessonStep = useTutorialProgressStore(
    (state) => state.updateLessonStep,
  )
  const setLessonMode = useTutorialProgressStore((state) => state.setLessonMode)
  const markValidationResult = useTutorialProgressStore(
    (state) => state.markValidationResult,
  )
  const completeLesson = useTutorialProgressStore(
    (state) => state.completeLesson,
  )
  const isTutorialModel = !!tutorialLesson
  const tutorialDisplayName = useMemo(
    () =>
      resolveTutorialModelDisplayName(t, tutorialLessonKey, name.trim() || ""),
    [name, t, tutorialLessonKey],
  )
  const tutorialDisplayDescription = useMemo(
    () =>
      resolveTutorialModelDescription(
        t,
        tutorialLessonKey,
        description.trim() || "",
      ),
    [description, t, tutorialLessonKey],
  )
  const isGuidedMode = isTutorialModel && tutorialMode === "guided"
  const isReadonlyMode = isGuidedMode && readonlyFromMeta
  const maxTutorialStep = tutorialLesson?.stepConfig.maxStep ?? 5
  const activeRecipes = tutorialLesson?.recipes ?? []
  const processTeachingMap = useMemo(
    () =>
      new Map(
        (tutorialLesson?.processTeaching || []).map((item) => [
          item.processName,
          item,
        ]),
      ),
    [tutorialLesson],
  )

  const processNameInputRefs = useRef<Record<number, HTMLInputElement | null>>(
    {},
  )
  const stoichInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const rateExprInputRefs = useRef<Record<number, HTMLInputElement | null>>({})
  const parameterNameInputRefs = useRef<
    Record<number, HTMLInputElement | null>
  >({})

  useEffect(() => {
    setCurrentModelId(modelId)
  }, [modelId])

  useEffect(() => {
    if (!tutorialLesson) {
      setTutorialMode("expert")
      setCurrentTutorialStep(1)
      return
    }

    startTutorialLesson(tutorialLesson.lessonKey, {
      modelId: currentModelId ?? tutorialProgress?.modelId,
      defaultStep: tutorialLesson.stepConfig.defaultStep,
      mode: tutorialProgress?.mode ?? "guided",
    })
    setTutorialMode(tutorialProgress?.mode ?? "guided")
    setCurrentTutorialStep(
      (tutorialProgress?.currentStep ??
        tutorialLesson.stepConfig.defaultStep) as TutorialStep,
    )
  }, [
    currentModelId,
    startTutorialLesson,
    tutorialLesson,
    tutorialProgress?.currentStep,
    tutorialProgress?.mode,
    tutorialProgress?.modelId,
  ])

  useEffect(() => {
    if (!tutorialLesson || !currentModelId) return
    attachLessonModel(tutorialLesson.lessonKey, currentModelId)
  }, [attachLessonModel, currentModelId, tutorialLesson])

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

    const metaLearning = (latest.meta?.learning || null) as {
      lessonKey?: string
      chapter?: string
      readonlyMode?: boolean
    } | null
    if (!_lessonKey) {
      setLessonKeyFromMeta(
        metaLearning?.lessonKey || metaLearning?.chapter || undefined,
      )
    }
    setReadonlyFromMeta(metaLearning?.readonlyMode === true)

    const loadedComponents = (
      (latest.components || []) as UDMComponentDefinition[]
    )
      .map((item): ComponentRow | null => {
        const compName = String(item?.name || "").trim()
        if (!compName) return null
        return {
          _rowId: crypto.randomUUID() as string,
          name: compName,
          label: String(item?.label || compName),
          unit: String(item?.unit || ""),
          defaultValue: String(item?.default_value ?? "0"),
          isFixed: Boolean(item?.is_fixed ?? false),
          conversion_factors: (item as any)?.conversion_factors ?? null,
        }
      })
      .filter((item): item is ComponentRow => !!item)

    const nextComponentRows = loadedComponents.length
      ? loadedComponents
      : [emptyComponent()]
    setComponentRows(nextComponentRows)

    const loadedProcesses: ProcessRow[] = (
      (latest.processes || []) as UDMProcessDefinition[]
    )
      .map((item) => ({
        _rowId: crypto.randomUUID() as string,
        name: String(item?.name || ""),
        rateExpr: String(item?.rate_expr ?? ""),
        note: String(item?.note || ""),
        stoich: Object.fromEntries(
          Object.entries(
            (item?.stoich_expr || item?.stoich || {}) as Record<
              string,
              unknown
            >,
          ).map(([k, v]) => [k, String(v)]),
        ),
      }))
      .filter((item: ProcessRow) => item.name || item.rateExpr || item.note)

    const nextProcessRows = loadedProcesses.length
      ? loadedProcesses
      : [emptyProcess()]
    setProcessRows(nextProcessRows)

    const loadedParameters: ParameterRow[] = (
      (latest.parameters || []) as UDMParameterDefinition[]
    )
      .map((item) => {
        const paramName = String(item?.name || "").trim()
        if (!paramName) return null
        return {
          _rowId: crypto.randomUUID() as string,
          name: paramName,
          unit: String(item?.unit || ""),
          defaultValue: String(item?.default_value ?? "1"),
          minValue: String(item?.min_value ?? "0.1"),
          maxValue: String(item?.max_value ?? "10"),
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
  const componentDisplayMap = useMemo(
    () =>
      new Map(
        componentRows.map((row) => [
          row._rowId,
          resolveTutorialComponentDisplay(
            t,
            tutorialLessonKey,
            row.name,
            row.label,
          ),
        ]),
      ),
    [componentRows, t, tutorialLessonKey],
  )
  const processDisplayMap = useMemo(
    () =>
      new Map(
        processRows.map((row) => [
          row._rowId,
          resolveTutorialProcessDisplay(t, tutorialLessonKey, row.name),
        ]),
      ),
    [processRows, t, tutorialLessonKey],
  )
  const parameterDisplayMap = useMemo(
    () =>
      new Map(
        parameterRows.map((row) => [
          row._rowId,
          resolveTutorialParameterDisplay(t, tutorialLessonKey, row.name),
        ]),
      ),
    [parameterRows, t, tutorialLessonKey],
  )
  const showArrowMatrix = isGuidedMode && currentTutorialStep === 1
  const showStoichSection = !isGuidedMode || currentTutorialStep >= 2
  const showRateExprSection = !isGuidedMode || currentTutorialStep >= 3
  const showParameterSection = !isGuidedMode || currentTutorialStep >= 4
  const showValidationSection = !isGuidedMode || currentTutorialStep >= 5
  const showAdvancedFields = !isGuidedMode || currentTutorialStep >= 5
  const activeContinuityProfiles = useMemo(
    () =>
      tutorialLesson?.continuityProfiles ||
      extractContinuityProfiles(detailQuery.data?.latest_version?.meta?.learning),
    [detailQuery.data?.latest_version?.meta, tutorialLesson],
  )
  const showRecipeBar =
    isGuidedMode && currentTutorialStep >= 3 && activeRecipes.length > 0

  const handleTutorialStepChange = (step: TutorialStep) => {
    const nextStep = Math.min(step, maxTutorialStep) as TutorialStep
    setCurrentTutorialStep(nextStep)
    if (tutorialLesson) {
      updateLessonStep(tutorialLesson.lessonKey, nextStep)
    }
  }

  const handleTutorialModeChange = (mode: TutorialMode) => {
    setTutorialMode(mode)
    if (tutorialLesson) {
      setLessonMode(tutorialLesson.lessonKey, mode)
    }
  }

  const getProcessTeaching = (
    processName: string,
  ): TutorialProcessTeaching | undefined =>
    processTeachingMap.get(processName.trim())

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
    [name, description, tagsText, componentRows, processRows, parameterRows],
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
    const existingMeta = {
      ...(((detailQuery.data?.latest_version?.meta || {}) as Record<
        string,
        unknown
      >) || {}),
    }
    const existingLearningMeta =
      existingMeta.learning &&
      typeof existingMeta.learning === "object" &&
      !Array.isArray(existingMeta.learning)
        ? (existingMeta.learning as Record<string, unknown>)
        : {}
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
          ...(row.conversion_factors
            ? { conversion_factors: row.conversion_factors }
            : {}),
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
            raw.length > 0 && STOICH_NUMBER_PATTERN.test(raw)
          if (isNumeric && Number.isFinite(num)) {
            stoich[compName] = num
          }
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

    const continuityProfiles =
      tutorialLesson?.continuityProfiles ||
      extractContinuityProfiles(existingLearningMeta)
    const tutorialLearningMeta = tutorialLesson
      ? {
          ...existingLearningMeta,
          track: "petersen",
          lessonKey: tutorialLesson.lessonKey,
          chapter: tutorialLesson.chapter,
          difficulty: tutorialLesson.difficulty,
          templateType: tutorialLesson.templateType,
          estimatedMinutes: tutorialLesson.estimatedMinutes,
          prerequisites: tutorialLesson.prerequisites,
          stepConfig: tutorialLesson.stepConfig,
          recommendedCharts: tutorialLesson.recommendedCharts,
          readonlyMode: false,
          ...(continuityProfiles
            ? { continuityProfiles }
            : {}),
        }
      : null

    return {
      name: name.trim() || t("flow.udmEditor.form.defaults.unnamedModel"),
      description: description.trim() || null,
      tags: tagsText
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      components: normalizedComponents,
      parameters: normalizedParameters as UDMParameterDefinition[],
      processes: normalizedProcesses,
      meta: {
        ...existingMeta,
        source: tutorialLesson ? "seed-template" : "manual",
        ...(tutorialLearningMeta ? { learning: tutorialLearningMeta } : {}),
      },
    }
  }

  const continuityChecks = useMemo<ContinuityCheckItemData[]>(() => {
    const items = (validation?.continuity_checks || []).map(
      normalizeContinuityCheckItem,
    )
    if (!activeContinuityProfiles || activeContinuityProfiles.length === 0) {
      return items
    }
    const dimensionSet = new Set(activeContinuityProfiles)
    return items.filter((item) => dimensionSet.has(item.dimension))
  }, [activeContinuityProfiles, validation?.continuity_checks])

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
      if (tutorialLesson) {
        markValidationResult(tutorialLesson.lessonKey, result.ok)
        if (
          result.ok &&
          currentTutorialStep === maxTutorialStep &&
          enabledTutorialSteps.includes(currentTutorialStep)
        ) {
          completeLesson(tutorialLesson.lessonKey)
        }
      }
      if (result.ok) {
        showSuccessToast(t("flow.udmEditor.validation.toast.validationPassed"))
      } else {
        showWarningToast(
          t("flow.udmEditor.validation.toast.validationHasIssues"),
        )
      }
    } catch (error) {
      showErrorToast(
        error instanceof Error
          ? error.message
          : t("flow.udmEditor.validation.toast.validationFailed"),
      )
      if (tutorialLesson) {
        markValidationResult(tutorialLesson.lessonKey, false)
      }
    }
  }

  const mergeExtractedParameters = () => {
    const extracted = validation?.extracted_parameters || []
    if (extracted.length === 0) {
      showWarningToast(
        t("flow.udmEditor.validation.toast.noExtractedParameters"),
      )
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

    const components = (latest.components || []) as UDMComponentDefinition[]
    const parameters = (latest.parameters || []) as UDMParameterDefinition[]
    const processes = (latest.processes || []) as UDMProcessDefinition[]

    const customParameters = components
      .map((item) => {
        const compName = String(item.name || "").trim()
        if (!compName) return null
        const defaultValue = Number.parseFloat(
          String(item.default_value ?? "0"),
        )
        return {
          name: compName,
          label: String(item.label || compName),
          description: item.unit
            ? t("flow.propertyPanel.unitWithValue", {
                unit: String(item.unit),
              })
            : undefined,
          defaultValue: Number.isFinite(defaultValue) ? defaultValue : 0,
        }
      })
      .filter((item): item is NonNullable<typeof item> => !!item)

    const parameterValues: Record<string, number> = {}
    parameters.forEach((param) => {
      const paramName = String(param.name || "").trim()
      if (!paramName) return
      const value = Number.parseFloat(String(param.default_value ?? "0"))
      parameterValues[paramName] = Number.isFinite(value) ? value : 0
    })

    // Lookup tutorial flow preset for this lesson
    const preset = getTutorialFlowPreset(tutorialLessonKey)

    const buildNodeData = (label: string, nodeRole?: "input" | "reactor") => {
      const base: Record<string, unknown> = {
        label,
        volume:
          nodeRole === "reactor" && preset?.reactorOverrides?.volume
            ? preset.reactorOverrides.volume
            : "1e-3",
      }
      customParameters.forEach((p) => {
        // For input nodes with tutorial preset, use the preset influent concentrations
        if (nodeRole === "input" && preset?.inputNodeOverrides?.[p.name] != null) {
          base[p.name] = String(preset.inputNodeOverrides[p.name])
        } else {
          base[p.name] = String(p.defaultValue ?? 0)
        }
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

    const edgeFlowRate = preset?.edgeFlowRate ?? 1000

    const calculationParameters = {
      ...getDefaultCalculationParams("udm"),
      ...(preset?.calculationParameters ?? {}),
    }
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
          data: buildNodeData(t("flow.udmEditor.form.defaults.influentNode"), "input"),
        },
        {
          id: "udm-reactor-1",
          type: "udm",
          position: { x: 360, y: 220 },
          data: {
            ...buildNodeData(t("flow.udmEditor.form.defaults.reactorNode"), "reactor"),
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
          data: buildNodeData(t("flow.udmEditor.form.defaults.effluentNode")),
        },
      ],
      edges: [
        {
          id: "udm-edge-1",
          source: "udm-input-1",
          target: "udm-reactor-1",
          type: "editable",
          data: {
            flow: edgeFlowRate,
            ...edgeData,
          },
        },
        {
          id: "udm-edge-2",
          source: "udm-reactor-1",
          target: "udm-output-1",
          type: "editable",
          data: {
            flow: edgeFlowRate,
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
      const flowName = `${savedModel.name}${t("flow.udmEditor.form.defaults.defaultFlowSuffix")}`
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
    if (isReadonlyMode) return
    setEditorTarget({
      cellType: "rateExpr",
      rowIndex,
    })
  }

  const openStoichEditor = (rowIndex: number, componentName: string) => {
    if (isReadonlyMode) return
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
    const processName = issue.location?.processName || issue.process
    if (processName) {
      const byName = processRows.findIndex(
        (row) => row.name.trim() === processName.trim(),
      )
      if (byName >= 0) return byName

      const match = processName.match(/process_(\d+)/i)
      if (match) {
        const idx = Number.parseInt(match[1], 10) - 1
        if (idx >= 0 && idx < processRows.length) return idx
      }
    }
    return -1
  }

  const resolveParameterIndex = (parameterName?: string | null): number => {
    if (!parameterName) return -1
    return parameterRows.findIndex(
      (row) => row.name.trim() === parameterName.trim(),
    )
  }

  const resolveComponentNameFromMessage = (message: string): string | null => {
    const zhMatch = message.match(/组分\s*([^\s的，,:]+)/)
    if (zhMatch?.[1]) return zhMatch[1]
    const enMatch = message.match(/component\s+([A-Za-z_][A-Za-z0-9_]*)/i)
    return enMatch?.[1] || null
  }

  const focusStoichCell = (processIndex: number, componentName: string): boolean => {
    if (isTutorialModel && !showStoichSection) {
      handleTutorialStepChange(Math.min(2, maxTutorialStep) as TutorialStep)
    }
    const stoichKey = `${processIndex}:${componentName}`
    const targetCell = stoichInputRefs.current[stoichKey]
    if (targetCell) {
      targetCell.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "center",
      })
      targetCell.focus()
    }
    openStoichEditor(processIndex, componentName)
    return true
  }

  const focusFirstStoichCell = (processIndex: number): boolean => {
    const fallbackComponent = componentNames[0]
    if (!fallbackComponent) {
      return false
    }
    return focusStoichCell(processIndex, fallbackComponent)
  }

  const jumpToIssue = (issue: ValidationIssue) => {
    const location = (issue.location || null) as ValidationLocation | null
    const processIndex = resolveProcessIndex(issue)
    const componentName =
      location?.componentName ||
      resolveComponentNameFromMessage(issue.message || "")

    const parameterIndex = resolveParameterIndex(location?.parameterName)
    if (
      (location?.section === "parameters" || parameterIndex >= 0) &&
      parameterIndex >= 0
    ) {
      if (isTutorialModel && !showParameterSection) {
        handleTutorialStepChange(Math.min(4, maxTutorialStep) as TutorialStep)
      }
      const parameterInput = parameterNameInputRefs.current[parameterIndex]
      if (parameterInput) {
        parameterInput.scrollIntoView({ behavior: "smooth", block: "center" })
        parameterInput.focus()
        parameterInput.select()
      }
      return
    }

    if (processIndex < 0) return

    if (location?.section === "stoich" && !componentName) {
      if (focusFirstStoichCell(processIndex)) {
        return
      }
    }

    if (componentName) {
      if (focusStoichCell(processIndex, componentName)) {
        return
      }
    }

    if (!componentName && issue.code.startsWith("STOICH_")) {
      if (focusFirstStoichCell(processIndex)) {
        return
      }
    }

    if (location?.section === "stoich") {
      return
    }

    if (
      location?.section === "rateExpr" ||
      issue.code !== "DUPLICATE_PROCESS"
    ) {
      if (isTutorialModel && !showRateExprSection) {
        handleTutorialStepChange(Math.min(3, maxTutorialStep) as TutorialStep)
      }
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

  const insertRecipeIntoRateExpr = (recipe: TutorialRecipe) => {
    if (processRows.length === 0) return
    const targetRowIndex =
      editorTarget?.cellType === "rateExpr" ? editorTarget.rowIndex : 0
    setProcessRows((prev) =>
      prev.map((row, idx) =>
        idx === targetRowIndex
          ? {
              ...row,
              rateExpr: row.rateExpr
                ? `${row.rateExpr} * ${recipe.template}`
                : recipe.template,
            }
          : row,
      ),
    )
    openRateExprEditor(targetRowIndex)
  }

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

      {isTutorialModel ? (
        <Box mt={6} borderWidth="1px" borderRadius="md" p={4}>
          <VStack align="stretch" gap={3}>
            <Flex align="center" justify="space-between" wrap="wrap" gap={3}>
              <Box>
                <Heading size="sm">
                  {t(`flow.tutorial.chapters.${tutorialLesson.chapter}.title`)}
                </Heading>
                <Text fontSize="sm" color="fg.muted">
                  {t("flow.tutorial.modeDescription")}
                </Text>
              </Box>
              <HStack>
                <Text fontSize="sm">{t("flow.tutorial.mode.guided")}</Text>
                <Switch.Root
                  checked={tutorialMode === "guided"}
                  onCheckedChange={(details) =>
                    handleTutorialModeChange(
                      details.checked ? "guided" : "expert",
                    )
                  }
                >
                  <Switch.HiddenInput
                    aria-label={t("flow.tutorial.modeToggle")}
                  />
                  <Switch.Control />
                </Switch.Root>
                <Text fontSize="sm">{t("flow.tutorial.mode.expert")}</Text>
              </HStack>
            </Flex>
            <TutorialStepper
              currentStep={currentTutorialStep}
              maxStep={maxTutorialStep}
              onStepChange={handleTutorialStepChange}
            />
          </VStack>
        </Box>
      ) : null}

      <Flex
        mt={6}
        gap={6}
        align="start"
        direction={{ base: "column", xl: "row" }}
      >
        {isTutorialModel ? (
          <Box flex={{ base: "1 1 auto", xl: "0 0 280px" }} w="full">
            <TutorialGuidePanel
              lesson={tutorialLesson}
              currentStep={currentTutorialStep}
            />
          </Box>
        ) : null}

        <Box flex="1" minW={0}>
          <Box borderWidth="1px" borderRadius="md" p={4}>
            <Heading size="sm" mb={3}>
              {t("flow.udmEditor.form.sections.basicInfo")}
            </Heading>
            <VStack align="stretch" gap={3}>
              {isTutorialModel &&
              tutorialDisplayName &&
              tutorialDisplayName !== name.trim() ? (
                <Text fontSize="xs" color="fg.muted">
                  {tutorialDisplayName}
                </Text>
              ) : null}
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("flow.udmEditor.form.placeholders.modelName")}
              />
              {isTutorialModel &&
              tutorialDisplayDescription &&
              tutorialDisplayDescription !== description.trim() ? (
                <Text fontSize="xs" color="fg.muted">
                  {tutorialDisplayDescription}
                </Text>
              ) : null}
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t(
                  "flow.udmEditor.form.placeholders.modelDescription",
                )}
                rows={3}
              />
              <Input
                value={tagsText}
                onChange={(e) => setTagsText(e.target.value)}
                placeholder={t("flow.udmEditor.form.placeholders.tags")}
              />
            </VStack>
          </Box>

          {showArrowMatrix ? (
            <Box mt={6}>
              <ArrowMatrixView
                lessonKey={tutorialLessonKey}
                componentNames={componentNames}
                processRows={processRows.map((row) => ({
                  name: row.name,
                  stoich: row.stoich,
                }))}
              />
            </Box>
          ) : null}

          <Box mt={6} borderWidth="1px" borderRadius="md" p={4}>
            <Flex align="center" justify="space-between" mb={3}>
              <Heading size="sm">
                {t("flow.udmEditor.form.sections.components")}
              </Heading>
              <Button
                size="sm"
                onClick={() =>
                  setComponentRows((prev) => [...prev, emptyComponent()])
                }
                disabled={isReadonlyMode}
              >
                {t("flow.udmEditor.form.actions.addComponent")}
              </Button>
            </Flex>
            <Table.Root size="sm">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>
                    {t("flow.udmEditor.form.columns.name")}
                  </Table.ColumnHeader>
                  <Table.ColumnHeader>
                    {t("flow.udmEditor.form.columns.label")}
                  </Table.ColumnHeader>
                  <Table.ColumnHeader>
                    {t("flow.udmEditor.form.columns.unit")}
                  </Table.ColumnHeader>
                  <Table.ColumnHeader>
                    {t("flow.udmEditor.form.columns.defaultValue")}
                  </Table.ColumnHeader>
                  <Table.ColumnHeader>
                    {t("flow.udmEditor.form.columns.allowChange")}
                  </Table.ColumnHeader>
                  <Table.ColumnHeader>
                    {t("flow.udmEditor.form.columns.actions")}
                  </Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {componentRows.map((row, index) => {
                  const componentDisplay = componentDisplayMap.get(row._rowId)
                  const componentAlias =
                    componentDisplay?.label?.trim() || row.label.trim()

                  return (
                    <Table.Row key={row._rowId}>
                      <Table.Cell>
                        <VStack align="stretch" gap={1}>
                          <Input
                            size="sm"
                            value={row.name}
                            onChange={(e) =>
                              setComponentName(index, e.target.value)
                            }
                          />
                          {componentAlias && componentAlias !== row.name.trim() ? (
                            <Text fontSize="xs" color="fg.muted">
                              {componentAlias}
                            </Text>
                          ) : null}
                          {componentDisplay?.description ? (
                            <Text fontSize="xs" color="fg.muted">
                              {componentDisplay.description}
                            </Text>
                          ) : null}
                        </VStack>
                      </Table.Cell>
                      <Table.Cell>
                        <Input
                          size="sm"
                          value={row.label}
                          placeholder={componentDisplay?.label}
                          onChange={(e) =>
                            setComponentRows((prev) =>
                              prev.map((item, idx) =>
                                idx === index
                                  ? { ...item, label: e.target.value }
                                  : item,
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
                              idx === index
                                ? { ...item, unit: e.target.value }
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
                              idx === index
                                ? { ...item, isFixed: !details.checked }
                                : item,
                            ),
                          )
                        }
                      >
                        <Switch.HiddenInput
                          aria-label={t(
                            "flow.udmEditor.form.aria.allowChange",
                            {
                              index: index + 1,
                            },
                          )}
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
                        disabled={componentRows.length <= 1 || isReadonlyMode}
                      >
                        {t("common.delete")}
                      </Button>
                    </Table.Cell>
                    </Table.Row>
                  )
                })}
              </Table.Body>
            </Table.Root>
          </Box>

          <Box mt={6} borderWidth="1px" borderRadius="md" p={4}>
            <Flex align="center" justify="space-between" mb={3}>
              <Heading size="sm">
                {t("flow.udmEditor.form.sections.processes")}
              </Heading>
              <HStack>
                {showStoichSection ? (
                  <Button
                    size="sm"
                    variant="subtle"
                    disabled={isReadonlyMode}
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
                ) : null}
                <Button
                  size="sm"
                  onClick={() =>
                    setProcessRows((prev) => [...prev, emptyProcess()])
                  }
                  disabled={isReadonlyMode}
                >
                  {t("flow.udmEditor.form.actions.addProcess")}
                </Button>
              </HStack>
            </Flex>
            <Table.ScrollArea
              borderWidth="1px"
              rounded="md"
              maxW="100%"
              maxH="520px"
            >
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
                    {showRateExprSection ? (
                      <Table.ColumnHeader
                        minW={RATE_EXPR_COL_W}
                        data-sticky="start-last"
                        left={PROCESS_NAME_COL_W}
                      >
                        {t("flow.udmEditor.form.columns.rateExpr")}
                      </Table.ColumnHeader>
                    ) : null}
                    {showStoichSection
                      ? componentNames.map((compName) => (
                          <Table.ColumnHeader
                            key={`stoich-header-${compName}`}
                            minW={STOICH_COL_MIN_W}
                          >
                            <VStack align="start" gap={0}>
                              <Text fontWeight="medium">
                                {
                                  resolveTutorialComponentDisplay(
                                    t,
                                    tutorialLessonKey,
                                    compName,
                                  ).label
                                }
                              </Text>
                              <Text fontSize="xs" color="fg.muted">
                                {compName}
                              </Text>
                            </VStack>
                          </Table.ColumnHeader>
                        ))
                      : null}
                    {showAdvancedFields ? (
                      <Table.ColumnHeader minW={NOTE_COL_W}>
                        {t("flow.udmEditor.form.columns.note")}
                      </Table.ColumnHeader>
                    ) : null}
                    <Table.ColumnHeader minW={ACTION_COL_W}>
                      {t("flow.udmEditor.form.columns.actions")}
                    </Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {processRows.map((row, rowIndex) => {
                    const processDisplay = processDisplayMap.get(row._rowId)
                    const processAlias = processDisplay?.label?.trim() || ""

                    return (
                      <Table.Row key={row._rowId}>
                      <Table.Cell
                        minW={PROCESS_NAME_COL_W}
                        data-sticky="start-first"
                        left="0"
                      >
                        <VStack align="stretch" gap={1}>
                          <HStack>
                            <Input
                              size="sm"
                              value={row.name}
                              ref={(el) => {
                                processNameInputRefs.current[rowIndex] = el
                              }}
                              onChange={(e) =>
                                setProcessRows((prev) =>
                                  prev.map((item, idx) =>
                                    idx === rowIndex
                                      ? { ...item, name: e.target.value }
                                      : item,
                                  ),
                                )
                              }
                            />
                            <ProcessTeachingPopover
                              teaching={getProcessTeaching(row.name)}
                            />
                          </HStack>
                          {processAlias && processAlias !== row.name.trim() ? (
                            <Text fontSize="xs" color="fg.muted">
                              {processAlias}
                            </Text>
                          ) : null}
                          {processDisplay?.description ? (
                            <Text fontSize="xs" color="fg.muted">
                              {processDisplay.description}
                            </Text>
                          ) : null}
                        </VStack>
                      </Table.Cell>
                      {showRateExprSection ? (
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
                            placeholder={t(
                              "flow.udmEditor.form.placeholders.clickEditRateExpr",
                            )}
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
                      ) : null}
                      {showStoichSection
                        ? componentNames.map((compName) => (
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
                                placeholder={t(
                                  "flow.udmEditor.form.placeholders.stoichExample",
                                )}
                                title={row.stoich[compName] || "0"}
                                ref={(el) => {
                                  stoichInputRefs.current[
                                    `${rowIndex}:${compName}`
                                  ] = el
                                }}
                                onClick={() =>
                                  openStoichEditor(rowIndex, compName)
                                }
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
                          ))
                        : null}
                      {showAdvancedFields ? (
                        <Table.Cell minW={NOTE_COL_W}>
                          <Input
                            size="sm"
                            value={row.note}
                            onChange={(e) =>
                              setProcessRows((prev) =>
                                prev.map((item, idx) =>
                                  idx === rowIndex
                                    ? { ...item, note: e.target.value }
                                    : item,
                                ),
                              )
                            }
                          />
                        </Table.Cell>
                      ) : null}
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
                          disabled={processRows.length <= 1 || isReadonlyMode}
                        >
                          {t("common.delete")}
                        </Button>
                      </Table.Cell>
                      </Table.Row>
                    )
                  })}
                </Table.Body>
              </Table.Root>
            </Table.ScrollArea>
          </Box>

          {showRecipeBar ? (
            <Box mt={6}>
              <RecipeBar
                recipes={activeRecipes}
                onInsert={insertRecipeIntoRateExpr}
              />
            </Box>
          ) : null}

          {showValidationSection ? (
            <Box mt={6} borderWidth="1px" borderRadius="md" p={4}>
              <Flex align="center" justify="space-between" mb={3}>
                <Heading size="sm">
                  {t("flow.udmEditor.validation.sectionTitle")}
                </Heading>
                <HStack>
                  <Button size="sm" variant="subtle" onClick={runValidate}>
                    {t("flow.udmEditor.validation.actions.parseValidate")}
                  </Button>
                  <Button size="sm" onClick={mergeExtractedParameters}>
                    {t(
                      "flow.udmEditor.validation.actions.applyExtractedParams",
                    )}
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
                      {(validation.extracted_parameters || []).join(", ") ||
                        "-"}
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
          ) : null}

          {showValidationSection && (
            <Box mt={4}>
              <ContinuityCheckPanel
                continuityChecks={continuityChecks}
                onJumpToProcess={(processName) => {
                  const idx = processRows.findIndex(
                    (r) => r.name.trim() === processName.trim(),
                  )
                  if (idx < 0) return
                  if (isTutorialModel && !showStoichSection) {
                    handleTutorialStepChange(
                      Math.min(2, maxTutorialStep) as TutorialStep,
                    )
                  }
                  const el = processNameInputRefs.current[idx]
                  if (el) {
                    el.scrollIntoView({
                      behavior: "smooth",
                      block: "center",
                    })
                    el.focus()
                    el.select()
                  }
                }}
              />
            </Box>
          )}

          {showParameterSection ? (
            <Box mt={6} borderWidth="1px" borderRadius="md" p={4}>
              <Flex align="center" justify="space-between" mb={3}>
                <Heading size="sm">
                  {t("flow.udmEditor.form.sections.parameterWizard")}
                </Heading>
                <Button
                  size="sm"
                  onClick={() =>
                    setParameterRows((prev) => [...prev, emptyParameter()])
                  }
                  disabled={isReadonlyMode}
                >
                  {t("flow.udmEditor.form.actions.addParameter")}
                </Button>
              </Flex>
              <Table.Root size="sm">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader>
                      {t("flow.udmEditor.form.columns.name")}
                    </Table.ColumnHeader>
                    <Table.ColumnHeader>
                      {t("flow.udmEditor.form.columns.unit")}
                    </Table.ColumnHeader>
                    <Table.ColumnHeader>
                      {t("flow.udmEditor.form.columns.defaultValue")}
                    </Table.ColumnHeader>
                    <Table.ColumnHeader>
                      {t("flow.udmEditor.form.columns.min")}
                    </Table.ColumnHeader>
                    <Table.ColumnHeader>
                      {t("flow.udmEditor.form.columns.max")}
                    </Table.ColumnHeader>
                    <Table.ColumnHeader>
                      {t("flow.udmEditor.form.columns.scale")}
                    </Table.ColumnHeader>
                    <Table.ColumnHeader>
                      {t("flow.udmEditor.form.columns.note")}
                    </Table.ColumnHeader>
                    <Table.ColumnHeader>
                      {t("flow.udmEditor.form.columns.actions")}
                    </Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {parameterRows.map((row, rowIndex) => {
                    const parameterDisplay = parameterDisplayMap.get(row._rowId)
                    const parameterAlias = parameterDisplay?.label?.trim() || ""

                    return (
                      <Table.Row key={row._rowId}>
                      <Table.Cell>
                        <VStack align="stretch" gap={1}>
                          <Input
                            size="sm"
                            value={row.name}
                            ref={(el) => {
                              parameterNameInputRefs.current[rowIndex] = el
                            }}
                            onChange={(e) =>
                              setParameterRows((prev) =>
                                prev.map((item, idx) =>
                                  idx === rowIndex
                                    ? { ...item, name: e.target.value }
                                    : item,
                                ),
                              )
                            }
                          />
                          {parameterAlias && parameterAlias !== row.name.trim() ? (
                            <Text fontSize="xs" color="fg.muted">
                              {parameterAlias}
                            </Text>
                          ) : null}
                          {parameterDisplay?.description ? (
                            <Text fontSize="xs" color="fg.muted">
                              {parameterDisplay.description}
                            </Text>
                          ) : null}
                        </VStack>
                      </Table.Cell>
                      <Table.Cell>
                        <Input
                          size="sm"
                          value={row.unit}
                          onChange={(e) =>
                            setParameterRows((prev) =>
                              prev.map((item, idx) =>
                                idx === rowIndex
                                  ? { ...item, unit: e.target.value }
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
                                idx === rowIndex
                                  ? { ...item, minValue: e.target.value }
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
                          value={row.maxValue}
                          onChange={(e) =>
                            setParameterRows((prev) =>
                              prev.map((item, idx) =>
                                idx === rowIndex
                                  ? { ...item, maxValue: e.target.value }
                                  : item,
                              ),
                            )
                          }
                        />
                      </Table.Cell>
                      <Table.Cell>
                        <NativeSelect.Root size="sm">
                          <NativeSelect.Field
                            value={row.scale}
                            onChange={(e) =>
                              setParameterRows((prev) =>
                                prev.map((item, idx) =>
                                  idx === rowIndex
                                    ? {
                                        ...item,
                                        scale: e.target.value as "lin" | "log",
                                      }
                                    : item,
                                ),
                              )
                            }
                          >
                            <option value="lin">lin</option>
                            <option value="log">log</option>
                          </NativeSelect.Field>
                          <NativeSelect.Indicator />
                        </NativeSelect.Root>
                      </Table.Cell>
                      <Table.Cell>
                        <Input
                          size="sm"
                          value={row.note}
                          onChange={(e) =>
                            setParameterRows((prev) =>
                              prev.map((item, idx) =>
                                idx === rowIndex
                                  ? { ...item, note: e.target.value }
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
                          onClick={() =>
                            setParameterRows((prev) =>
                              prev.filter((_, idx) => idx !== rowIndex),
                            )
                          }
                          disabled={isReadonlyMode}
                        >
                          {t("common.delete")}
                        </Button>
                      </Table.Cell>
                      </Table.Row>
                    )
                  })}
                </Table.Body>
              </Table.Root>
            </Box>
          ) : null}

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
            <Button
              loading={isSaving}
              onClick={saveModel}
              disabled={isReadonlyMode}
            >
              {t("flow.udmEditor.actions.saveModel")}
            </Button>
            <Button
              colorPalette="blue"
              loading={isSaving}
              onClick={saveAndGenerateFlowchart}
              disabled={isReadonlyMode}
            >
              {t("flow.udmEditor.actions.saveAndGenerateFlow")}
            </Button>
            {!hideBackButton ? (
              <Button variant="subtle" onClick={handleBackClick}>
                {t("flow.udmEditor.actions.backToLibrary")}
              </Button>
            ) : null}
          </Flex>
        </Box>
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
          recipes={
            editorTarget.cellType === "rateExpr" && showRateExprSection
              ? activeRecipes
              : undefined
          }
          onSave={saveEditorValue}
          onClose={closeEditor}
        />
      ) : null}
    </Container>
  )
}

export default UDMModelEditorForm
