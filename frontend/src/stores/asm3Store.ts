import { create } from "zustand"
import { devtools } from "zustand/middleware"
import type {
  ASM3FlowChartCreate,
  ASM3FlowChartPublic,
  ASM3FlowChartUpdate,
  ASM3FlowChartsPublic,
  ASM3JobPublic,
  MaterialBalanceInput,
  MaterialBalanceJobStatus,
  MaterialBalanceResultSummary,
  MaterialBalanceTimeSeriesResponse,
  MaterialBalanceValidationResponse,
} from "../client/types.gen"
import { t } from "../i18n"
import { asm3Service } from "../services/asm3Service"
import type { BaseModelState } from "./baseModelStore"

const MODEL_NAME = "ASM3"

interface ASM3State
  extends BaseModelState<
    ASM3JobPublic,
    ASM3FlowChartPublic,
    ASM3FlowChartsPublic,
    ASM3FlowChartCreate,
    ASM3FlowChartUpdate
  > {
  // 继承的属性需要重新声明以确保类型正确
  currentJob: ASM3JobPublic | null
  resultSummary: MaterialBalanceResultSummary | null
  timeSeriesData: MaterialBalanceTimeSeriesResponse | null
  finalValues: any | null
  userJobs: ASM3JobPublic[]
  flowcharts: ASM3FlowChartPublic[]
  currentFlowchart: ASM3FlowChartPublic | null
  isLoading: boolean
  error: string | null

  // ASM3特定的状态扩展
  validationResult: MaterialBalanceValidationResponse | null
}

export const useASM3Store = create<ASM3State>()(
  devtools(
    (set, get) => ({
      // Initial state
      currentJob: null,
      resultSummary: null,
      timeSeriesData: null,
      finalValues: null,
      validationResult: null,
      userJobs: [],
      flowcharts: [],
      currentFlowchart: null,
      isLoading: false,
      error: null,

      // Actions - 计算任务相关（继承自BaseModelState）
      createCalculationJob: async (input: MaterialBalanceInput) => {
        set({ isLoading: true, error: null })
        try {
          const job = await asm3Service.createCalculationJob(input)
          set({ currentJob: job, isLoading: false })
          return job
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : t("flow.store.model.createJobFailed", {
                  model: MODEL_NAME,
                })
          set({ error: errorMessage, isLoading: false })
          throw error
        }
      },

      createCalculationJobFromFlowchart: async (flowchartData: any) => {
        // 清理之前的结果数据
        set({
          isLoading: true,
          error: null,
          resultSummary: null,
          timeSeriesData: null,
          finalValues: null,
        })
        try {
          const job =
            await asm3Service.createCalculationJobFromFlowchart(flowchartData)
          set({ currentJob: job, isLoading: false })
          return job
        } catch (error) {
          console.error(
            "Error creating ASM3 calculation job from flowchart:",
            error,
          )
          set({
            error:
              error instanceof Error
                ? error.message
                : t("flow.store.model.createJobFromFlowchartFailed", {
                    model: MODEL_NAME,
                  }),
            isLoading: false,
          })
          throw error
        }
      },

      getCalculationStatus: async (jobId: string) => {
        set({ isLoading: true, error: null })
        try {
          const job = await asm3Service.getCalculationStatus(jobId)
          set({ currentJob: job, isLoading: false })
          return job
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : t("flow.store.model.getStatusFailed", { model: MODEL_NAME })
          set({ error: errorMessage, isLoading: false })
          throw error
        }
      },

      getResultSummary: async (jobId: string) => {
        set({ isLoading: true, error: null })
        try {
          const summary = await asm3Service.getCalculationResultSummary(jobId)
          set({ resultSummary: summary, isLoading: false })
          return summary
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : t("flow.store.model.getSummaryFailed", { model: MODEL_NAME })
          set({ error: errorMessage, isLoading: false })
          throw error
        }
      },

      getTimeSeriesData: async (params: {
        jobId: string
        startTime?: number
        endTime?: number
        page?: number
        pageSize?: number
        nodeIds?: string[]
        edgeIds?: string[]
      }) => {
        set({ isLoading: true, error: null })
        try {
          const data = await asm3Service.getCalculationTimeseries(params)
          set({ timeSeriesData: data, isLoading: false })
          return data
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : t("flow.store.model.getTimeSeriesFailed", {
                  model: MODEL_NAME,
                })
          set({ error: errorMessage, isLoading: false })
          throw error
        }
      },

      getFinalValues: async (jobId: string) => {
        set({ isLoading: true, error: null })
        try {
          const data = await asm3Service.getCalculationFinalValues(jobId)
          set({ finalValues: data, isLoading: false })
          return data
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : t("flow.store.model.getFinalValuesFailed", {
                  model: MODEL_NAME,
                })
          set({ error: errorMessage, isLoading: false })
          throw error
        }
      },

      validateInput: async (input: MaterialBalanceInput) => {
        set({ isLoading: true, error: null })
        try {
          const result = await asm3Service.validateCalculationInput(input)
          set({ validationResult: result, isLoading: false })
          return result
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : t("flow.store.model.validateInputFailed", {
                  model: MODEL_NAME,
                })
          set({ error: errorMessage, isLoading: false })
          throw error
        }
      },

      getUserJobs: async (skip = 0, limit = 50) => {
        set({ isLoading: true, error: null })
        try {
          const response = await asm3Service.getUserCalculationJobs(skip, limit)
          const jobs = response.data
          const count = response.count
          set({ userJobs: jobs, isLoading: false })
          return { data: jobs, count }
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : t("flow.store.model.getUserJobsFailed", {
                  model: MODEL_NAME,
                })
          set({ error: errorMessage, isLoading: false })
          throw error
        }
      },

      deleteJob: async (jobId: string) => {
        set({ isLoading: true, error: null })
        try {
          await asm3Service.deleteCalculationJob(jobId)
          const { userJobs } = get()
          set({
            userJobs: userJobs.filter((job) => job.job_id !== jobId),
            isLoading: false,
          })
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : t("flow.store.model.deleteJobFailed", { model: MODEL_NAME })
          set({ error: errorMessage, isLoading: false })
          throw error
        }
      },

      getJobInputData: async (jobId: string) => {
        set({ isLoading: true, error: null })
        try {
          const data = await asm3Service.getJobInputData(jobId)
          set({ isLoading: false })
          return data
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : t("flow.store.model.getJobInputFailed", { model: MODEL_NAME })
          set({ error: errorMessage, isLoading: false })
          throw error
        }
      },

      pollJobStatus: (
        jobId: string,
        interval?: number,
        flowchartData?: any,
      ) => {
        const { getCalculationStatus } = get()

        // 计算动态轮询间隔
        const calculateDynamicInterval = (flowchartData?: any): number => {
          // 如果手动指定了间隔，使用指定值
          if (interval !== undefined) {
            return interval
          }

          // 如果没有流程图数据，使用默认间隔
          if (!flowchartData) {
            return 2000
          }

          const nodeCount = flowchartData.nodes?.length || 0
          const edgeCount = flowchartData.edges?.length || 0
          const customParamCount = flowchartData.customParameters?.length || 0
          const hours = flowchartData.calculationParameters?.hours || 1
          const stepsPerHour =
            flowchartData.calculationParameters?.steps_per_hour || 10
          const totalSteps = hours * stepsPerHour

          // 计算复杂度因子，考虑节点、边、自定义参数和计算步数
          const complexityFactor =
            (nodeCount + edgeCount) * customParamCount * (totalSteps / 100)

          // 基础间隔：2秒
          let dynamicInterval = 2000

          // 根据复杂度调整间隔
          if (complexityFactor <= 50) {
            // 简单流程图：2秒
            dynamicInterval = 2000
          } else if (complexityFactor <= 200) {
            // 中等复杂度：4秒
            dynamicInterval = 3000
          } else if (complexityFactor <= 500) {
            // 复杂流程图：8秒
            dynamicInterval = 4000
          } else if (complexityFactor <= 1000) {
            // 高复杂度流程图：12秒
            dynamicInterval = 5000
          } else {
            // 非常复杂的流程图：20秒
            dynamicInterval = 10000
          }

          return dynamicInterval
        }

        const actualInterval = calculateDynamicInterval(flowchartData)

        const poll = async () => {
          try {
            const job = await getCalculationStatus(jobId)
            // 如果任务完成（成功、失败或取消），停止轮询
            if (["success", "failed", "cancelled"].includes(job.status)) {
              clearInterval(intervalId)

              // 如果任务成功完成，自动获取结果摘要和最终值
              if (job.status === "success") {
                try {
                  await get().getResultSummary(jobId)
                  await get().getFinalValues(jobId)
                } catch (error) {
                  console.error(
                    "Failed to fetch results after job completion:",
                    error,
                  )
                }
              }
            }
          } catch (error) {
            console.error("ASM3 polling error:", error)
            clearInterval(intervalId)
          }
        }

        const intervalId = setInterval(poll, actualInterval)

        // 返回清理函数
        return () => clearInterval(intervalId)
      },

      // Actions - 流程图相关（继承自BaseModelState）
      getFlowcharts: async (skip = 0, limit = 50) => {
        set({ isLoading: true, error: null })
        try {
          const response = await asm3Service.getFlowcharts(skip, limit)
          set({ flowcharts: response.data, isLoading: false })
          return response
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : t("flow.store.model.getFlowchartsFailed", {
                  model: MODEL_NAME,
                })
          set({ error: errorMessage, isLoading: false })
          throw error
        }
      },

      createFlowchart: async (flowchart: ASM3FlowChartCreate) => {
        set({ isLoading: true, error: null })
        try {
          const newFlowchart = await asm3Service.createFlowchart(flowchart)
          const { flowcharts } = get()
          set({
            flowcharts: [...flowcharts, newFlowchart],
            currentFlowchart: newFlowchart,
            isLoading: false,
          })
          return newFlowchart
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : t("flow.store.model.createFlowchartFailed", {
                  model: MODEL_NAME,
                })
          set({ error: errorMessage, isLoading: false })
          throw error
        }
      },

      getFlowchart: async (id: string) => {
        set({ isLoading: true, error: null })
        try {
          const flowchart = await asm3Service.getFlowchart(id)
          set({ currentFlowchart: flowchart, isLoading: false })
          return flowchart
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : t("flow.store.model.getFlowchartFailed", {
                  model: MODEL_NAME,
                })
          set({ error: errorMessage, isLoading: false })
          throw error
        }
      },

      updateFlowchart: async (id: string, flowchart: ASM3FlowChartUpdate) => {
        set({ isLoading: true, error: null })
        try {
          const updatedFlowchart = await asm3Service.updateFlowchart(
            id,
            flowchart,
          )
          const { flowcharts } = get()
          set({
            flowcharts: flowcharts.map((f) =>
              f.id === id ? updatedFlowchart : f,
            ),
            currentFlowchart: updatedFlowchart,
            isLoading: false,
          })
          return updatedFlowchart
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : t("flow.store.model.updateFlowchartFailed", {
                  model: MODEL_NAME,
                })
          set({ error: errorMessage, isLoading: false })
          throw error
        }
      },

      deleteFlowchart: async (id: string) => {
        set({ isLoading: true, error: null })
        try {
          await asm3Service.deleteFlowchart(id)
          const { flowcharts, currentFlowchart } = get()
          set({
            flowcharts: flowcharts.filter((f) => f.id !== id),
            currentFlowchart:
              currentFlowchart?.id === id ? null : currentFlowchart,
            isLoading: false,
          })
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : t("flow.store.model.deleteFlowchartFailed", {
                  model: MODEL_NAME,
                })
          set({ error: errorMessage, isLoading: false })
          throw error
        }
      },

      // 通用Actions
      clearError: () => {
        set({ error: null })
      },

      reset: () => {
        set({
          currentJob: null,
          resultSummary: null,
          timeSeriesData: null,
          finalValues: null,
          validationResult: null,
          userJobs: [],
          flowcharts: [],
          currentFlowchart: null,
          isLoading: false,
          error: null,
        })
      },
    }),
    {
      name: "asm3-store",
    },
  ),
)

// 导出类型和状态选择器
export type { ASM3State }

// 常用的状态选择器
export const selectCurrentJob = (state: ASM3State) => state.currentJob
export const selectResultSummary = (state: ASM3State) => state.resultSummary
export const selectTimeSeriesData = (state: ASM3State) => state.timeSeriesData
export const selectFinalValues = (state: ASM3State) => state.finalValues
export const selectValidationResult = (state: ASM3State) =>
  state.validationResult
export const selectUserJobs = (state: ASM3State) => state.userJobs
export const selectFlowcharts = (state: ASM3State) => state.flowcharts
export const selectCurrentFlowchart = (state: ASM3State) =>
  state.currentFlowchart
export const selectIsLoading = (state: ASM3State) => state.isLoading
export const selectError = (state: ASM3State) => state.error

// 计算状态辅助函数
export const isJobRunning = (status: MaterialBalanceJobStatus): boolean => {
  return ["pending", "running"].includes(status)
}

export const isJobCompleted = (status: MaterialBalanceJobStatus): boolean => {
  return ["success", "failed", "cancelled"].includes(status)
}

export const isJobSuccessful = (status: MaterialBalanceJobStatus): boolean => {
  return status === "success"
}

export const getJobStatusColor = (status: MaterialBalanceJobStatus): string => {
  switch (status) {
    case "pending":
      return "yellow"
    case "running":
      return "blue"
    case "success":
      return "green"
    case "failed":
      return "red"
    case "cancelled":
      return "gray"
    default:
      return "gray"
  }
}

export const getJobStatusText = (status: MaterialBalanceJobStatus): string => {
  switch (status) {
    case "pending":
      return t("flow.jobStatus.pending")
    case "running":
      return t("flow.jobStatus.running")
    case "success":
      return t("flow.jobStatus.success")
    case "failed":
      return t("flow.jobStatus.failed")
    case "cancelled":
      return t("flow.jobStatus.cancelled")
    default:
      return t("common.unknown")
  }
}
