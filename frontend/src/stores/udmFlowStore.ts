import type {
  UDMFlowChartCreate,
  UDMFlowChartUpdate,
} from "../client/types.gen"
import { UDM_CONFIG } from "../config/modelConfigs"
import { udmService } from "../services/udmService"
import { createModelFlowStore } from "./createModelFlowStore"
import { useUDMStore } from "./udmStore"

// 创建UDM专用的流程图服务适配器
const udmFlowChartService = {
  async getFlowcharts(params: { skip?: number; limit?: number }) {
    return await udmService.getFlowcharts(params.skip, params.limit)
  },

  async createFlowchart(params: { requestBody: UDMFlowChartCreate }) {
    return await udmService.createFlowchart(params.requestBody)
  },

  async getFlowchart(params: { id: string }) {
    return await udmService.getFlowchart(params.id)
  },

  async updateFlowchart(params: {
    id: string
    requestBody: UDMFlowChartUpdate
  }) {
    return await udmService.updateFlowchart(params.id, params.requestBody)
  },

  async deleteFlowchart(params: { id: string }) {
    return await udmService.deleteFlowchart(params.id)
  },
}

// 使用工厂函数创建UDM专用的流程图store
export const useUDMFlowStore = createModelFlowStore(
  UDM_CONFIG,
  udmFlowChartService,
  useUDMStore,
)

// 导出类型定义
export type UDMFlowState = ReturnType<typeof useUDMFlowStore.getState>

// 导出选择器
export const udmFlowSelectors = {
  // 获取当前节点
  getCurrentNodes: (state: UDMFlowState) => state.nodes,

  // 获取当前边
  getCurrentEdges: (state: UDMFlowState) => state.edges,

  // 获取选中的节点
  getSelectedNodes: (state: UDMFlowState) =>
    state.selectedNode ? [state.selectedNode] : [],

  // 获取选中的边
  getSelectedEdges: (state: UDMFlowState) =>
    state.selectedEdge ? [state.selectedEdge] : [],

  // 获取自定义参数
  getCustomParameters: (state: UDMFlowState) => state.customParameters,

  // 获取边参数配置
  getEdgeParameterConfigs: (state: UDMFlowState) => state.edgeParameterConfigs,

  // 获取计算参数
  getCalculationParameters: (state: UDMFlowState) =>
    state.calculationParameters,

  // 获取当前流程图信息
  getCurrentFlowChart: (state: UDMFlowState) => ({
    id: state.currentFlowChartId,
    name: state.currentFlowChartName,
  }),

  // 获取加载状态
  getLoadingState: (_state: UDMFlowState) => ({
    isLoading: false, // ModelFlowState doesn't have isLoading
    error: null, // ModelFlowState doesn't have error
  }),

  // 检查是否有未保存的更改
  hasUnsavedChanges: (_state: UDMFlowState) => {
    // 这里可以添加逻辑来检查是否有未保存的更改
    // 比如比较当前状态与最后保存的状态
    return false // 简化实现
  },
}

// 导出常用的操作函数
export const udmFlowActions = {
  // 重置为UDM默认配置
  resetToDefaults: () => {
    const store = useUDMFlowStore.getState()
    store.resetToModelDefaults()
  },

  // 导出当前流程图数据
  exportFlowchartData: () => {
    const store = useUDMFlowStore.getState()
    return store.exportFlowData()
  },

  // 导入流程图数据
  importFlowchartData: (data: any, _filename?: string) => {
    const store = useUDMFlowStore.getState()
    store.importFlowData(data)
  },

  // 保存当前流程图
  saveCurrentFlowchart: async (name?: string) => {
    const store = useUDMFlowStore.getState()
    return await store.saveFlowChart(name || "Untitled")
  },

  // 加载流程图
  loadFlowchart: async (id: string) => {
    const store = useUDMFlowStore.getState()
    return await store.loadFlowChart(id)
  },

  // 创建新流程图
  createNewFlowchart: () => {
    const store = useUDMFlowStore.getState()
    store.newFlowChart()
  },
}
