import { Box } from "@chakra-ui/react"
import React, { type ReactNode, useEffect, useMemo, useRef, useState } from "react"
import { useI18n } from "../../i18n"
import useFlowStore from "../../stores/flowStore"
import type { RFState } from "../../stores/flowStore"
import BaseInspectorContainer, {
  INSPECTOR_PANEL_WIDTH,
} from "./inspectorbar/BaseInspectorContainer"
import SimulationActionPlate from "./inspectorbar/SimulationActionPlate"
import type { SimulationControllerProps } from "./inspectorbar/useSimulationController"
import BubbleMenu from "./menu/BubbleMenu"

interface BubbleMenuProps {
  onExport: () => string
  onImport: (files: File[]) => void
  onNewFlowChart: () => void
  store: () => RFState
}

interface BaseBubbleMenuProps {
  flowStore?: () => RFState
  modelStore?: any
  config?: any
  onExport?: () => string
  onImport?: (files: File[]) => void
  onNewFlowChart?: () => void
  [key: string]: any
}

interface FlowLayoutProps {
  canvas: ReactNode
  inspector: ReactNode
  toolbar: ReactNode | ((props: any) => ReactNode)
  store?: () => any
  BubbleMenuComponent?: React.ComponentType<
    BubbleMenuProps | BaseBubbleMenuProps
  >
  simulationControlProps?: SimulationControllerProps
}

const FlowLayout = ({
  canvas,
  inspector,
  toolbar,
  store,
  BubbleMenuComponent,
  simulationControlProps,
}: FlowLayoutProps) => {
  const { t } = useI18n()
  const themeScopeRef = useRef<HTMLDivElement>(null!)
  const flowStore = store || useFlowStore
  const flowState = flowStore() as any
  const {
    selectedNode,
    selectedEdge,
    exportFlowData,
    importFlowData,
    setImportedFileName,
    setCurrentFlowChartName,
    newFlowChart,
  } = flowState
  const isEdgeTimeSegmentMode = !!flowState.isEdgeTimeSegmentMode
  const timeSegments = Array.isArray(flowState.timeSegments)
    ? flowState.timeSegments
    : []

  const [isInspectorOpen, setIsInspectorOpen] = useState(false)
  const [isToolbarCollapsed, setIsToolbarCollapsed] = useState(false)
  const [toolbarPosition, setToolbarPosition] = useState({ x: 16, y: 16 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [sidebarWidth, setSidebarWidth] = useState(240)
  const [isToolbarLocked, setIsToolbarLocked] = useState(true)
  const [layoutWidth, setLayoutWidth] = useState(0)

  const getDefaultPosition = () => ({ x: sidebarWidth + 16, y: 16 })

  useEffect(() => {
    if (isToolbarLocked) {
      setToolbarPosition(getDefaultPosition())
    }
  }, [isToolbarLocked, sidebarWidth])

  useEffect(() => {
    if (selectedNode || selectedEdge) {
      setIsInspectorOpen(true)
    }
  }, [selectedNode, selectedEdge])

  useEffect(() => {
    if (!selectedNode && !selectedEdge) {
      setIsInspectorOpen(false)
    }
  }, [selectedNode, selectedEdge])

  useEffect(() => {
    const checkSidebarWidth = () => {
      const sidebarElement = document.querySelector("[data-sidebar]")
      if (sidebarElement) {
        const width = sidebarElement.getBoundingClientRect().width
        setSidebarWidth(width)
      } else {
        setSidebarWidth(240)
      }
    }

    checkSidebarWidth()

    const observer = new ResizeObserver(checkSidebarWidth)
    const sidebarElement = document.querySelector("[data-sidebar]")
    if (sidebarElement) {
      observer.observe(sidebarElement)
    }

    return () => {
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    const host = themeScopeRef.current
    if (!host) return

    const syncLayoutWidth = () => {
      setLayoutWidth(host.getBoundingClientRect().width)
    }

    syncLayoutWidth()
    const observer = new ResizeObserver(syncLayoutWidth)
    observer.observe(host)
    return () => observer.disconnect()
  }, [])

  const segmentCount = timeSegments.length
  const shouldExpandInspector =
    !!selectedEdge && isEdgeTimeSegmentMode && segmentCount >= 2
  const inspectorWidth = useMemo(() => {
    if (!shouldExpandInspector) return INSPECTOR_PANEL_WIDTH

    const desiredWidth = INSPECTOR_PANEL_WIDTH + (segmentCount - 1) * 280
    const viewportWidth =
      typeof window !== "undefined" ? window.innerWidth : INSPECTOR_PANEL_WIDTH
    const containerWidth = layoutWidth > 0 ? layoutWidth : viewportWidth
    const maxWidth = Math.floor(containerWidth * 0.8)
    return Math.max(INSPECTOR_PANEL_WIDTH, Math.min(desiredWidth, maxWidth))
  }, [layoutWidth, segmentCount, shouldExpandInspector])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isToolbarLocked) return

    setIsDragging(true)
    const rect = (e.target as HTMLElement)
      .closest("[data-toolbar]")
      ?.getBoundingClientRect()
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      })
    }
  }

  const handleToggleLock = () => {
    if (!isToolbarLocked) {
      setToolbarPosition(getDefaultPosition())
    }
    setIsToolbarLocked(!isToolbarLocked)
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return

    const newX = e.clientX - dragOffset.x
    const newY = e.clientY - dragOffset.y

    const maxX = window.innerWidth - 250
    const maxY = window.innerHeight - 100

    setToolbarPosition({
      x: Math.max(sidebarWidth + 16, Math.min(newX, maxX)),
      y: Math.max(16, Math.min(newY, maxY)),
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  useEffect(() => {
    if (!isDragging) return

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isDragging, dragOffset, sidebarWidth])

  const handleExport = () => {
    try {
      const flowData = exportFlowData()
      const dataStr = JSON.stringify(flowData, null, 2)
      return dataStr
    } catch (error) {
      console.error("导出流程图失败:", error)
      return ""
    }
  }

  const handleImport = async (files: File[]) => {
    if (files.length === 0) return

    const file = files[0]
    if (!file.name.endsWith(".json")) {
      const { toaster } = await import("../ui/toaster")
      toaster.create({
        title: t("flow.menu.fileFormatErrorTitle"),
        description: t("flow.menu.fileFormatErrorDescription"),
        type: "error",
        duration: 3000,
      })
      return
    }

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string
        const flowData = JSON.parse(content)
        const result = importFlowData(flowData)

        const fileName = file.name.replace(/\.json$/, "")
        setImportedFileName(fileName)
        setCurrentFlowChartName(fileName)

        const { toaster } = await import("../ui/toaster")
        toaster.create({
          title: result.success
            ? t("flow.menu.importSuccess")
            : t("flow.menu.importFailed"),
          description: result.message,
          type: result.success ? "success" : "error",
          duration: 3000,
        })
      } catch (error) {
        const { toaster } = await import("../ui/toaster")
        toaster.create({
          title: t("flow.menu.importFailed"),
          description: t("flow.menu.importInvalidDescription"),
          type: "error",
          duration: 3000,
        })
      }
    }
    reader.readAsText(file)
  }

  const handleNewFlowChart = async () => {
    try {
      newFlowChart()
      const { toaster } = await import("../ui/toaster")
      toaster.create({
        title: t("flow.menu.newFlowchartSuccessTitle"),
        description: t("flow.menu.newFlowchartSuccessDescription"),
        type: "success",
        duration: 3000,
      })
    } catch (error) {
      const { toaster } = await import("../ui/toaster")
      toaster.create({
        title: t("flow.menu.newFlowchartFailedTitle"),
        description: t("flow.menu.newFlowchartFailedDescription"),
        type: "error",
        duration: 3000,
      })
    }
  }

  const toolbarProps = {
    sidebarWidth,
    isToolbarLocked,
    isToolbarCollapsed,
    toolbarPosition,
    isDragging,
    onToggleLock: handleToggleLock,
    onToggleCollapse: () => setIsToolbarCollapsed(!isToolbarCollapsed),
    onMouseDown: handleMouseDown,
    store: flowStore,
  }

  return (
    <Box
      ref={themeScopeRef}
      data-flow-theme-scope
      h="calc(100vh)"
      overflow="hidden"
      position="relative"
    >
      <Box
        w="100%"
        h="100%"
        position="relative"
        transition="margin-right 0.1s ease"
        marginRight={isInspectorOpen ? `${inspectorWidth}px` : "0"}
      >
        {canvas}
        {simulationControlProps && (
          <SimulationActionPlate {...simulationControlProps} />
        )}
      </Box>

      {typeof toolbar === "function"
        ? toolbar(toolbarProps)
        : typeof toolbar === "object" && toolbar && "type" in toolbar
          ? React.cloneElement(toolbar as React.ReactElement, toolbarProps)
          : toolbar}

      {(() => {
        const flowSnapshot = flowStore() as { showBubbleMenu?: boolean }
        const showBubbleMenu =
          typeof flowSnapshot.showBubbleMenu === "boolean"
            ? flowSnapshot.showBubbleMenu
            : true
        if (!showBubbleMenu) return null
        return BubbleMenuComponent ? (
          <BubbleMenuComponent
            onExport={handleExport}
            onImport={handleImport}
            onNewFlowChart={handleNewFlowChart}
            store={flowStore}
            flowStore={flowStore}
          />
        ) : (
          <BubbleMenu
            onExport={handleExport}
            onImport={handleImport}
            store={flowStore}
          />
        )
      })()}

      <BaseInspectorContainer
        isOpen={isInspectorOpen}
        onToggle={() => setIsInspectorOpen(!isInspectorOpen)}
        width={inspectorWidth}
      >
        {inspector}
      </BaseInspectorContainer>
    </Box>
  )
}

export default FlowLayout
