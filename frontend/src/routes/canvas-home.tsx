import { Box } from "@chakra-ui/react"
import { createFileRoute } from "@tanstack/react-router"
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
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { CanvasHomeStepEdge } from "../components/CanvasHome/CanvasHomeStepEdge"
import { CaseGroupNode } from "../components/CanvasHome/CaseGroupNode"
import { GenericGroupNode } from "../components/CanvasHome/GenericGroupNode"
import {
  PlainContentNode,
  type PlainContentNodeData,
} from "../components/CanvasHome/PlainContentNode"
import { WidgetNode } from "../components/CanvasHome/WidgetNode"
import {
  Footer,
  FooterCTA,
  MiddayHead,
  MiddayStyleHero,
  SectionFive,
  SectionFour,
  SectionOne,
  SectionThree,
  SectionTwo,
  Stories,
} from "../components/Landing"
import ASM1Node from "../components/Flow/nodes/ASM1Node"
import ASMslimNode from "../components/Flow/nodes/ASMslimNode"
import DefaultNode from "../components/Flow/nodes/DefaultNode"
import InputNode from "../components/Flow/nodes/InputNode"
import OutputNode from "../components/Flow/nodes/OutputNode"
import AORCalculator from "../components/calculators/AORCalculator"
import { DWACalculator } from "../components/calculators/DWACalculator"
import { LSICalculator } from "../components/calculators/LSICalculator"
import StandardAO from "../components/calculators/StandardAO"
import {
  buildCanvasHomeCaseGraph,
  normalizeRawFlowchart,
  type RawFlowchart,
} from "../features/canvasHome/buildGraph"
import { CANVAS_HOME_CASES } from "../features/canvasHome/cases"
import { useI18n } from "../i18n"

export const Route = createFileRoute("/canvas-home")({
  component: CanvasHomePage,
})

type CalculatorKind = "dwa" | "aor" | "lsi" | "standardAO"
type CanvasHomeNode = Node<Record<string, unknown>, string | undefined>
type CanvasHomeEdge = Edge<Record<string, unknown>>

const LANDING_ARTBOARD_W = 1600

function CanvasHomePage() {
  const { t, language } = useI18n()
  const [caseData, setCaseData] = useState<Record<string, RawFlowchart>>({})
  const [isLoadingCases, setIsLoadingCases] = useState(true)
  const [caseLoadError, setCaseLoadError] = useState<string | null>(null)
  const [nodes, setNodes, onNodesChange] = useNodesState<CanvasHomeNode>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<CanvasHomeEdge>([])

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
    const controller = new AbortController()
    setIsLoadingCases(true)
    setCaseLoadError(null)

    const load = async () => {
      try {
        const results = await Promise.all(
          CANVAS_HOME_CASES.map(async (c) => {
            const res = await fetch(c.jsonUrl, { signal: controller.signal })
            if (!res.ok) {
              throw new Error(`${c.downloadFilename} 加载失败 (${res.status})`)
            }
            const raw = (await res.json()) as unknown
            const json = normalizeRawFlowchart(raw)
            return [c.id, json] as const
          }),
        )
        if (!controller.signal.aborted) {
          setCaseData(Object.fromEntries(results))
        }
      } catch (e: any) {
        if (controller.signal.aborted) return
        setCaseLoadError(e instanceof Error ? e.message : String(e))
        setCaseData({})
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingCases(false)
        }
      }
    }

    load()
    return () => controller.abort()
  }, [])

  const nodeTypes = useMemo(
    () => ({
      widget: WidgetNode,
      calculator: PlainContentNode,
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
    const ready = Object.keys(caseData).length >= CANVAS_HOME_CASES.length
    const { nodes: caseNodes, edges: caseEdges, layout } = ready
      ? buildCanvasHomeCaseGraph(caseData)
      : {
          nodes: [] as CanvasHomeNode[],
          edges: [] as CanvasHomeEdge[],
          layout: { leftX: 40, topY: 40, rightX: 1000 },
        }

    const outNodes: CanvasHomeNode[] = [...caseNodes]
    const outEdges: CanvasHomeEdge[] = [...caseEdges]

    const wrapLandingArtboard = (content: ReactNode) => (
      <Box
        w={`${LANDING_ARTBOARD_W}px`}
        overflowX="hidden"
        bg={{ base: "hsl(192,85%,99.5%)", _dark: "gray.900" }}
      >
        {content}
      </Box>
    )

    const landingX = layout.leftX - LANDING_ARTBOARD_W - 200
    const landingY0 = layout.topY
    const landingGapY = 600
    const landingSections: Array<{ id: string; node: ReactNode; heightMul?: number }> =
      [
        { id: "landing:hero", node: <MiddayStyleHero />, heightMul: 1.4 },
      { id: "landing:stories", node: <Stories /> },
      { id: "landing:section1", node: <SectionOne /> },
      { id: "landing:section2", node: <SectionTwo /> },
      { id: "landing:section3", node: <SectionThree /> },
      { id: "landing:section4", node: <SectionFour /> },
      { id: "landing:section5", node: <SectionFive /> },
      { id: "landing:footer-cta", node: <FooterCTA /> },
      { id: "landing:footer", node: <Footer /> },
      ]

    let landingY = landingY0
    landingSections.forEach((s) => {
      const mul = s.heightMul ?? 1
      const nodeHeight = s.heightMul ? Math.round(landingGapY * mul) : undefined
      outNodes.push({
        id: s.id,
        type: "calculator",
        position: { x: landingX, y: landingY },
        style: {
          width: LANDING_ARTBOARD_W,
          ...(nodeHeight ? { height: nodeHeight } : {}),
        },
        data: {
          width: LANDING_ARTBOARD_W,
          content: wrapLandingArtboard(s.node),
        } satisfies PlainContentNodeData,
      })
      landingY += landingGapY * mul
    })

    const calculatorsGroupId = "calculator:group"
    const calculators: Array<{ kind: CalculatorKind }> = [
      { kind: "dwa" },
      { kind: "standardAO" },
      { kind: "aor" },
      { kind: "lsi" },
    ]
    const calculatorNodeW = 1080
    const calculatorGapX = 40
    const calculatorGroupPaddingX = 30
    const calculatorGroupPaddingTop = 60
    const calculatorsGroupW =
      calculatorGroupPaddingX * 2 +
      calculators.length * calculatorNodeW +
      (calculators.length - 1) * calculatorGapX
    const calculatorsGroupH = 4800

    const renderCalculator = (kind: CalculatorKind) => {
      switch (kind) {
        case "lsi":
          return <LSICalculator />
        case "standardAO":
          return <StandardAO />
        case "aor":
          return <AORCalculator />
        case "dwa":
          return <DWACalculator />
      }
    }

    outNodes.push({
      id: calculatorsGroupId,
      type: "genericGroup",
      position: { x: layout.rightX, y: layout.topY + 760 },
      data: { title: t("landing.nav.calculators"), variant: "calculator" },
      style: { width: calculatorsGroupW, height: calculatorsGroupH },
    })

    calculators.forEach((spec, i) => {
      outNodes.push({
        id: `calculator:${spec.kind}`,
        type: "calculator",
        parentId: calculatorsGroupId,
        position: {
          x: calculatorGroupPaddingX + i * (calculatorNodeW + calculatorGapX),
          y: calculatorGroupPaddingTop,
        },
        style: { width: calculatorNodeW },
        data: {
          width: calculatorNodeW,
          content: renderCalculator(spec.kind),
        } satisfies PlainContentNodeData,
      })
    })

    setNodes((prev) => {
      const prevById = new Map(prev.map((n) => [n.id, n]))
      return outNodes.map((n) => {
        const old = prevById.get(n.id)
        if (!old) return n
        return { ...n, position: old.position }
      })
    })
    setEdges(outEdges)
  }, [caseData, isLoadingCases, caseLoadError, language, setEdges, setNodes, t])

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

  return (
    <Box
      minH="100vh"
      bg={{ base: "hsl(192,85%,99.5%)", _dark: "gray.900" }}
      css={{
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
          borderStyle: "none",
          borderColor: "transparent",
          outline: "none",
          outlineWidth: "0px",
          outlineOffset: "0px",
          outlineStyle: "none",
          boxShadow: "none",
        },
      }}
    >
      <MiddayHead />
      <Box h="100vh">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={{ zIndex: 0 }}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
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
  )
}
