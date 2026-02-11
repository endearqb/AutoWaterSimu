import { Box, Heading, Portal, Text } from "@chakra-ui/react"
import { ReactFlowProvider } from "@xyflow/react"
import { useEffect, useMemo, useRef, useState } from "react"

import Canvas from "@/components/Flow/Canvas"
import SimulationActionPlate from "@/components/Flow/inspectorbar/SimulationActionPlate"
import { useI18n } from "@/i18n"
import useFlowStore from "@/stores/flowStore"

const SAMPLE_JSON_URL = "/assets/json/asm1slim.json"
const SAMPLE_NAME = "asm1slim"

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

export function SimulationPlateDemo() {
  const { t } = useI18n()
  const [bubble, setBubble] = useState<{
    x: number
    y: number
    title: string
    body: string
  } | null>(null)

  const snapshotRef = useRef<FlowStoreSnapshot | null>(null)

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

  const bubbleText = useMemo(
    () => ({
      title: t("posthogDemo.simulationPlate.bubbleTitle"),
      body: t("posthogDemo.simulationPlate.bubbleBody"),
    }),
    [t],
  )

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      if (!target) return

      const plate = target.closest?.("[data-simulation-action-plate]")
      if (!plate) return

      const interactive = target.closest?.(
        'a,button,input,select,textarea,[role="button"]',
      )
      if (interactive) return

      setBubble({
        x: e.clientX,
        y: e.clientY,
        title: bubbleText.title,
        body: bubbleText.body,
      })
    }

    document.addEventListener("click", onClick, { capture: true })
    return () => {
      document.removeEventListener("click", onClick, { capture: true } as any)
    }
  }, [bubbleText])

  useEffect(() => {
    if (!bubble) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setBubble(null)
    }
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      const inside = target?.closest?.("[data-simulation-bubble]")
      if (!inside) setBubble(null)
    }
    window.addEventListener("keydown", onKeyDown)
    document.addEventListener("mousedown", onMouseDown, { capture: true })
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      document.removeEventListener("mousedown", onMouseDown, {
        capture: true,
      } as any)
    }
  }, [bubble])

  return (
    <Box w="full" h="full" position="relative" data-flow-theme-scope>
      <ReactFlowProvider>
        <Canvas showControls={false} />
        <SimulationActionPlate modelType="asm1slim" />
      </ReactFlowProvider>

      {bubble ? (
        <Portal>
          <Box
            data-simulation-bubble
            position="fixed"
            left={`${Math.max(12, Math.min(bubble.x + 12, window.innerWidth - 320))}px`}
            top={`${Math.max(12, Math.min(bubble.y + 12, window.innerHeight - 180))}px`}
            zIndex={2600}
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
    </Box>
  )
}
