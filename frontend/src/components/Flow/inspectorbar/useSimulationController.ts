import { useEffect, useMemo, useRef, useState } from "react"
import {
  type CalculationParameters,
  type SimulationConfig,
  getSimulationConfig,
  validateCalculationParameters,
} from "../../../config/simulationConfig"
import {
  getJobStatusText as asm1GetJobStatusText,
  isJobCompleted as asm1IsJobCompleted,
  isJobRunning as asm1IsJobRunning,
  isJobSuccessful as asm1IsJobSuccessful,
} from "../../../stores/asm1Store"
import {
  getJobStatusText as asm1SlimGetJobStatusText,
  isJobCompleted as asm1SlimIsJobCompleted,
  isJobRunning as asm1SlimIsJobRunning,
  isJobSuccessful as asm1SlimIsJobSuccessful,
  useASM1SlimStore,
} from "../../../stores/asm1slimStore"
import {
  getJobStatusText as asm3GetJobStatusText,
  isJobCompleted as asm3IsJobCompleted,
  isJobRunning as asm3IsJobRunning,
  isJobSuccessful as asm3IsJobSuccessful,
} from "../../../stores/asm3Store"
import type { BaseModelState } from "../../../stores/baseModelStore"
import useFlowStore from "../../../stores/flowStore"
import type { RFState } from "../../../stores/flowStore"
import {
  getJobStatusText as materialBalanceGetJobStatusText,
  isJobCompleted as materialBalanceIsJobCompleted,
  isJobRunning as materialBalanceIsJobRunning,
  isJobSuccessful as materialBalanceIsJobSuccessful,
} from "../../../stores/materialBalanceStore"
import { useI18n } from "../../../i18n"

type SimulationModelStore = Pick<
  BaseModelState<any, any, any, any, any>,
  | "createCalculationJobFromFlowchart"
  | "isLoading"
  | "currentJob"
  | "getCalculationStatus"
  | "pollJobStatus"
  | "resultSummary"
  | "getResultSummary"
  | "getFinalValues"
>

export interface SimulationControllerProps {
  store?: () => any
  modelStore?: () => BaseModelState<any, any, any, any, any>
  modelType?: string
}

interface VolumeDepletionInfo {
  time: number
  isValid: boolean
}

export interface SimulationController {
  config: SimulationConfig
  modelType: string
  // 参数与配置
  simulationHours: number
  simulationSteps: number
  solverMethod: string
  tolerance: number
  maxIterations: number
  maxMemoryMb: number
  samplingIntervalHours?: number
  validationErrors: string[]
  validateAndUpdateParameters: (
    params: Partial<CalculationParameters>,
  ) => boolean
  calculateVolumeDepletionTime: VolumeDepletionInfo
  maxSimulationTime: number
  // 任务与进度
  showCompletionAlert: boolean
  isCalculationSuccessful: boolean
  isJobCurrentlyRunning: boolean
  elapsedTime: number
  estimatedTotalTime: number
  remainingTime: number
  progressPercentage: number
  formatTime: (seconds: number) => string
  handleStartSimulation: () => Promise<void>
  // 其他依赖
  getJobStatusText: (status: any) => string
  finalStore: SimulationModelStore
  selectedNode: RFState["selectedNode"]
  edges: RFState["edges"]
  edgeParameterConfigs: RFState["edgeParameterConfigs"]
}

export function useSimulationController(
  props: SimulationControllerProps = {},
): SimulationController {
  const { store, modelStore, modelType = "materialBalance" } = props
  const { t, language } = useI18n()

  const config = getSimulationConfig(modelType)

  const getModelHelpers = (type: string) => {
    switch (type) {
      case "asm3":
        return {
          isJobCompleted: asm3IsJobCompleted,
          isJobSuccessful: asm3IsJobSuccessful,
          isJobRunning: asm3IsJobRunning,
          getJobStatusText: asm3GetJobStatusText,
        }
      case "asm1":
        return {
          isJobCompleted: asm1IsJobCompleted,
          isJobSuccessful: asm1IsJobSuccessful,
          isJobRunning: asm1IsJobRunning,
          getJobStatusText: asm1GetJobStatusText,
        }
      case "asm1slim":
        return {
          isJobCompleted: asm1SlimIsJobCompleted,
          isJobSuccessful: asm1SlimIsJobSuccessful,
          isJobRunning: asm1SlimIsJobRunning,
          getJobStatusText: asm1SlimGetJobStatusText,
        }
      default:
        return {
          isJobCompleted: materialBalanceIsJobCompleted,
          isJobSuccessful: materialBalanceIsJobSuccessful,
          isJobRunning: materialBalanceIsJobRunning,
          getJobStatusText: materialBalanceGetJobStatusText,
        }
    }
  }

  const { isJobCompleted, isJobSuccessful, isJobRunning, getJobStatusText } =
    getModelHelpers(modelType)

  const flowStore = store || useFlowStore
  const {
    selectedNode,
    calculationParameters,
    updateCalculationParameters,
    exportFlowData,
    setCurrentJobId,
    currentFlowChartName,
    importedFileName,
    currentJobId,
    nodes,
    edges,
    edgeParameterConfigs,
  } = flowStore()

  const {
    hours: simulationHours,
    steps_per_hour: simulationSteps,
    solver_method: solverMethod,
    tolerance,
    max_iterations: maxIterations,
    max_memory_mb: maxMemoryMb,
    sampling_interval_hours: samplingIntervalHours,
  } = calculationParameters

  const defaultModelStore = useASM1SlimStore()
  const currentModelStore = modelStore ? modelStore() : defaultModelStore

  const {
    createCalculationJobFromFlowchart,
    isLoading: isCalculating,
    currentJob,
    getCalculationStatus,
    pollJobStatus,
    resultSummary,
    getResultSummary,
    getFinalValues,
  } = currentModelStore as SimulationModelStore

  const finalStore: SimulationModelStore = {
    createCalculationJobFromFlowchart,
    isLoading: isCalculating,
    currentJob,
    getCalculationStatus,
    pollJobStatus,
    resultSummary,
    getResultSummary,
    getFinalValues,
  }

  const [validationErrors, setValidationErrors] = useState<string[]>([])

  const validateAndUpdateParameters = (
    newParams: Partial<CalculationParameters>,
  ) => {
    const validation = validateCalculationParameters(newParams, modelType)
    setValidationErrors(validation.errors)

    if (validation.isValid) {
      updateCalculationParameters(newParams)
    }

    return validation.isValid
  }

  const pollCleanupRef = useRef<(() => void) | null>(null)

  const [elapsedTime, setElapsedTime] = useState(0)
  const [estimatedTotalTime, setEstimatedTotalTime] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const handleStartSimulation = async () => {
    try {
      if (pollCleanupRef.current) {
        pollCleanupRef.current()
        pollCleanupRef.current = null
      }
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }

      setElapsedTime(0)

      const flowData = exportFlowData()

      const nodeCount = flowData.nodes?.length || 0
      const edgeCount = flowData.edges?.length || 0
      const customParamCount = flowData.customParameters?.length || 0
      const hours = flowData.calculationParameters?.hours || 1
      const stepsPerHour = flowData.calculationParameters?.steps_per_hour || 10
      const totalSteps = hours * stepsPerHour

      const complexityFactor =
        (nodeCount + edgeCount) * customParamCount * (totalSteps / 100)
      let estimatedTime = 2
      if (complexityFactor <= 100) {
        estimatedTime = 2
      } else if (complexityFactor <= 300) {
        estimatedTime = 4
      } else if (complexityFactor <= 600) {
        estimatedTime = 8
      } else if (complexityFactor <= 1100) {
        estimatedTime = 16
      } else {
        estimatedTime = 60
      }
      setEstimatedTotalTime(estimatedTime)

      const timestamp = new Date().toLocaleString(
        language === "zh" ? "zh-CN" : "en-US",
      )
      const flowChartName =
        currentFlowChartName ||
        importedFileName ||
        t("flow.simulation.defaultFlowchartName", { timestamp })

      const flowDataWithName = {
        ...flowData,
        name: flowChartName,
      }

      const job =
        await finalStore.createCalculationJobFromFlowchart(flowDataWithName)

      if (job && (job as any).job_id) {
        const jobId = (job as any).job_id as string
        setCurrentJobId(jobId)

        timerRef.current = setInterval(() => {
          setElapsedTime((prev) => prev + 1)
        }, 1000)

        pollCleanupRef.current = finalStore.pollJobStatus(
          jobId,
          undefined,
          flowData,
        )
      }
    } catch (error) {
      console.error(t("flow.simulation.startFailed"), error)
    }
  }

  useEffect(() => {
    return () => {
      if (pollCleanupRef.current) {
        pollCleanupRef.current()
      }
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  const currentJobStatus = currentJob?.status as string | undefined
  const {
    getCalculationStatus: getCalculationStatusFromStore,
    getResultSummary: getResultSummaryFromStore,
    getFinalValues: getFinalValuesFromStore,
  } = finalStore

  useEffect(() => {
    if (
      currentJobStatus &&
      isJobCompleted(currentJobStatus as any) &&
      timerRef.current
    ) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [currentJobStatus, isJobCompleted])

  useEffect(() => {
    if (currentJobId && !currentJob) {
      getCalculationStatusFromStore(currentJobId).catch(console.error)
    }
  }, [currentJobId, currentJob, getCalculationStatusFromStore])

  useEffect(() => {
    if (currentJobStatus === "success" && currentJobId) {
      const promises = [
        getResultSummaryFromStore(currentJobId),
        getFinalValuesFromStore(currentJobId),
      ]

      Promise.all(promises).catch(console.error)
    }
  }, [
    currentJobStatus,
    currentJobId,
    getResultSummaryFromStore,
    getFinalValuesFromStore,
  ])

  const showCompletionAlert =
    !!currentJob && isJobCompleted(currentJobStatus as any)
  const isCalculationSuccessful =
    !!currentJob && isJobSuccessful(currentJobStatus as any)
  const isJobCurrentlyRunning = currentJob
    ? isJobRunning(currentJobStatus as any)
    : false

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const remainingTime = Math.max(0, estimatedTotalTime - elapsedTime)

  const progressPercentage =
    estimatedTotalTime > 0
      ? Math.min(100, (elapsedTime / estimatedTotalTime) * 100)
      : 0

  const calculateVolumeDepletionTime: VolumeDepletionInfo = useMemo(() => {
    if (!nodes || !edges || nodes.length === 0 || edges.length === 0) {
      return { time: config.hours.max, isValid: true }
    }

    let minDepletionTime = config.hours.max

    nodes.forEach((node: any) => {
      const nodeType = node.type
      const nodeData = node.data

      if (nodeType === "input" || nodeType === "output") {
        return
      }

      const initialVolume =
        Number.parseFloat(nodeData?.volume as string) || 1e-6

      let totalInflowRate = 0
      let totalOutflowRate = 0

      edges.forEach((edge: any) => {
        const edgeData = edge.data
        const flowRate = Number.parseFloat(edgeData?.flow as string) || 0

        if (edge.target === node.id) {
          totalInflowRate += flowRate
        }
        if (edge.source === node.id) {
          totalOutflowRate += flowRate
        }
      })

      const netOutflowRate = totalOutflowRate - totalInflowRate

      if (netOutflowRate > 0) {
        const depletionTime = initialVolume / netOutflowRate
        minDepletionTime = Math.min(minDepletionTime, depletionTime)
      }
    })

    const isValid = minDepletionTime >= 0.5
    const finalTime = isValid
      ? Math.min(minDepletionTime, config.hours.max)
      : minDepletionTime

    return { time: finalTime, isValid }
  }, [nodes, edges, config.hours.max])

  const maxSimulationTime = calculateVolumeDepletionTime.isValid
    ? Math.floor(calculateVolumeDepletionTime.time * 2) / 2
    : 0.5

  return {
    config,
    modelType,
    simulationHours,
    simulationSteps,
    solverMethod,
    tolerance,
    maxIterations,
    maxMemoryMb,
    samplingIntervalHours,
    validationErrors,
    validateAndUpdateParameters,
    calculateVolumeDepletionTime,
    maxSimulationTime,
    showCompletionAlert,
    isCalculationSuccessful,
    isJobCurrentlyRunning,
    elapsedTime,
    estimatedTotalTime,
    remainingTime,
    progressPercentage,
    formatTime,
    handleStartSimulation,
    getJobStatusText,
    finalStore,
    selectedNode,
    edges,
    edgeParameterConfigs,
  }
}
