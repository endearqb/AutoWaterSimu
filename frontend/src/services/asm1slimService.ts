import { Asm1SlimFlowchartsService, Asm1SlimService } from "../client/sdk.gen"
import type {
  ASM1SlimFlowChartCreate,
  ASM1SlimFlowChartPublic,
  ASM1SlimFlowChartUpdate,
  ASM1SlimFlowChartsPublic,
  ASM1SlimJobInputDataResponse,
  ASM1SlimJobPublic,
  ASM1SlimJobsPublic,
  MaterialBalanceInput,
  MaterialBalanceResultSummary,
  MaterialBalanceTimeSeriesResponse,
  MaterialBalanceValidationResponse,
} from "../client/types.gen"
import { t } from "@/utils/i18n"
import type { BaseModelService } from "./baseModelService"
import { handleApiError } from "./baseModelService"

/**
 * ASM1Slim模型服务实现
 * 基于BaseModelService接口，封装ASM1Slim特定的API调用
 */
class ASM1SlimServiceImpl
  implements
    BaseModelService<
      ASM1SlimJobPublic,
      ASM1SlimFlowChartPublic,
      ASM1SlimJobsPublic,
      ASM1SlimFlowChartsPublic,
      ASM1SlimFlowChartCreate,
      ASM1SlimFlowChartUpdate,
      ASM1SlimJobInputDataResponse
    >
{
  private readonly modelName = "ASM1 Slim"

  // ========== 计算任务相关方法 ==========

  /**
   * 创建计算任务
   * @param input 计算输入参数
   * @returns 创建的任务
   */
  async createCalculationJob(
    input: MaterialBalanceInput,
  ): Promise<ASM1SlimJobPublic> {
    try {
      return await Asm1SlimService.createCalculationJob({ requestBody: input })
    } catch (error) {
      throw handleApiError(
        error,
        t("flow.store.model.createJobFailed", { model: this.modelName }),
      )
    }
  }

  /**
   * 从流程图数据创建计算任务
   * @param flowchartData 流程图数据
   * @returns 创建的任务
   */
  async createCalculationJobFromFlowchart(
    flowchartData: any,
  ): Promise<ASM1SlimJobPublic> {
    try {
      return await Asm1SlimService.createCalculationJobFromFlowchart({
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
   * 获取计算任务状态
   * @param jobId 任务ID
   * @returns 任务状态
   */
  async getCalculationStatus(jobId: string): Promise<ASM1SlimJobPublic> {
    try {
      return await Asm1SlimService.getCalculationStatus({ jobId })
    } catch (error) {
      throw handleApiError(
        error,
        t("flow.store.model.getStatusFailed", { model: this.modelName }),
      )
    }
  }

  /**
   * 获取计算结果摘要
   * @param jobId 任务ID
   * @returns 结果摘要
   */
  async getCalculationResultSummary(
    jobId: string,
  ): Promise<MaterialBalanceResultSummary> {
    try {
      return await Asm1SlimService.getCalculationResultSummary({ jobId })
    } catch (error) {
      throw handleApiError(
        error,
        t("flow.store.model.getSummaryFailed", { model: this.modelName }),
      )
    }
  }

  /**
   * 获取时间序列数据
   * @param params 查询参数
   * @returns 时间序列数据
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
      return await Asm1SlimService.getCalculationTimeseries({
        jobId: params.jobId,
        startTime: params.startTime,
        endTime: params.endTime,
        page: params.page,
        pageSize: params.pageSize,
        nodeIds: params.nodeIds,
        edgeIds: params.edgeIds,
      })
    } catch (error) {
      throw handleApiError(
        error,
        t("flow.store.model.getTimeSeriesFailed", { model: this.modelName }),
      )
    }
  }

  /**
   * 获取最终值数据
   * @param jobId 任务ID
   * @returns 最终值数据
   */
  async getCalculationFinalValues(jobId: string): Promise<any> {
    try {
      return await Asm1SlimService.getCalculationFinalValues({ jobId })
    } catch (error) {
      throw handleApiError(
        error,
        t("flow.store.model.getFinalValuesFailed", { model: this.modelName }),
      )
    }
  }

  /**
   * 验证输入数据
   * @param input 输入数据
   * @returns 验证结果
   */
  async validateCalculationInput(
    input: MaterialBalanceInput,
  ): Promise<MaterialBalanceValidationResponse> {
    try {
      return await Asm1SlimService.validateCalculationInput({
        requestBody: { input_data: input },
      })
    } catch (error) {
      throw handleApiError(
        error,
        t("flow.store.model.validateInputFailed", { model: this.modelName }),
      )
    }
  }

  /**
   * 获取用户的计算任务列表
   * @param skip 跳过数量
   * @param limit 限制数量
   * @returns 任务列表
   */
  async getUserCalculationJobs(
    skip?: number,
    limit?: number,
  ): Promise<ASM1SlimJobsPublic> {
    try {
      return await Asm1SlimService.getUserCalculationJobs({
        skip: skip || 0,
        limit: limit || 50,
      })
    } catch (error) {
      throw handleApiError(
        error,
        t("flow.store.model.getUserJobsFailed", { model: this.modelName }),
      )
    }
  }

  /**
   * 删除计算任务
   * @param jobId 任务ID
   * @returns 删除结果
   */
  async deleteCalculationJob(jobId: string): Promise<any> {
    try {
      return await Asm1SlimService.deleteCalculationJob({ jobId })
    } catch (error) {
      throw handleApiError(
        error,
        t("flow.store.model.deleteJobFailed", { model: this.modelName }),
      )
    }
  }

  /**
   * 获取任务输入数据
   * @param jobId 任务ID
   * @returns 任务输入数据
   */
  async getJobInputData(jobId: string): Promise<ASM1SlimJobInputDataResponse> {
    try {
      return await Asm1SlimService.getJobInputData({ jobId })
    } catch (error) {
      throw handleApiError(
        error,
        t("flow.store.model.getJobInputFailed", { model: this.modelName }),
      )
    }
  }

  // ========== 流程图相关方法 ==========

  /**
   * 获取流程图列表
   * @param skip 跳过数量
   * @param limit 限制数量
   * @returns 流程图列表
   */
  async getFlowcharts(
    skip?: number,
    limit?: number,
  ): Promise<ASM1SlimFlowChartsPublic> {
    try {
      return await Asm1SlimFlowchartsService.readAsm1SlimFlowcharts({
        skip: skip || 0,
        limit: limit || 50,
      })
    } catch (error) {
      throw handleApiError(
        error,
        t("flow.store.model.getFlowchartsFailed", { model: this.modelName }),
      )
    }
  }

  /**
   * 创建流程图
   * @param flowchart 创建参数
   * @returns 创建的流程图
   */
  async createFlowchart(
    flowchart: ASM1SlimFlowChartCreate,
  ): Promise<ASM1SlimFlowChartPublic> {
    try {
      return await Asm1SlimFlowchartsService.createAsm1SlimFlowchart({
        requestBody: flowchart,
      })
    } catch (error) {
      throw handleApiError(
        error,
        t("flow.store.model.createFlowchartFailed", { model: this.modelName }),
      )
    }
  }

  /**
   * 获取单个流程图
   * @param id 流程图ID
   * @returns 流程图数据
   */
  async getFlowchart(id: string): Promise<ASM1SlimFlowChartPublic> {
    try {
      return await Asm1SlimFlowchartsService.readAsm1SlimFlowchart({ id })
    } catch (error) {
      throw handleApiError(
        error,
        t("flow.store.model.getFlowchartFailed", { model: this.modelName }),
      )
    }
  }

  /**
   * 更新流程图
   * @param id 流程图ID
   * @param flowchart 更新数据
   * @returns 更新后的流程图
   */
  async updateFlowchart(
    id: string,
    flowchart: ASM1SlimFlowChartUpdate,
  ): Promise<ASM1SlimFlowChartPublic> {
    try {
      return await Asm1SlimFlowchartsService.updateAsm1SlimFlowchart({
        id,
        requestBody: flowchart,
      })
    } catch (error) {
      throw handleApiError(
        error,
        t("flow.store.model.updateFlowchartFailed", { model: this.modelName }),
      )
    }
  }

  /**
   * 删除流程图
   * @param id 流程图ID
   */
  async deleteFlowchart(id: string): Promise<any> {
    try {
      return await Asm1SlimFlowchartsService.deleteAsm1SlimFlowchart({ id })
    } catch (error) {
      throw handleApiError(
        error,
        t("flow.store.model.deleteFlowchartFailed", { model: this.modelName }),
      )
    }
  }

  // ========== 轮询相关方法 ==========

  /**
   * 轮询计算状态
   * @param jobId 任务ID
   * @param interval 轮询间隔（毫秒）
   * @param onUpdate 状态更新回调
   * @param onComplete 完成回调
   * @param onError 错误回调
   * @returns 停止轮询的函数
   */
  pollJobStatus(
    jobId: string,
    interval = 2000,
    onUpdate?: (job: ASM1SlimJobPublic) => void,
    onComplete?: (job: ASM1SlimJobPublic) => void,
    onError?: (error: Error) => void,
  ): () => void {
    let timeoutId: NodeJS.Timeout
    let isPolling = true

    const poll = async () => {
      if (!isPolling) return

      try {
        const job = await this.getCalculationStatus(jobId)

        if (onUpdate) {
          onUpdate(job)
        }

        // 检查任务是否完成
        if (job.status === "success" || job.status === "failed") {
          isPolling = false
          if (onComplete) {
            onComplete(job)
          }
          return
        }

        // 继续轮询
        if (isPolling) {
          timeoutId = setTimeout(poll, interval)
        }
      } catch (error) {
        isPolling = false
        if (onError) {
          onError(error as Error)
        }
      }
    }

    // 开始轮询
    poll()

    // 返回停止轮询的函数
    return () => {
      isPolling = false
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }
}

// 导出单例实例
export const asm1SlimService = new ASM1SlimServiceImpl()

// 导出类型
export type { ASM1SlimServiceImpl as ASM1SlimService }
