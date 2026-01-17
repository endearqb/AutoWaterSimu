import type {
  MaterialBalanceInput,
  MaterialBalanceResultSummary,
  MaterialBalanceTimeSeriesResponse,
  MaterialBalanceValidationResponse,
  Message,
} from "../client/types.gen"

/**
 * 通用模型服务接口
 * 定义所有ASM模型API服务的基础结构
 * @template TJob - 计算任务类型
 * @template TFlowChart - 流程图类型
 * @template TJobsResponse - 任务列表响应类型
 * @template TFlowChartsResponse - 流程图列表响应类型
 * @template TFlowChartCreate - 创建流程图请求类型
 * @template TFlowChartUpdate - 更新流程图请求类型
 * @template TJobInputDataResponse - 任务输入数据响应类型
 */
export interface BaseModelService<
  TJob,
  TFlowChart,
  TJobsResponse,
  TFlowChartsResponse,
  TFlowChartCreate,
  TFlowChartUpdate,
  TJobInputDataResponse,
> {
  // ========== 计算任务相关方法 ==========

  /**
   * 创建计算任务
   * @param input 计算输入参数
   * @returns 创建的任务
   */
  createCalculationJob(input: MaterialBalanceInput): Promise<TJob>

  /**
   * 从流程图数据创建计算任务
   * @param flowchartData 流程图数据
   * @returns 创建的任务
   */
  createCalculationJobFromFlowchart(flowchartData: any): Promise<TJob>

  /**
   * 获取计算任务状态
   * @param jobId 任务ID
   * @returns 任务状态
   */
  getCalculationStatus(jobId: string): Promise<TJob>

  /**
   * 获取计算结果摘要
   * @param jobId 任务ID
   * @returns 结果摘要
   */
  getCalculationResultSummary(
    jobId: string,
  ): Promise<MaterialBalanceResultSummary>

  /**
   * 获取计算最终值
   * @param jobId 任务ID
   * @returns 最终值数据
   */
  getCalculationFinalValues(jobId: string): Promise<any>

  /**
   * 获取计算时间序列数据
   * @param params 查询参数
   * @returns 时间序列数据
   */
  getCalculationTimeseries(params: {
    jobId: string
    startTime?: number
    endTime?: number
    page?: number
    pageSize?: number
    nodeIds?: string[]
    edgeIds?: string[]
  }): Promise<MaterialBalanceTimeSeriesResponse>

  /**
   * 验证计算输入数据
   * @param input 输入数据
   * @returns 验证结果
   */
  validateCalculationInput(
    input: MaterialBalanceInput,
  ): Promise<MaterialBalanceValidationResponse>

  /**
   * 获取用户计算任务列表
   * @param skip 跳过数量
   * @param limit 限制数量
   * @returns 任务列表
   */
  getUserCalculationJobs(skip?: number, limit?: number): Promise<TJobsResponse>

  /**
   * 删除计算任务
   * @param jobId 任务ID
   * @returns 删除结果
   */
  deleteCalculationJob(jobId: string): Promise<Message>

  /**
   * 获取任务输入数据
   * @param jobId 任务ID
   * @returns 输入数据
   */
  getJobInputData(jobId: string): Promise<TJobInputDataResponse>

  // ========== 流程图相关方法 ==========

  /**
   * 获取流程图列表
   * @param skip 跳过数量
   * @param limit 限制数量
   * @returns 流程图列表
   */
  getFlowcharts(skip?: number, limit?: number): Promise<TFlowChartsResponse>

  /**
   * 创建流程图
   * @param flowchart 流程图数据
   * @returns 创建的流程图
   */
  createFlowchart(flowchart: TFlowChartCreate): Promise<TFlowChart>

  /**
   * 根据ID获取流程图
   * @param id 流程图ID
   * @returns 流程图数据
   */
  getFlowchart(id: string): Promise<TFlowChart>

  /**
   * 更新流程图
   * @param id 流程图ID
   * @param flowchart 更新数据
   * @returns 更新后的流程图
   */
  updateFlowchart(id: string, flowchart: TFlowChartUpdate): Promise<TFlowChart>

  /**
   * 删除流程图
   * @param id 流程图ID
   * @returns 删除结果
   */
  deleteFlowchart(id: string): Promise<Message>
}

/**
 * 通用API参数类型
 */
export interface BaseApiParams {
  /** 跳过数量 */
  skip?: number
  /** 限制数量 */
  limit?: number
}

/**
 * 时间序列查询参数
 */
export interface TimeSeriesParams extends BaseApiParams {
  /** 任务ID */
  jobId: string
  /** 开始时间 */
  startTime?: number
  /** 结束时间 */
  endTime?: number
  /** 页码 */
  page?: number
  /** 页大小 */
  pageSize?: number
  /** 节点ID列表 */
  nodeIds?: string[]
  /** 边ID列表 */
  edgeIds?: string[]
}

/**
 * 通用API响应包装器
 */
export interface ApiResponse<T> {
  /** 是否成功 */
  success: boolean
  /** 响应消息 */
  message: string
  /** 响应数据 */
  data?: T
}

/**
 * 分页响应类型
 */
export interface PaginatedResponse<T> {
  /** 数据列表 */
  data: T[]
  /** 总数量 */
  count: number
}

/**
 * 创建API响应包装器
 * @param data 响应数据
 * @param message 响应消息
 * @returns API响应
 */
export function createApiResponse<T>(
  data: T,
  message = "Success",
): ApiResponse<T> {
  return {
    success: true,
    message,
    data,
  }
}

/**
 * 创建错误响应
 * @param message 错误消息
 * @returns 错误响应
 */
export function createErrorResponse(message: string): ApiResponse<never> {
  return {
    success: false,
    message,
  }
}

/**
 * 处理API错误的通用函数
 * @param error 错误对象
 * @param defaultMessage 默认错误消息
 * @returns 错误消息
 */
export function handleApiError(
  error: any,
  defaultMessage = "操作失败",
): string {
  if (error?.body?.detail) {
    return typeof error.body.detail === "string"
      ? error.body.detail
      : JSON.stringify(error.body.detail)
  }
  if (error?.message) {
    return error.message
  }
  return defaultMessage
}
