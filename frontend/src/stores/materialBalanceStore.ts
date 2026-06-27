import { create } from "zustand"
import { devtools } from "zustand/middleware"
import { isStandaloneRuntime } from "@/shared/runtimeConfig"
import type {
  FlowChartCreate,
  FlowChartPublic,
  FlowChartUpdate,
  FlowChartsPublic,
  MaterialBalanceInput,
  MaterialBalanceJobPublic,
  MaterialBalanceJobStatus,
} from "../client/types.gen"
import { t } from "../i18n"
import { standaloneComputeService } from "../services/standaloneComputeService"
import type { BaseModelState } from "./baseModelStore"

const MODEL_NAME = "Material Balance"
const legacyMaterialBalanceService = async () =>
  (await import("../client/sdk.gen")).MaterialBalanceService
const legacyFlowchartsService = async () =>
  (await import("../client/sdk.gen")).FlowchartsService

interface MaterialBalanceState
  extends BaseModelState<
    MaterialBalanceJobPublic,
    FlowChartPublic,
    FlowChartsPublic,
    FlowChartCreate,
    FlowChartUpdate
  > {
  // MaterialBalanceState specific properties (if any)
  // All base properties and methods are inherited from BaseModelState
}

export const useMaterialBalanceStore = create<MaterialBalanceState>()(
  devtools(
    (set, get) => ({
      // 初始状态
      currentJob: null,
      resultSummary: null,
      timeSeriesData: null,
      finalValues: null,
      analysisResultJobId: null,
      analysisResultStatus: "idle",
      analysisResultData: null,
      analysisResultError: null,
      validationResult: null,
      userJobs: [],
      flowcharts: [],
      currentFlowchart: null,
      isLoading: false,
      error: null,

      // Actions
      createCalculationJob: async (input: MaterialBalanceInput) => {
        set({
          isLoading: true,
          error: null,
          analysisResultJobId: null,
          analysisResultStatus: "idle",
          analysisResultData: null,
          analysisResultError: null,
        })
        try {
          const job = isStandaloneRuntime()
            ? await standaloneComputeService.createCalculationJob(
                "materialBalance",
                input,
              )
            : await (
                await legacyMaterialBalanceService()
              ).createCalculationJob({
                requestBody: input,
              })
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
          analysisResultJobId: null,
          analysisResultStatus: "idle",
          analysisResultData: null,
          analysisResultError: null,
        })
        try {
          const job = isStandaloneRuntime()
            ? await standaloneComputeService.createCalculationJobFromFlowchart(
                "materialBalance",
                flowchartData,
              )
            : await (
                await legacyMaterialBalanceService()
              ).createCalculationJobFromFlowchart({
                requestBody: flowchartData,
              })
          set({ currentJob: job, isLoading: false })
          return job
        } catch (error) {
          console.error("Error creating calculation job from flowchart:", error)
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
          const job = isStandaloneRuntime()
            ? await standaloneComputeService.getCalculationStatus(jobId)
            : await (await legacyMaterialBalanceService()).getCalculationStatus({
                jobId,
              })
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
          const summary = isStandaloneRuntime()
            ? await standaloneComputeService.getCalculationResultSummary(jobId)
            : await (
                await legacyMaterialBalanceService()
              ).getCalculationResultSummary({ jobId })
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

      getTimeSeriesData: async (params) => {
        set({ isLoading: true, error: null })
        try {
          const data = isStandaloneRuntime()
            ? await standaloneComputeService.getCalculationTimeseries(params)
            : await (
                await legacyMaterialBalanceService()
              ).getCalculationTimeseries(params)
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
          const data = isStandaloneRuntime()
            ? await standaloneComputeService.getCalculationFinalValues(jobId)
            : await (
                await legacyMaterialBalanceService()
              ).getCalculationFinalValues({
                jobId,
              })
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

      getAnalysisResult: async (jobId: string) => {
        set({
          analysisResultJobId: jobId,
          analysisResultStatus: "loading",
          analysisResultData: null,
          analysisResultError: null,
        })
        try {
          const data = isStandaloneRuntime()
            ? await standaloneComputeService.getAnalysisResult(jobId)
            : (
                await (await legacyMaterialBalanceService()).getJobInputData({
                  jobId,
                })
              ).result_data
          if (get().analysisResultJobId === jobId) {
            set({
              analysisResultStatus: "ready",
              analysisResultData: data,
              analysisResultError: null,
            })
          }
          return data
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : t("flow.analysis.loadFailed")
          if (get().analysisResultJobId === jobId) {
            set({
              analysisResultStatus: "error",
              analysisResultData: null,
              analysisResultError: message,
            })
          }
          throw error
        }
      },

      validateInput: async (input: MaterialBalanceInput) => {
        set({ isLoading: true, error: null })
        try {
          const result = isStandaloneRuntime()
            ? await standaloneComputeService.validateCalculationInput(
                "materialBalance",
                input,
              )
            : await (
                await legacyMaterialBalanceService()
              ).validateCalculationInput({
                requestBody: { input_data: input },
              })
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
          const response = isStandaloneRuntime()
            ? await standaloneComputeService.getUserCalculationJobs(
                "materialBalance",
                skip,
                limit,
              )
            : await (
                await legacyMaterialBalanceService()
              ).getUserCalculationJobs({
                skip,
                limit,
              })
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
          if (isStandaloneRuntime()) {
            await standaloneComputeService.deleteCalculationJob(jobId)
          } else {
            await (
              await legacyMaterialBalanceService()
            ).deleteCalculationJob({ jobId })
          }
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
          const data = isStandaloneRuntime()
            ? await standaloneComputeService.getJobInputData(jobId)
            : await (await legacyMaterialBalanceService()).getJobInputData({
                jobId,
              })
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
            }
          } catch (error) {
            console.error("Polling error:", error)
            clearInterval(intervalId)
          }
        }

        const intervalId = setInterval(poll, actualInterval)

        // 返回清理函数
        return () => clearInterval(intervalId)
      },

      clearError: () => {
        set({ error: null })
      },

      reset: () => {
        set({
          currentJob: null,
          resultSummary: null,
          timeSeriesData: null,
          finalValues: null,
          analysisResultJobId: null,
          analysisResultStatus: "idle",
          analysisResultData: null,
          analysisResultError: null,
          validationResult: null,
          userJobs: [],
          flowcharts: [],
          currentFlowchart: null,
          isLoading: false,
          error: null,
        })
      },

      // Flowchart methods
      getFlowcharts: async (skip = 0, limit = 50) => {
        try {
          set({ isLoading: true, error: null })
          const response = await (await legacyFlowchartsService()).readFlowcharts({
            skip,
            limit,
          })
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

      createFlowchart: async (flowchart: FlowChartCreate) => {
        try {
          set({ isLoading: true, error: null })
          const response = await (
            await legacyFlowchartsService()
          ).createFlowchart({
            requestBody: flowchart,
          })
          // 重新获取flowcharts列表
          await get().getFlowcharts()
          set({ isLoading: false })
          return response
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
        try {
          set({ isLoading: true, error: null })
          const response = await (await legacyFlowchartsService()).readFlowchart({
            id,
          })
          set({ currentFlowchart: response, isLoading: false })
          return response
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

      updateFlowchart: async (id: string, flowchart: FlowChartUpdate) => {
        try {
          set({ isLoading: true, error: null })
          const response = await (await legacyFlowchartsService()).updateFlowchart({
            id,
            requestBody: flowchart,
          })
          // 重新获取flowcharts列表
          await get().getFlowcharts()
          set({ isLoading: false })
          return response
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
        try {
          set({ isLoading: true, error: null })
          await (await legacyFlowchartsService()).deleteFlowchart({ id })
          // 重新获取flowcharts列表
          await get().getFlowcharts()
          set({ isLoading: false })
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
    }),
    {
      name: "material-balance-store",
    },
  ),
)

// 导出类型和状态选择器
export type { MaterialBalanceState }

// 常用的状态选择器
export const selectCurrentJob = (state: MaterialBalanceState) =>
  state.currentJob
export const selectResultSummary = (state: MaterialBalanceState) =>
  state.resultSummary
export const selectTimeSeriesData = (state: MaterialBalanceState) =>
  state.timeSeriesData
export const selectFinalValues = (state: MaterialBalanceState) =>
  state.finalValues
export const selectValidationResult = (state: MaterialBalanceState) =>
  state.validationResult
export const selectUserJobs = (state: MaterialBalanceState) => state.userJobs
export const selectIsLoading = (state: MaterialBalanceState) => state.isLoading
export const selectError = (state: MaterialBalanceState) => state.error

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
