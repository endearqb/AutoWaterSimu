import { t } from "@/utils/i18n"
import { isStandaloneRuntime } from "@/shared/runtimeConfig"
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
import type { BaseModelService } from "./baseModelService"
import { handleApiError } from "./baseModelService"
import { standaloneComputeService } from "./standaloneComputeService"
import { standaloneFlowchartService } from "./standaloneFlowchartService"

const legacyAsm1SlimService = async () =>
  (await import("../client/sdk.gen")).Asm1SlimService
const legacyAsm1SlimFlowchartsService = async () =>
  (await import("../client/sdk.gen")).Asm1SlimFlowchartsService

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
    if (isStandaloneRuntime()) {
      return standaloneComputeService.createCalculationJob("asm1slim", input)
    }
    try {
      const service = await legacyAsm1SlimService()
      return await service.createCalculationJob({ requestBody: input })
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
    if (isStandaloneRuntime()) {
      return standaloneComputeService.createCalculationJobFromFlowchart(
        "asm1slim",
        flowchartData,
      )
    }
    try {
      const service = await legacyAsm1SlimService()
      return await service.createCalculationJobFromFlowchart({
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
    if (isStandaloneRuntime()) {
      return standaloneComputeService.getCalculationStatus(jobId)
    }
    try {
      const service = await legacyAsm1SlimService()
      return await service.getCalculationStatus({ jobId })
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
    if (isStandaloneRuntime()) {
      return standaloneComputeService.getCalculationResultSummary(jobId)
    }
    try {
      const service = await legacyAsm1SlimService()
      return await service.getCalculationResultSummary({ jobId })
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
    if (isStandaloneRuntime()) {
      return standaloneComputeService.getCalculationTimeseries(params)
    }
    try {
      const service = await legacyAsm1SlimService()
      return await service.getCalculationTimeseries({
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
    if (isStandaloneRuntime()) {
      return standaloneComputeService.getCalculationFinalValues(jobId)
    }
    try {
      const service = await legacyAsm1SlimService()
      return await service.getCalculationFinalValues({ jobId })
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
    if (isStandaloneRuntime()) {
      return standaloneComputeService.validateCalculationInput(
        "asm1slim",
        input,
      )
    }
    try {
      const service = await legacyAsm1SlimService()
      return await service.validateCalculationInput({
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
    if (isStandaloneRuntime()) {
      return standaloneComputeService.getUserCalculationJobs(
        "asm1slim",
        skip,
        limit,
      )
    }
    try {
      const service = await legacyAsm1SlimService()
      return await service.getUserCalculationJobs({
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
    if (isStandaloneRuntime()) {
      return standaloneComputeService.deleteCalculationJob(jobId)
    }
    try {
      const service = await legacyAsm1SlimService()
      return await service.deleteCalculationJob({ jobId })
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
    if (isStandaloneRuntime()) {
      return standaloneComputeService.getJobInputData(jobId)
    }
    try {
      const service = await legacyAsm1SlimService()
      return await service.getJobInputData({ jobId })
    } catch (error) {
      throw handleApiError(
        error,
        t("flow.store.model.getJobInputFailed", { model: this.modelName }),
      )
    }
  }

  async getAnalysisResult(jobId: string): Promise<Record<string, unknown>> {
    if (isStandaloneRuntime()) {
      return standaloneComputeService.getAnalysisResult(jobId)
    }
    const response = await this.getJobInputData(jobId)
    return response.result_data
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
    if (isStandaloneRuntime()) {
      return (await standaloneFlowchartService.list(
        "asm1slim",
        skip,
        limit,
      )) as ASM1SlimFlowChartsPublic
    }
    try {
      const service = await legacyAsm1SlimFlowchartsService()
      return await service.readAsm1SlimFlowcharts({
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
    if (isStandaloneRuntime()) {
      return (await standaloneFlowchartService.create(
        "asm1slim",
        flowchart,
      )) as ASM1SlimFlowChartPublic
    }
    try {
      const service = await legacyAsm1SlimFlowchartsService()
      return await service.createAsm1SlimFlowchart({
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
    if (isStandaloneRuntime()) {
      return (await standaloneFlowchartService.get(
        "asm1slim",
        id,
      )) as ASM1SlimFlowChartPublic
    }
    try {
      const service = await legacyAsm1SlimFlowchartsService()
      return await service.readAsm1SlimFlowchart({ id })
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
    if (isStandaloneRuntime()) {
      return (await standaloneFlowchartService.update(
        "asm1slim",
        id,
        flowchart,
      )) as ASM1SlimFlowChartPublic
    }
    try {
      const service = await legacyAsm1SlimFlowchartsService()
      return await service.updateAsm1SlimFlowchart({
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
    if (isStandaloneRuntime()) {
      return standaloneFlowchartService.delete("asm1slim", id)
    }
    try {
      const service = await legacyAsm1SlimFlowchartsService()
      return await service.deleteAsm1SlimFlowchart({ id })
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
