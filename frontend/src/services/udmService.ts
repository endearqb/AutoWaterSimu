import { t } from "@/utils/i18n"
import {
  UdmFlowchartsService,
  UdmModelsService,
  UdmService,
} from "../client/sdk.gen"
import type {
  MaterialBalanceInput,
  MaterialBalanceResultSummary,
  MaterialBalanceTimeSeriesResponse,
  MaterialBalanceValidationResponse,
  UDMModelCreate,
  UDMModelCreateFromTemplate,
  UDMModelDefinitionDraft,
  UDMModelDetailPublic,
  UDMModelsPublic,
  UDMModelUpdate,
  UDMValidationResponse,
  UDMFlowChartCreate,
  UDMFlowChartPublic,
  UDMFlowChartUpdate,
  UDMFlowChartsPublic,
  UDMJobInputDataResponse,
  UDMJobPublic,
  UDMJobsPublic,
} from "../client/types.gen"
import type { BaseModelService } from "./baseModelService"
import { handleApiError } from "./baseModelService"

/**
 * UDM模型服务实现
 * 基于BaseModelService接口，封装UDM特定的API调用
 */
export interface UDMSeedTemplateSummary {
  key: string
  name: string
  description?: string
  tags?: string[]
  components_count?: number
  processes_count?: number
  parameters_count?: number
}

class UDMServiceImpl
  implements
    BaseModelService<
      UDMJobPublic,
      UDMFlowChartPublic,
      UDMJobsPublic,
      UDMFlowChartsPublic,
      UDMFlowChartCreate,
      UDMFlowChartUpdate,
      UDMJobInputDataResponse
    >
{
  private readonly modelName = "UDM"

  // ========== 计算任务相关方法 ==========

  /**
   * 创建计算任务
   */
  async createCalculationJob(
    inputData: MaterialBalanceInput,
  ): Promise<UDMJobPublic> {
    try {
      const response = await UdmService.createCalculationJob({
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
  ): Promise<UDMJobPublic> {
    try {
      return await UdmService.createCalculationJobFromFlowchart({
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
  async getCalculationStatus(jobId: string): Promise<UDMJobPublic> {
    try {
      const response = await UdmService.getCalculationStatus({
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
      const response = await UdmService.getCalculationResultSummary({
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
      const response = await UdmService.getCalculationTimeseries({
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
      const response = await UdmService.getCalculationFinalValues({
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
      const response = await UdmService.validateCalculationInput({
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
  async getUserCalculationJobs(skip = 0, limit = 100): Promise<UDMJobsPublic> {
    try {
      const response = await UdmService.getUserCalculationJobs({
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
      const response = await UdmService.deleteCalculationJob({
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
  async getJobInputData(jobId: string): Promise<UDMJobInputDataResponse> {
    try {
      const response = await UdmService.getJobInputData({
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
    flowchartData: UDMFlowChartCreate,
  ): Promise<UDMFlowChartPublic> {
    try {
      const response = await UdmFlowchartsService.createUdmFlowchart({
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
  ): Promise<UDMFlowChartsPublic> {
    try {
      const response = await UdmFlowchartsService.readUdmFlowcharts({
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
  async getFlowchart(id: string): Promise<UDMFlowChartPublic> {
    try {
      const response = await UdmFlowchartsService.readUdmFlowchart({
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
    flowchartData: UDMFlowChartUpdate,
  ): Promise<UDMFlowChartPublic> {
    try {
      const response = await UdmFlowchartsService.updateUdmFlowchart({
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
      const response = await UdmFlowchartsService.deleteUdmFlowchart({
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
  // ========== UDM model library methods ==========

  private normalizeTemplate(item: unknown): UDMSeedTemplateSummary {
    const raw = (item || {}) as Record<string, unknown>
    return {
      key: String(raw.key || ""),
      name: String(raw.name || raw.key || "Unnamed template"),
      description:
        raw.description !== undefined ? String(raw.description) : undefined,
      tags: Array.isArray(raw.tags)
        ? raw.tags.map((v) => String(v)).filter(Boolean)
        : [],
      components_count:
        typeof raw.components_count === "number"
          ? raw.components_count
          : undefined,
      processes_count:
        typeof raw.processes_count === "number"
          ? raw.processes_count
          : undefined,
      parameters_count:
        typeof raw.parameters_count === "number"
          ? raw.parameters_count
          : undefined,
    }
  }

  async getModelTemplates(): Promise<UDMSeedTemplateSummary[]> {
    try {
      const response = await UdmModelsService.getUdmTemplates()
      return (response || []).map((item) => this.normalizeTemplate(item))
    } catch (error) {
      throw handleApiError(error, "Failed to fetch UDM templates")
    }
  }

  async validateModelDefinition(
    draft: UDMModelDefinitionDraft,
  ): Promise<UDMValidationResponse> {
    try {
      return await UdmModelsService.validateUdmModelDefinition({
        requestBody: draft,
      })
    } catch (error) {
      throw handleApiError(error, "Failed to validate UDM model definition")
    }
  }

  async createModel(model: UDMModelCreate): Promise<UDMModelDetailPublic> {
    try {
      return await UdmModelsService.createUdmModel({
        requestBody: model,
      })
    } catch (error) {
      throw handleApiError(error, "Failed to create UDM model")
    }
  }

  async createModelFromTemplate(
    payload: UDMModelCreateFromTemplate,
  ): Promise<UDMModelDetailPublic> {
    try {
      return await UdmModelsService.createUdmModelFromTemplate({
        requestBody: payload,
      })
    } catch (error) {
      throw handleApiError(error, "Failed to create UDM model from template")
    }
  }

  async getModels(params: {
    skip?: number
    limit?: number
    q?: string
  }): Promise<UDMModelsPublic> {
    try {
      return await UdmModelsService.readUdmModels(params)
    } catch (error) {
      throw handleApiError(error, "Failed to fetch UDM model list")
    }
  }

  async getModel(modelId: string): Promise<UDMModelDetailPublic> {
    try {
      return await UdmModelsService.readUdmModel({ modelId })
    } catch (error) {
      throw handleApiError(error, "Failed to fetch UDM model detail")
    }
  }

  async updateModel(
    modelId: string,
    model: UDMModelUpdate,
  ): Promise<UDMModelDetailPublic> {
    try {
      return await UdmModelsService.updateUdmModel({
        modelId,
        requestBody: model,
      })
    } catch (error) {
      throw handleApiError(error, "Failed to update UDM model")
    }
  }

  async deleteModel(modelId: string): Promise<{ message: string }> {
    try {
      return await UdmModelsService.deleteUdmModel({ modelId })
    } catch (error) {
      throw handleApiError(error, "Failed to delete UDM model")
    }
  }

  async duplicateModel(
    modelId: string,
    nameOverride?: string,
  ): Promise<UDMModelDetailPublic> {
    const detail = await this.getModel(modelId)
    const latest = detail.latest_version
    if (!latest) {
      throw new Error("UDM model has no latest version")
    }
    const payload: UDMModelCreate = {
      name: nameOverride || `${detail.name} Copy`,
      description: detail.description || "",
      tags: detail.tags || [],
      components: (latest.components || []) as any,
      parameters: (latest.parameters || []) as any,
      processes: (latest.processes || []) as any,
      meta: (latest.meta || null) as any,
      seed_source: latest.seed_source || null,
    }
    return await this.createModel(payload)
  }

  async pollJobStatus(
    jobId: string,
    onStatusUpdate?: (status: UDMJobPublic) => void,
    maxAttempts = 60,
    interval = 2000,
  ): Promise<UDMJobPublic> {
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
export const udmService = new UDMServiceImpl()
export default udmService

// 导出类型
export type { UDMServiceImpl }
