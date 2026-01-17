import type {
  ASM3FlowChartCreate,
  ASM3FlowChartUpdate,
} from "../client/types.gen"
import { ASM3_CONFIG } from "../config/modelConfigs"
import { asm3Service } from "../services/asm3Service"
import { useASM3Store } from "./asm3Store"
import { createModelFlowStore } from "./createModelFlowStore"

// 创建ASM3专用的流程图服务适配器
const asm3FlowChartService = {
  async getFlowcharts(params: { skip?: number; limit?: number }) {
    return await asm3Service.getFlowcharts(params.skip, params.limit)
  },

  async createFlowchart(params: { requestBody: ASM3FlowChartCreate }) {
    return await asm3Service.createFlowchart(params.requestBody)
  },

  async getFlowchart(params: { id: string }) {
    return await asm3Service.getFlowchart(params.id)
  },

  async updateFlowchart(params: {
    id: string
    requestBody: ASM3FlowChartUpdate
  }) {
    return await asm3Service.updateFlowchart(params.id, params.requestBody)
  },

  async deleteFlowchart(params: { id: string }) {
    return await asm3Service.deleteFlowchart(params.id)
  },
}

// 使用工厂函数创建ASM3专用的流程图store
export const useASM3FlowStore = createModelFlowStore(
  ASM3_CONFIG,
  asm3FlowChartService,
  useASM3Store,
)

// 导出类型定义
export type ASM3FlowState = ReturnType<typeof useASM3FlowStore.getState>

// 导出选择器
export const asm3FlowSelectors = {
  // 获取当前节点
  getCurrentNodes: (state: ASM3FlowState) => state.nodes,

  // 获取当前边
  getCurrentEdges: (state: ASM3FlowState) => state.edges,

  // 获取选中的节点
  getSelectedNodes: (state: ASM3FlowState) =>
    state.selectedNode ? [state.selectedNode] : [],

  // 获取选中的边
  getSelectedEdges: (state: ASM3FlowState) =>
    state.selectedEdge ? [state.selectedEdge] : [],

  // 获取自定义参数
  getCustomParameters: (state: ASM3FlowState) => state.customParameters,

  // 获取边参数配置
  getEdgeParameterConfigs: (state: ASM3FlowState) => state.edgeParameterConfigs,

  // 获取计算参数
  getCalculationParameters: (state: ASM3FlowState) =>
    state.calculationParameters,

  // 获取当前流程图信息
  getCurrentFlowChart: (state: ASM3FlowState) => ({
    id: state.currentFlowChartId,
    name: state.currentFlowChartName,
  }),

  // 获取加载状态
  getLoadingState: (_state: ASM3FlowState) => ({
    isLoading: false, // ModelFlowState doesn't have isLoading
    error: null, // ModelFlowState doesn't have error
  }),

  // 检查是否有未保存的更改
  hasUnsavedChanges: (_state: ASM3FlowState) => {
    // 这里可以添加逻辑来检查是否有未保存的更改
    // 比如比较当前状态与最后保存的状态
    return false // 简化实现
  },
}

// 导出常用的操作函数
export const asm3FlowActions = {
  // 重置为ASM3默认配置
  resetToDefaults: () => {
    const store = useASM3FlowStore.getState()
    store.resetToModelDefaults()
  },

  // 导出当前流程图数据
  exportFlowchartData: () => {
    const store = useASM3FlowStore.getState()
    return store.exportFlowData()
  },

  // 导入流程图数据
  importFlowchartData: (data: any, _filename?: string) => {
    const store = useASM3FlowStore.getState()
    store.importFlowData(data)
  },

  // 保存当前流程图
  saveCurrentFlowchart: async (name?: string) => {
    const store = useASM3FlowStore.getState()
    return await store.saveFlowChart(name || "Untitled")
  },

  // 加载流程图
  loadFlowchart: async (id: string) => {
    const store = useASM3FlowStore.getState()
    return await store.loadFlowChart(id)
  },

  // 创建新流程图
  createNewFlowchart: () => {
    const store = useASM3FlowStore.getState()
    store.newFlowChart()
  },
}
