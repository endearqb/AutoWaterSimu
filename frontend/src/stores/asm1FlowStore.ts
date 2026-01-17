import type {
  ASM1FlowChartCreate,
  ASM1FlowChartUpdate,
} from "../client/types.gen"
import { ASM1_CONFIG } from "../config/modelConfigs"
import { asm1Service } from "../services/asm1Service"
import { useASM1Store } from "./asm1Store"
import { createModelFlowStore } from "./createModelFlowStore"

// 创建ASM1专用的流程图服务适配器
const asm1FlowChartService = {
  async getFlowcharts(params: { skip?: number; limit?: number }) {
    return await asm1Service.getFlowcharts(params.skip, params.limit)
  },

  async createFlowchart(params: { requestBody: ASM1FlowChartCreate }) {
    return await asm1Service.createFlowchart(params.requestBody)
  },

  async getFlowchart(params: { id: string }) {
    return await asm1Service.getFlowchart(params.id)
  },

  async updateFlowchart(params: {
    id: string
    requestBody: ASM1FlowChartUpdate
  }) {
    return await asm1Service.updateFlowchart(params.id, params.requestBody)
  },

  async deleteFlowchart(params: { id: string }) {
    return await asm1Service.deleteFlowchart(params.id)
  },
}

// 使用工厂函数创建ASM1专用的流程图store
export const useASM1FlowStore = createModelFlowStore(
  ASM1_CONFIG,
  asm1FlowChartService,
  useASM1Store,
)

// 导出类型定义
export type ASM1FlowState = ReturnType<typeof useASM1FlowStore.getState>

// 导出选择器
export const asm1FlowSelectors = {
  // 获取当前节点
  getCurrentNodes: (state: ASM1FlowState) => state.nodes,

  // 获取当前边
  getCurrentEdges: (state: ASM1FlowState) => state.edges,

  // 获取选中的节点
  getSelectedNodes: (state: ASM1FlowState) =>
    state.selectedNode ? [state.selectedNode] : [],

  // 获取选中的边
  getSelectedEdges: (state: ASM1FlowState) =>
    state.selectedEdge ? [state.selectedEdge] : [],

  // 获取自定义参数
  getCustomParameters: (state: ASM1FlowState) => state.customParameters,

  // 获取边参数配置
  getEdgeParameterConfigs: (state: ASM1FlowState) => state.edgeParameterConfigs,

  // 获取计算参数
  getCalculationParameters: (state: ASM1FlowState) =>
    state.calculationParameters,

  // 获取当前流程图信息
  getCurrentFlowChart: (state: ASM1FlowState) => ({
    id: state.currentFlowChartId,
    name: state.currentFlowChartName,
  }),

  // 获取加载状态
  getLoadingState: (_state: ASM1FlowState) => ({
    isLoading: false, // ModelFlowState doesn't have isLoading
    error: null, // ModelFlowState doesn't have error
  }),

  // 检查是否有未保存的更改
  hasUnsavedChanges: (_state: ASM1FlowState) => {
    // 这里可以添加逻辑来检查是否有未保存的更改
    // 比如比较当前状态与最后保存的状态
    return false // 简化实现
  },
}

// 导出常用的操作函数
export const asm1FlowActions = {
  // 重置为ASM1默认配置
  resetToDefaults: () => {
    const store = useASM1FlowStore.getState()
    store.resetToModelDefaults()
  },

  // 导出当前流程图数据
  exportFlowchartData: () => {
    const store = useASM1FlowStore.getState()
    return store.exportFlowData()
  },

  // 导入流程图数据
  importFlowchartData: (data: any, _filename?: string) => {
    const store = useASM1FlowStore.getState()
    store.importFlowData(data)
  },

  // 保存当前流程图
  saveCurrentFlowchart: async (name?: string) => {
    const store = useASM1FlowStore.getState()
    return await store.saveFlowChart(name || "Untitled")
  },

  // 加载流程图
  loadFlowchart: async (id: string) => {
    const store = useASM1FlowStore.getState()
    return await store.loadFlowChart(id)
  },

  // 创建新流程图
  createNewFlowchart: () => {
    const store = useASM1FlowStore.getState()
    store.newFlowChart()
  },
}
