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
import { useI18n } from "../../../i18n"
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
  store?: () => RFState // 可选的自定义store
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
  const { t } = useI18n()
  const flowStore = store || useFlowStore
  const {
    nodes,
    edges,
    currentFlowChartName,
    setCurrentFlowChartName,
    edgeParameterConfigs,
  } = flowStore()
  const [toolbarView, setToolbarView] = useState("nodes")
  const [isEditingName, setIsEditingName] = useState(false)
  const [editingName, setEditingName] = useState("")
  const modelStoreInstance = modelStore ? modelStore() : null
  const currentJob = modelStoreInstance?.currentJob
  const untitled = t("flow.menu.untitledFlowchart")
  const displayName = currentFlowChartName || untitled

  const getToolbarWidth = () => {
    if (toolbarView === "nodes") return "250px"
    if (toolbarView === "data" || toolbarView === "results") {
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
      const baseWidth = 120 + 80
      const paramWidth = paramCount * 80
      const totalWidth = baseWidth + paramWidth
      return `${Math.min(Math.max(totalWidth, 400), 1200)}px`
    }
    return "600px"
  }

  const getToolbarMaxHeight = () => {
    if (isToolbarCollapsed) return "50px"
    if (toolbarView === "data") {
      const rowCount = nodes.length
      const headerHeight = 40
      const rowHeight = 32
      const padding = 80
      const titleHeight = 60
      const calculatedHeight =
        titleHeight + padding + headerHeight + rowCount * rowHeight + 64
      const minHeight = 200
      const maxHeight = window.innerHeight - 64
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
      <Box
        borderBottom={isToolbarCollapsed ? "none" : "1px"}
        borderColor="rgba(255,255,255,0.35)"
        bg="rgba(255,255,255,0.15)"
        backdropFilter="blur(4px)"
      >
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
          <Flex
            align="center"
            gap={2}
            flex="1"
            minW="0"
            maxW="calc(100% - 80px)"
          >
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

            {isEditingName ? (
              <Input
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={() => {
                  if (editingName.trim()) {
                    setCurrentFlowChartName(editingName.trim())
                  } else {
                    setEditingName(displayName)
                  }
                  setIsEditingName(false)
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    if (editingName.trim()) {
                      setCurrentFlowChartName(editingName.trim())
                    } else {
                      setEditingName(displayName)
                    }
                    setIsEditingName(false)
                  } else if (e.key === "Escape") {
                    setEditingName(displayName)
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
                  setEditingName(displayName)
                  setIsEditingName(true)
                }}
                _hover={{ color: "blue.600" }}
                title={t("flow.toolbar.editNameTitle", { name: displayName })}
                overflow="hidden"
                textOverflow="ellipsis"
                whiteSpace="nowrap"
                minW="0"
              >
                {displayName}
              </Text>
            )}
          </Flex>

          <Flex gap={1}>
            <IconButton
              size="xs"
              variant="ghost"
              aria-label={
                isToolbarLocked
                  ? t("flow.toolbar.unlock")
                  : t("flow.toolbar.lock")
              }
              onClick={(e) => {
                e.stopPropagation()
                onToggleLock()
              }}
              onMouseDown={(e) => e.stopPropagation()}
              color={isToolbarLocked ? "gray.600" : "blue.500"}
            >
              {isToolbarLocked ? <FiLock /> : <FiUnlock />}
            </IconButton>
            <IconButton
              size="xs"
              variant="ghost"
              aria-label={
                isToolbarCollapsed
                  ? t("flow.toolbar.expand")
                  : t("flow.toolbar.collapse")
              }
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
                if (details.value) {
                  setToolbarView(details.value)
                }
              }}
              size="xs"
            >
              <SegmentGroup.Indicator />
              <SegmentGroup.Items
                items={[
                  { value: "nodes", label: t("flow.toolbar.views.nodes") },
                  { value: "data", label: t("flow.toolbar.views.data") },
                  {
                    value: "modelParams",
                    label: t("flow.toolbar.views.modelParams"),
                  },
                  { value: "results", label: t("flow.toolbar.views.results") },
                ]}
              />
            </SegmentGroup.Root>
          </Flex>
        )}
      </Box>

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
              {modelType &&
                modelStoreInstance &&
                currentJob?.result_data &&
                (() => {
                  const AnalysisButton = createAnalysisButton({
                    modelType: modelType as any,
                    label: t("flow.toolbar.analysisLabel"),
                    resultData: currentJob.result_data,
                    edges: edges,
                    edgeParameterConfigs: edgeParameterConfigs,
                    disabled: false,
                  })
                  return <AnalysisButton />
                })()}
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
