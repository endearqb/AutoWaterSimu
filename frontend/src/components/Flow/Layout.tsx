import { Box, IconButton } from "@chakra-ui/react"
import { type ReactNode, useEffect, useState } from "react"
import { FiChevronLeft, FiChevronRight } from "react-icons/fi"
import { useI18n } from "../../i18n"
import useFlowStore from "../../stores/flowStore"
import BubbleMenu from "./menu/BubbleMenu"
import BaseToolbarContainer from "./toolbar/BaseToolbarContainer"
import NodesPanel from "./toolbar/NodesPanel"

interface LayoutProps {
  canvas: ReactNode
  inspector: ReactNode
  topOffset?: number
}

const Layout = ({ canvas, inspector, topOffset = 82 }: LayoutProps) => {
  const { t } = useI18n()
  const {
    selectedNode,
    selectedEdge,
    exportFlowData,
    importFlowData,
    setImportedFileName,
    setCurrentFlowChartName,
  } = useFlowStore()
  const [isInspectorOpen, setIsInspectorOpen] = useState(false)
  const [isToolbarCollapsed, setIsToolbarCollapsed] = useState(false)
  const [toolbarPosition, setToolbarPosition] = useState({
    x: 16,
    y: topOffset,
  })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [sidebarWidth, setSidebarWidth] = useState(240)
  const [isToolbarLocked, setIsToolbarLocked] = useState(true) // 默认锁定状态

  // 动态计算默认锁定位置（跟随sidebar右边缘，位于MiddayHead下方）
  const getDefaultPosition = () => ({ x: sidebarWidth + 16, y: topOffset })

  // 初始化工具栏位置为默认位置（锁定状态）
  useEffect(() => {
    if (isToolbarLocked) {
      setToolbarPosition(getDefaultPosition())
    }
  }, [isToolbarLocked, sidebarWidth, topOffset])

  // 当选中节点或连接线时自动打开属性检查器
  useEffect(() => {
    if (selectedNode || selectedEdge) {
      setIsInspectorOpen(true)
    }
  }, [selectedNode, selectedEdge])

  // 当没有选中任何元素时自动关闭属性检查器
  useEffect(() => {
    if (!selectedNode && !selectedEdge) {
      setIsInspectorOpen(false)
    }
  }, [selectedNode, selectedEdge])

  // 监听侧边栏状态变化，调整工具栏位置
  useEffect(() => {
    const checkSidebarWidth = () => {
      const sidebarElement = document.querySelector("[data-sidebar]")
      if (sidebarElement) {
        const width = sidebarElement.getBoundingClientRect().width
        setSidebarWidth(width)
      } else {
        // 如果找不到sidebar元素，使用默认值
        setSidebarWidth(240)
      }
    }

    // 初始检查
    checkSidebarWidth()

    // 监听窗口大小变化
    const observer = new ResizeObserver(checkSidebarWidth)
    const sidebarElement = document.querySelector("[data-sidebar]")
    if (sidebarElement) {
      observer.observe(sidebarElement)
    }

    return () => {
      observer.disconnect()
    }
  }, [])

  // 拖拽事件处理
  const handleMouseDown = (e: React.MouseEvent) => {
    // 只有在解锁状态下才允许拖拽
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

  // 处理锁定/解锁切换
  const handleToggleLock = () => {
    if (!isToolbarLocked) {
      // 从解锁切换到锁定时，回到默认位置
      setToolbarPosition(getDefaultPosition())
    }
    setIsToolbarLocked(!isToolbarLocked)
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      const newX = e.clientX - dragOffset.x
      const newY = e.clientY - dragOffset.y

      // 确保工具栏不会超出视窗边界
      const maxX = window.innerWidth - 250 // 工具栏宽度
      const maxY = window.innerHeight - 100 // 预留底部空间

      setToolbarPosition({
        x: Math.max(sidebarWidth + 16, Math.min(newX, maxX)),
        y: Math.max(topOffset, Math.min(newY, maxY)),
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // 添加全局鼠标事件监听
  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
      return () => {
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
      }
    }
  }, [isDragging, dragOffset, sidebarWidth])

  // 处理导出流程图
  const handleExport = () => {
    try {
      const flowData = exportFlowData()
      const dataStr = JSON.stringify(flowData, null, 2)
      return dataStr
    } catch (error) {
      // 导出失败时返回空字符串，DownloadTrigger会处理错误
      console.error("导出流程图失败:", error)
      return ""
    }
  }

  // 处理导入流程图
  const handleImport = async (files: File[]) => {
    if (files.length === 0) return

    const file = files[0]
    if (!file.name.endsWith(".json")) {
      // 动态导入toaster
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

        // 保存导入的文件名（去掉.json扩展名）并设置为当前流程图名称
        const fileName = file.name.replace(/\.json$/, "")
        setImportedFileName(fileName)
        setCurrentFlowChartName(fileName)

        // 动态导入toaster
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
        // 动态导入toaster
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

  return (
    <Box h="calc(100vh)" overflow="hidden" position="relative">
      {/* 画布区域 - 全宽显示 */}
      <Box
        w="100%"
        h="100%"
        position="relative"
        transition="margin-right 0.1s ease"
        marginRight={isInspectorOpen ? "320px" : "0"}
      >
        {canvas}
      </Box>

      {/* 悬浮节点工具栏 */}
      <BaseToolbarContainer
        sidebarWidth={sidebarWidth}
        isToolbarLocked={isToolbarLocked}
        isToolbarCollapsed={isToolbarCollapsed}
        toolbarPosition={toolbarPosition}
        isDragging={isDragging}
        onToggleLock={handleToggleLock}
        onToggleCollapse={() => setIsToolbarCollapsed(!isToolbarCollapsed)}
        onMouseDown={handleMouseDown}
        nodesPanelComponent={NodesPanel}
        modelType="materialBalance"
      />

      {/* 左下角气泡菜单 */}
      <BubbleMenu onExport={handleExport} onImport={handleImport} />

      {/* 右侧属性检查器面板 */}
      <Box
        position="fixed"
        right={0}
        top="8px"
        h="calc(100vh)"
        w="320px"
        bg="white"
        borderLeft="1px"
        borderColor="gray.200"
        transform={isInspectorOpen ? "translateX(0)" : "translateX(100%)"}
        transition="transform 0.3s ease"
        zIndex={1000}
        boxShadow={isInspectorOpen ? "lg" : "none"}
      >
        {/* 折叠/展开按钮 */}
        <IconButton
          position="absolute"
          left="-40px"
          top="50%"
          transform="translateY(-50%)"
          size="sm"
          variant="solid"
          colorScheme="blue"
          onClick={() => setIsInspectorOpen(!isInspectorOpen)}
          borderRadius="md 0 0 md"
          zIndex={1001}
        >
          {isInspectorOpen ? <FiChevronRight /> : <FiChevronLeft />}
        </IconButton>

        {/* 属性检查器内容 */}
        <Box h="100%" overflowY="auto" p={4}>
          {inspector}
        </Box>
      </Box>
    </Box>
  )
}

export default Layout
