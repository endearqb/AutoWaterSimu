import type { Edge, Node } from "@xyflow/react"

import type { NetworkV2EdgeData } from "../edges/edgeModel"

export type RealtimeFlowBalance = {
  status:
    | "empty"
    | "balanced"
    | "pending"
    | "underdetermined"
    | "inconsistent"
    | "invalid"
  flows: Record<string, number>
  rank: number
  equations: number
  maxResidual: number
  diagnostics: string[]
}

type Equation = { row: number[]; rhs: number }

export function solveRealtimeFlowBalance(
  nodes: Node[],
  edges: Edge<NetworkV2EdgeData>[],
  externalValues: Record<string, number> = {},
): RealtimeFlowBalance {
  const flowEdges = edges.filter(
    (edge) =>
      edge.data?.edge_kind === "hydraulic" || edge.data?.edge_kind === "pump",
  )
  if (!flowEdges.length) return result("empty", {}, 0, 0, 0)

  const index = new Map(flowEdges.map((edge, i) => [edge.id, i]))
  const equations: Equation[] = []
  const pending: string[] = []
  const fixed = new Set<string>()

  for (const node of nodes) {
    const incoming = flowEdges.filter((edge) => edge.target === node.id)
    const outgoing = flowEdges.filter((edge) => edge.source === node.id)
    if (!incoming.length || !outgoing.length) continue
    const row = Array(flowEdges.length).fill(0)
    for (const edge of incoming) row[index.get(edge.id)!] += 1
    for (const edge of outgoing) row[index.get(edge.id)!] -= 1
    equations.push({ row, rhs: 0 })
  }

  for (const edge of flowEdges) {
    const spec = edge.data?.flow_spec
    let value: number | undefined
    if (spec?.mode === "fixed") value = spec.value
    if (spec?.mode === "controlled")
      value = externalValues[spec.control_signal ?? ""]
    if (spec?.mode === "timeseries")
      value = externalValues[spec.timeseries_ref ?? ""]
    if (
      (spec?.mode === "controlled" || spec?.mode === "timeseries") &&
      !Number.isFinite(value)
    ) {
      pending.push(`${edge.id}: waiting for external flow value`)
      continue
    }
    if (Number.isFinite(value)) {
      const row = Array(flowEdges.length).fill(0)
      row[index.get(edge.id)!] = 1
      equations.push({ row, rhs: value! })
      fixed.add(edge.id)
    }
    if (
      spec?.mode === "ratio_to_edge" &&
      spec.reference_edge_id &&
      Number.isFinite(spec.ratio)
    ) {
      const reference = index.get(spec.reference_edge_id)
      if (reference === undefined)
        return result(
          "invalid",
          {},
          0,
          equations.length,
          Number.POSITIVE_INFINITY,
          [`${edge.id}: missing ratio reference`],
        )
      const row = Array(flowEdges.length).fill(0)
      row[index.get(edge.id)!] = 1
      row[reference] = -spec.ratio!
      equations.push({ row, rhs: 0 })
    }
  }

  const solved = rref(equations, flowEdges.length)
  if (solved.inconsistent)
    return result(
      "inconsistent",
      {},
      solved.rank,
      equations.length,
      Number.POSITIVE_INFINITY,
      ["Flow equations are inconsistent"],
    )
  if (solved.rank < flowEdges.length)
    return result(
      pending.length ? "pending" : "underdetermined",
      {},
      solved.rank,
      equations.length,
      Number.POSITIVE_INFINITY,
      pending,
    )

  const flows = Object.fromEntries(
    flowEdges.map((edge, i) => [edge.id, clean(solved.values[i])]),
  )
  const residuals = equations.map(({ row, rhs }) =>
    Math.abs(
      row.reduce((sum, value, i) => sum + value * solved.values[i], -rhs),
    ),
  )
  const maxResidual = Math.max(0, ...residuals)
  const diagnostics = [...pending]
  for (const edge of flowEdges) {
    const value = flows[edge.id]
    const spec = edge.data?.flow_spec
    const min = spec?.min ?? edge.data?.pump?.min_flow
    const max = spec?.max ?? edge.data?.pump?.max_flow
    if (value < -1e-8) diagnostics.push(`${edge.id}: negative flow ${value}`)
    if (min !== undefined && value < min - 1e-8)
      diagnostics.push(`${edge.id}: below pump minimum`)
    if (max !== undefined && value > max + 1e-8)
      diagnostics.push(`${edge.id}: above pump maximum`)
  }
  return result(
    diagnostics.length ? "invalid" : "balanced",
    flows,
    solved.rank,
    equations.length,
    maxResidual,
    diagnostics,
  )
}

function rref(equations: Equation[], width: number) {
  const matrix = equations.map(({ row, rhs }) => [...row, rhs])
  let pivotRow = 0
  const pivots: number[] = []
  for (
    let column = 0;
    column < width && pivotRow < matrix.length;
    column += 1
  ) {
    let best = pivotRow
    for (let row = pivotRow + 1; row < matrix.length; row += 1)
      if (Math.abs(matrix[row][column]) > Math.abs(matrix[best][column]))
        best = row
    if (Math.abs(matrix[best][column]) < 1e-10) continue
    ;[matrix[pivotRow], matrix[best]] = [matrix[best], matrix[pivotRow]]
    const divisor = matrix[pivotRow][column]
    for (let i = column; i <= width; i += 1) matrix[pivotRow][i] /= divisor
    for (let row = 0; row < matrix.length; row += 1) {
      if (row === pivotRow) continue
      const factor = matrix[row][column]
      for (let i = column; i <= width; i += 1)
        matrix[row][i] -= factor * matrix[pivotRow][i]
    }
    pivots.push(column)
    pivotRow += 1
  }
  const inconsistent = matrix.some(
    (row) =>
      row.slice(0, width).every((value) => Math.abs(value) < 1e-10) &&
      Math.abs(row[width]) >= 1e-10,
  )
  const values = Array(width).fill(0)
  for (const [row, column] of pivots.entries())
    values[column] = matrix[row][width]
  return { values, rank: pivots.length, inconsistent }
}

const clean = (value: number) =>
  Math.abs(value) < 1e-8 ? 0 : Number(value.toFixed(8))
const result = (
  status: RealtimeFlowBalance["status"],
  flows: Record<string, number>,
  rank: number,
  equations: number,
  maxResidual: number,
  diagnostics: string[] = [],
): RealtimeFlowBalance => ({
  status,
  flows,
  rank,
  equations,
  maxResidual,
  diagnostics,
})
