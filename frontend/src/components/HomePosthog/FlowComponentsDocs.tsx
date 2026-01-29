import { Box, Button, Flex, Heading, HStack, Portal, Text, VStack } from "@chakra-ui/react"
import { ReactFlowProvider } from "@xyflow/react"
import { useEffect, useMemo, useRef, useState } from "react"

import Canvas from "@/components/Flow/Canvas"
import InspectorContainer from "@/components/Flow/inspectorbar/InspectorContainer"
import SimulationPanel from "@/components/Flow/inspectorbar/SimulationPanel"
import ResultsPanel from "@/components/Flow/toolbar/ResultsPanel"
import NodePalette from "@/components/Flow/toolbar/NodePalette"
import { useI18n } from "@/i18n"
import useFlowStore from "@/stores/flowStore"

type FlowDocsPanelId = "nodeToolbar" | "inspector" | "simulation" | "analysis"

const SAMPLE_JSON_URL = "/assets/json/ZLD.json"
const SAMPLE_NAME = "ZLD"
const SAMPLE_MODEL_TYPE: "materialBalance" = "materialBalance"

type FlowStoreSnapshot = {
  nodes: unknown
  edges: unknown
  selectedNode: unknown
  selectedEdge: unknown
  customParameters: unknown
  edgeParameterConfigs: unknown
  importedFileName: unknown
  calculationParameters: unknown
  currentFlowChartId: unknown
  currentFlowChartName: unknown
  currentJobId: unknown
  showMiniMap: boolean
  showBubbleMenu: boolean
}

const toNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) return undefined
    const parsed = Number(trimmed)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

const buildSampleFinalValues = (raw: unknown) => {
  const obj = raw && typeof raw === "object" ? (raw as any) : null
  const nodes = Array.isArray(obj?.nodes) ? obj.nodes : []

  const nodeData: Record<string, Record<string, number>> = {}
  for (const node of nodes) {
    const id = typeof node?.id === "string" ? node.id : ""
    const data = node?.data && typeof node.data === "object" ? node.data : null
    if (!id || !data) continue

    const params: Record<string, number> = {}
    for (const [key, val] of Object.entries(data)) {
      if (key === "label") continue
      const num = toNumber(val)
      if (num === undefined) continue
      params[key] = num
    }
    nodeData[id] = params
  }

  return { node_data: nodeData }
}

export function FlowComponentsDocs() {
  const { t } = useI18n()
  const [active, setActive] = useState<FlowDocsPanelId>("nodeToolbar")
  const [sampleFinalValues, setSampleFinalValues] = useState<any>(null)
  const [bubble, setBubble] = useState<
    | {
        x: number
        y: number
        title: string
        body: string
      }
    | null
  >(null)
  const snapshotRef = useRef<FlowStoreSnapshot | null>(null)
  const canvasRef = useRef<HTMLDivElement | null>(null)

  const importFlowData = useFlowStore((s) => s.importFlowData)
  const newFlowChart = useFlowStore((s) => s.newFlowChart)
  const setImportedFileName = useFlowStore((s) => s.setImportedFileName)
  const setCurrentFlowChartName = useFlowStore((s) => s.setCurrentFlowChartName)
  const setSelectedNode = useFlowStore((s) => s.setSelectedNode)
  const setSelectedEdge = useFlowStore((s) => s.setSelectedEdge)
  const setShowMiniMap = useFlowStore((s) => s.setShowMiniMap)
  const setShowBubbleMenu = useFlowStore((s) => s.setShowBubbleMenu)

  useEffect(() => {
    const prev = useFlowStore.getState()
    snapshotRef.current = {
      nodes: prev.nodes,
      edges: prev.edges,
      selectedNode: prev.selectedNode,
      selectedEdge: prev.selectedEdge,
      customParameters: prev.customParameters,
      edgeParameterConfigs: prev.edgeParameterConfigs,
      importedFileName: prev.importedFileName,
      calculationParameters: prev.calculationParameters,
      currentFlowChartId: prev.currentFlowChartId,
      currentFlowChartName: prev.currentFlowChartName,
      currentJobId: prev.currentJobId,
      showMiniMap: prev.showMiniMap,
      showBubbleMenu: prev.showBubbleMenu,
    }

    setSelectedNode(null)
    setSelectedEdge(null)
    setShowMiniMap(false)
    setShowBubbleMenu(false)

    const controller = new AbortController()
    const load = async () => {
      try {
        const res = await fetch(SAMPLE_JSON_URL, { signal: controller.signal })
        if (!res.ok) return
        const data = (await res.json()) as unknown
        if (controller.signal.aborted) return

        newFlowChart()
        const result = importFlowData(data)
        if (!result.success) return

        setImportedFileName(SAMPLE_NAME)
        setCurrentFlowChartName(SAMPLE_NAME)
        setSampleFinalValues(buildSampleFinalValues(data))
      } catch {
        // ignore
      }
    }

    load()

    return () => {
      controller.abort()
      const snapshot = snapshotRef.current
      if (!snapshot) return
      useFlowStore.setState({
        nodes: snapshot.nodes as any,
        edges: snapshot.edges as any,
        selectedNode: snapshot.selectedNode as any,
        selectedEdge: snapshot.selectedEdge as any,
        customParameters: snapshot.customParameters as any,
        edgeParameterConfigs: snapshot.edgeParameterConfigs as any,
        importedFileName: snapshot.importedFileName as any,
        calculationParameters: snapshot.calculationParameters as any,
        currentFlowChartId: snapshot.currentFlowChartId as any,
        currentFlowChartName: snapshot.currentFlowChartName as any,
        currentJobId: snapshot.currentJobId as any,
        showMiniMap: snapshot.showMiniMap,
        showBubbleMenu: snapshot.showBubbleMenu,
      })
    }
  }, [
    importFlowData,
    newFlowChart,
    setCurrentFlowChartName,
    setImportedFileName,
    setSelectedEdge,
    setSelectedNode,
    setShowBubbleMenu,
    setShowMiniMap,
  ])

  const demoModelStore = useMemo(() => {
    return () => ({ finalValues: sampleFinalValues }) as any
  }, [sampleFinalValues])

  const nodePaletteNodes = useMemo(
    () => [
      {
        type: "input",
        label: t("flow.node.input"),
        helpTitle: t("posthogDemo.flowDocs.bubbles.inputTitle"),
        helpBody: t("posthogDemo.flowDocs.bubbles.inputBody"),
      },
      {
        type: "output",
        label: t("flow.node.output"),
        helpTitle: t("posthogDemo.flowDocs.bubbles.outputTitle"),
        helpBody: t("posthogDemo.flowDocs.bubbles.outputBody"),
      },
      {
        type: "default",
        label: t("flow.node.default"),
        helpTitle: t("posthogDemo.flowDocs.bubbles.defaultTitle"),
        helpBody: t("posthogDemo.flowDocs.bubbles.defaultBody"),
      },
    ],
    [t],
  )

  useEffect(() => {
    if (!bubble) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setBubble(null)
    }
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      const inside = target?.closest?.("[data-flowdocs-bubble]")
      if (!inside) setBubble(null)
    }
    window.addEventListener("keydown", onKeyDown)
    document.addEventListener("mousedown", onMouseDown, { capture: true })
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      document.removeEventListener("mousedown", onMouseDown, { capture: true } as any)
    }
  }, [bubble])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      if (!target) return
      if (!canvasRef.current?.contains(target)) return
      if (target.closest?.("[data-flowdocs-bubble]")) return

      const isNode = Boolean(target.closest?.(".react-flow__node"))
      const isEdge = Boolean(target.closest?.(".react-flow__edge"))
      if (!isNode && !isEdge) return

      const title = isNode
        ? t("posthogDemo.flowDocs.bubbles.canvasNodeTitle")
        : t("posthogDemo.flowDocs.bubbles.canvasEdgeTitle")
      const body = isNode
        ? t("posthogDemo.flowDocs.bubbles.canvasNodeBody")
        : t("posthogDemo.flowDocs.bubbles.canvasEdgeBody")

      setBubble({
        x: e.clientX,
        y: e.clientY,
        title,
        body,
      })
    }

    document.addEventListener("click", handler, { capture: true })
    return () => {
      document.removeEventListener("click", handler, { capture: true } as any)
    }
  }, [t])

  const panels = useMemo(
    () =>
      [
        {
          id: "nodeToolbar" as const,
          label: t("posthogDemo.flowDocs.panels.nodeToolbar"),
        },
        {
          id: "inspector" as const,
          label: t("posthogDemo.flowDocs.panels.inspector"),
        },
        {
          id: "simulation" as const,
          label: t("posthogDemo.flowDocs.panels.simulation"),
        },
        {
          id: "analysis" as const,
          label: t("posthogDemo.flowDocs.panels.analysis"),
        },
      ] satisfies Array<{ id: FlowDocsPanelId; label: string }>,
    [t],
  )

  const renderPanel = () => {
    if (active === "nodeToolbar") {
      return (
        <VStack align="stretch" gap={3}>
          <Heading size="sm">
            {t("posthogDemo.flowDocs.panel.nodeToolbar.title")}
          </Heading>
          <Text fontSize="sm" color="gray.700">
            {t("posthogDemo.flowDocs.panel.nodeToolbar.body")}
          </Text>
          <NodePalette
            nodeTypes={nodePaletteNodes}
            onNodeClick={(node, event) => {
              event.preventDefault()
              event.stopPropagation()
              setBubble({
                x: event.clientX,
                y: event.clientY,
                title: node.helpTitle || node.label,
                body: node.helpBody || "",
              })
            }}
          />
        </VStack>
      )
    }

    if (active === "inspector") {
      return (
        <VStack align="stretch" gap={3}>
          <Heading size="sm">
            {t("posthogDemo.flowDocs.panel.inspector.title")}
          </Heading>
          <Text fontSize="sm" color="gray.700">
            {t("posthogDemo.flowDocs.panel.inspector.body")}
          </Text>
          <Box borderWidth="1px" borderColor="rgba(0,0,0,0.12)" borderRadius="md" p={3}>
            <InspectorContainer />
          </Box>
        </VStack>
      )
    }

    if (active === "simulation") {
      return (
        <VStack align="stretch" gap={3}>
          <Heading size="sm">
            {t("posthogDemo.flowDocs.panel.simulation.title")}
          </Heading>
          <Text fontSize="sm" color="gray.700">
            {t("posthogDemo.flowDocs.panel.simulation.body")}
          </Text>
          <SimulationPanel modelType={SAMPLE_MODEL_TYPE} />
        </VStack>
      )
    }

    return (
      <VStack align="stretch" gap={3}>
        <Heading size="sm">{t("posthogDemo.flowDocs.panel.analysis.title")}</Heading>
        <Text fontSize="sm" color="gray.700">
          {t("posthogDemo.flowDocs.panel.analysis.body")}
        </Text>
        <ResultsPanel modelType={SAMPLE_MODEL_TYPE} modelStore={demoModelStore} />
      </VStack>
    )
  }

  return (
    <Flex
      w="full"
      h="full"
      overflow="hidden"
      bg="white"
      data-flow-theme-scope
    >
      <Box ref={canvasRef} flex="1" minW={0} position="relative" bg="white">
        <ReactFlowProvider>
          <Canvas />
        </ReactFlowProvider>
      </Box>

      {bubble ? (
        <Portal>
          <Box
            data-flowdocs-bubble
            position="fixed"
            left={`${Math.max(12, Math.min(bubble.x + 12, window.innerWidth - 320))}px`}
            top={`${Math.max(12, Math.min(bubble.y + 12, window.innerHeight - 180))}px`}
            zIndex={2500}
            maxW="300px"
            borderWidth="1px"
            borderColor="rgba(0,0,0,0.18)"
            borderRadius="md"
            bg="white"
            boxShadow="0 18px 60px rgba(0,0,0,0.22)"
            p={3}
          >
            <Heading size="xs" color="gray.900" mb={1}>
              {bubble.title}
            </Heading>
            <Text fontSize="xs" color="gray.700">
              {bubble.body}
            </Text>
          </Box>
        </Portal>
      ) : null}

      <Flex
        direction="column"
        w={{ base: "320px", md: "380px" }}
        borderLeftWidth="1px"
        borderLeftColor="rgba(0,0,0,0.12)"
        bg="rgba(248,247,244,0.92)"
        overflow="hidden"
      >
        <Box px={4} py={3} borderBottomWidth="1px" borderBottomColor="rgba(0,0,0,0.12)">
          <Heading size="sm" color="gray.800">
            {t("posthogDemo.flowDocs.title")}
          </Heading>
          <Text fontSize="xs" color="gray.600">
            {t("posthogDemo.flowDocs.intro")}
          </Text>

          <HStack gap={2} mt={3} flexWrap="wrap">
            {panels.map((p) => (
              <Button
                key={p.id}
                size="sm"
                variant={p.id === active ? "solid" : "outline"}
                colorScheme={p.id === active ? "blue" : undefined}
                onClick={() => setActive(p.id)}
              >
                {p.label}
              </Button>
            ))}
          </HStack>

          <HStack gap={2} mt={3} flexWrap="wrap" justify="space-between" align="center">
            <Button
              asChild
              size="xs"
              bg="#e0a73b"
              color="black"
              borderWidth="2px"
              borderColor="rgba(0,0,0,0.25)"
              _hover={{ bg: "#d99b22" }}
              boxShadow="sm"
            >
              <a href={SAMPLE_JSON_URL} download={`${SAMPLE_NAME}.json`}>
                {t("posthogDemo.flowDocs.sampleDataDownload")}
              </a>
            </Button>
            <Text fontSize="xs" color="gray.600">
              {t("posthogDemo.flowDocs.sampleDataHint", { name: SAMPLE_NAME })}
            </Text>
          </HStack>
        </Box>

        <Box flex="1" overflow="auto" p={4}>
          {renderPanel()}
        </Box>
      </Flex>
    </Flex>
  )
}
