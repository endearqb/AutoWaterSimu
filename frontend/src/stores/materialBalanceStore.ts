import { create } from "zustand"
import { devtools } from "zustand/middleware"
import { FlowchartsService, MaterialBalanceService } from "../client/sdk.gen"
import type {
  FlowChartCreate,
  FlowChartPublic,
  FlowChartUpdate,
  FlowChartsPublic,
  MaterialBalanceInput,
  MaterialBalanceJobPublic,
  MaterialBalanceJobStatus,
} from "../client/types.gen"
import type { BaseModelState } from "./baseModelStore"

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
      validationResult: null,
      userJobs: [],
      flowcharts: [],
      currentFlowchart: null,
      isLoading: false,
      error: null,

      // Actions
      createCalculationJob: async (input: MaterialBalanceInput) => {
        set({ isLoading: true, error: null })
        try {
          const job = await MaterialBalanceService.createCalculationJob({
            requestBody: input,
          })
          set({ currentJob: job, isLoading: false })
          return job
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Failed to create calculation job"
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
            await MaterialBalanceService.createCalculationJobFromFlowchart({
              requestBody: flowchartData,
            })
          set({ currentJob: job, isLoading: false })
          return job
        } catch (error) {
          console.error("Error creating calculation job from flowchart:", error)
          set({
            error: error instanceof Error ? error.message : "Unknown error",
            isLoading: false,
          })
          throw error
        }
      },

      getCalculationStatus: async (jobId: string) => {
        set({ isLoading: true, error: null })
        try {
          const job = await MaterialBalanceService.getCalculationStatus({
            jobId,
          })
          set({ currentJob: job, isLoading: false })
          return job
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Failed to get calculation status"
          set({ error: errorMessage, isLoading: false })
          throw error
        }
      },

      getResultSummary: async (jobId: string) => {
        set({ isLoading: true, error: null })
        try {
          const summary =
            await MaterialBalanceService.getCalculationResultSummary({ jobId })
          set({ resultSummary: summary, isLoading: false })
          return summary
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Failed to get result summary"
          set({ error: errorMessage, isLoading: false })
          throw error
        }
      },

      getTimeSeriesData: async (params) => {
        set({ isLoading: true, error: null })
        try {
          const data =
            await MaterialBalanceService.getCalculationTimeseries(params)
          set({ timeSeriesData: data, isLoading: false })
          return data
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Failed to get time series data"
          set({ error: errorMessage, isLoading: false })
          throw error
        }
      },

      getFinalValues: async (jobId: string) => {
        set({ isLoading: true, error: null })
        try {
          const data = await MaterialBalanceService.getCalculationFinalValues({
            jobId,
          })
          set({ finalValues: data, isLoading: false })
          return data
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Failed to get final values"
          set({ error: errorMessage, isLoading: false })
          throw error
        }
      },

      validateInput: async (input: MaterialBalanceInput) => {
        set({ isLoading: true, error: null })
        try {
          const result = await MaterialBalanceService.validateCalculationInput({
            requestBody: { input_data: input },
          })
          set({ validationResult: result, isLoading: false })
          return result
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Failed to validate input"
          set({ error: errorMessage, isLoading: false })
          throw error
        }
      },

      getUserJobs: async (skip = 0, limit = 50) => {
        set({ isLoading: true, error: null })
        try {
          const response = await MaterialBalanceService.getUserCalculationJobs({
            skip,
            limit,
          })
          const jobs = response.data
          const count = response.count
          set({ userJobs: jobs, isLoading: false })
          return { data: jobs, count }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Failed to get user jobs"
          set({ error: errorMessage, isLoading: false })
          throw error
        }
      },

      deleteJob: async (jobId: string) => {
        set({ isLoading: true, error: null })
        try {
          await MaterialBalanceService.deleteCalculationJob({ jobId })
          const { userJobs } = get()
          set({
            userJobs: userJobs.filter((job) => job.job_id !== jobId),
            isLoading: false,
          })
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Failed to delete job"
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
          const response = await FlowchartsService.readFlowcharts({
            skip,
            limit,
          })
          set({ flowcharts: response.data, isLoading: false })
          return response
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Failed to get flowcharts"
          set({ error: errorMessage, isLoading: false })
          throw error
        }
      },

      createFlowchart: async (flowchart: FlowChartCreate) => {
        try {
          set({ isLoading: true, error: null })
          const response = await FlowchartsService.createFlowchart({
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
              : "Failed to create flowchart"
          set({ error: errorMessage, isLoading: false })
          throw error
        }
      },

      getFlowchart: async (id: string) => {
        try {
          set({ isLoading: true, error: null })
          const response = await FlowchartsService.readFlowchart({ id })
          set({ currentFlowchart: response, isLoading: false })
          return response
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Failed to get flowchart"
          set({ error: errorMessage, isLoading: false })
          throw error
        }
      },

      updateFlowchart: async (id: string, flowchart: FlowChartUpdate) => {
        try {
          set({ isLoading: true, error: null })
          const response = await FlowchartsService.updateFlowchart({
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
              : "Failed to update flowchart"
          set({ error: errorMessage, isLoading: false })
          throw error
        }
      },

      deleteFlowchart: async (id: string) => {
        try {
          set({ isLoading: true, error: null })
          await FlowchartsService.deleteFlowchart({ id })
          // 重新获取flowcharts列表
          await get().getFlowcharts()
          set({ isLoading: false })
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Failed to delete flowchart"
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
      return "等待中"
    case "running":
      return "计算中"
    case "success":
      return "已完成"
    case "failed":
      return "失败"
    case "cancelled":
      return "已取消"
    default:
      return "未知"
  }
}
