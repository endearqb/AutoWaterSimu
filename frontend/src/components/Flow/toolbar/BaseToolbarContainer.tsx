import {
  Box,
  Flex,
  IconButton,
  Input,
  SegmentGroup,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useState } from "react"
import type { ComponentType } from "react"
import { FiChevronDown, FiChevronUp, FiLock, FiUnlock } from "react-icons/fi"
import type { BaseModelState } from "../../../stores/baseModelStore"
import useFlowStore from "../../../stores/flowStore"
import type { RFState } from "../../../stores/flowStore"
import { createAnalysisButton } from "../legacy-analysis/AnalysisButtonFactory"
import { getGlassPanelStyles } from "../nodes/utils/glass"
import DataPanel from "./DataPanel"
import ModelParametersPanel from "./ModelParametersPanel"
import ResultsPanel from "./ResultsPanel"

interface BaseToolbarContainerProps {
  sidebarWidth: number
  isToolbarLocked: boolean
  isToolbarCollapsed: boolean
  toolbarPosition: { x: number; y: number }
  isDragging: boolean
  onToggleLock: () => void
  onToggleCollapse: () => void
  onMouseDown: (e: React.MouseEvent) => void
  store?: () => RFState // 可选的自定义 store
  modelStore?: () => BaseModelState<any, any, any, any, any> // 可选的模型计算store
  nodesPanelComponent: ComponentType // 节点面板组件
  modelType?: "asm1" | "asm1slim" | "materialBalance" | "asm3" // 模型类型
}

const BaseToolbarContainer = ({
  isToolbarLocked,
  isToolbarCollapsed,
  toolbarPosition,
  isDragging,
  onToggleLock,
  onToggleCollapse,
  onMouseDown,
  store,
  modelStore,
  nodesPanelComponent: NodesPanel,
  modelType,
}: BaseToolbarContainerProps) => {
  const flowStore = store || useFlowStore
  const {
    nodes,
    edges,
    currentFlowChartName,
    setCurrentFlowChartName,
    edgeParameterConfigs,
  } = flowStore()
  const [toolbarView, setToolbarView] = useState("nodes") // 工具栏视图状态：nodes, data, results
  const [isEditingName, setIsEditingName] = useState(false) // 是否正在编辑流程图名称
  const [editingName, setEditingName] = useState("") // 编辑中的流程图名称

  // 在组件顶层调用modelStore，避免hooks规则违反
  const modelStoreInstance = modelStore ? modelStore() : null
  const currentJob = modelStoreInstance?.currentJob

  // 动态计算工具栏宽度
  const getToolbarWidth = () => {
    if (toolbarView === "nodes") return "250px"
    if (toolbarView === "data" || toolbarView === "results") {
      // 根据参数列数动态计算宽度
      const allParamKeys = new Set<string>()
      nodes.forEach((node) => {
        if (node.data) {
          Object.keys(node.data).forEach((key) => {
            if (key !== "label" && key !== "volume") {
              allParamKeys.add(key)
            }
          })
        }
      })
      const paramCount = allParamKeys.size
      // 基础宽度(名称+体积) + 每个参数列的宽度
      const baseWidth = 120 + 80 // 节点名称列120px + 体积列80px
      const paramWidth = paramCount * 80 // 每个参数列80px，与DataPanel一致
      const totalWidth = baseWidth + paramWidth
      // 限制最小和最大宽度
      return `${Math.min(Math.max(totalWidth, 400), 1200)}px`
    }
    return "600px"
  }

  // 动态计算工具栏高度
  const getToolbarMaxHeight = () => {
    if (isToolbarCollapsed) return "50px"
    if (toolbarView === "data") {
      // 根据节点数量动态计算高度
      const rowCount = nodes.length
      const headerHeight = 40 // 表头高度
      const rowHeight = 32 // 每行高度
      const padding = 80 // 标题和内边距
      const titleHeight = 60 // 工具栏标题栏高度
      const calculatedHeight =
        titleHeight + padding + headerHeight + rowCount * rowHeight + 64
      // 限制最小和最大高度
      const minHeight = 200
      const maxHeight = window.innerHeight - 64 // 留出边距
      return `${Math.min(Math.max(calculatedHeight, minHeight), maxHeight)}px`
    }
    return "calc(100vh - 32px)"
  }

  const panelGlass = getGlassPanelStyles({ hovered: isDragging })
  const {
    transition: panelTransition,
    direction: _panelDirection,
    ...panelSurface
  } = panelGlass
  const toolbarSurface = {
    ...panelSurface,
    backgroundColor: "rgba(255,255,255,0.45)",
    backdropFilter: "blur(2px)",
  }
  const combinedTransition = isDragging
    ? "none"
    : ["all 0.1s ease", panelTransition].filter(Boolean).join(", ")

  return (
    <Flex
      data-toolbar
      position="fixed"
      left={`${toolbarPosition.x}px`}
      top={`${toolbarPosition.y}px`}
      w={getToolbarWidth()}
      maxH={getToolbarMaxHeight()}
      direction="column"
      {...toolbarSurface}
      zIndex={1000}
      transition={combinedTransition}
      overflow="hidden"
      cursor={isDragging ? "grabbing" : isToolbarLocked ? "default" : "grab"}
    >
      {/* 工具栏标题栏 - 分为两行布局 */}
      <Box
        borderBottom={isToolbarCollapsed ? "none" : "1px"}
        borderColor="rgba(255,255,255,0.35)"
        bg="rgba(255,255,255,0.15)"
        backdropFilter="blur(4px)"
      >
        {/* 第一行：流程图名称和控制按钮 */}
        <Flex
          justify="space-between"
          align="center"
          p={3}
          pb={isToolbarCollapsed ? 3 : 2}
          cursor={isToolbarLocked ? "default" : "grab"}
          onMouseDown={onMouseDown}
          _hover={{
            bg: isToolbarLocked
              ? "rgba(255,255,255,0.18)"
              : "rgba(255,255,255,0.28)",
          }}
          userSelect="none"
        >
          {/* 流程图名称显示/编辑 */}
          <Flex
            align="center"
            gap={2}
            flex="1"
            minW="0"
            maxW="calc(100% - 80px)"
          >
            {/* 流程图类型Logo */}
            <Box
              px={2}
              py={1}
              borderRadius="md"
              fontSize="xs"
              fontWeight="bold"
              color="white"
              bg={
                modelType === "asm1"
                  ? "green.700"
                  : modelType === "asm1slim"
                    ? "green.500"
                    : modelType === "asm3"
                      ? "blue.700"
                      : modelType === "materialBalance"
                        ? "purple.600"
                        : "gray.600"
              }
              border="1px solid"
              borderColor={
                modelType === "asm1"
                  ? "green.800"
                  : modelType === "asm1slim"
                    ? "green.600"
                    : modelType === "asm3"
                      ? "blue.800"
                      : modelType === "materialBalance"
                        ? "purple.700"
                        : "gray.700"
              }
            >
              {modelType === "asm1"
                ? "ASM1"
                : modelType === "asm1slim"
                  ? "ASM1Slim"
                  : modelType === "asm3"
                    ? "ASM3"
                    : modelType === "materialBalance"
                      ? "MBalance"
                      : "Flow"}
            </Box>

            {/* 流程图名称 */}
            {isEditingName ? (
              <Input
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={() => {
                  // 失去焦点时保存并退出编辑模式
                  if (editingName.trim()) {
                    setCurrentFlowChartName(editingName.trim())
                  } else {
                    setEditingName(currentFlowChartName || "未命名")
                  }
                  setIsEditingName(false)
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    // 按回车键保存并退出编辑模式
                    if (editingName.trim()) {
                      setCurrentFlowChartName(editingName.trim())
                    } else {
                      setEditingName(currentFlowChartName || "未命名")
                    }
                    setIsEditingName(false)
                  } else if (e.key === "Escape") {
                    // 按ESC键取消编辑
                    setEditingName(currentFlowChartName || "未命名")
                    setIsEditingName(false)
                  }
                }}
                autoFocus
                size="sm"
                fontSize="md"
                fontWeight="semibold"
                color="gray.800"
                flex="1"
                minW="0"
                bg="rgba(255,255,255,0.78)"
                border="1px"
                borderColor="rgba(86,126,251,0.6)"
                _focus={{
                  borderColor: "blue.500",
                  boxShadow: "0 0 0 1px var(--chakra-colors-blue-500)",
                }}
              />
            ) : (
              <Text
                fontSize="md"
                fontWeight="semibold"
                color="gray.800"
                flex="1"
                cursor="pointer"
                onDoubleClick={() => {
                  setEditingName(currentFlowChartName || "未命名")
                  setIsEditingName(true)
                }}
                _hover={{ color: "blue.600" }}
                title={`双击编辑流程图名称: ${currentFlowChartName || "未命名"}`}
                overflow="hidden"
                textOverflow="ellipsis"
                whiteSpace="nowrap"
                minW="0"
              >
                {currentFlowChartName || "未命名"}
              </Text>
            )}
          </Flex>

          <Flex gap={1}>
            {/* 锁定/解锁按钮 */}
            <IconButton
              size="xs"
              variant="ghost"
              aria-label={isToolbarLocked ? "解锁工具栏" : "锁定工具栏"}
              onClick={(e) => {
                e.stopPropagation()
                onToggleLock()
              }}
              onMouseDown={(e) => e.stopPropagation()}
              color={isToolbarLocked ? "gray.600" : "blue.500"}
            >
              {isToolbarLocked ? <FiLock /> : <FiUnlock />}
            </IconButton>
            {/* 折叠按钮 */}
            <IconButton
              size="xs"
              variant="ghost"
              aria-label={isToolbarCollapsed ? "展开工具栏" : "折叠工具栏"}
              onClick={(e) => {
                e.stopPropagation()
                onToggleCollapse()
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {isToolbarCollapsed ? <FiChevronDown /> : <FiChevronUp />}
            </IconButton>
          </Flex>
        </Flex>

        {/* 第二行：SegmentGroup 视图切换 */}
        {!isToolbarCollapsed && (
          <Flex
            justify="flex-start"
            align="center"
            px={3}
            pb={3}
            bg="rgba(255,255,255,0.12)"
            borderTop="1px solid rgba(255,255,255,0.18)"
          >
            <SegmentGroup.Root
              value={toolbarView}
              onValueChange={(details) => {
                // 添加null检查
                if (details.value) {
                  setToolbarView(details.value)
                }
              }}
              size="xs"
            >
              <SegmentGroup.Indicator />
              <SegmentGroup.Items
                items={[
                  { value: "nodes", label: "节点" },
                  { value: "data", label: "数据" },
                  { value: "modelParams", label: "模型参数" },
                  { value: "results", label: "结果" },
                ]}
              />
            </SegmentGroup.Root>
          </Flex>
        )}
      </Box>

      {/* 工具栏内容 */}
      {!isToolbarCollapsed && (
        <Box
          p={4}
          flex="1"
          overflowY="auto"
          bg="rgba(255,255,255,0.08)"
          borderTop="1px solid rgba(255,255,255,0.15)"
          backdropFilter="blur(4px)"
        >
          {toolbarView === "nodes" && <NodesPanel />}
          {toolbarView === "data" && (
            <DataPanel store={store} modelType={modelType} />
          )}
          {toolbarView === "modelParams" && (
            <ModelParametersPanel
              store={store}
              modelType={modelType || "materialBalance"}
            />
          )}
          {toolbarView === "results" && (
            <VStack gap={4} align="stretch">
              {/* 分析按钮 */}
              {modelType &&
                modelStoreInstance &&
                currentJob?.result_data &&
                (() => {
                  const AnalysisButton = createAnalysisButton({
                    modelType: modelType as any,
                    label: "分析数据",
                    resultData: currentJob.result_data,
                    edges: edges,
                    edgeParameterConfigs: edgeParameterConfigs, // 传递正确的边参数配置
                    disabled: false,
                  })
                  return <AnalysisButton />
                })()}
              {/* 结果面板 */}
              <ResultsPanel
                store={store}
                modelStore={modelStore}
                modelType={modelType}
              />
            </VStack>
          )}
        </Box>
      )}
    </Flex>
  )
}

export default BaseToolbarContainer
export type { BaseToolbarContainerProps }
