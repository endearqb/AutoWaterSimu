// asm3-analysis.ts
// ASM3 结果分析工具函数和类型定义
// 基于 asm1-analysis.ts 适配 ASM3 模型

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

// ASM3 节点数据类型定义
export type ASM3NodeSeries = {
  label: string
  // ASM3 特有的参数
  S_S?: number[] // 可溶性易降解有机物 (mg COD/L)
  S_NH?: number[] // 氨氮 (mg N/L)
  S_NO?: number[] // 硝态氮 (mg N/L)
  S_O?: number[] // 溶解氧 (mg O2/L)
  S_ND?: number[] // 可溶性有机氮 (mg N/L)
  S_ALK?: number[] // 碱度 (mol HCO3-/L)
  S_I?: number[] // 可溶惰性物质 (mg COD/L)
  X_H?: number[] // 异养菌生物量 (mg COD/L)
  X_A?: number[] // 自养菌生物量 (mg COD/L)
  X_S?: number[] // 缓慢降解有机物 (mg COD/L)
  X_I?: number[] // 惰性颗粒有机物 (mg COD/L)
  X_STO?: number[] // 储存产物 (mg COD/L)
  X_ND?: number[] // 颗粒有机氮 (mg N/L)
  volume?: number[] // 体积 (m³)
  // 允许保留其他附加字段
  [k: string]: any
}

// ASM3 连接线数据类型定义
export type ASM3EdgeSeries = {
  source: string
  target: string
  flow_rate?: number[]
  [k: string]: any
}

// ASM3 结果数据类型定义
export type ASM3ResultData = {
  timestamps: number[]
  node_data: Record<string, ASM3NodeSeries>
  edge_data?: Record<string, ASM3EdgeSeries>
  summary?: {
    total_steps?: number
    convergence_status?: string
    final_total_volume?: number
    final_mass_balance_error?: number
    [k: string]: any
  }
  [k: string]: any
}

export type ASM3Job = {
  job_info?: any
  result_data: ASM3ResultData
}

// ASM3 特有的分析函数

/**
 * 计算ASM3模型的储存产物利用率
 * @param nodeData ASM3节点数据
 * @returns 储存产物利用率统计
 */
export function calculateStorageUtilization(nodeData: ASM3NodeSeries) {
  if (!nodeData.X_STO || !nodeData.X_H) {
    return null
  }

  const storageFraction = nodeData.X_STO.map((sto, i) => {
    const bh = nodeData.X_H?.[i] || 0
    return bh > 0 ? sto / bh : 0
  })

  return {
    mean: seriesStats(storageFraction).mean,
    max: Math.max(...storageFraction),
    min: Math.min(...storageFraction),
    final: lastOf(storageFraction),
  }
}

/**
 * 计算ASM3模型的碳氮比
 * @param nodeData ASM3节点数据
 * @returns 碳氮比统计
 */
export function calculateCNRatio(nodeData: ASM3NodeSeries) {
  if (!nodeData.S_S || !nodeData.S_NH) {
    return null
  }

  const cnRatio = nodeData.S_S.map((ss, i) => {
    const snh = nodeData.S_NH?.[i] || 0
    return snh > 0 ? ss / snh : 0
  })

  return {
    mean: seriesStats(cnRatio).mean,
    max: Math.max(...cnRatio),
    min: Math.min(...cnRatio),
    final: lastOf(cnRatio),
  }
}

/**
 * 数组质量检查函数
 * @param arr 数值数组
 * @returns 质量检查结果
 */
function arrayQualityCheck(arr: number[]) {
  let hasNaN = false
  let hasInf = false
  let negativeCount = 0

  for (const value of arr) {
    if (Number.isNaN(value)) {
      hasNaN = true
    }
    if (!Number.isFinite(value)) {
      hasInf = true
    }
    if (Number.isFinite(value) && value < -1e-9) {
      negativeCount++
    }
  }

  return {
    hasNaN,
    hasInf,
    negativeCount,
    length: arr.length,
  }
}

/**
 * ASM3 数据质量检查
 * @param resultData ASM3结果数据
 * @returns 数据质量报告
 */
export function asm3DataQualityCheck(resultData: ASM3ResultData) {
  const report: any = {
    timestamp: Date.now(),
    model: "ASM3",
    nodes: {},
    summary: {
      totalNodes: Object.keys(resultData.node_data).length,
      timePoints: resultData.timestamps.length,
      issues: [],
    },
  }

  // 检查每个节点的数据质量
  for (const [nodeId, nodeData] of Object.entries(resultData.node_data)) {
    const nodeReport: any = {
      label: nodeData.label,
      variables: {},
      issues: [],
    }

    // 检查主要变量
    const mainVars = ["S_S", "S_NH", "S_NO", "S_O", "X_H", "X_A", "X_STO"]
    for (const varName of mainVars) {
      if (nodeData[varName]) {
        const qa = arrayQualityCheck(nodeData[varName])
        nodeReport.variables[varName] = qa

        if (qa.hasNaN) {
          nodeReport.issues.push(`${varName} 包含 NaN 值`)
        }
        if (qa.hasInf) {
          nodeReport.issues.push(`${varName} 包含无穷值`)
        }
        if (
          qa.negativeCount > 0 &&
          ["S_S", "S_NH", "S_NO", "S_O", "X_H", "X_A", "X_STO"].includes(
            varName,
          )
        ) {
          nodeReport.issues.push(`${varName} 包含负值 (${qa.negativeCount} 个)`)
        }
      }
    }

    // ASM3特有检查：储存产物合理性
    if (nodeData.X_STO && nodeData.X_H) {
      const storageUtil = calculateStorageUtilization(nodeData)
      if (storageUtil && storageUtil.max > 2.0) {
        nodeReport.issues.push("储存产物/异养菌比值过高，可能存在异常")
      }
    }

    report.nodes[nodeId] = nodeReport
    report.summary.issues.push(...nodeReport.issues)
  }

  return report
}

/**
 * ASM3 稳态检查
 * @param resultData ASM3结果数据
 * @param fraction 用于稳态检查的末段比例 (默认0.2)
 * @returns 稳态检查结果
 */
export function asm3SteadyStateCheck(
  resultData: ASM3ResultData,
  fraction = 0.2,
) {
  const results: Record<string, Record<string, SteadyCheck>> = {}

  for (const [nodeId, nodeData] of Object.entries(resultData.node_data)) {
    results[nodeId] = {}

    const mainVars = ["S_S", "S_NH", "S_NO", "S_O", "X_H", "X_A", "X_STO"]
    for (const varName of mainVars) {
      if (nodeData[varName]) {
        results[nodeId][varName] = steadyCheck(
          resultData.timestamps,
          nodeData[varName],
          fraction,
        )
      }
    }
  }

  return results
}

/**
 * 获取ASM3模型的可用变量列表
 * @returns 变量列表，包含变量名和显示标签
 */
export function getASM3Variables() {
  return [
    { value: "S_S", label: "可溶性易降解有机物 (S_S)" },
    { value: "S_NH", label: "氨氮 (S_NH)" },
    { value: "S_NO", label: "硝态氮 (S_NO)" },
    { value: "S_O", label: "溶解氧 (S_O)" },
    { value: "S_ND", label: "可溶性有机氮 (S_ND)" },
    { value: "S_ALK", label: "碱度 (S_ALK)" },
    { value: "S_I", label: "可溶惰性物质 (S_I)" },
    { value: "X_H", label: "异养菌生物量 (X_H)" },
    { value: "X_A", label: "自养菌生物量 (X_A)" },
    { value: "X_S", label: "缓慢降解有机物 (X_S)" },
    { value: "X_I", label: "惰性颗粒有机物 (X_I)" },
    { value: "X_STO", label: "储存产物 (X_STO)" },
    { value: "X_ND", label: "颗粒有机氮 (X_ND)" },
    { value: "volume", label: "体积 (volume)" },
  ]
}

// 重新导出通用分析函数
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
