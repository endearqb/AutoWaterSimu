import { Box, Button, HStack, Text, VStack } from "@chakra-ui/react"
import { createFileRoute, Link } from "@tanstack/react-router"
import {
  addEdge,
  type Connection,
  Controls,
  MiniMap,
  MarkerType,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
  type OnInit,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { useCallback, useEffect, useMemo, useState } from "react"
import { CanvasHomeStepEdge } from "../components/CanvasHome/CanvasHomeStepEdge"
import { CaseGroupNode } from "../components/CanvasHome/CaseGroupNode"
import { GenericGroupNode } from "../components/CanvasHome/GenericGroupNode"
import { WidgetNode, type WidgetNodeData } from "../components/CanvasHome/WidgetNode"
import { MiddayHead } from "../components/Landing"
import ASM1Node from "../components/Flow/nodes/ASM1Node"
import ASMslimNode from "../components/Flow/nodes/ASMslimNode"
import DefaultNode from "../components/Flow/nodes/DefaultNode"
import InputNode from "../components/Flow/nodes/InputNode"
import OutputNode from "../components/Flow/nodes/OutputNode"
import { getStories } from "../data/stories"
import { useI18n } from "../i18n"

export const Route = createFileRoute("/canvas-home")({
  component: CanvasHomePage,
})

type RawFlowNode = {
  id: string
  type?: string
  position: { x: number; y: number }
  data?: Record<string, unknown>
  measured?: { width?: number; height?: number }
}

type RawFlowEdge = {
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

type RawFlowchart = {
  nodes?: RawFlowNode[]
  edges?: RawFlowEdge[]
}

const FLOW_SCALE = 1.35

type CaseSpec = {
  id: string
  title: string
  subtitle: string
  jsonUrl: string
  downloadFilename: string
  openUrl: string
}

const CASES: CaseSpec[] = [
  {
    id: "asm1",
    title: "ASM1 模型案例",
    subtitle: "ASM1-SST.json",
    jsonUrl: "/assets/json/ASM1-SST.json",
    downloadFilename: "ASM1-SST.json",
    openUrl: "/asm1",
  },
  {
    id: "asm1slim",
    title: "ASM1Slim 模型案例",
    subtitle: "asm1slim.json",
    jsonUrl: "/assets/json/asm1slim.json",
    downloadFilename: "asm1slim.json",
    openUrl: "/asm1slim",
  },
  {
    id: "material-zld",
    title: "物料平衡案例",
    subtitle: "ZLD.json",
    jsonUrl: "/assets/json/ZLD.json",
    downloadFilename: "ZLD.json",
    openUrl: "/materialbalance",
  },
  {
    id: "material-multi",
    title: "物料平衡案例",
    subtitle: "multi-flow.json",
    jsonUrl: "/assets/json/multi-flow.json",
    downloadFilename: "multi-flow.json",
    openUrl: "/materialbalance",
  },
]

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

function CanvasHomePage() {
  const { language } = useI18n()
  const [caseData, setCaseData] = useState<Record<string, RawFlowchart>>({})
  const [initialized, setInitialized] = useState(false)
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  const updateNodeParameter = useCallback(
    (nodeId: string, paramName: string, value: any) => {
      setNodes((prev) =>
        prev.map((n) =>
          n.id === nodeId
            ? {
                ...n,
                data: {
                  ...(n.data as Record<string, unknown>),
                  [paramName]: value,
                },
              }
            : n,
        ),
      )
    },
    [setNodes],
  )

  const canvasStore = useMemo(
    () =>
      () => ({
        updateNodeParameter,
      }),
    [updateNodeParameter],
  )

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const results = await Promise.all(
          CASES.map(async (c) => {
            const res = await fetch(c.jsonUrl)
            const json = (await res.json()) as RawFlowchart
            return [c.id, json] as const
          }),
        )
        if (!cancelled) {
          setCaseData(Object.fromEntries(results))
        }
      } catch (e: any) {
        if (cancelled) {
          return
        }
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const nodeTypes = useMemo(
    () => ({
      widget: WidgetNode,
      group: CaseGroupNode,
      genericGroup: GenericGroupNode,
      input: (props: any) => <InputNode {...props} store={canvasStore} />,
      output: (props: any) => <OutputNode {...props} store={canvasStore} />,
      default: (props: any) => <DefaultNode {...props} store={canvasStore} />,
      asm1: (props: any) => <ASM1Node {...props} store={canvasStore as any} />,
      asmslim: (props: any) => <ASMslimNode {...props} store={canvasStore} />,
    }),
    [canvasStore],
  )

  const edgeTypes = useMemo(() => ({ step: CanvasHomeStepEdge }), [])

  useEffect(() => {
    if (initialized) {
      return
    }
    if (Object.keys(caseData).length < CASES.length) {
      return
    }

    const outNodes: Node[] = []
    const outEdges: Edge[] = []

    const leftX = 40
    const topY = 40

    const gapX = 120
    const gapY = 80
    const padding = 40 * FLOW_SCALE
    const headerOffset = 36 * FLOW_SCALE

    const centerX = leftX

    outNodes.push({
      id: "intro",
      type: "widget",
      position: { x: centerX, y: -280 },
      data: {
        title: "自由画布首页",
        subtitle: "案例流程图（节点可拖动/可连线）",
        minW: 560,
        content: (
          <VStack align="stretch" gap={3} className="nodrag">
            <Text fontSize="sm" color="gray.600" _dark={{ color: "gray.300" }}>
              模型节点复用现有外观，但不接入仿真。下载节点可直接获取原始 JSON。
            </Text>
            <HStack gap={2} flexWrap="wrap">
              <Button asChild size="sm">
                <Link to="/openflow" search={{}}>
                  打开自由画布（完整版）
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to="/calculators/" search={{}}>
                  打开计算器页面
                </Link>
              </Button>
            </HStack>
          </VStack>
        ),
      } satisfies WidgetNodeData,
    })

    const groups = CASES.map((spec) => {
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
    const row1Height = Math.max(
      ...groups.filter((_, i) => Math.floor(i / 2) === 1).map((g) => g.groupH),
    )
    const rowY = [topY, topY + row0Height + gapY]

    const rightX = colX[1] + col1Width + gapX + 120

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

    const stories = getStories(language)
    const storyGapY = 220
    const storiesGroupId = "story:group"
    const storiesGroupW = 720
    const storiesGroupH = Math.max(900, stories.length * storyGapY + 120)
    outNodes.push({
      id: storiesGroupId,
      type: "genericGroup",
      position: { x: rightX, y: topY },
      data: { title: "Stories" },
      style: { width: storiesGroupW, height: storiesGroupH },
    })

    stories.forEach((s, i) => {
      outNodes.push({
        id: `story-${s.id}`,
        type: "widget",
        parentId: storiesGroupId,
        extent: "parent",
        position: { x: 40, y: 60 + i * storyGapY },
        data: {
          title: s.title,
          subtitle: `${s.name} · ${s.company}`,
          minW: 520,
          maxW: 640,
          content: (
            <VStack align="stretch" gap={2} className="nodrag">
              {s.description ? (
                <Text
                  fontSize="sm"
                  color="gray.600"
                  _dark={{ color: "gray.300" }}
                >
                  {s.description}
                </Text>
              ) : null}
            </VStack>
          ),
        },
      })
    })

    setNodes(outNodes)
    setEdges(outEdges)
    setInitialized(true)
  }, [caseData, initialized, language, setEdges, setNodes])

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            type: "step",
            markerEnd: { type: MarkerType.ArrowClosed },
          },
          eds,
        ),
      )
    },
    [setEdges],
  )

  const onInit = useMemo<OnInit>(
    () => (instance) => {
      instance.fitView({ padding: 0.22, maxZoom: 0.65 })
    },
    [],
  )

  return (
    <Box
      minH="100vh"
      bg={{ base: "hsl(192,85%,99.5%)", _dark: "gray.900" }}
      sx={{
        "& .react-flow__node": {
          border: "none",
          outline: "none",
          boxShadow: "none",
          background: "transparent",
        },
        "& .react-flow__node.selected": {
          border: "none",
          outline: "none",
          boxShadow: "none",
        },
        "& .react-flow__node:focus": {
          border: "none",
          outline: "none",
          boxShadow: "none",
        },
        "& .react-flow__node:focus-visible": {
          border: "none",
          outline: "none",
          boxShadow: "none",
        },
        "& [data-glass-node]": {
          borderWidth: "0px",
          outlineWidth: "0px",
          outlineOffset: "0px",
          boxShadow: "none",
        },
      }}
    >
      <MiddayHead />
      <Box pt="82px" h="100vh">
        <Box h="calc(100vh - 82px)">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            defaultEdgeOptions={{ zIndex: 0 }}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={onInit}
            fitView
            fitViewOptions={{ padding: 0.22, maxZoom: 0.65 }}
            minZoom={0.1}
            maxZoom={1.2}
            defaultViewport={{ x: 0, y: 0, zoom: 0.3 }}
            proOptions={{ hideAttribution: true }}
          >
            <MiniMap pannable zoomable />
            <Controls />
          </ReactFlow>
        </Box>
      </Box>
    </Box>
  )
}
