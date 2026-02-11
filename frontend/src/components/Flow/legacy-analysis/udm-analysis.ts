export type UDMNodeSeries = {
  label: string
  volume?: number[]
  [k: string]: any
}

export type UDMEdgeSeries = {
  source: string
  target: string
  flow_rate?: number[]
  [k: string]: any
}

export type UDMResultData = {
  timestamps: number[]
  node_data: Record<string, UDMNodeSeries>
  edge_data?: Record<string, UDMEdgeSeries>
  summary?: {
    total_steps?: number
    convergence_status?: string
    final_total_volume?: number
    final_mass_balance_error?: number
    [k: string]: any
  }
  [k: string]: any
}

export interface UDMEdgeRef {
  id: string
  source: string
  target: string
}

export interface UDMEdgeParameterConfig {
  a: number
  b: number
}

interface UDMVariableOptions {
  exclude?: string[]
}

export function getUDMAvailableVariables(
  rd: UDMResultData,
  options: UDMVariableOptions = {},
): Array<{ name: string; label: string }> {
  const excluded = new Set(options.exclude || [])
  const variables = new Set<string>()

  Object.values(rd.node_data || {}).forEach((node) => {
    Object.keys(node).forEach((key) => {
      if (key === "label" || excluded.has(key)) return
      if (Array.isArray(node[key])) {
        variables.add(key)
      }
    })
  })

  return Array.from(variables).map((name) => ({
    name,
    label: name,
  }))
}

export function calculateUDMEdgeConcentrations(
  rd: UDMResultData,
  edgeParameterConfigs: Record<string, Record<string, UDMEdgeParameterConfig>>,
  variables: string[],
  timeIndex: number,
  edges: UDMEdgeRef[] = [],
  selectedEdges: string[] = [],
): Array<Record<string, any>> {
  const rows: Array<Record<string, any>> = []
  const edgeList: UDMEdgeRef[] =
    edges.length > 0
      ? edges
      : Object.entries(rd.edge_data || {}).map(([edgeId, edgeData]) => ({
          id: edgeId,
          source: edgeData.source,
          target: edgeData.target,
        }))

  edgeList.forEach((edge) => {
    if (selectedEdges.length > 0 && !selectedEdges.includes(edge.id)) {
      return
    }

    const sourceNode = rd.node_data[edge.source]
    const targetNode = rd.node_data[edge.target]
    if (!sourceNode) return

    const row: Record<string, any> = {
      edgeId: edge.id,
      edge: `${sourceNode.label || edge.source} -> ${targetNode?.label || edge.target}`,
    }

    variables.forEach((variable) => {
      if (variable === "flow_rate") {
        const flowSeries = rd.edge_data?.[edge.id]?.flow_rate || []
        row[variable] = flowSeries[timeIndex] ?? flowSeries[0] ?? 0
        return
      }

      const sourceSeries = sourceNode[variable]
      const sourceValue =
        Array.isArray(sourceSeries) && sourceSeries[timeIndex] !== undefined
          ? Number(sourceSeries[timeIndex])
          : 0

      const config = edgeParameterConfigs?.[edge.id]?.[variable] || {
        a: 1,
        b: 0,
      }

      row[variable] = sourceValue * config.a + config.b
    })

    rows.push(row)
  })

  return rows
}
