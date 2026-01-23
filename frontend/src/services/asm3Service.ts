import { Asm3FlowchartsService, Asm3Service } from "../client/sdk.gen"
import type {
  ASM3FlowChartCreate,
  ASM3FlowChartPublic,
  ASM3FlowChartUpdate,
  ASM3FlowChartsPublic,
  ASM3JobInputDataResponse,
  ASM3JobPublic,
  ASM3JobsPublic,
  MaterialBalanceInput,
  MaterialBalanceResultSummary,
  MaterialBalanceTimeSeriesResponse,
  MaterialBalanceValidationResponse,
} from "../client/types.gen"
import { t } from "@/utils/i18n"
import type { BaseModelService } from "./baseModelService"
import { handleApiError } from "./baseModelService"

/**
 * ASM3模型服务实现
 * 基于BaseModelService接口，封装ASM3特定的API调用
 */
class ASM3ServiceImpl
  implements
    BaseModelService<
      ASM3JobPublic,
      ASM3FlowChartPublic,
      ASM3JobsPublic,
      ASM3FlowChartsPublic,
      ASM3FlowChartCreate,
      ASM3FlowChartUpdate,
      ASM3JobInputDataResponse
    >
{
  private readonly modelName = "ASM3"

  // ========== 计算任务相关方法 ==========

  /**
   * 创建计算任务
   */
  async createCalculationJob(
    inputData: MaterialBalanceInput,
  ): Promise<ASM3JobPublic> {
    try {
      const response = await Asm3Service.createCalculationJob({
        requestBody: inputData,
      })
      return response
    } catch (error) {
      throw handleApiError(
        error,
        t("flow.store.model.createJobFailed", { model: this.modelName }),
      )
    }
  }

  /**
   * 从流程图数据创建计算任务
   */
  async createCalculationJobFromFlowchart(
    flowchartData: any,
  ): Promise<ASM3JobPublic> {
    try {
      return await Asm3Service.createCalculationJobFromFlowchart({
        requestBody: flowchartData,
      })
    } catch (error) {
      throw handleApiError(
        error,
        t("flow.store.model.createJobFromFlowchartFailed", {
          model: this.modelName,
        }),
      )
    }
  }

  /**
   * 获取任务状态
   */
  async getCalculationStatus(jobId: string): Promise<ASM3JobPublic> {
    try {
      const response = await Asm3Service.getCalculationStatus({
        jobId,
      })
      return response
    } catch (error) {
      throw handleApiError(
        error,
        t("flow.store.model.getStatusFailed", { model: this.modelName }),
      )
    }
  }

  /**
   * 获取计算结果摘要
   */
  async getCalculationResultSummary(
    jobId: string,
  ): Promise<MaterialBalanceResultSummary> {
    try {
      const response = await Asm3Service.getCalculationResultSummary({
        jobId,
      })
      return response
    } catch (error) {
      throw handleApiError(
        error,
        t("flow.store.model.getSummaryFailed", { model: this.modelName }),
      )
    }
  }

  /**
   * 获取时间序列数据
   */
  async getCalculationTimeseries(params: {
    jobId: string
    startTime?: number
    endTime?: number
    page?: number
    pageSize?: number
    nodeIds?: string[]
    edgeIds?: string[]
  }): Promise<MaterialBalanceTimeSeriesResponse> {
    try {
      const response = await Asm3Service.getCalculationTimeseries({
        jobId: params.jobId,
        startTime: params.startTime,
        endTime: params.endTime,
        page: params.page,
        pageSize: params.pageSize,
        nodeIds: params.nodeIds,
        edgeIds: params.edgeIds,
      })
      return response
    } catch (error) {
      throw handleApiError(
        error,
        t("flow.store.model.getTimeSeriesFailed", { model: this.modelName }),
      )
    }
  }

  /**
   * 获取最终值
   */
  async getCalculationFinalValues(jobId: string): Promise<any> {
    try {
      const response = await Asm3Service.getCalculationFinalValues({
        jobId,
      })
      return response
    } catch (error) {
      throw handleApiError(
        error,
        t("flow.store.model.getFinalValuesFailed", { model: this.modelName }),
      )
    }
  }

  /**
   * 验证输入数据
   */
  async validateCalculationInput(
    inputData: MaterialBalanceInput,
  ): Promise<MaterialBalanceValidationResponse> {
    try {
      const response = await Asm3Service.validateCalculationInput({
        requestBody: { input_data: inputData },
      })
      return response
    } catch (error) {
      throw handleApiError(
        error,
        t("flow.store.model.validateInputFailed", { model: this.modelName }),
      )
    }
  }

  /**
   * 获取用户的所有任务
   */
  async getUserCalculationJobs(skip = 0, limit = 100): Promise<ASM3JobsPublic> {
    try {
      const response = await Asm3Service.getUserCalculationJobs({
        skip,
        limit,
      })
      return response
    } catch (error) {
      throw handleApiError(
        error,
        t("flow.store.model.getUserJobsFailed", { model: this.modelName }),
      )
    }
  }

  /**
   * 删除任务
   */
  async deleteCalculationJob(jobId: string): Promise<{ message: string }> {
    try {
      const response = await Asm3Service.deleteCalculationJob({
        jobId,
      })
      return response
    } catch (error) {
      throw handleApiError(
        error,
        t("flow.store.model.deleteJobFailed", { model: this.modelName }),
      )
    }
  }

  /**
   * 获取任务输入数据
   */
  async getJobInputData(jobId: string): Promise<ASM3JobInputDataResponse> {
    try {
      const response = await Asm3Service.getJobInputData({
        jobId,
      })
      return response
    } catch (error) {
      throw handleApiError(
        error,
        t("flow.store.model.getJobInputFailed", { model: this.modelName }),
      )
    }
  }

  // ========== 流程图相关方法 ==========

  /**
   * 创建流程图
   */
  async createFlowchart(
    flowchartData: ASM3FlowChartCreate,
  ): Promise<ASM3FlowChartPublic> {
    try {
      const response = await Asm3FlowchartsService.createAsm3Flowchart({
        requestBody: flowchartData,
      })
      return response
    } catch (error) {
      throw handleApiError(
        error,
        t("flow.store.model.createFlowchartFailed", { model: this.modelName }),
      )
    }
  }

  /**
   * 获取流程图列表
   */
  async getFlowcharts(
    skip?: number,
    limit?: number,
  ): Promise<ASM3FlowChartsPublic> {
    try {
      const response = await Asm3FlowchartsService.readAsm3Flowcharts({
        skip,
        limit,
      })
      return response
    } catch (error) {
      throw handleApiError(
        error,
        t("flow.store.model.getFlowchartsFailed", { model: this.modelName }),
      )
    }
  }

  /**
   * 获取单个流程图
   */
  async getFlowchart(id: string): Promise<ASM3FlowChartPublic> {
    try {
      const response = await Asm3FlowchartsService.readAsm3Flowchart({
        id,
      })
      return response
    } catch (error) {
      throw handleApiError(
        error,
        t("flow.store.model.getFlowchartFailed", { model: this.modelName }),
      )
    }
  }

  /**
   * 更新流程图
   */
  async updateFlowchart(
    id: string,
    flowchartData: ASM3FlowChartUpdate,
  ): Promise<ASM3FlowChartPublic> {
    try {
      const response = await Asm3FlowchartsService.updateAsm3Flowchart({
        id,
        requestBody: flowchartData,
      })
      return response
    } catch (error) {
      throw handleApiError(
        error,
        t("flow.store.model.updateFlowchartFailed", { model: this.modelName }),
      )
    }
  }

  /**
   * 删除流程图
   */
  async deleteFlowchart(id: string): Promise<{ message: string }> {
    try {
      const response = await Asm3FlowchartsService.deleteAsm3Flowchart({
        id,
      })
      return response
    } catch (error) {
      throw handleApiError(
        error,
        t("flow.store.model.deleteFlowchartFailed", { model: this.modelName }),
      )
    }
  }

  // ========== 辅助方法 ==========

  /**
   * 轮询任务状态直到完成
   */
  async pollJobStatus(
    jobId: string,
    onStatusUpdate?: (status: ASM3JobPublic) => void,
    maxAttempts = 60,
    interval = 2000,
  ): Promise<ASM3JobPublic> {
    let attempts = 0

    while (attempts < maxAttempts) {
      try {
        const status = await this.getCalculationStatus(jobId)

        if (onStatusUpdate) {
          onStatusUpdate(status)
        }

        if (status.status === "success" || status.status === "failed") {
          return status
        }

        await new Promise((resolve) => setTimeout(resolve, interval))
        attempts++
      } catch (error) {
        console.error(
          t("flow.store.model.pollingError", { model: this.modelName }),
          error,
        )
        attempts++

        if (attempts >= maxAttempts) {
          throw error
        }

        await new Promise((resolve) => setTimeout(resolve, interval))
      }
    }

    throw new Error(
      t("flow.store.model.pollingTimeout", { model: this.modelName }),
    )
  }

  /**
   * 获取完整的计算结果
   */
  async getCompleteResults(jobId: string) {
    try {
      const [summary, finalValues] = await Promise.all([
        this.getCalculationResultSummary(jobId),
        this.getCalculationFinalValues(jobId),
      ])

      return {
        summary,
        finalValues,
      }
    } catch (error) {
      throw handleApiError(
        error,
        t("flow.store.model.getCompleteResultsFailed", {
          model: this.modelName,
        }),
      )
    }
  }
}

// 导出单例实例
export const asm3Service = new ASM3ServiceImpl()
export default asm3Service

// 导出类型
export type { ASM3ServiceImpl }
