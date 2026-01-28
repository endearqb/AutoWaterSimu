import { MarkerType, type Edge, type Node } from "@xyflow/react"
import { CANVAS_HOME_CASES } from "./cases"

export type RawFlowNode = {
  id: string
  type?: string
  position: { x: number; y: number }
  data?: Record<string, unknown>
  measured?: { width?: number; height?: number }
}

export type RawFlowEdge = {
  id: string
  type?: string
  source: string
  sourceHandle?: string
  target: string
  targetHandle?: string
  style?: Record<string, unknown>
  markerEnd?: Record<string, unknown>
  data?: Record<string, unknown>
}

export type RawFlowchart = {
  nodes?: RawFlowNode[]
  edges?: RawFlowEdge[]
}

export const FLOW_SCALE = 1.35

const MAX_RAW_NODES = 600
const MAX_RAW_EDGES = 900

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value)

export function normalizeRawFlowchart(raw: unknown): RawFlowchart {
  if (!isRecord(raw)) {
    return { nodes: [], edges: [] }
  }

  const rawNodes = Array.isArray(raw.nodes) ? raw.nodes : []
  const nodes: RawFlowNode[] = []
  for (const n of rawNodes.slice(0, MAX_RAW_NODES)) {
    if (!isRecord(n)) continue
    if (typeof n.id !== "string") continue
    if (!isRecord(n.position)) continue
    const x = n.position.x
    const y = n.position.y
    if (typeof x !== "number" || typeof y !== "number") continue
    const measured = isRecord(n.measured)
      ? {
          width: typeof n.measured.width === "number" ? n.measured.width : undefined,
          height:
            typeof n.measured.height === "number" ? n.measured.height : undefined,
        }
      : undefined
    nodes.push({
      id: n.id,
      type: typeof n.type === "string" ? n.type : undefined,
      position: { x, y },
      data: isRecord(n.data) ? n.data : undefined,
      measured,
    })
  }

  const rawEdges = Array.isArray(raw.edges) ? raw.edges : []
  const edges: RawFlowEdge[] = []
  for (const e of rawEdges.slice(0, MAX_RAW_EDGES)) {
    if (!isRecord(e)) continue
    if (typeof e.id !== "string") continue
    if (typeof e.source !== "string" || typeof e.target !== "string") continue
    edges.push({
      id: e.id,
      type: typeof e.type === "string" ? e.type : undefined,
      source: e.source,
      target: e.target,
      sourceHandle: typeof e.sourceHandle === "string" ? e.sourceHandle : undefined,
      targetHandle: typeof e.targetHandle === "string" ? e.targetHandle : undefined,
      data: isRecord(e.data) ? e.data : undefined,
    })
  }

  return { nodes, edges }
}

function calcBounds(nodes: RawFlowNode[]) {
  const fallbackW = 180
  const fallbackH = 90
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (const n of nodes) {
    const w = Math.max(n.measured?.width ?? 0, fallbackW)
    const h = Math.max(n.measured?.height ?? 0, fallbackH)
    minX = Math.min(minX, n.position.x)
    minY = Math.min(minY, n.position.y)
    maxX = Math.max(maxX, n.position.x + w)
    maxY = Math.max(maxY, n.position.y + h)
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
    return { minX: 0, minY: 0, width: 0, height: 0 }
  }
  return { minX, minY, width: maxX - minX, height: maxY - minY }
}

export type CanvasHomeCaseGraphLayout = {
  leftX: number
  topY: number
  rightX: number
}

export function buildCanvasHomeCaseGraph(caseData: Record<string, RawFlowchart>) {
  const outNodes: Node[] = []
  const outEdges: Edge[] = []

  const leftX = 40
  const topY = 40

  const gapX = 120
  const gapY = 80
  const padding = 40 * FLOW_SCALE
  const headerOffset = 36 * FLOW_SCALE

  const centerX = leftX

  const groups = CANVAS_HOME_CASES.map((spec) => {
    const raw = caseData[spec.id]
    const rawNodes = raw?.nodes ?? []
    const rawEdges = raw?.edges ?? []

    const bounds = calcBounds(rawNodes)
    const groupW = Math.max(560, bounds.width * FLOW_SCALE + padding * 2 + 60)
    const groupH = Math.max(
      420,
      bounds.height * FLOW_SCALE + padding * 2 + headerOffset + 60,
    )

    return {
      spec,
      rawNodes,
      rawEdges,
      bounds,
      groupW,
      groupH,
    }
  })

  const col0Width = Math.max(
    ...groups.filter((_, i) => i % 2 === 0).map((g) => g.groupW),
  )
  const col1Width = Math.max(
    ...groups.filter((_, i) => i % 2 === 1).map((g) => g.groupW),
  )
  const colX = [centerX, centerX + col0Width + gapX]

  const row0Height = Math.max(
    ...groups.filter((_, i) => Math.floor(i / 2) === 0).map((g) => g.groupH),
  )
  const rowY = [topY, topY + row0Height + gapY]

  groups.forEach(({ spec, rawNodes, rawEdges, bounds, groupW, groupH }, idx) => {
    const row = Math.floor(idx / 2)
    const col = idx % 2
    const groupX = colX[col]
    const groupY = rowY[row]

    const groupId = `case:${spec.id}:group`
    outNodes.push({
      id: groupId,
      type: "group",
      position: { x: groupX, y: groupY },
      data: {
        title: spec.title,
        subtitle: spec.subtitle,
        jsonUrl: spec.jsonUrl,
        downloadFilename: spec.downloadFilename,
        openUrl: spec.openUrl,
      },
      style: { width: groupW, height: groupH },
    })

    for (const n of rawNodes) {
      const normalizedType =
        n.type === "asm1slim" || n.type === "asmslim" ? "asmslim" : n.type
      outNodes.push({
        id: `case:${spec.id}:node:${n.id}`,
        type: normalizedType || "default",
        parentId: groupId,
        extent: "parent",
        position: {
          x: (n.position.x - bounds.minX) * FLOW_SCALE + padding,
          y: (n.position.y - bounds.minY) * FLOW_SCALE + padding + headerOffset,
        },
        data: {
          ...(n.data || {}),
        },
      })
    }

    for (const e of rawEdges) {
      outEdges.push({
        id: `case:${spec.id}:edge:${e.id}`,
        type: "step",
        source: `case:${spec.id}:node:${e.source}`,
        target: `case:${spec.id}:node:${e.target}`,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { stroke: "rgba(100, 116, 139, 0.8)" },
        data: { flow: (e.data as any)?.flow },
      })
    }
  })

  const rightX = colX[1] + col1Width + gapX + 120

  return {
    nodes: outNodes,
    edges: outEdges,
    layout: { leftX, topY, rightX } satisfies CanvasHomeCaseGraphLayout,
  }
}
