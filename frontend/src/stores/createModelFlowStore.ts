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
import { t } from "../i18n"
import {
  normalizeTimeSegments,
  type TimeSegment,
} from "../utils/timeSegmentValidation"
// import type { BaseModelService } from '../services/baseModelService' // 鏆傛椂娉ㄩ噴鎺夋湭浣跨敤鐨勫锟?

/**
 * 閫氱敤娴佺▼鍥剧姸鎬佹帴锟?
 * 鍩轰簬RFState浣嗘敮鎸佹硾鍨嬮厤锟?
 */
export interface ModelFlowState<
  TFlowChart,
  _TFlowChartCreate,
  _TFlowChartUpdate,
> {
  // ========== 鍩虹鐘讹拷?==========
  nodes: Node[]
  edges: Edge[]
  selectedNode: Node | null
  selectedEdge: Edge | null
  customParameters: CustomParameter[]
  edgeParameterConfigs: Record<string, Record<string, EdgeParameterConfig>>
  importedFileName: string | null
  calculationParameters: CalculationParameters
  timeSegments: TimeSegment[]
  currentFlowChartId: string | null
  currentFlowChartName: string | null
  currentJobId: string | null
  showMiniMap: boolean

  // ========== 妯″瀷閰嶇疆 ==========
  modelConfig: ModelConfig

  // ========== 鍩虹鎿嶄綔 ==========
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

  // ========== 鍙傛暟绠＄悊 ==========
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
  setTimeSegments: (segments: TimeSegment[]) => void
  addTimeSegment: (segment?: Partial<TimeSegment>) => void
  updateTimeSegment: (segmentId: string, patch: Partial<TimeSegment>) => void
  removeTimeSegment: (segmentId: string) => void
  copyTimeSegment: (segmentId: string) => void
  reorderTimeSegments: (fromIndex: number, toIndex: number) => void

  // ========== 鏁版嵁瀵煎叆瀵煎嚭 ==========
  exportFlowData: () => any
  importFlowData: (data: any) => { success: boolean; message: string }
  setImportedFileName: (fileName: string | null) => void

  // ========== 娴佺▼鍥剧锟?==========
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

  // ========== 妯″瀷鐗瑰畾鏂规硶 ==========
  syncAllParametersToElements: () => void
  resetToModelDefaults: () => void
}

/**
 * 娴佺▼鍥炬湇鍔℃帴锟?
 * 鐢ㄤ簬鎶借薄涓嶅悓妯″瀷鐨勬祦绋嬪浘API璋冪敤
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

const getDefaultFlowchartName = () => t("flow.menu.untitledFlowchart")

/**
 * 鍒涘缓妯″瀷娴佺▼鍥維tore鐨勫伐鍘傚嚱锟?
 * @param config 妯″瀷閰嶇疆
 * @param flowChartService 娴佺▼鍥炬湇锟?
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
      // ========== 鍒濆鐘讹拷?==========
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
      currentFlowChartName: getDefaultFlowchartName(),
      currentJobId: null,
      importedFileName: null,
      calculationParameters: getDefaultCalculationParams(
        config.modelName as any,
      ),
      timeSegments: [],
      modelConfig: config,
      showMiniMap: false,

      // ========== 鍩虹鎿嶄綔 ==========
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

        // 涓烘柊杩炴帴绾挎坊鍔犲弬鏁伴厤锟?
        const newEdgeParameterConfigs = { ...state.edgeParameterConfigs }
        newEdgeParameterConfigs[newEdge.id] = {}

        // 涓烘瘡涓浐瀹氬弬鏁板垱寤洪粯璁ら厤锟?
        config.fixedParameters.forEach((param) => {
          newEdgeParameterConfigs[newEdge.id][param.name] = {
            a: 1, // 榛樿姣斾緥绯绘暟
            b: 0, // 榛樿甯告暟锟?
          }
        })

        // 涓烘瘡涓嚜瀹氫箟鍙傛暟鍒涘缓榛樿閰嶇疆
        state.customParameters.forEach((param) => {
          newEdgeParameterConfigs[newEdge.id][param.name] = {
            a: 1, // 榛樿姣斾緥绯绘暟
            b: 0, // 榛樿甯告暟锟?
          }
        })

        set({
          edges: [...state.edges, newEdge],
          edgeParameterConfigs: newEdgeParameterConfigs,
        })

        // 鍚屾鎵€鏈夊弬鏁板埌鐜版湁鍏冪礌锛堢‘淇濇柊杩炴帴绾垮寘鍚墍鏈夊弬鏁帮級
        get().syncAllParametersToElements()
      },

      addNode: (node: Node) => {
        set({ nodes: [...get().nodes, node] })
        // 鍚屾鎵€鏈夊弬鏁板埌鏂版坊鍔犵殑鑺傜偣锛堢‘淇濇柊鑺傜偣鍖呭惈鎵€鏈夊浐瀹氬弬鏁帮級
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

        // 濡傛灉鏇存柊鐨勮妭鐐规槸褰撳墠閫変腑鐨勮妭鐐癸紝涔熸洿鏂皊electedNode
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

      // ========== 鍙傛暟绠＄悊 ==========
      addCustomParameter: (paramName: string, description?: string) => {
        const { customParameters } = get()
        if (customParameters.find((p) => p.name === paramName)) {
          return // 鍙傛暟宸插瓨锟?
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

        // 鍚屾鍒版墍鏈夎妭锟?
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
                    a: 1, // 榛樿姣斾緥绯绘暟
                    b: 0, // 榛樿甯告暟锟?
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

        // 妫€鏌ユ槸鍚︿负鍥哄畾鍙傛暟鎴栬绠楀弬锟?
        const isFixedParam = config.fixedParameters.some(
          (p) => p.name === paramName,
        )
        const isCalcParam = config.calculationParameters.some(
          (p) => p.name === paramName,
        )

        if (isFixedParam || isCalcParam) {
          return // 涓嶈兘鍒犻櫎妯″瀷瀹氫箟鐨勫弬锟?
        }

        // 锟?edgeParameterConfigs 涓Щ闄ゅ搴旂殑閰嶇疆
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

      setTimeSegments: (segments: TimeSegment[]) => {
        set({
          timeSegments: [...segments].sort(
            (a, b) => a.startHour - b.startHour,
          ),
        })
      },

      addTimeSegment: (segment?: Partial<TimeSegment>) => {
        const state = get()
        const nextSegment: TimeSegment = {
          id: segment?.id || `seg_${Date.now()}`,
          startHour:
            typeof segment?.startHour === "number"
              ? segment.startHour
              : state.timeSegments.length > 0
                ? state.timeSegments[state.timeSegments.length - 1].endHour
                : 0,
          endHour:
            typeof segment?.endHour === "number"
              ? segment.endHour
              : state.calculationParameters.hours,
          edgeOverrides: segment?.edgeOverrides || {},
        }

        set({
          timeSegments: [...state.timeSegments, nextSegment].sort(
            (a, b) => a.startHour - b.startHour,
          ),
        })
      },

      updateTimeSegment: (
        segmentId: string,
        patch: Partial<TimeSegment>,
      ) => {
        set({
          timeSegments: get().timeSegments
            .map((segment) =>
              segment.id === segmentId ? { ...segment, ...patch } : segment,
            )
            .sort((a, b) => a.startHour - b.startHour),
        })
      },

      removeTimeSegment: (segmentId: string) => {
        set({
          timeSegments: get().timeSegments.filter(
            (segment) => segment.id !== segmentId,
          ),
        })
      },

      copyTimeSegment: (segmentId: string) => {
        const state = get()
        const sourceSegment = state.timeSegments.find(
          (segment) => segment.id === segmentId,
        )
        if (!sourceSegment) return

        const copiedSegment: TimeSegment = {
          ...sourceSegment,
          id: `${sourceSegment.id}_copy_${Date.now()}`,
          edgeOverrides: JSON.parse(JSON.stringify(sourceSegment.edgeOverrides)),
        }
        set({
          timeSegments: [...state.timeSegments, copiedSegment].sort(
            (a, b) => a.startHour - b.startHour,
          ),
        })
      },

      reorderTimeSegments: (fromIndex: number, toIndex: number) => {
        const segments = [...get().timeSegments]
        if (
          fromIndex < 0 ||
          toIndex < 0 ||
          fromIndex >= segments.length ||
          toIndex >= segments.length
        ) {
          return
        }
        const [moved] = segments.splice(fromIndex, 1)
        segments.splice(toIndex, 0, moved)
        set({ timeSegments: segments })
      },

      // ========== 鏁版嵁瀵煎叆瀵煎嚭 ==========
      exportFlowData: () => {
        const state = get()
        const isUDMModel = config.modelName === "udm"

        // 鑾峰彇璁＄畻鍙傛暟鐨勫悕绉板垪锟?- 浣跨敤enhancedCalculationParameters鏇夸唬绌虹殑calculationParameters
        const calculationParamNames =
          config.enhancedCalculationParameters?.map((param) => param.name) ||
          config.calculationParameters.map((param) => param.name)
        // 鑾峰彇鍥哄畾鍙傛暟鐨勫悕绉板垪锟?
        const fixedParamNames = config.fixedParameters.map(
          (param) => param.name,
        )

        // 澶勭悊鑺傜偣鏁版嵁
        const processedNodes = state.nodes.map((node) => {
          if (isUDMModel && node.type === "udm" && node.data) {
            const nodeAny = node as any
            const udmDataKeys = [
              "udmModel",
              "udmModelSnapshot",
              "udmComponents",
              "udmComponentNames",
              "udmProcesses",
              "udmParameters",
              "udmParameterValues",
              "udmModelId",
              "udmModelVersion",
              "udmModelHash",
            ] as const

            const exportedData: any = {
              volume: (node.data as any).volume ?? "1e-3",
              label: (node.data as any).label,
            }

            state.customParameters.forEach((param) => {
              const value = (node.data as any)[param.name]
              exportedData[param.name] =
                value !== undefined ? value : param.defaultValue
            })

            udmDataKeys.forEach((key) => {
              if ((node.data as any)[key] !== undefined) {
                exportedData[key] = (node.data as any)[key]
              }
            })

            const exportedNode: any = {
              ...node,
              data: exportedData,
            }

            udmDataKeys.forEach((key) => {
              if (nodeAny[key] !== undefined) {
                exportedNode[key] = nodeAny[key]
              }
            })

            if (
              !exportedNode.udmComponentNames &&
              Array.isArray(exportedData.udmComponents)
            ) {
              exportedNode.udmComponentNames = exportedData.udmComponents
                .map((item: any) =>
                  typeof item?.name === "string" ? item.name : undefined,
                )
                .filter((name: string | undefined): name is string => !!name)
            }
            if (
              !exportedData.udmComponentNames &&
              Array.isArray(exportedNode.udmComponentNames)
            ) {
              exportedData.udmComponentNames = exportedNode.udmComponentNames
            }

            return exportedNode
          }

          if (
            (node.type === "asmslim" || node.type === "asm1slim") &&
            node.data
          ) {
            // ASM1slim鑺傜偣锛氬垎绂诲浐瀹氬弬鏁板拰璁＄畻鍙傛暟
            const { volume, ...nodeData } = node.data
            const fixedParams: any = { volume: volume ?? "1e-3" }
            const modelParams: any = {}

            // 閬嶅巻鑺傜偣鏁版嵁锛屽垎绂诲浐瀹氬弬鏁板拰璁＄畻鍙傛暟
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
            // ASM1鑺傜偣锛氬垎绂诲浐瀹氬弬鏁板拰璁＄畻鍙傛暟
            const { volume, ...nodeData } = node.data
            const fixedParams: any = { volume: volume ?? "1e-3" }
            const modelParams: any = {}

            // 閬嶅巻鑺傜偣鏁版嵁锛屽垎绂诲浐瀹氬弬鏁板拰璁＄畻鍙傛暟
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
            // ASM3鑺傜偣锛氬垎绂诲浐瀹氬弬鏁板拰ASM3鐘舵€佸彉閲忓弬锟?
            const { volume, label, ...nodeData } = node.data
            const fixedParams: any = { volume: volume ?? "1e-3", label }
            const modelParams: any = {}

            // 閬嶅巻鑺傜偣鏁版嵁锛屽垎绂籄SM3鐘舵€佸彉閲忓弬锟?
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
            // 闈濧SM1slim鑺傜偣锛氬彧淇濈暀鍥哄畾鍙傛暟锛岀Щ闄よ绠楀弬锟?
            const { volume, ...nodeData } = node.data
            const filteredData: any = { volume: volume ?? "1e-3" }

            // 鍙繚鐣欏浐瀹氬弬鏁板拰label
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

          // 娌℃湁data鐨勮妭鐐逛繚鎸佸師锟?
          return node
        })

        // 澶勭悊杈规暟鎹紝鍙鍑哄浐瀹氬弬鏁扮殑a鍜宐閰嶇疆
        const processedEdges = state.edges.map((edge) => {
          const { flow } = edge.data || {}
          const edgeConfigs = state.edgeParameterConfigs[edge.id] || {}
          const edgeParameters = isUDMModel
            ? state.customParameters
            : config.fixedParameters

          // 鏋勫缓鏂扮殑data瀵硅薄锛屽寘鍚玣low鍜屽浐瀹氬弬鏁扮殑a銆乥閰嶇疆
          const newData: any = {
            flow: flow || 0,
          }

          // 鍙负鍥哄畾鍙傛暟娣诲姞a鍜宐閰嶇疆锛屼笉鍖呭惈璁＄畻鍙傛暟
          edgeParameters.forEach((param) => {
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
          customParameters: isUDMModel
            ? state.customParameters
            : config.fixedParameters, // export fixed parameters only (exclude calculation params)
          calculationParameters: state.calculationParameters,
          timeSegments: state.timeSegments,
          exportedAt: new Date().toISOString(),
          version: "1.0",
        }
      },

      importFlowData: (data: any) => {
        try {
          // 娓呯悊妯″瀷璁＄畻缁撴灉
          if (modelStore) {
            modelStore.getState().reset()
          }

          // 楠岃瘉鏁版嵁鏍煎紡
          if (!data || typeof data !== "object") {
            return {
              success: false,
              message: t("flow.store.flowchart.invalidFormat"),
            }
          }

          const {
            nodes,
            edges: importedEdges,
            customParameters,
            edgeParameterConfigs,
            timeSegments,
          } = data

          // 鍩烘湰楠岃瘉
          if (!Array.isArray(nodes) || !Array.isArray(importedEdges)) {
            return {
              success: false,
              message: t("flow.store.flowchart.invalidGraph"),
            }
          }

          // 澶勭悊瀵煎叆鐨勮妭鐐规暟鎹紝灏哸sm1slimParameters銆乵odelParameters鎴朼sm1Parameters鍚堝苟鍒癲ata锟?
          const processedNodes = nodes.map((node: any) => {
            if (
              (node.type === "asm1slim" || node.type === "asmslim") &&
              (node.asm1slimParameters || node.modelParameters)
            ) {
              // 灏哸sm1slimParameters鎴杕odelParameters鍚堝苟鍒癲ata涓紙鍏煎鏃ф牸寮忥級
              const parameters = node.asm1slimParameters || node.modelParameters
              return {
                ...node,
                type: "asmslim", // 鍐呴儴缁熶竴浣跨敤asmslim绫诲瀷
                data: {
                  ...node.data,
                  ...parameters,
                },
                // 绉婚櫎鍙傛暟瀛楁
                asm1slimParameters: undefined,
                modelParameters: undefined,
              }
            }
            if (node.type === "asm1" && node.asm1Parameters) {
              // 灏哸sm1Parameters鍚堝苟鍒癲ata锟?
              return {
                ...node,
                data: {
                  ...node.data,
                  ...node.asm1Parameters,
                },
                // 绉婚櫎鍙傛暟瀛楁
                asm1Parameters: undefined,
              }
            }
            return node
          })

          // 澶勭悊瀵煎叆鐨勮竟鏁版嵁锛屼粠data涓彁鍙栬嚜瀹氫箟鍙傛暟鐨刟鍜宐閰嶇疆
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

            // 鎻愬彇flow鍙傛暟
            const { flow, ...otherData } = edge.data

            // 鍒涘缓鏂扮殑杈规暟鎹璞★紝鍙寘鍚玣low
            const newEdgeData: any = { flow: flow || 0 }

            // 涓烘瘡鏉¤竟鍒涘缓鍙傛暟閰嶇疆瀵硅薄
            newEdgeParameterConfigs[edge.id] = {}

            // 澶勭悊鑷畾涔夊弬鏁扮殑a鍜宐閰嶇疆
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

            // 娣诲姞澶勭悊鍚庣殑锟?
            processedEdges.push({
              ...edge,
              data: newEdgeData,
            })
          })

          // 鍚堝苟鑷畾涔夊弬鏁帮紙淇濈暀妯″瀷瀹氫箟鐨勫弬鏁帮級
          const enhancedCalculationParams =
            config.enhancedCalculationParameters || config.calculationParameters
          const mergedCustomParameters =
            config.modelName === "udm"
              ? customParameters
                ? [...customParameters]
                : [...get().customParameters]
              : customParameters
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

          // 鍚堝苟杈瑰弬鏁伴厤缃細浼樺厛浣跨敤浠庤竟鏁版嵁涓彁鍙栫殑閰嶇疆锛岀劧鍚庝娇鐢ㄥ鍏ユ暟鎹腑鐨勯厤锟?
          const finalEdgeParameterConfigs = {
            ...edgeParameterConfigs,
            ...newEdgeParameterConfigs,
          }

          set({
            nodes: processedNodes || [],
            edges: processedEdges,
            customParameters: mergedCustomParameters,
            edgeParameterConfigs: finalEdgeParameterConfigs,
            timeSegments: normalizeTimeSegments(timeSegments),
            // 淇濇寔褰撳墠鐨勮绠楀弬鏁帮紝涓嶄娇鐢ㄥ鍏ユ暟鎹腑鐨勫弬锟?
            // calculationParameters: calculationParameters || getDefaultCalculationParams(config.modelName as any),
            selectedNode: null,
            selectedEdge: null,
          })

          return {
            success: true,
            message: t("flow.store.flowchart.importSuccess"),
          }
        } catch (error) {
          console.error("瀵煎叆娴佺▼鍥惧け锟?", error)
          const message =
            error instanceof Error
              ? error.message
              : t("flow.store.flowchart.importFailed")
          return { success: false, message }
        }
      },

      setImportedFileName: (fileName: string | null) => {
        set({ importedFileName: fileName })
      },

      // ========== 娴佺▼鍥剧锟?==========
      saveFlowChart: async (name: string, description?: string) => {
        try {
          const flowData = get().exportFlowData()
          const { currentFlowChartId } = get()

          if (currentFlowChartId) {
            // 鏇存柊鐜版湁娴佺▼锟?
            const result = await flowChartService.updateFlowchart({
              id: currentFlowChartId,
              requestBody: {
                name,
                description,
                flow_data: flowData,
              } as TFlowChartUpdate,
            })

            set({ currentFlowChartName: name })
            return {
              success: true,
              message: t("flow.store.flowchart.updateSuccess"),
              data: result,
            }
          }
          // 鍒涘缓鏂版祦绋嬪浘
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
          return {
            success: true,
            message: t("flow.store.flowchart.createSuccess"),
            data: result,
          }
        } catch (error: any) {
          console.error("淇濆瓨娴佺▼鍥惧け锟?", error)
          const reason =
            error?.body?.detail || error?.message || t("common.unknown")
          return {
            success: false,
            message: t("flow.store.flowchart.saveFailedWithReason", {
              reason,
            }),
          }
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
                currentFlowChartName:
                  (flowchart as any).name || getDefaultFlowchartName(),
                importedFileName: null,
              })
              return {
                success: true,
                message: t("flow.store.flowchart.loadSuccess"),
              }
            }
            return {
              success: false,
              message: t("flow.store.flowchart.loadFailedWithReason", {
                reason: importResult.message,
              }),
            }
          }
          return {
            success: false,
            message: t("flow.store.flowchart.loadFailedEmpty"),
          }
        } catch (error: any) {
          console.error("鍔犺浇娴佺▼鍥惧け锟?", error)
          const reason =
            error?.body?.detail || error?.message || t("common.unknown")
          return {
            success: false,
            message: t("flow.store.flowchart.loadFailedWithReason", { reason }),
          }
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
            message: t("flow.store.flowchart.listSuccess"),
            data: (response as any).data || [],
          }
        } catch (error: any) {
          console.error("鑾峰彇娴佺▼鍥惧垪琛ㄥけ锟?", error)
          const reason =
            error?.body?.detail || error?.message || t("common.unknown")
          return {
            success: false,
            message: t("flow.store.flowchart.listFailedWithReason", { reason }),
          }
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

          return {
            success: true,
            message: t("flow.store.flowchart.updateSuccess"),
            data: result,
          }
        } catch (error: any) {
          console.error("鏇存柊娴佺▼鍥惧け锟?", error)
          const reason =
            error?.body?.detail || error?.message || t("common.unknown")
          return {
            success: false,
            message: t("flow.store.flowchart.updateFailedWithReason", {
              reason,
            }),
          }
        }
      },

      deleteFlowChart: async (id: string) => {
        try {
          await flowChartService.deleteFlowchart({ id })

          if (id === get().currentFlowChartId) {
            get().newFlowChart()
          }

          return {
            success: true,
            message: t("flow.store.flowchart.deleteSuccess"),
          }
        } catch (error: any) {
          console.error("鍒犻櫎娴佺▼鍥惧け锟?", error)
          const reason =
            error?.body?.detail || error?.message || t("common.unknown")
          return {
            success: false,
            message: t("flow.store.flowchart.deleteFailedWithReason", {
              reason,
            }),
          }
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
        // 娓呯悊妯″瀷璁＄畻缁撴灉
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
          currentFlowChartName: getDefaultFlowchartName(),
          currentJobId: null,
          importedFileName: null,
          calculationParameters: getDefaultCalculationParams(
            config.modelName as any,
          ),
          timeSegments: [],
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

      // ========== 妯″瀷鐗瑰畾鏂规硶 ==========
      syncAllParametersToElements: () => {
        const state = get()
        // 浣跨敤enhancedCalculationParameters鏇夸唬绌虹殑calculationParameters
        const enhancedCalculationParams =
          config.enhancedCalculationParameters || config.calculationParameters
        const allParameters = [
          ...config.fixedParameters,
          ...enhancedCalculationParams,
          ...state.customParameters,
        ]

        // 涓烘墍鏈夌幇鏈夎妭鐐规坊鍔犵己澶辩殑鍙傛暟
        const updatedNodes = state.nodes.map((node) => {
          const updatedData = { ...node.data }

          // 妫€鏌ュ苟娣诲姞缂哄け鐨勫弬锟?
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

        // 涓烘墍鏈夌幇鏈夎繛鎺ョ嚎娣诲姞缂哄け鐨勫弬锟?
        const updatedEdges = state.edges.map((edge) => {
          const updatedData = { ...edge.data }

          // 妫€鏌ュ苟娣诲姞缂哄け鐨勫弬锟?
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

        // 涓烘墍鏈夌幇鏈夎繛鎺ョ嚎娣诲姞缂哄け鐨刟b閰嶇疆
        const updatedEdgeParameterConfigs = { ...state.edgeParameterConfigs }
        state.edges.forEach((edge) => {
          if (!updatedEdgeParameterConfigs[edge.id]) {
            updatedEdgeParameterConfigs[edge.id] = {}
          }

          // 涓烘墍鏈夊弬鏁版坊鍔燼b閰嶇疆
          allParameters.forEach((param) => {
            if (!updatedEdgeParameterConfigs[edge.id][param.name]) {
              updatedEdgeParameterConfigs[edge.id][param.name] = {
                a: 1, // 榛樿姣斾緥绯绘暟
                b: 0, // 榛樿甯告暟锟?
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
        // 浣跨敤enhancedCalculationParameters鏇夸唬绌虹殑calculationParameters
        const enhancedCalculationParams =
          config.enhancedCalculationParameters || config.calculationParameters

        // 閲嶇疆鎵€鏈夎妭鐐瑰弬鏁颁负榛樿锟?
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

        // 閲嶇疆鎵€鏈夎竟鍙傛暟涓洪粯璁わ拷?
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
          timeSegments: [],
        })
      },
    }),
  )
}

// 瀵煎嚭绫诲瀷
// 瀵煎嚭绫诲瀷锛堥伩鍏嶉噸澶嶅鍑猴級
// export type { ModelFlowState, FlowChartService }
