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
import { FlowchartsService } from "../client/sdk.gen"
import type {
  FlowChartCreate,
  FlowChartPublic,
  FlowChartUpdate,
} from "../client/types.gen"
import { getDefaultCalculationParams } from "../config/simulationConfig"
import { useMaterialBalanceStore } from "./materialBalanceStore"

type CustomParameter = {
  name: string
  label: string
  description?: string
  defaultValue: number
}

type EdgeParameterConfig = {
  a: number // 比例系数
  b: number // 常数项
}

type CalculationParameters = {
  hours: number
  steps_per_hour: number
  solver_method: string
  tolerance: number
  max_iterations: number
  max_memory_mb: number
  sampling_interval_hours?: number
}

type RFState = {
  nodes: Node[]
  edges: Edge[]
  selectedNode: Node | null
  selectedEdge: Edge | null
  customParameters: CustomParameter[] // 动态自定义参数列表（不再全局共享）
  edgeParameterConfigs: Record<string, Record<string, EdgeParameterConfig>> // 连接线参数配置 {edgeId: {paramName: {a, b}}}
  importedFileName: string | null // 导入的文件名
  calculationParameters: CalculationParameters // 计算参数
  currentFlowChartId: string | null
  currentFlowChartName: string | null // 当前流程图名称
  currentJobId: string | null // 当前计算任务ID
  showMiniMap: boolean
  showBubbleMenu: boolean

  // 操作函数
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
  setShowBubbleMenu: (show: boolean) => void
  deleteSelectedEdge: () => void
  deleteSelectedNode: () => void
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
  exportFlowData: () => any
  importFlowData: (data: any) => { success: boolean; message: string }
  setImportedFileName: (fileName: string | null) => void
  updateCalculationParameters: (params: Partial<CalculationParameters>) => void

  // 后端API相关功能
  saveFlowChart: (
    name: string,
    description?: string,
  ) => Promise<{ success: boolean; message: string; data?: FlowChartPublic }>
  loadFlowChart: (id: string) => Promise<{ success: boolean; message: string }>
  getFlowCharts: () => Promise<{
    success: boolean
    message: string
    data?: FlowChartPublic[]
  }>
  updateFlowChart: (
    id: string,
    name?: string,
    description?: string,
  ) => Promise<{ success: boolean; message: string; data?: FlowChartPublic }>
  deleteFlowChart: (
    id: string,
  ) => Promise<{ success: boolean; message: string }>
  setCurrentFlowChartId: (id: string | null) => void
  setCurrentFlowChartName: (name: string | null) => void
  setCurrentJobId: (jobId: string | null) => void
  newFlowChart: () => void
  syncAllParametersToElements?: () => void // ASM1Slim专用方法，可选
}

const useFlowStore = create<RFState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNode: null,
  selectedEdge: null,
  customParameters: [], // 初始化自定义参数列表
  edgeParameterConfigs: {}, // 初始化连接线参数配置
  currentFlowChartId: null, // 当前流程图ID
  currentFlowChartName: "未命名", // 当前流程图名称
  currentJobId: null, // 当前计算任务ID
  importedFileName: null, // 导入的文件名

  // 初始化计算参数 - 使用统一配置
  calculationParameters: getDefaultCalculationParams("materialBalance"),
  showMiniMap: false,
  showBubbleMenu: false,

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

    const newEdge = {
      ...connection,
      id: `edge-${Date.now()}`,
      type: "editable",
      data: {
        flow: 0, // 改为flow表示流量
        a: 1, // 计算参数a
        b: 0, // 计算参数b
      },
    }

    // 为新连接线添加参数配置
    const newEdgeParameterConfigs = { ...state.edgeParameterConfigs }
    newEdgeParameterConfigs[newEdge.id] = {}

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
  },

  updateEdgeFlow: (edgeId: string, flow: number) => {
    const state = get()
    const updatedEdges = state.edges.map((edge) => {
      if (edge.id === edgeId) {
        return {
          ...edge,
          data: {
            ...edge.data,
            flow: flow,
          },
        }
      }
      return edge
    })

    // 如果更新的边是当前选中的边，也更新selectedEdge
    const updatedSelectedEdge =
      state.selectedEdge?.id === edgeId
        ? updatedEdges.find((edge) => edge.id === edgeId) || state.selectedEdge
        : state.selectedEdge

    set({
      edges: updatedEdges,
      selectedEdge: updatedSelectedEdge,
    })
  },

  updateEdgeCalculationParams: (edgeId: string, a: number, b: number) => {
    const state = get()

    // a和b互斥逻辑：只能有一个不为0
    const finalA = a
    let finalB = b

    if (a !== 0 && b !== 0) {
      // 如果两个都不为0，保持最后修改的那个，另一个设为0
      // 这里我们需要知道哪个是最后修改的，暂时保持a，b设为0
      finalB = 0
    }

    const updatedEdges = state.edges.map((edge) => {
      if (edge.id === edgeId) {
        return {
          ...edge,
          data: {
            ...edge.data,
            a: finalA,
            b: finalB,
          },
        }
      }
      return edge
    })

    // 如果更新的边是当前选中的边，也更新selectedEdge
    const updatedSelectedEdge =
      state.selectedEdge?.id === edgeId
        ? updatedEdges.find((edge) => edge.id === edgeId) || state.selectedEdge
        : state.selectedEdge

    set({
      edges: updatedEdges,
      selectedEdge: updatedSelectedEdge,
    })
  },

  addNode: (node: Node) => {
    set({
      nodes: [...get().nodes, node],
    })
  },

  updateNodeParameter: (nodeId: string, paramName: string, value: any) => {
    const state = get()
    const updatedNodes = state.nodes.map((node) => {
      if (node.id === nodeId) {
        return {
          ...node,
          data: {
            ...node.data,
            [paramName]: value,
          },
        }
      }
      return node
    })

    // 如果更新的节点是当前选中的节点，也更新selectedNode
    const updatedSelectedNode =
      state.selectedNode?.id === nodeId
        ? updatedNodes.find((node) => node.id === nodeId) || state.selectedNode
        : state.selectedNode

    set({
      nodes: updatedNodes,
      selectedNode: updatedSelectedNode,
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
  setShowBubbleMenu: (show: boolean) => {
    set({ showBubbleMenu: show })
  },

  // 更新计算参数方法 - 修复类型错误
  updateCalculationParameters: (params: Partial<CalculationParameters>) => {
    set((state) => ({
      calculationParameters: {
        ...state.calculationParameters,
        ...params,
      },
    }))
  },

  deleteSelectedEdge: () => {
    const selectedEdge = get().selectedEdge
    if (selectedEdge) {
      set({
        edges: get().edges.filter((edge) => edge.id !== selectedEdge.id),
        selectedEdge: null,
      })
    }
  },

  deleteSelectedNode: () => {
    const selectedNode = get().selectedNode
    if (selectedNode) {
      // 删除节点
      const newNodes = get().nodes.filter((node) => node.id !== selectedNode.id)
      // 删除与该节点相关的所有连接线
      const newEdges = get().edges.filter(
        (edge) =>
          edge.source !== selectedNode.id && edge.target !== selectedNode.id,
      )

      set({
        nodes: newNodes,
        edges: newEdges,
        selectedNode: null,
        selectedEdge: null, // 如果删除的节点有相关连接线，也清除边的选择
      })
    }
  },

  updateEdgeParameter: (edgeId: string, paramName: string, value: any) => {
    const state = get()
    const updatedEdges = state.edges.map((edge) => {
      if (edge.id === edgeId) {
        return {
          ...edge,
          data: {
            ...edge.data,
            [paramName]: value,
          },
        }
      }
      return edge
    })

    // 如果更新的边是当前选中的边，也更新selectedEdge
    const updatedSelectedEdge =
      state.selectedEdge?.id === edgeId
        ? updatedEdges.find((edge) => edge.id === edgeId) || state.selectedEdge
        : state.selectedEdge

    set({
      edges: updatedEdges,
      selectedEdge: updatedSelectedEdge,
    })
  },

  updateEdgeParameterConfig: (
    edgeId: string,
    paramName: string,
    config: EdgeParameterConfig,
  ) => {
    const state = get()
    const updatedConfigs = {
      ...state.edgeParameterConfigs,
      [edgeId]: {
        ...state.edgeParameterConfigs[edgeId],
        [paramName]: config,
      },
    }
    set({ edgeParameterConfigs: updatedConfigs })
  },

  addCustomParameter: (paramName: string, description?: string) => {
    const state = get()
    const newParam: CustomParameter = {
      name: paramName,
      label: paramName,
      description: description,
      defaultValue: 0,
    }

    // 添加到参数定义列表
    const updatedCustomParameters = [...state.customParameters, newParam]

    // 自动应用到所有现有节点
    const updatedNodes = state.nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        [paramName]: newParam.defaultValue,
      },
    }))

    // 自动应用到所有现有连接线
    const updatedEdges = state.edges.map((edge) => ({
      ...edge,
      data: {
        ...edge.data,
        [paramName]: newParam.defaultValue,
      },
    }))

    // 为所有现有连接线添加新参数的ab配置
    const updatedEdgeParameterConfigs = { ...state.edgeParameterConfigs }
    state.edges.forEach((edge) => {
      if (!updatedEdgeParameterConfigs[edge.id]) {
        updatedEdgeParameterConfigs[edge.id] = {}
      }
      updatedEdgeParameterConfigs[edge.id][paramName] = {
        a: 1, // 默认比例系数
        b: 0, // 默认常数项
      }
    })

    set({
      customParameters: updatedCustomParameters,
      nodes: updatedNodes,
      edges: updatedEdges,
      edgeParameterConfigs: updatedEdgeParameterConfigs,
    })
  },

  removeCustomParameter: (paramName: string) => {
    const state = get()

    // 从参数定义列表中移除
    const updatedCustomParameters = state.customParameters.filter(
      (param) => param.name !== paramName,
    )

    // 从所有节点中移除该参数
    const updatedNodes = state.nodes.map((node) => {
      const { [paramName]: removed, ...restData } = node.data || {}
      return {
        ...node,
        data: restData,
      }
    })

    // 从所有连接线中移除该参数
    const updatedEdges = state.edges.map((edge) => {
      const { [paramName]: removed, ...restData } = edge.data || {}
      return {
        ...edge,
        data: restData,
      }
    })

    // 从所有连接线的ab配置中移除该参数
    const updatedEdgeParameterConfigs = { ...state.edgeParameterConfigs }
    Object.keys(updatedEdgeParameterConfigs).forEach((edgeId) => {
      if (updatedEdgeParameterConfigs[edgeId][paramName]) {
        delete updatedEdgeParameterConfigs[edgeId][paramName]
      }
    })

    set({
      customParameters: updatedCustomParameters,
      nodes: updatedNodes,
      edges: updatedEdges,
      edgeParameterConfigs: updatedEdgeParameterConfigs,
    })
  },

  // 为单个节点添加参数
  addNodeParameter: (
    nodeId: string,
    paramName: string,
    _description?: string,
    defaultValue = 0,
  ) => {
    const state = get()
    const updatedNodes = state.nodes.map((node) => {
      if (node.id === nodeId) {
        return {
          ...node,
          data: {
            ...node.data,
            [paramName]: defaultValue,
          },
        }
      }
      return node
    })

    const updatedSelectedNode =
      state.selectedNode?.id === nodeId
        ? updatedNodes.find((n) => n.id === nodeId) || state.selectedNode
        : state.selectedNode

    set({
      nodes: updatedNodes,
      selectedNode: updatedSelectedNode,
    })
  },

  // 从单个节点移除参数
  removeNodeParameter: (nodeId: string, paramName: string) => {
    const state = get()
    const updatedNodes = state.nodes.map((node) => {
      if (node.id === nodeId) {
        const { [paramName]: removed, ...restData } = node.data || {}
        return {
          ...node,
          data: restData,
        }
      }
      return node
    })

    const updatedSelectedNode =
      state.selectedNode?.id === nodeId
        ? updatedNodes.find((n) => n.id === nodeId) || state.selectedNode
        : state.selectedNode

    set({
      nodes: updatedNodes,
      selectedNode: updatedSelectedNode,
    })
  },

  // 为单个连接线添加参数
  addEdgeParameter: (
    edgeId: string,
    paramName: string,
    _description?: string,
    defaultValue = 0,
  ) => {
    const state = get()
    const updatedEdges = state.edges.map((edge) => {
      if (edge.id === edgeId) {
        return {
          ...edge,
          data: {
            ...edge.data,
            [paramName]: defaultValue,
          },
        }
      }
      return edge
    })

    const updatedSelectedEdge =
      state.selectedEdge?.id === edgeId
        ? updatedEdges.find((e) => e.id === edgeId) || state.selectedEdge
        : state.selectedEdge

    set({
      edges: updatedEdges,
      selectedEdge: updatedSelectedEdge,
    })
  },

  // 从单个连接线移除参数
  removeEdgeParameter: (edgeId: string, paramName: string) => {
    const state = get()
    const updatedEdges = state.edges.map((edge) => {
      if (edge.id === edgeId) {
        const { [paramName]: removed, ...restData } = edge.data || {}
        return {
          ...edge,
          data: restData,
        }
      }
      return edge
    })

    const updatedSelectedEdge =
      state.selectedEdge?.id === edgeId
        ? updatedEdges.find((e) => e.id === edgeId) || state.selectedEdge
        : state.selectedEdge

    set({
      edges: updatedEdges,
      selectedEdge: updatedSelectedEdge,
    })
  },

  // 导出流程图数据
  exportFlowData: () => {
    const state = get()

    // 处理边数据，将自定义参数的a和b配置移动到边的data中
    const processedEdges = state.edges.map((edge) => {
      const { flow } = edge.data || {}
      const edgeConfigs = state.edgeParameterConfigs[edge.id] || {}

      // 构建新的data对象，包含flow和所有自定义参数的a、b配置
      const newData: any = {
        flow: flow || 0,
      }

      // 为每个自定义参数添加a和b配置
      state.customParameters.forEach((param) => {
        const config = edgeConfigs[param.name] || { a: 1, b: 0 }
        newData[`${param.name}_a`] = config.a
        newData[`${param.name}_b`] = config.b
      })

      return {
        ...edge,
        data: newData,
      }
    })

    return {
      nodes: state.nodes,
      edges: processedEdges,
      customParameters: state.customParameters,
      calculationParameters: state.calculationParameters,
      exportedAt: new Date().toISOString(),
      version: "1.0",
    }
  },

  // 导入流程图数据
  importFlowData: (data: any) => {
    try {
      // 验证数据格式
      if (!data || typeof data !== "object") {
        throw new Error("无效的数据格式")
      }

      const {
        nodes,
        edges: importedEdges,
        customParameters,
        edgeParameterConfigs,
      } = data

      // 基本验证
      if (!Array.isArray(nodes) || !Array.isArray(importedEdges)) {
        throw new Error("节点或边数据格式错误")
      }

      // 处理导入的节点数据，确保自定义参数被正确保留
      const processedNodes: Node[] = nodes.map((node: any) => {
        // 保留所有节点数据，包括自定义参数
        const nodeData = { ...node.data }

        // 为所有自定义参数添加默认值（如果不存在）
        if (Array.isArray(customParameters)) {
          customParameters.forEach((param) => {
            if (!(param.name in nodeData)) {
              nodeData[param.name] =
                param.defaultValue !== undefined ? param.defaultValue : 0
            }
          })
        }

        return {
          ...node,
          data: nodeData,
        } as Node
      })

      // 处理导入的边数据，从data中提取自定义参数的a和b配置
      const processedEdges: Edge[] = []
      const newEdgeParameterConfigs: Record<
        string,
        Record<string, EdgeParameterConfig>
      > = {}

      importedEdges.forEach((edge: any) => {
        if (!edge.data) {
          processedEdges.push(edge as Edge)
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
          customParameters.forEach((param) => {
            const aKey = `${param.name}_a`
            const bKey = `${param.name}_b`

            // 为每个自定义参数创建配置，如果数据中没有则使用默认值
            newEdgeParameterConfigs[edge.id][param.name] = {
              a: otherData[aKey] !== undefined ? otherData[aKey] : 1,
              b: otherData[bKey] !== undefined ? otherData[bKey] : 0,
            }
          })
        } else {
          // 如果customParameters不存在，从边数据中自动推断自定义参数
          Object.keys(otherData).forEach((key) => {
            if (key.endsWith("_a")) {
              const paramName = key.slice(0, -2) // 移除'_a'后缀
              const bKey = `${paramName}_b`

              if (!newEdgeParameterConfigs[edge.id][paramName]) {
                newEdgeParameterConfigs[edge.id][paramName] = {
                  a: otherData[key] !== undefined ? otherData[key] : 1,
                  b: otherData[bKey] !== undefined ? otherData[bKey] : 0,
                }
              }
            }
          })
        }

        // 添加处理后的边
        processedEdges.push({
          ...edge,
          data: newEdgeData,
        } as Edge)
      })

      set({
        nodes: processedNodes,
        edges: processedEdges,
        customParameters: customParameters || [],
        edgeParameterConfigs: edgeParameterConfigs || newEdgeParameterConfigs,
        // 保持当前的计算参数，不使用导入数据中的参数
        // calculationParameters: calculationParameters || getDefaultCalculationParams('materialBalance'),
        selectedNode: null,
        selectedEdge: null,
      })

      // 清理物料平衡计算结果
      useMaterialBalanceStore.getState().reset()

      return { success: true, message: "流程图导入成功" }
    } catch (error) {
      console.error("导入流程图失败:", error)
      return {
        success: false,
        message: error instanceof Error ? error.message : "导入失败",
      }
    }
  },

  // 设置当前流程图ID
  setCurrentFlowChartId: (id: string | null) => {
    set({ currentFlowChartId: id })
  },

  // 设置当前流程图名称
  setCurrentFlowChartName: (name: string | null) => {
    set({ currentFlowChartName: name })
  },

  // 设置导入的文件名
  setImportedFileName: (fileName: string | null) => {
    set({ importedFileName: fileName })
  },

  // 保存流程图到后端
  saveFlowChart: async (name: string, description?: string) => {
    try {
      const { nodes, edges, customParameters, edgeParameterConfigs } = get()

      // 处理边数据，将自定义参数的a和b配置移动到边的data中
      const processedEdges = edges.map((edge) => {
        const { flow } = edge.data || {}
        const edgeConfigs = edgeParameterConfigs[edge.id] || {}

        // 构建新的data对象，包含flow和所有自定义参数的a、b配置
        const newData: any = {
          flow: flow || 0,
        }

        // 为每个自定义参数添加a和b配置
        customParameters.forEach((param) => {
          const config = edgeConfigs[param.name] || { a: 1, b: 0 }
          newData[`${param.name}_a`] = config.a
          newData[`${param.name}_b`] = config.b
        })

        return {
          ...edge,
          data: newData,
        }
      })

      const flowData = {
        nodes,
        edges: processedEdges,
        customParameters,
      }

      const createData: FlowChartCreate = {
        name,
        description: description || "",
        flow_data: flowData,
      }

      const response = await FlowchartsService.createFlowchart({
        requestBody: createData,
      })

      if (response) {
        set({
          currentFlowChartId: response.id,
          currentFlowChartName: response.name,
        })
        return { success: true, message: "流程图保存成功", data: response }
      }

      return { success: false, message: "保存失败：服务器未返回数据" }
    } catch (error) {
      console.error("保存流程图时出错:", error)
      return {
        success: false,
        message: `保存失败：${error instanceof Error ? error.message : "未知错误"}`,
      }
    }
  },

  // 从后端加载流程图
  loadFlowChart: async (id: string) => {
    try {
      const response = await FlowchartsService.readFlowchart({ id })

      if (response?.flow_data) {
        const {
          nodes,
          edges: loadedEdges,
          customParameters,
        } = response.flow_data

        // 处理加载的节点数据，确保自定义参数被正确保留
        const processedNodes: Node[] = Array.isArray(nodes)
          ? nodes.map((node: any) => {
              // 保留所有节点数据，包括自定义参数
              const nodeData = { ...node.data }

              // 为所有自定义参数添加默认值（如果不存在）
              if (Array.isArray(customParameters)) {
                customParameters.forEach((param) => {
                  if (!(param.name in nodeData)) {
                    nodeData[param.name] =
                      param.defaultValue !== undefined ? param.defaultValue : 0
                  }
                })
              }

              return {
                ...node,
                data: nodeData,
              } as Node
            })
          : []

        // 处理加载的边数据，从data中提取自定义参数的a和b配置
        const processedEdges: Edge[] = []
        const edgeParameterConfigs: Record<
          string,
          Record<string, EdgeParameterConfig>
        > = {}

        if (Array.isArray(loadedEdges)) {
          loadedEdges.forEach((edge: any) => {
            if (!edge.data) {
              processedEdges.push(edge as Edge)
              return
            }

            // 提取flow参数
            const { flow, ...otherData } = edge.data

            // 创建新的边数据对象，只包含flow
            const newEdgeData: any = { flow: flow || 0 }

            // 为每条边创建参数配置对象
            edgeParameterConfigs[edge.id] = {}

            // 处理自定义参数的a和b配置
            if (Array.isArray(customParameters)) {
              customParameters.forEach((param) => {
                const aKey = `${param.name}_a`
                const bKey = `${param.name}_b`

                if (aKey in otherData || bKey in otherData) {
                  edgeParameterConfigs[edge.id][param.name] = {
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
            } as Edge)
          })
        }

        set({
          nodes: processedNodes,
          edges: processedEdges,
          customParameters: Array.isArray(customParameters)
            ? customParameters
            : [],
          edgeParameterConfigs,
          selectedNode: null,
          selectedEdge: null,
          currentFlowChartId: id,
          currentFlowChartName: response.name, // 保存当前流程图名称
          importedFileName: response.name, // 保存加载的流程图名称
        })

        // 清理物料平衡计算结果
        useMaterialBalanceStore.getState().reset()

        return { success: true, message: "流程图加载成功" }
      }

      return { success: false, message: "加载失败：流程图数据为空" }
    } catch (error) {
      console.error("加载流程图时出错:", error)
      return {
        success: false,
        message: `加载失败：${error instanceof Error ? error.message : "未知错误"}`,
      }
    }
  },

  // 获取所有流程图列表
  getFlowCharts: async () => {
    try {
      const response = await FlowchartsService.readFlowcharts({})

      if (response?.data) {
        return {
          success: true,
          message: "获取流程图列表成功",
          data: response.data,
        }
      }

      return { success: false, message: "获取失败：服务器未返回数据" }
    } catch (error) {
      console.error("获取流程图列表时出错:", error)
      return {
        success: false,
        message: `获取失败：${error instanceof Error ? error.message : "未知错误"}`,
      }
    }
  },

  // 更新流程图
  updateFlowChart: async (id: string, name?: string, description?: string) => {
    try {
      const { nodes, edges, customParameters, edgeParameterConfigs } = get()

      // 处理边数据，将自定义参数的a和b配置移动到边的data中
      const processedEdges = edges.map((edge) => {
        const { flow } = edge.data || {}
        const edgeConfigs = edgeParameterConfigs[edge.id] || {}

        // 构建新的data对象，包含flow和所有自定义参数的a、b配置
        const newData: any = {
          flow: flow || 0,
        }

        // 为每个自定义参数添加a和b配置
        customParameters.forEach((param) => {
          const config = edgeConfigs[param.name] || { a: 1, b: 0 }
          newData[`${param.name}_a`] = config.a
          newData[`${param.name}_b`] = config.b
        })

        return {
          ...edge,
          data: newData,
        }
      })

      const flowData = {
        nodes,
        edges: processedEdges,
        customParameters,
      }

      const updateData: FlowChartUpdate = {}
      if (name !== undefined) updateData.name = name
      if (description !== undefined) updateData.description = description
      updateData.flow_data = flowData

      const response = await FlowchartsService.updateFlowchart({
        id,
        requestBody: updateData,
      })

      if (response) {
        return { success: true, message: "流程图更新成功", data: response }
      }

      return { success: false, message: "更新失败：服务器未返回数据" }
    } catch (error) {
      console.error("更新流程图时出错:", error)
      return {
        success: false,
        message: `更新失败：${error instanceof Error ? error.message : "未知错误"}`,
      }
    }
  },

  // 删除流程图
  deleteFlowChart: async (id: string) => {
    try {
      await FlowchartsService.deleteFlowchart({ id })

      // 如果删除的是当前流程图，清空当前ID
      const { currentFlowChartId } = get()
      if (currentFlowChartId === id) {
        set({ currentFlowChartId: null })
      }

      return { success: true, message: "流程图删除成功" }
    } catch (error) {
      console.error("删除流程图时出错:", error)
      return {
        success: false,
        message: `删除失败：${error instanceof Error ? error.message : "未知错误"}`,
      }
    }
  },

  // 设置当前计算任务ID
  setCurrentJobId: (jobId: string | null) => {
    set({ currentJobId: jobId })
  },

  // 新建流程图 - 清空画布和重置状态
  newFlowChart: () => {
    set({
      nodes: [],
      edges: [],
      selectedNode: null,
      selectedEdge: null,
      customParameters: [],
      edgeParameterConfigs: {},
      currentFlowChartId: null,
      currentFlowChartName: "未命名",
      importedFileName: null,
      showMiniMap: false,
      // 重置计算参数为默认值
      calculationParameters: getDefaultCalculationParams("materialBalance"),
    })

    // 清理物料平衡计算结果
    useMaterialBalanceStore.getState().reset()
  },
}))

export default useFlowStore
export type { RFState }
