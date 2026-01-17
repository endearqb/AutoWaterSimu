// asm1-analysis.ts
// 纯前端 ASM1 结果分析工具函数（无副作用，易于单测）

export type ASM1NodeSeries = {
  label: string
  // --- 溶解相 & 颗粒相（常见 ASM1 列）---
  S_S?: number[]
  S_NH?: number[]
  S_NO?: number[]
  S_O?: number[]
  S_ND?: number[]
  S_ALK?: number[]
  X_BH?: number[]
  X_BA?: number[]
  X_S?: number[]
  X_i?: number[]
  X_ND?: number[]
  volume?: number[]
  // 允许保留其他附加字段
  [k: string]: any
}

export type ASM1EdgeSeries = {
  source: string
  target: string
  flow_rate?: number[]
  [k: string]: any
}

export type ASM1ResultData = {
  timestamps: number[]
  node_data: Record<string, ASM1NodeSeries> // key 可为 id；每个节点有 label
  edge_data?: Record<string, ASM1EdgeSeries>
  summary?: {
    total_steps?: number
    convergence_status?: string
    final_total_volume?: number
    final_mass_balance_error?: number
    [k: string]: any
  }
  [k: string]: any
}

export type ASM1Job = {
  job_info?: any
  result_data: ASM1ResultData
}

export interface EdgeParameterConfig {
  a: number // 比例系数
  b: number // 常数项
}

export type SteadyCheck = {
  slope: number // 末段线性拟合斜率（单位/时间）
  relSlope: number // 相对斜率 = slope / median(|y|)
  startIndex: number // 末段起点索引
  n: number // 参与点数
}

export function assertArray(x: any, name: string): number[] {
  if (!Array.isArray(x)) throw new Error(`${name} should be an array`)
  return x as number[]
}

export function pickNodeByLabel(
  rd: ASM1ResultData,
  labelLike: string,
): ASM1NodeSeries | null {
  // 先精确匹配 label，再做包含匹配
  const nodes = Object.values(rd.node_data || {})
  const exact = nodes.find((n) => (n.label || "").trim() === labelLike.trim())
  if (exact) return exact
  const fuzzy = nodes.find((n) => (n.label || "").includes(labelLike))
  return fuzzy || null
}

export function lastOf(arr?: number[]): number | undefined {
  if (!arr || arr.length === 0) return undefined
  return arr[arr.length - 1]
}

export function seriesStats(arr: number[]) {
  const v = arr.filter(Number.isFinite) as number[]
  const n = v.length
  if (!n) return { min: Number.NaN, max: Number.NaN, mean: Number.NaN }
  const min = Math.min(...v)
  const max = Math.max(...v)
  const mean = v.reduce((a, b) => a + b, 0) / n
  return { min, max, mean }
}

export function t95Index(y: number[]): number {
  // 通用 t95：找最早使 |y - y_final| 降至初始差值的 5% 以内的索引
  if (!y || y.length < 2) return -1
  const y0 = y[0]
  const yf = y[y.length - 1]
  const total = Math.abs(yf - y0)
  if (total === 0) return 0
  for (let i = 0; i < y.length; i++) {
    if (Math.abs(y[i] - yf) <= 0.05 * total) return i
  }
  return -1
}

export function steadyCheck(
  time: number[],
  y: number[],
  tailRatio = 0.2,
): SteadyCheck {
  if (time.length !== y.length) throw new Error("time/y length mismatch")
  const n = time.length
  const start = Math.max(0, Math.floor((1 - tailRatio) * n))
  const t = time.slice(start)
  const v = y.slice(start)
  if (t.length < 2)
    return {
      slope: Number.NaN,
      relSlope: Number.NaN,
      startIndex: start,
      n: t.length,
    }
  // 线性回归（最小二乘）
  const t0 = t[0]
  const X = t.map((tt) => tt - t0)
  const meanX = X.reduce((a, b) => a + b, 0) / X.length
  const meanY = v.reduce((a, b) => a + b, 0) / v.length
  let num = 0
  let den = 0
  for (let i = 0; i < X.length; i++) {
    num += (X[i] - meanX) * (v[i] - meanY)
    den += (X[i] - meanX) * (X[i] - meanX)
  }
  const slope = den === 0 ? 0 : num / den
  const med = median(v.map((x) => Math.abs(x)))
  const relSlope = med === 0 ? 0 : slope / med
  return { slope, relSlope, startIndex: start, n: t.length }
}

export function median(a: number[]): number {
  const b = [...a].sort((x, y) => x - y)
  const n = b.length
  if (!n) return Number.NaN
  const m = Math.floor(n / 2)
  return n % 2 === 0 ? (b[m - 1] + b[m]) / 2 : b[m]
}

export function profileAtEnd(
  rd: ASM1ResultData,
  nodesOrder: string[],
  vars: string[],
) {
  // 返回 [{node, var1, var2, ...}]
  const rows = []
  for (const name of nodesOrder) {
    const node = pickNodeByLabel(rd, name)
    if (!node) continue
    const row: any = { node: name }
    for (const v of vars) row[v] = lastOf(node[v])
    rows.push(row)
  }
  return rows
}

export function percentRemoval(
  inlet: number | undefined,
  eff: number | undefined,
): number | undefined {
  if (inlet == null || eff == null) return undefined
  if (inlet === 0) return eff === 0 ? 100 : 0
  return (1 - eff / inlet) * 100
}

export function basicQA(rd: ASM1ResultData) {
  const issues: string[] = []
  const t = rd.timestamps || []
  // 时间轴单调性
  for (let i = 1; i < t.length; i++) {
    if (!(t[i] > t[i - 1])) {
      issues.push(`时间轴在索引 ${i} 非严格递增`)
      break
    }
  }
  // 负值检测（常见列）
  const NEG_COLS = [
    "S_S",
    "S_NH",
    "S_NO",
    "S_O",
    "X_BH",
    "X_BA",
    "X_S",
    "X_i",
    "X_ND",
    "S_ND",
    "S_ALK",
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
  // 体积守恒（粗略）
  if (rd.summary && typeof rd.summary.final_total_volume === "number") {
    if (rd.summary.final_total_volume <= 0)
      issues.push("final_total_volume 非法")
  }
  return issues
}

export function effluentNode(rd: ASM1ResultData): ASM1NodeSeries | null {
  // 优先"沉淀池"；其次最后一个有时序的单元
  const clar = pickNodeByLabel(rd, "沉淀池") || pickNodeByLabel(rd, "Clarifier")
  if (clar) return clar
  const nodes = Object.values(rd.node_data || {})
  if (!nodes.length) return null
  // 简单按 label/工艺顺序猜最后一个
  const candidate = ["出水端", "Effluent", "Outfall", "O3", "O2", "O1"]
  for (const name of candidate) {
    const n = pickNodeByLabel(rd, name)
    if (n) return n
  }
  return nodes[nodes.length - 1]
}

export function buildEffluentTimes(rd: ASM1ResultData, vars: string[]) {
  const node = effluentNode(rd)
  const t = rd.timestamps || []
  if (!node) return { time: t, series: {} as Record<string, number[]> }
  const series: Record<string, number[]> = {}
  for (const v of vars)
    series[v] = node[v] || new Array(t.length).fill(Number.NaN)
  return { time: t, series }
}

// 新增：支持任意时间点的空间剖面计算
export function profileAtTime(
  rd: ASM1ResultData,
  nodesOrder: string[],
  vars: string[],
  timeIndex: number,
) {
  const rows = []
  for (const name of nodesOrder) {
    const node = pickNodeByLabel(rd, name)
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

// 新增：计算连接线浓度
export function calculateEdgeConcentrations(
  rd: ASM1ResultData,
  edgeConfigs: Record<string, Record<string, EdgeParameterConfig>>,
  vars: string[],
  timeIndex: number,
  edges?: any[],
  selectedEdges?: string[],
): any[] {
  const edgeConcentrations: any[] = []

  // DEBUG: 打印输入参数
  console.log("🔍 [DEBUG] calculateEdgeConcentrations 输入参数:")
  console.log("  - edgeConfigs:", edgeConfigs)
  console.log("  - vars:", vars)
  console.log("  - timeIndex:", timeIndex)
  console.log("  - edges count:", edges?.length || 0)
  console.log("  - selectedEdges:", selectedEdges)

  // 优先使用传入的edges数组，如果没有则使用result_data中的edge_data
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

      // DEBUG: 打印每条边的配置信息
      console.log(`🔍 [DEBUG] 处理边 ${edge.id}:`)
      console.log(`  - source: ${sourceNodeId} → target: ${targetNodeId}`)
      console.log(`  - edgeConfig for ${edge.id}:`, edgeConfig)

      const row: any = {
        edge: `${sourceNode.label || sourceNodeId} → ${targetNode?.label || targetNodeId}`,
        edgeId: edge.id,
      }

      for (const variable of vars) {
        if (variable === "flow_rate") {
          // 流量变量直接从edge_data中获取，如果没有则从edgeConfig获取
          const edgeData = rd.edge_data?.[edge.id]
          const flowValue =
            edgeData?.flow_rate?.[timeIndex] || edgeData?.flow_rate?.[0] || 0

          // DEBUG: 打印流量获取信息
          console.log(`  - 流量变量 ${variable}:`)
          console.log("    - edgeData:", edgeData)
          console.log("    - flow_rate array:", edgeData?.flow_rate)
          console.log("    - 最终值:", flowValue)

          row[variable] = flowValue
        } else {
          // 其他变量使用起点节点浓度 * a + b的公式
          const sourceConcentration = sourceNode[variable]?.[timeIndex] || 0
          const config = edgeConfig[variable] || { a: 1, b: 0 }
          const calculatedValue = sourceConcentration * config.a + config.b

          // DEBUG: 打印浓度计算详细信息
          console.log(`  - 浓度变量 ${variable}:`)
          console.log("    - sourceConcentration:", sourceConcentration)
          console.log(`    - config for ${variable}:`, config)
          console.log("    - config.a:", config.a)
          console.log("    - config.b:", config.b)
          console.log(
            `    - 计算公式: ${sourceConcentration} * ${config.a} + ${config.b} = ${calculatedValue}`,
          )

          row[variable] = calculatedValue
        }
      }

      console.log("  - 最终行数据:", row)
      edgeConcentrations.push(row)
    }
  } else if (rd.edge_data) {
    // 回退到使用result_data中的edge_data
    console.log("🔍 [DEBUG] 使用 rd.edge_data 分支")
    console.log("  - rd.edge_data keys:", Object.keys(rd.edge_data))

    for (const [edgeId, edgeData] of Object.entries(rd.edge_data)) {
      // 如果指定了selectedEdges，则只处理选中的连接线
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

      // DEBUG: 打印每条边的配置信息
      console.log(`🔍 [DEBUG] 处理边 ${edgeId} (edge_data分支):`)
      console.log(`  - source: ${sourceNodeId} → target: ${targetNodeId}`)
      console.log(`  - edgeConfig for ${edgeId}:`, edgeConfig)
      console.log("  - edgeData:", edgeData)

      const row: any = {
        edge: `${sourceNode.label || sourceNodeId} → ${targetNode?.label || targetNodeId}`,
        edgeId,
      }

      for (const variable of vars) {
        if (variable === "flow_rate") {
          // 流量变量直接从edge_data中获取
          const flowValue =
            edgeData.flow_rate?.[timeIndex] || edgeData.flow_rate?.[0] || 0

          // DEBUG: 打印流量获取信息
          console.log(`  - 流量变量 ${variable}:`)
          console.log("    - flow_rate array:", edgeData.flow_rate)
          console.log("    - 最终值:", flowValue)

          row[variable] = flowValue
        } else {
          // 其他变量使用起点节点浓度 * a + b的公式
          const sourceConcentration = sourceNode[variable]?.[timeIndex] || 0
          const config = edgeConfig[variable] || { a: 1, b: 0 }
          const calculatedValue = sourceConcentration * config.a + config.b

          // DEBUG: 打印浓度计算详细信息
          console.log(`  - 浓度变量 ${variable}:`)
          console.log("    - sourceConcentration:", sourceConcentration)
          console.log(`    - config for ${variable}:`, config)
          console.log("    - config.a:", config.a)
          console.log("    - config.b:", config.b)
          console.log(
            `    - 计算公式: ${sourceConcentration} * ${config.a} + ${config.b} = ${calculatedValue}`,
          )

          row[variable] = calculatedValue
        }
      }

      console.log("  - 最终行数据:", row)
      edgeConcentrations.push(row)
    }
  }

  // DEBUG: 打印最终结果
  console.log("🔍 [DEBUG] calculateEdgeConcentrations 最终结果:")
  console.log("  - 处理的边数量:", edgeConcentrations.length)
  console.log("  - 最终数据:", edgeConcentrations)

  return edgeConcentrations
}

// 新增：获取可用的变量列表
export function getAvailableVariables(
  rd: ASM1ResultData,
): Array<{ name: string; label: string }> {
  const variableMap: Record<string, string> = {
    S_S: "易降解基质",
    S_NH: "氨氮",
    S_NO: "硝态氮",
    S_O: "溶解氧",
    S_ND: "溶解有机氮",
    S_ALK: "碱度",
    X_BH: "异养菌生物量",
    X_BA: "自养菌生物量",
    X_S: "缓慢降解基质",
    X_i: "惰性颗粒物",
    X_ND: "颗粒有机氮",
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

// 新增：获取可用的节点列表
export function getAvailableNodes(rd: ASM1ResultData): string[] {
  return Object.values(rd.node_data || {})
    .map((node) => node.label)
    .filter((label) => label && typeof label === "string")
}
