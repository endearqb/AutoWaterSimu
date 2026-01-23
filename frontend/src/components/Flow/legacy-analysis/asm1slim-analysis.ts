// asm1slim-analysis.ts
// ASM1Slim 结果分析工具函数和类型定义
// 基于 asm1-analysis.ts 适配 ASM1Slim 简化模型

import {
  type EdgeParameterConfig,
  type SteadyCheck,
  assertArray,
  basicQA,
  lastOf,
  median,
  percentRemoval,
  seriesStats,
  steadyCheck,
  t95Index,
} from "./asm1-analysis"

// ASM1Slim 节点数据类型定义
export type ASM1SlimNodeSeries = {
  label: string
  // ASM1Slim 特有的简化参数
  dissolvedOxygen?: number[] // 溶解氧 (mg/L)
  cod?: number[] // COD (mg/L)
  nitrate?: number[] // 硝态氮 (mg/L)
  ammonia?: number[] // 氨氮 (mg/L)
  totalAlkalinity?: number[] // 总碱度 (mg/L)
  volume?: number[] // 体积 (m³)
  // 允许保留其他附加字段
  [k: string]: any
}

// ASM1Slim 连接线数据类型定义
export type ASM1SlimEdgeSeries = {
  source: string
  target: string
  flow_rate?: number[]
  [k: string]: any
}

// ASM1Slim 结果数据类型定义
export type ASM1SlimResultData = {
  timestamps: number[]
  node_data: Record<string, ASM1SlimNodeSeries>
  edge_data?: Record<string, ASM1SlimEdgeSeries>
  summary?: {
    total_steps?: number
    convergence_status?: string
    final_total_volume?: number
    final_mass_balance_error?: number
    [k: string]: any
  }
  [k: string]: any
}

// ASM1Slim 作业类型定义
export type ASM1SlimJob = {
  job_info?: any
  result_data: ASM1SlimResultData
}

// ASM1Slim 参数映射配置 - 与 modelConfigs.ts 中的固定参数定义保持一致
export const ASM1_SLIM_PARAMETERS = {
  dissolvedOxygen: { label: "溶解氧", unit: "mg/L" },
  cod: { label: "COD", unit: "mg/L" },
  nitrate: { label: "硝态氮", unit: "mg/L" },
  ammonia: { label: "氨氮", unit: "mg/L" },
  totalAlkalinity: { label: "总碱度", unit: "mg/L" },
  volume: { label: "体积", unit: "m³" },
}

// 数据转换适配器类
export class ASM1SlimDataAdapter {
  /**
   * 将 ASM1Slim 数据转换为通用分析格式
   * @param slimData ASM1Slim 结果数据
   * @returns 转换后的 ASM1 格式数据
   */
  static toAnalysisFormat(slimData: ASM1SlimResultData): any {
    // 直接返回 slimData，因为数据结构基本兼容
    // 如果需要特殊转换，可以在这里实现
    return {
      ...slimData,
      // 确保数据格式兼容
      node_data: Object.fromEntries(
        Object.entries(slimData.node_data || {}).map(([key, node]) => [
          key,
          {
            ...node,
            // 确保所有必要字段存在
            label: node.label || key,
          },
        ]),
      ),
    }
  }

  /**
   * 验证 ASM1Slim 数据格式
   * @param data ASM1Slim 结果数据
   * @returns 是否有效
   */
  static validateData(data: ASM1SlimResultData): boolean {
    if (!data || typeof data !== "object") return false
    if (!Array.isArray(data.timestamps)) return false
    if (!data.node_data || typeof data.node_data !== "object") return false

    // 检查节点数据格式
    for (const [_nodeId, nodeData] of Object.entries(data.node_data)) {
      if (!nodeData || typeof nodeData !== "object") return false
      const typedNodeData = nodeData as Record<string, any>
      if (!typedNodeData.label || typeof typedNodeData.label !== "string")
        return false
    }

    return true
  }
}

/**
 * 数据转换函数：将 ASM1Slim 结果转换为分析组件可用的格式
 * @param slimData ASM1Slim 结果数据
 * @returns 转换后的数据
 */
export function convertASM1SlimToAnalysisData(
  slimData: ASM1SlimResultData,
): any {
  return ASM1SlimDataAdapter.toAnalysisFormat(slimData)
}

// 复用现有的分析工具函数，适配 ASM1Slim

/**
 * 根据标签查找 ASM1Slim 节点
 */
export function pickSlimNodeByLabel(
  rd: ASM1SlimResultData,
  labelLike: string,
): ASM1SlimNodeSeries | null {
  const nodes = Object.values(rd.node_data || {})
  const exact = nodes.find((n) => (n.label || "").trim() === labelLike.trim())
  if (exact) return exact
  const fuzzy = nodes.find((n) => (n.label || "").includes(labelLike))
  return fuzzy || null
}

/**
 * ASM1Slim 数据质量检查
 */
export function basicSlimQA(rd: ASM1SlimResultData) {
  const issues: string[] = []
  const t = rd.timestamps || []

  // 时间轴单调性检查
  for (let i = 1; i < t.length; i++) {
    if (!(t[i] > t[i - 1])) {
      issues.push(`时间轴在索引 ${i} 非严格递增`)
      break
    }
  }

  // ASM1Slim 特有参数的负值检测
  const NEG_COLS = [
    "dissolvedOxygen",
    "cod",
    "nitrate",
    "ammonia",
    "totalAlkalinity",
  ]
  for (const node of Object.values(rd.node_data || {})) {
    for (const c of NEG_COLS) {
      const arr = node[c]
      if (!arr) continue
      if (arr.some((v: any) => Number.isFinite(v) && v < -1e-9)) {
        issues.push(`节点 ${node.label} 列 ${c} 存在负值`)
      }
    }
  }

  // 体积守恒检查
  if (rd.summary && typeof rd.summary.final_total_volume === "number") {
    if (rd.summary.final_total_volume <= 0) {
      issues.push("final_total_volume 非法")
    }
  }

  return issues
}

/**
 * 获取 ASM1Slim 出水节点
 */
export function slimEffluentNode(
  rd: ASM1SlimResultData,
): ASM1SlimNodeSeries | null {
  // 优先"沉淀池"；其次最后一个有时序的单元
  const clar =
    pickSlimNodeByLabel(rd, "沉淀池") || pickSlimNodeByLabel(rd, "Clarifier")
  if (clar) return clar
  const nodes = Object.values(rd.node_data || {})
  if (!nodes.length) return null
  // 简单按 label/工艺顺序猜最后一个
  const candidate = ["出水端", "Effluent", "Outfall", "O3", "O2", "O1"]
  for (const name of candidate) {
    const n = pickSlimNodeByLabel(rd, name)
    if (n) return n
  }
  return nodes[nodes.length - 1]
}

/**
 * 构建 ASM1Slim 出水时间序列数据
 */
export function buildSlimEffluentTimes(rd: ASM1SlimResultData, vars: string[]) {
  const node = slimEffluentNode(rd)
  const t = rd.timestamps || []
  if (!node) return { time: t, series: {} as Record<string, number[]> }

  const series: Record<string, number[]> = {}
  for (const v of vars) {
    series[v] = node[v] || new Array(t.length).fill(Number.NaN)
  }
  return { time: t, series }
}

/**
 * ASM1Slim 任意时间点的空间剖面计算
 */
export function slimProfileAtTime(
  rd: ASM1SlimResultData,
  nodesOrder: string[],
  vars: string[],
  timeIndex: number,
) {
  const rows = []
  for (const name of nodesOrder) {
    const node = pickSlimNodeByLabel(rd, name)
    if (!node) continue
    const row: any = { node: name }
    for (const v of vars) {
      const series = node[v]
      row[v] = series && series[timeIndex] !== undefined ? series[timeIndex] : 0
    }
    rows.push(row)
  }
  return rows
}

/**
 * ASM1Slim 末端空间剖面计算
 */
export function slimProfileAtEnd(
  rd: ASM1SlimResultData,
  nodesOrder: string[],
  vars: string[],
) {
  const rows = []
  for (const name of nodesOrder) {
    const node = pickSlimNodeByLabel(rd, name)
    if (!node) continue
    const row: any = { node: name }
    for (const v of vars) row[v] = lastOf(node[v])
    rows.push(row)
  }
  return rows
}

/**
 * ASM1Slim 连接线浓度计算
 */
export function calculateSlimEdgeConcentrations(
  rd: ASM1SlimResultData,
  edgeConfigs: Record<string, Record<string, EdgeParameterConfig>>,
  vars: string[],
  timeIndex: number,
  edges?: any[],
  selectedEdges?: string[],
): any[] {
  const edgeConcentrations: any[] = []

  // 优先使用传入的edges数组
  if (edges && edges.length > 0) {
    for (const edge of edges) {
      // 如果指定了selectedEdges，则只处理选中的连接线
      if (
        selectedEdges &&
        selectedEdges.length > 0 &&
        !selectedEdges.includes(edge.id)
      ) {
        continue
      }

      const sourceNodeId = edge.source
      const targetNodeId = edge.target
      const sourceNode = rd.node_data[sourceNodeId]
      const targetNode = rd.node_data[targetNodeId]

      if (!sourceNode) continue

      const edgeConfig = edgeConfigs[edge.id] || {}
      const row: any = {
        edge: `${sourceNode.label || sourceNodeId} → ${targetNode?.label || targetNodeId}`,
        edgeId: edge.id,
      }

      for (const variable of vars) {
        const sourceConcentration = sourceNode[variable]?.[timeIndex] || 0
        const config = edgeConfig[variable] || { a: 1, b: 0 }
        row[variable] = sourceConcentration * config.a + config.b
      }

      edgeConcentrations.push(row)
    }
  } else if (rd.edge_data) {
    // 回退到使用result_data中的edge_data
    for (const [edgeId, edgeData] of Object.entries(rd.edge_data)) {
      if (
        selectedEdges &&
        selectedEdges.length > 0 &&
        !selectedEdges.includes(edgeId)
      ) {
        continue
      }

      const sourceNodeId = edgeData.source
      const targetNodeId = edgeData.target
      const sourceNode = rd.node_data[sourceNodeId]
      const targetNode = rd.node_data[targetNodeId]

      if (!sourceNode) continue

      const edgeConfig = edgeConfigs[edgeId] || {}
      const row: any = {
        edge: `${sourceNode.label || sourceNodeId} → ${targetNode?.label || targetNodeId}`,
        edgeId,
      }

      for (const variable of vars) {
        const sourceConcentration = sourceNode[variable]?.[timeIndex] || 0
        const config = edgeConfig[variable] || { a: 1, b: 0 }
        row[variable] = sourceConcentration * config.a + config.b
      }

      edgeConcentrations.push(row)
    }
  }

  return edgeConcentrations
}

/**
 * 获取 ASM1Slim 可用的变量列表
 */
export function getSlimAvailableVariables(
  rd: ASM1SlimResultData,
): Array<{ name: string; label: string }> {
  const variableMap: Record<string, string> = {
    dissolvedOxygen: "flow.modelParams.asm1slim.dissolvedOxygen.label",
    cod: "flow.modelParams.asm1slim.cod.label",
    nitrate: "flow.modelParams.asm1slim.nitrate.label",
    ammonia: "flow.modelParams.asm1slim.ammonia.label",
    totalAlkalinity: "flow.modelParams.asm1slim.totalAlkalinity.label",
    volume: "flow.modelParams.asm1slim.volume.label",
  }

  const availableVars = new Set<string>()

  // 从节点数据中提取实际存在的变量
  for (const node of Object.values(rd.node_data || {})) {
    for (const key of Object.keys(node)) {
      if (key !== "label" && Array.isArray(node[key]) && variableMap[key]) {
        availableVars.add(key)
      }
    }
  }

  return Array.from(availableVars).map((name) => ({
    name,
    label: variableMap[name] || name,
  }))
}

/**
 * 获取 ASM1Slim 可用的节点列表
 */
export function getSlimAvailableNodes(rd: ASM1SlimResultData): string[] {
  return Object.values(rd.node_data || {})
    .map((node) => node.label)
    .filter((label) => label && typeof label === "string")
}

// 导出复用的工具函数
export {
  assertArray,
  lastOf,
  seriesStats,
  t95Index,
  steadyCheck,
  median,
  percentRemoval,
  basicQA,
  type SteadyCheck,
  type EdgeParameterConfig,
}
