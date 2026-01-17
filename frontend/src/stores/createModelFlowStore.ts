import {
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type OnConnect,
  type OnEdgesChange,
  type OnNodesChange,
  applyEdgeChanges,
  applyNodeChanges,
} from "@xyflow/react"
import { create } from "zustand"
import type {
  CustomParameter,
  EdgeParameterConfig,
  ModelConfig,
} from "../config/modelConfigs"
import {
  type CalculationParameters,
  getDefaultCalculationParams,
} from "../config/simulationConfig"
// import type { BaseModelService } from '../services/baseModelService' // 暂时注释掉未使用的导入

/**
 * 通用流程图状态接口
 * 基于RFState但支持泛型配置
 */
export interface ModelFlowState<
  TFlowChart,
  _TFlowChartCreate,
  _TFlowChartUpdate,
> {
  // ========== 基础状态 ==========
  nodes: Node[]
  edges: Edge[]
  selectedNode: Node | null
  selectedEdge: Edge | null
  customParameters: CustomParameter[]
  edgeParameterConfigs: Record<string, Record<string, EdgeParameterConfig>>
  importedFileName: string | null
  calculationParameters: CalculationParameters
  currentFlowChartId: string | null
  currentFlowChartName: string | null
  currentJobId: string | null
  showMiniMap: boolean

  // ========== 模型配置 ==========
  modelConfig: ModelConfig

  // ========== 基础操作 ==========
  setNodes: (nodes: Node[]) => void
  setEdges: (edges: Edge[]) => void
  onNodesChange: OnNodesChange
  onEdgesChange: OnEdgesChange
  onConnect: OnConnect
  addNode: (node: Node) => void
  updateNodeParameter: (nodeId: string, paramName: string, value: any) => void
  updateEdgeParameter: (edgeId: string, paramName: string, value: any) => void
  updateEdgeFlow: (edgeId: string, flow: number) => void
  updateEdgeCalculationParams: (edgeId: string, a: number, b: number) => void
  updateEdgeParameterConfig: (
    edgeId: string,
    paramName: string,
    config: EdgeParameterConfig,
  ) => void
  setSelectedNode: (node: Node | null) => void
  setSelectedEdge: (edge: Edge | null) => void
  setShowMiniMap: (show: boolean) => void
  deleteSelectedEdge: () => void
  deleteSelectedNode: () => void

  // ========== 参数管理 ==========
  addCustomParameter: (paramName: string, description?: string) => void
  removeCustomParameter: (paramName: string) => void
  addNodeParameter: (
    nodeId: string,
    paramName: string,
    description?: string,
    defaultValue?: number,
  ) => void
  removeNodeParameter: (nodeId: string, paramName: string) => void
  addEdgeParameter: (
    edgeId: string,
    paramName: string,
    description?: string,
    defaultValue?: number,
  ) => void
  removeEdgeParameter: (edgeId: string, paramName: string) => void
  updateCalculationParameters: (params: Partial<CalculationParameters>) => void

  // ========== 数据导入导出 ==========
  exportFlowData: () => any
  importFlowData: (data: any) => { success: boolean; message: string }
  setImportedFileName: (fileName: string | null) => void

  // ========== 流程图管理 ==========
  saveFlowChart: (
    name: string,
    description?: string,
  ) => Promise<{ success: boolean; message: string; data?: TFlowChart }>
  loadFlowChart: (id: string) => Promise<{ success: boolean; message: string }>
  getFlowCharts: () => Promise<{
    success: boolean
    message: string
    data?: TFlowChart[]
  }>
  updateFlowChart: (
    id: string,
    name?: string,
    description?: string,
  ) => Promise<{ success: boolean; message: string; data?: TFlowChart }>
  deleteFlowChart: (
    id: string,
  ) => Promise<{ success: boolean; message: string }>
  setCurrentFlowChartId: (id: string | null) => void
  setCurrentFlowChartName: (name: string | null) => void
  setCurrentJobId: (jobId: string | null) => void
  newFlowChart: () => void

  // ========== 模型特定方法 ==========
  syncAllParametersToElements: () => void
  resetToModelDefaults: () => void
}

/**
 * 流程图服务接口
 * 用于抽象不同模型的流程图API调用
 */
export interface FlowChartService<
  TFlowChart,
  TFlowChartCreate,
  TFlowChartUpdate,
  TFlowChartsResponse,
> {
  getFlowcharts: (params: {
    skip?: number
    limit?: number
  }) => Promise<TFlowChartsResponse>
  createFlowchart: (params: {
    requestBody: TFlowChartCreate
  }) => Promise<TFlowChart>
  getFlowchart: (params: { id: string }) => Promise<TFlowChart>
  updateFlowchart: (params: {
    id: string
    requestBody: TFlowChartUpdate
  }) => Promise<TFlowChart>
  deleteFlowchart: (params: { id: string }) => Promise<any>
}

/**
 * 创建模型流程图Store的工厂函数
 * @param config 模型配置
 * @param flowChartService 流程图服务
 * @returns Zustand store hook
 */
export function createModelFlowStore<
  TFlowChart,
  TFlowChartCreate,
  TFlowChartUpdate,
  TFlowChartsResponse,
>(
  config: ModelConfig,
  flowChartService: FlowChartService<
    TFlowChart,
    TFlowChartCreate,
    TFlowChartUpdate,
    TFlowChartsResponse
  >,
  modelStore?: { getState: () => { reset: () => void } },
) {
  return create<ModelFlowState<TFlowChart, TFlowChartCreate, TFlowChartUpdate>>(
    (set, get) => ({
      // ========== 初始状态 ==========
      nodes: [],
      edges: [],
      selectedNode: null,
      selectedEdge: null,
      customParameters: [
        ...config.fixedParameters,
        ...(config.enhancedCalculationParameters ||
          config.calculationParameters),
      ],
      edgeParameterConfigs: {},
      currentFlowChartId: null,
      currentFlowChartName: "未命名",
      currentJobId: null,
      importedFileName: null,
      calculationParameters: getDefaultCalculationParams(
        config.modelName as any,
      ),
      modelConfig: config,
      showMiniMap: false,

      // ========== 基础操作 ==========
      setNodes: (nodes) => set({ nodes }),
      setEdges: (edges) => set({ edges }),

      onNodesChange: (changes: NodeChange[]) => {
        set({
          nodes: applyNodeChanges(changes, get().nodes),
        })
      },

      onEdgesChange: (changes: EdgeChange[]) => {
        set({
          edges: applyEdgeChanges(changes, get().edges),
        })
      },

      onConnect: (connection: Connection) => {
        const { source, target } = connection
        if (!source || !target || source === target) {
          return
        }

        const state = get()
        const hasDuplicateEdge = state.edges.some(
          (edge) => edge.source === source && edge.target === target,
        )
        if (hasDuplicateEdge) {
          return
        }

        const newEdge: Edge = {
          ...connection,
          id: `edge-${Date.now()}`,
          type: "editable",
          data: { flow: 0 },
        }

        // 为新连接线添加参数配置
        const newEdgeParameterConfigs = { ...state.edgeParameterConfigs }
        newEdgeParameterConfigs[newEdge.id] = {}

        // 为每个固定参数创建默认配置
        config.fixedParameters.forEach((param) => {
          newEdgeParameterConfigs[newEdge.id][param.name] = {
            a: 1, // 默认比例系数
            b: 0, // 默认常数项
          }
        })

        // 为每个自定义参数创建默认配置
        state.customParameters.forEach((param) => {
          newEdgeParameterConfigs[newEdge.id][param.name] = {
            a: 1, // 默认比例系数
            b: 0, // 默认常数项
          }
        })

        set({
          edges: [...state.edges, newEdge],
          edgeParameterConfigs: newEdgeParameterConfigs,
        })

        // 同步所有参数到现有元素（确保新连接线包含所有参数）
        get().syncAllParametersToElements()
      },

      addNode: (node: Node) => {
        set({ nodes: [...get().nodes, node] })
        // 同步所有参数到新添加的节点（确保新节点包含所有固定参数）
        get().syncAllParametersToElements()
      },

      updateNodeParameter: (nodeId: string, paramName: string, value: any) => {
        const state = get()
        const updatedNodes = state.nodes.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  [paramName]: value,
                },
              }
            : node,
        )

        // 如果更新的节点是当前选中的节点，也更新selectedNode
        const updatedSelectedNode =
          state.selectedNode?.id === nodeId
            ? updatedNodes.find((node) => node.id === nodeId) ||
              state.selectedNode
            : state.selectedNode

        set({
          nodes: updatedNodes,
          selectedNode: updatedSelectedNode,
        })
      },

      updateEdgeParameter: (edgeId: string, paramName: string, value: any) => {
        set({
          edges: get().edges.map((edge) =>
            edge.id === edgeId
              ? {
                  ...edge,
                  data: {
                    ...edge.data,
                    [paramName]: value,
                  },
                }
              : edge,
          ),
        })
      },

      updateEdgeFlow: (edgeId: string, flow: number) => {
        set({
          edges: get().edges.map((edge) =>
            edge.id === edgeId
              ? {
                  ...edge,
                  data: {
                    ...edge.data,
                    flow,
                  },
                }
              : edge,
          ),
        })
      },

      updateEdgeCalculationParams: (edgeId: string, a: number, b: number) => {
        const { edgeParameterConfigs } = get()
        const edgeConfigs = edgeParameterConfigs[edgeId] || {}

        set({
          edgeParameterConfigs: {
            ...edgeParameterConfigs,
            [edgeId]: {
              ...edgeConfigs,
              flow: { a, b },
            },
          },
        })
      },

      updateEdgeParameterConfig: (
        edgeId: string,
        paramName: string,
        config: EdgeParameterConfig,
      ) => {
        const { edgeParameterConfigs } = get()
        const edgeConfigs = edgeParameterConfigs[edgeId] || {}

        set({
          edgeParameterConfigs: {
            ...edgeParameterConfigs,
            [edgeId]: {
              ...edgeConfigs,
              [paramName]: config,
            },
          },
        })
      },

      setSelectedNode: (node: Node | null) => {
        set({ selectedNode: node })
      },

      setSelectedEdge: (edge: Edge | null) => {
        set({ selectedEdge: edge })
      },

      setShowMiniMap: (show: boolean) => {
        set({ showMiniMap: show })
      },

      deleteSelectedEdge: () => {
        const { selectedEdge, edges } = get()
        if (selectedEdge) {
          set({
            edges: edges.filter((edge) => edge.id !== selectedEdge.id),
            selectedEdge: null,
          })
        }
      },

      deleteSelectedNode: () => {
        const { selectedNode, nodes, edges } = get()
        if (selectedNode) {
          set({
            nodes: nodes.filter((node) => node.id !== selectedNode.id),
            edges: edges.filter(
              (edge) =>
                edge.source !== selectedNode.id &&
                edge.target !== selectedNode.id,
            ),
            selectedNode: null,
          })
        }
      },

      // ========== 参数管理 ==========
      addCustomParameter: (paramName: string, description?: string) => {
        const { customParameters } = get()
        if (customParameters.find((p) => p.name === paramName)) {
          return // 参数已存在
        }

        const newParam: CustomParameter = {
          name: paramName,
          label: paramName,
          description,
          defaultValue: 0,
        }

        set({
          customParameters: [...customParameters, newParam],
        })

        // 同步到所有节点
        const { nodes, edges, edgeParameterConfigs } = get()
        set({
          nodes: nodes.map((node) => ({
            ...node,
            data: {
              ...node.data,
              [paramName]: newParam.defaultValue,
            },
          })),
          edges: edges.map((edge) => ({
            ...edge,
            data: {
              ...edge.data,
              [paramName]: newParam.defaultValue,
            },
          })),
          edgeParameterConfigs: {
            ...edgeParameterConfigs,
            ...edges.reduce(
              (configs, edge) => {
                configs[edge.id] = {
                  ...edgeParameterConfigs[edge.id],
                  [paramName]: {
                    a: 1, // 默认比例系数
                    b: 0, // 默认常数项
                  },
                }
                return configs
              },
              {} as Record<string, Record<string, EdgeParameterConfig>>,
            ),
          },
        })
      },

      removeCustomParameter: (paramName: string) => {
        const { customParameters, nodes, edges, edgeParameterConfigs } = get()

        // 检查是否为固定参数或计算参数
        const isFixedParam = config.fixedParameters.some(
          (p) => p.name === paramName,
        )
        const isCalcParam = config.calculationParameters.some(
          (p) => p.name === paramName,
        )

        if (isFixedParam || isCalcParam) {
          return // 不能删除模型定义的参数
        }

        // 从 edgeParameterConfigs 中移除对应的配置
        const updatedEdgeParameterConfigs = { ...edgeParameterConfigs }
        Object.keys(updatedEdgeParameterConfigs).forEach((edgeId) => {
          if (updatedEdgeParameterConfigs[edgeId][paramName]) {
            const { [paramName]: removed, ...restConfigs } =
              updatedEdgeParameterConfigs[edgeId]
            updatedEdgeParameterConfigs[edgeId] = restConfigs
          }
        })

        set({
          customParameters: customParameters.filter(
            (p) => p.name !== paramName,
          ),
          nodes: nodes.map((node) => {
            const { [paramName]: removed, ...restData } = node.data
            return {
              ...node,
              data: restData,
            }
          }),
          edges: edges.map((edge) => {
            const { [paramName]: removed, ...restData } = edge.data || {}
            return {
              ...edge,
              data: restData,
            }
          }),
          edgeParameterConfigs: updatedEdgeParameterConfigs,
        })
      },

      addNodeParameter: (
        nodeId: string,
        paramName: string,
        _description?: string,
        defaultValue = 0,
      ) => {
        set({
          nodes: get().nodes.map((node) =>
            node.id === nodeId
              ? {
                  ...node,
                  data: {
                    ...node.data,
                    [paramName]: defaultValue,
                  },
                }
              : node,
          ),
        })
      },

      removeNodeParameter: (nodeId: string, paramName: string) => {
        set({
          nodes: get().nodes.map((node) => {
            if (node.id === nodeId) {
              const { [paramName]: removed, ...restData } = node.data
              return {
                ...node,
                data: restData,
              }
            }
            return node
          }),
        })
      },

      addEdgeParameter: (
        edgeId: string,
        paramName: string,
        _description?: string,
        defaultValue = 0,
      ) => {
        set({
          edges: get().edges.map((edge) =>
            edge.id === edgeId
              ? {
                  ...edge,
                  data: {
                    ...edge.data,
                    [paramName]: defaultValue,
                  },
                }
              : edge,
          ),
        })
      },

      removeEdgeParameter: (edgeId: string, paramName: string) => {
        set({
          edges: get().edges.map((edge) => {
            if (edge.id === edgeId) {
              const { [paramName]: removed, ...restData } = edge.data || {}
              return {
                ...edge,
                data: restData,
              }
            }
            return edge
          }),
        })
      },

      updateCalculationParameters: (params: Partial<CalculationParameters>) => {
        set({
          calculationParameters: {
            ...get().calculationParameters,
            ...params,
          },
        })
      },

      // ========== 数据导入导出 ==========
      exportFlowData: () => {
        const state = get()

        // 获取计算参数的名称列表 - 使用enhancedCalculationParameters替代空的calculationParameters
        const calculationParamNames =
          config.enhancedCalculationParameters?.map((param) => param.name) ||
          config.calculationParameters.map((param) => param.name)
        // 获取固定参数的名称列表
        const fixedParamNames = config.fixedParameters.map(
          (param) => param.name,
        )

        // 处理节点数据
        const processedNodes = state.nodes.map((node) => {
          if (
            (node.type === "asmslim" || node.type === "asm1slim") &&
            node.data
          ) {
            // ASM1slim节点：分离固定参数和计算参数
            const { volume, ...nodeData } = node.data
            const fixedParams: any = { volume: volume ?? "1e-3" }
            const modelParams: any = {}

            // 遍历节点数据，分离固定参数和计算参数
            Object.keys(nodeData).forEach((key) => {
              if (calculationParamNames.includes(key)) {
                modelParams[key] = nodeData[key]
              } else {
                fixedParams[key] = nodeData[key]
              }
            })

            return {
              ...node,
              type: "asm1slim",
              data: fixedParams,
              asm1slimParameters: modelParams,
            }
          }
          if (node.type === "asm1" && node.data) {
            // ASM1节点：分离固定参数和计算参数
            const { volume, ...nodeData } = node.data
            const fixedParams: any = { volume: volume ?? "1e-3" }
            const modelParams: any = {}

            // 遍历节点数据，分离固定参数和计算参数
            Object.keys(nodeData).forEach((key) => {
              if (calculationParamNames.includes(key)) {
                modelParams[key] = nodeData[key]
              } else {
                fixedParams[key] = nodeData[key]
              }
            })

            return {
              ...node,
              data: fixedParams,
              asm1Parameters: modelParams,
            }
          }
          if (node.type === "asm3" && node.data) {
            // ASM3节点：分离固定参数和ASM3状态变量参数
            const { volume, label, ...nodeData } = node.data
            const fixedParams: any = { volume: volume ?? "1e-3", label }
            const modelParams: any = {}

            // 遍历节点数据，分离ASM3状态变量参数
            Object.keys(nodeData).forEach((key) => {
              if (calculationParamNames.includes(key)) {
                modelParams[key] = nodeData[key]
              } else if (fixedParamNames.includes(key)) {
                fixedParams[key] = nodeData[key]
              }
            })

            return {
              ...node,
              data: fixedParams,
              asm3Parameters: modelParams,
            }
          }
          if (node.data) {
            // 非ASM1slim节点：只保留固定参数，移除计算参数
            const { volume, ...nodeData } = node.data
            const filteredData: any = { volume: volume ?? "1e-3" }

            // 只保留固定参数和label
            Object.keys(nodeData).forEach((key) => {
              if (fixedParamNames.includes(key) || key === "label") {
                filteredData[key] = nodeData[key]
              }
            })

            return {
              ...node,
              data: filteredData,
            }
          }

          // 没有data的节点保持原样
          return node
        })

        // 处理边数据，只导出固定参数的a和b配置
        const processedEdges = state.edges.map((edge) => {
          const { flow } = edge.data || {}
          const edgeConfigs = state.edgeParameterConfigs[edge.id] || {}

          // 构建新的data对象，包含flow和固定参数的a、b配置
          const newData: any = {
            flow: flow || 0,
          }

          // 只为固定参数添加a和b配置，不包含计算参数
          config.fixedParameters.forEach((param) => {
            const configItem = edgeConfigs[param.name] || { a: 1, b: 0 }
            newData[`${param.name}_a`] = configItem.a
            newData[`${param.name}_b`] = configItem.b
          })

          return {
            ...edge,
            data: newData,
          }
        })

        return {
          nodes: processedNodes,
          edges: processedEdges,
          customParameters: config.fixedParameters, // 只导出固定参数，不包含计算参数
          calculationParameters: state.calculationParameters,
          exportedAt: new Date().toISOString(),
          version: "1.0",
        }
      },

      importFlowData: (data: any) => {
        try {
          // 清理模型计算结果
          if (modelStore) {
            modelStore.getState().reset()
          }

          // 验证数据格式
          if (!data || typeof data !== "object") {
            return { success: false, message: "无效的数据格式" }
          }

          const {
            nodes,
            edges: importedEdges,
            customParameters,
            edgeParameterConfigs,
          } = data

          // 基本验证
          if (!Array.isArray(nodes) || !Array.isArray(importedEdges)) {
            return { success: false, message: "节点或边数据格式错误" }
          }

          // 处理导入的节点数据，将asm1slimParameters、modelParameters或asm1Parameters合并到data中
          const processedNodes = nodes.map((node: any) => {
            if (
              (node.type === "asm1slim" || node.type === "asmslim") &&
              (node.asm1slimParameters || node.modelParameters)
            ) {
              // 将asm1slimParameters或modelParameters合并到data中（兼容旧格式）
              const parameters = node.asm1slimParameters || node.modelParameters
              return {
                ...node,
                type: "asmslim", // 内部统一使用asmslim类型
                data: {
                  ...node.data,
                  ...parameters,
                },
                // 移除参数字段
                asm1slimParameters: undefined,
                modelParameters: undefined,
              }
            }
            if (node.type === "asm1" && node.asm1Parameters) {
              // 将asm1Parameters合并到data中
              return {
                ...node,
                data: {
                  ...node.data,
                  ...node.asm1Parameters,
                },
                // 移除参数字段
                asm1Parameters: undefined,
              }
            }
            return node
          })

          // 处理导入的边数据，从data中提取自定义参数的a和b配置
          const processedEdges: any[] = []
          const newEdgeParameterConfigs: Record<
            string,
            Record<string, EdgeParameterConfig>
          > = {}

          importedEdges.forEach((edge: any) => {
            if (!edge.data) {
              processedEdges.push(edge)
              return
            }

            // 提取flow参数
            const { flow, ...otherData } = edge.data

            // 创建新的边数据对象，只包含flow
            const newEdgeData: any = { flow: flow || 0 }

            // 为每条边创建参数配置对象
            newEdgeParameterConfigs[edge.id] = {}

            // 处理自定义参数的a和b配置
            if (Array.isArray(customParameters)) {
              customParameters.forEach((param: any) => {
                const aKey = `${param.name}_a`
                const bKey = `${param.name}_b`

                if (aKey in otherData || bKey in otherData) {
                  newEdgeParameterConfigs[edge.id][param.name] = {
                    a: otherData[aKey] !== undefined ? otherData[aKey] : 1,
                    b: otherData[bKey] !== undefined ? otherData[bKey] : 0,
                  }
                }
              })
            }

            // 添加处理后的边
            processedEdges.push({
              ...edge,
              data: newEdgeData,
            })
          })

          // 合并自定义参数（保留模型定义的参数）
          const enhancedCalculationParams =
            config.enhancedCalculationParameters || config.calculationParameters
          const mergedCustomParameters = customParameters
            ? [
                ...config.fixedParameters,
                ...enhancedCalculationParams,
                ...customParameters.filter(
                  (param: CustomParameter) =>
                    !config.fixedParameters.some(
                      (fp) => fp.name === param.name,
                    ) &&
                    !enhancedCalculationParams.some(
                      (cp) => cp.name === param.name,
                    ),
                ),
              ]
            : [...config.fixedParameters, ...enhancedCalculationParams]

          // 合并边参数配置：优先使用从边数据中提取的配置，然后使用导入数据中的配置
          const finalEdgeParameterConfigs = {
            ...edgeParameterConfigs,
            ...newEdgeParameterConfigs,
          }

          set({
            nodes: processedNodes || [],
            edges: processedEdges,
            customParameters: mergedCustomParameters,
            edgeParameterConfigs: finalEdgeParameterConfigs,
            // 保持当前的计算参数，不使用导入数据中的参数
            // calculationParameters: calculationParameters || getDefaultCalculationParams(config.modelName as any),
            selectedNode: null,
            selectedEdge: null,
          })

          return { success: true, message: "流程图导入成功" }
        } catch (error) {
          console.error("导入流程图失败:", error)
          return {
            success: false,
            message: error instanceof Error ? error.message : "导入失败",
          }
        }
      },

      setImportedFileName: (fileName: string | null) => {
        set({ importedFileName: fileName })
      },

      // ========== 流程图管理 ==========
      saveFlowChart: async (name: string, description?: string) => {
        try {
          const flowData = get().exportFlowData()
          const { currentFlowChartId } = get()

          if (currentFlowChartId) {
            // 更新现有流程图
            const result = await flowChartService.updateFlowchart({
              id: currentFlowChartId,
              requestBody: {
                name,
                description,
                flow_data: flowData,
              } as TFlowChartUpdate,
            })

            set({ currentFlowChartName: name })
            return { success: true, message: "流程图更新成功", data: result }
          }
          // 创建新流程图
          const result = await flowChartService.createFlowchart({
            requestBody: {
              name,
              description,
              flow_data: flowData,
            } as TFlowChartCreate,
          })

          set({
            currentFlowChartId: (result as any).id,
            currentFlowChartName: name,
          })
          return { success: true, message: "流程图创建成功", data: result }
        } catch (error: any) {
          console.error("保存流程图失败:", error)
          const message =
            error?.body?.detail || error?.message || "保存流程图失败"
          return { success: false, message }
        }
      },

      loadFlowChart: async (id: string) => {
        try {
          const flowchart = await flowChartService.getFlowchart({ id })
          const flowData = (flowchart as any).flow_data

          if (flowData) {
            const importResult = get().importFlowData(flowData)
            if (importResult.success) {
              set({
                currentFlowChartId: id,
                currentFlowChartName: (flowchart as any).name || "未命名",
                importedFileName: null,
              })
              return { success: true, message: "流程图加载成功" }
            }
            return {
              success: false,
              message: `加载失败: ${importResult.message}`,
            }
          }
          return { success: false, message: "流程图数据为空" }
        } catch (error: any) {
          console.error("加载流程图失败:", error)
          const message =
            error?.body?.detail || error?.message || "加载流程图失败"
          return { success: false, message }
        }
      },

      getFlowCharts: async () => {
        try {
          const response = await flowChartService.getFlowcharts({
            skip: 0,
            limit: 100,
          })
          return {
            success: true,
            message: "获取流程图列表成功",
            data: (response as any).data || [],
          }
        } catch (error: any) {
          console.error("获取流程图列表失败:", error)
          const message =
            error?.body?.detail || error?.message || "获取流程图列表失败"
          return { success: false, message }
        }
      },

      updateFlowChart: async (
        id: string,
        name?: string,
        description?: string,
      ) => {
        try {
          const flowData = get().exportFlowData()
          const result = await flowChartService.updateFlowchart({
            id,
            requestBody: {
              name,
              description,
              flow_data: flowData,
            } as TFlowChartUpdate,
          })

          if (id === get().currentFlowChartId && name) {
            set({ currentFlowChartName: name })
          }

          return { success: true, message: "流程图更新成功", data: result }
        } catch (error: any) {
          console.error("更新流程图失败:", error)
          const message =
            error?.body?.detail || error?.message || "更新流程图失败"
          return { success: false, message }
        }
      },

      deleteFlowChart: async (id: string) => {
        try {
          await flowChartService.deleteFlowchart({ id })

          if (id === get().currentFlowChartId) {
            get().newFlowChart()
          }

          return { success: true, message: "流程图删除成功" }
        } catch (error: any) {
          console.error("删除流程图失败:", error)
          const message =
            error?.body?.detail || error?.message || "删除流程图失败"
          return { success: false, message }
        }
      },

      setCurrentFlowChartId: (id: string | null) => {
        set({ currentFlowChartId: id })
      },

      setCurrentFlowChartName: (name: string | null) => {
        set({ currentFlowChartName: name })
      },

      setCurrentJobId: (jobId: string | null) => {
        set({ currentJobId: jobId })
      },

      newFlowChart: () => {
        // 清理模型计算结果
        if (modelStore) {
          modelStore.getState().reset()
        }

        set({
          nodes: [],
          edges: [],
          selectedNode: null,
          selectedEdge: null,
          customParameters: [
            ...config.fixedParameters,
            ...(config.enhancedCalculationParameters ||
              config.calculationParameters),
          ],
          edgeParameterConfigs: {},
          currentFlowChartId: null,
          currentFlowChartName: "未命名",
          currentJobId: null,
          importedFileName: null,
          calculationParameters: getDefaultCalculationParams(
            config.modelName as any,
          ),
        })
      },

      // addNodeParameter: (nodeId: string, paramName: string, _description?: string, defaultValue: number = 0) => {
      //   const state = get()
      //   const updatedNodes = state.nodes.map(node => {
      //     if (node.id === nodeId) {
      //       return {
      //         ...node,
      //         data: {
      //           ...node.data,
      //           [paramName]: defaultValue
      //         }
      //       }
      //     }
      //     return node
      //   })
      //   set({ nodes: updatedNodes })
      // },

      // removeNodeParameter: (nodeId: string, paramName: string) => {
      //   const state = get()
      //   const updatedNodes = state.nodes.map(node => {
      //     if (node.id === nodeId && node.data) {
      //       const { [paramName]: removed, ...remainingData } = node.data
      //       return {
      //         ...node,
      //         data: remainingData
      //       }
      //     }
      //     return node
      //   })
      //   set({ nodes: updatedNodes })
      // },

      // addEdgeParameter: (edgeId: string, paramName: string, _description?: string, defaultValue: number = 0) => {
      //   const state = get()
      //   const updatedEdges = state.edges.map(edge => {
      //     if (edge.id === edgeId) {
      //       return {
      //         ...edge,
      //         data: {
      //           ...edge.data,
      //           [paramName]: defaultValue
      //         }
      //       }
      //     }
      //     return edge
      //   })
      //   set({ edges: updatedEdges })
      // },

      // removeEdgeParameter: (edgeId: string, paramName: string) => {
      //   const state = get()
      //   const updatedEdges = state.edges.map(edge => {
      //     if (edge.id === edgeId && edge.data) {
      //       const { [paramName]: removed, ...remainingData } = edge.data
      //       return {
      //         ...edge,
      //         data: remainingData
      //       }
      //     }
      //     return edge
      //   })
      //   set({ edges: updatedEdges })
      // },

      // ========== 模型特定方法 ==========
      syncAllParametersToElements: () => {
        const state = get()
        // 使用enhancedCalculationParameters替代空的calculationParameters
        const enhancedCalculationParams =
          config.enhancedCalculationParameters || config.calculationParameters
        const allParameters = [
          ...config.fixedParameters,
          ...enhancedCalculationParams,
          ...state.customParameters,
        ]

        // 为所有现有节点添加缺失的参数
        const updatedNodes = state.nodes.map((node) => {
          const updatedData = { ...node.data }

          // 检查并添加缺失的参数
          allParameters.forEach((param) => {
            if (!(param.name in updatedData)) {
              updatedData[param.name] = param.defaultValue
            }
          })

          return {
            ...node,
            data: updatedData,
          }
        })

        // 为所有现有连接线添加缺失的参数
        const updatedEdges = state.edges.map((edge) => {
          const updatedData = { ...edge.data }

          // 检查并添加缺失的参数
          allParameters.forEach((param) => {
            if (!(param.name in updatedData)) {
              updatedData[param.name] = param.defaultValue
            }
          })

          return {
            ...edge,
            data: updatedData,
          }
        })

        // 为所有现有连接线添加缺失的ab配置
        const updatedEdgeParameterConfigs = { ...state.edgeParameterConfigs }
        state.edges.forEach((edge) => {
          if (!updatedEdgeParameterConfigs[edge.id]) {
            updatedEdgeParameterConfigs[edge.id] = {}
          }

          // 为所有参数添加ab配置
          allParameters.forEach((param) => {
            if (!updatedEdgeParameterConfigs[edge.id][param.name]) {
              updatedEdgeParameterConfigs[edge.id][param.name] = {
                a: 1, // 默认比例系数
                b: 0, // 默认常数项
              }
            }
          })
        })

        set({
          nodes: updatedNodes,
          edges: updatedEdges,
          edgeParameterConfigs: updatedEdgeParameterConfigs,
        })
      },

      resetToModelDefaults: () => {
        const { nodes, edges } = get()
        // 使用enhancedCalculationParameters替代空的calculationParameters
        const enhancedCalculationParams =
          config.enhancedCalculationParameters || config.calculationParameters

        // 重置所有节点参数为默认值
        const resetNodes = nodes.map((node) => {
          const resetData = { ...node.data }
          config.fixedParameters.forEach((param) => {
            resetData[param.name] = param.defaultValue
          })
          enhancedCalculationParams.forEach((param) => {
            resetData[param.name] = param.defaultValue
          })
          return {
            ...node,
            data: resetData,
          }
        })

        // 重置所有边参数为默认值
        const resetEdges = edges.map((edge) => {
          const resetData = { ...edge.data }
          config.fixedParameters.forEach((param) => {
            resetData[param.name] = param.defaultValue
          })
          enhancedCalculationParams.forEach((param) => {
            resetData[param.name] = param.defaultValue
          })
          return {
            ...edge,
            data: resetData,
          }
        })

        set({
          nodes: resetNodes,
          edges: resetEdges,
          calculationParameters: getDefaultCalculationParams(
            config.modelName as any,
          ),
          customParameters: [
            ...config.fixedParameters,
            ...enhancedCalculationParams,
          ],
          edgeParameterConfigs: {},
        })
      },
    }),
  )
}

// 导出类型
// 导出类型（避免重复导出）
// export type { ModelFlowState, FlowChartService }
