import type {
  MaterialBalanceInput,
  MaterialBalanceResultSummary,
  MaterialBalanceTimeSeriesResponse,
  MaterialBalanceValidationResponse,
} from "../client/types.gen"

/**
 * 通用模型状态接口
 * 定义所有ASM模型状态管理的基础结构
 * @template TJob - 计算任务类型
 * @template TFlowChart - 流程图类型
 * @template TJobsResponse - 任务列表响应类型
 * @template TFlowChartsResponse - 流程图列表响应类型
 * @template TFlowChartCreate - 创建流程图请求类型
 * @template TFlowChartUpdate - 更新流程图请求类型
 */
export interface BaseModelState<
  TJob,
  TFlowChart,
  TFlowChartsResponse,
  TFlowChartCreate,
  TFlowChartUpdate,
> {
  // ========== 状态字段 ==========

  /** 当前计算任务 */
  currentJob: TJob | null

  /** 计算结果摘要 */
  resultSummary: MaterialBalanceResultSummary | null

  /** 时间序列数据 */
  timeSeriesData: MaterialBalanceTimeSeriesResponse | null

  /** 最终值数据 */
  finalValues: any | null

  /** 验证结果 */
  validationResult: MaterialBalanceValidationResponse | null

  /** 用户的计算任务列表 */
  userJobs: TJob[]

  /** 流程图列表 */
  flowcharts: TFlowChart[]

  /** 当前流程图 */
  currentFlowchart: TFlowChart | null

  /** 加载状态 */
  isLoading: boolean

  /** 错误信息 */
  error: string | null

  // ========== 计算任务相关方法 ==========

  /**
   * 创建计算任务
   * @param input 计算输入参数
   * @returns 创建的任务
   */
  createCalculationJob: (input: MaterialBalanceInput) => Promise<TJob>

  /**
   * 从流程图数据创建计算任务
   * @param flowchartData 流程图数据
   * @returns 创建的任务
   */
  createCalculationJobFromFlowchart: (flowchartData: any) => Promise<TJob>

  /**
   * 获取计算状态
   * @param jobId 任务ID
   * @returns 任务状态
   */
  getCalculationStatus: (jobId: string) => Promise<TJob>

  /**
   * 获取计算结果摘要
   * @param jobId 任务ID
   * @returns 结果摘要
   */
  getResultSummary: (jobId: string) => Promise<MaterialBalanceResultSummary>

  /**
   * 获取时间序列数据
   * @param params 查询参数
   * @returns 时间序列数据
   */
  getTimeSeriesData: (params: {
    jobId: string
    startTime?: number
    endTime?: number
    page?: number
    pageSize?: number
    nodeIds?: string[]
    edgeIds?: string[]
  }) => Promise<MaterialBalanceTimeSeriesResponse>

  /**
   * 获取最终值数据
   * @param jobId 任务ID
   * @returns 最终值数据
   */
  getFinalValues: (jobId: string) => Promise<any>

  /**
   * 验证输入数据
   * @param input 输入数据
   * @returns 验证结果
   */
  validateInput: (
    input: MaterialBalanceInput,
  ) => Promise<MaterialBalanceValidationResponse>

  /**
   * 获取用户计算任务列表
   * @param skip 跳过数量
   * @param limit 限制数量
   * @returns 任务列表
   */
  getUserJobs: (
    skip?: number,
    limit?: number,
  ) => Promise<{ data: TJob[]; count: number }>

  /**
   * 删除计算任务
   * @param jobId 任务ID
   */
  deleteJob: (jobId: string) => Promise<void>

  /**
   * 轮询任务状态
   * @param jobId 任务ID
   * @param interval 轮询间隔（毫秒）
   * @param flowchartData 流程图数据（可选）
   * @returns 清理函数
   */
  pollJobStatus: (
    jobId: string,
    interval?: number,
    flowchartData?: any,
  ) => () => void

  // ========== 流程图相关方法 ==========

  /**
   * 获取流程图列表
   * @param skip 跳过数量
   * @param limit 限制数量
   * @returns 流程图列表
   */
  getFlowcharts: (skip?: number, limit?: number) => Promise<TFlowChartsResponse>

  /**
   * 创建流程图
   * @param flowchart 流程图数据
   * @returns 创建的流程图
   */
  createFlowchart: (flowchart: TFlowChartCreate) => Promise<TFlowChart>

  /**
   * 获取单个流程图
   * @param id 流程图ID
   * @returns 流程图数据
   */
  getFlowchart: (id: string) => Promise<TFlowChart>

  /**
   * 更新流程图
   * @param id 流程图ID
   * @param flowchart 更新数据
   * @returns 更新后的流程图
   */
  updateFlowchart: (
    id: string,
    flowchart: TFlowChartUpdate,
  ) => Promise<TFlowChart>

  /**
   * 删除流程图
   * @param id 流程图ID
   */
  deleteFlowchart: (id: string) => Promise<void>

  // ========== 通用方法 ==========

  /**
   * 清除错误信息
   */
  clearError: () => void

  /**
   * 重置状态
   */
  reset: () => void
}

/**
 * 通用选择器类型
 * 用于从状态中选择特定字段
 */
export type BaseModelSelectors<
  TState extends BaseModelState<any, any, any, any, any>,
> = {
  selectCurrentJob: (state: TState) => any | null
  selectResultSummary: (state: TState) => MaterialBalanceResultSummary | null
  selectTimeSeriesData: (
    state: TState,
  ) => MaterialBalanceTimeSeriesResponse | null
  selectFinalValues: (state: TState) => any | null
  selectValidationResult: (
    state: TState,
  ) => MaterialBalanceValidationResponse | null
  selectUserJobs: (state: TState) => any[]
  selectFlowcharts: (state: TState) => any[]
  selectCurrentFlowchart: (state: TState) => any | null
  selectIsLoading: (state: TState) => boolean
  selectError: (state: TState) => string | null
}

/**
 * 创建通用选择器
 * @returns 选择器对象
 */
export function createBaseModelSelectors<
  TState extends BaseModelState<any, any, any, any, any>,
>(): BaseModelSelectors<TState> {
  return {
    selectCurrentJob: (state) => state.currentJob,
    selectResultSummary: (state) => state.resultSummary,
    selectTimeSeriesData: (state) => state.timeSeriesData,
    selectFinalValues: (state) => state.finalValues,
    selectValidationResult: (state) => state.validationResult,
    selectUserJobs: (state) => state.userJobs,
    selectFlowcharts: (state) => state.flowcharts,
    selectCurrentFlowchart: (state) => state.currentFlowchart,
    selectIsLoading: (state) => state.isLoading,
    selectError: (state) => state.error,
  }
}
