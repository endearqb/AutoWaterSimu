import {
  Box,
  Button,
  DownloadTrigger,
  IconButton,
  VStack,
} from "@chakra-ui/react"
import { type ReactNode, useEffect, useState } from "react"
import {
  FiDatabase,
  FiDownload,
  FiFolder,
  FiMenu,
  FiPlus,
  FiSave,
  FiUpload,
} from "react-icons/fi"
import type { BaseModelState } from "../../../stores/baseModelStore"
import ConfirmDialog from "./ConfirmDialog"

/**
 * 通用BubbleMenu组件的配置接口
 */
export interface BubbleMenuConfig {
  /** 是否启用在线保存功能 */
  enableOnlineSave?: boolean
  /** 是否启用在线加载功能 */
  enableOnlineLoad?: boolean
  /** 是否启用加载计算数据功能 */
  enableLoadCalculationData?: boolean
  /** 是否启用本地导入导出功能 */
  enableLocalImportExport?: boolean
}

/**
 * 通用BubbleMenu组件的Props接口
 * @template TJob - 计算任务类型
 * @template TFlowChart - 流程图类型
 */
export interface BaseBubbleMenuProps<TJob, TFlowChart> {
  /** 流程图Store */
  flowStore?: () => any
  /** 模型Store */
  modelStore?: () => BaseModelState<TJob, TFlowChart, any, any, any>

  /** 功能配置 */
  config?: BubbleMenuConfig

  /** 导出回调函数 */
  onExport?: () => string
  /** 导入回调函数 */
  onImport?: (files: File[]) => void
  /** 新建流程图回调函数 */
  onNewFlowChart?: () => void

  /** 自定义对话框管理器组件 */
  dialogManager?: ReactNode
  /** 自定义加载计算数据对话框组件 */
  loadCalculationDataDialog?: ReactNode

  /** 对话框管理器组件类型 */
  DialogManagerComponent?: React.ComponentType<any>
  /** 加载计算数据对话框组件类型 */
  LoadCalculationDataDialogComponent?: React.ComponentType<any>
  /** 加载计算数据对话框配置 */
  loadCalculationDataDialogConfig?: any
}

/**
 * 确认对话框状态接口
 */
interface ConfirmDialogState {
  isOpen: boolean
  title: string
  message: string
  pendingAction: () => void
}

/**
 * 通用BubbleMenu组件
 * 支持不同模型的流程图管理功能
 * @template TJob - 计算任务类型
 * @template TFlowChart - 流程图类型
 */
const BaseBubbleMenu = <TJob, TFlowChart>({
  flowStore,
  modelStore,
  config = {},
  onExport,
  onImport,
  onNewFlowChart,
  dialogManager,
  loadCalculationDataDialog,
  DialogManagerComponent,
  LoadCalculationDataDialogComponent,
  loadCalculationDataDialogConfig,
}: BaseBubbleMenuProps<TJob, TFlowChart>) => {
  const [isOpen, setIsOpen] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(
    null,
  )
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false)
  const [isLoadDialogOpen, setIsLoadDialogOpen] = useState(false)
  const [isLoadCalculationDataDialogOpen, setIsLoadCalculationDataDialogOpen] =
    useState(false)

  // 默认配置
  const {
    enableOnlineSave = true,
    enableOnlineLoad = true,
    enableLoadCalculationData = true,
    enableLocalImportExport = true,
  } = config

  // 获取流程图状态
  const flowState = flowStore?.()
  const nodes = flowState?.nodes || []
  const edges = flowState?.edges || []
  const currentFlowChartName = flowState?.currentFlowChartName || ""
  const setCurrentFlowChartName = flowState?.setCurrentFlowChartName

  // 点击外部区域关闭气泡菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      const bubbleMenu = document.querySelector("[data-bubble-menu]")
      if (isOpen && bubbleMenu && !bubbleMenu.contains(target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => {
        document.removeEventListener("mousedown", handleClickOutside)
      }
    }
  }, [isOpen])

  // 检查是否有未保存的内容
  const hasUnsavedContent = () => {
    return nodes.length > 0 || edges.length > 0
  }

  // 处理保存按钮点击
  const handleOpenSaveDialog = () => {
    setIsSaveDialogOpen(true)
  }

  // 处理加载按钮点击
  const handleOpenLoadDialog = () => {
    setIsLoadDialogOpen(true)
  }

  // 处理确认对话框的确认操作
  const handleConfirmAction = async (action: "save" | "export" | "skip") => {
    if (!confirmDialog) return

    try {
      switch (action) {
        case "save":
          handleOpenSaveDialog()
          break
        case "export":
          // 触发导出
          if (onExport) {
            const exportData = onExport()
            const blob = new Blob([exportData], { type: "application/json" })
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `flowchart-${new Date().toISOString().split("T")[0]}.json`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
          }
          break
        case "skip":
          // 不保存，直接执行待处理的操作
          confirmDialog.pendingAction()
          break
      }
    } catch (error) {
      console.error("操作失败:", error)
    } finally {
      setConfirmDialog(null)
    }
  }

  const handleSaveClick = () => {
    handleOpenSaveDialog()
    setIsOpen(false)
  }

  const handleLoadClick = () => {
    if (hasUnsavedContent()) {
      setConfirmDialog({
        isOpen: true,
        title: "加载流程图",
        message: "当前流程图是否要保存？",
        pendingAction: () => {
          handleOpenLoadDialog()
          setIsOpen(false)
        },
      })
    } else {
      handleOpenLoadDialog()
      setIsOpen(false)
    }
  }

  const handleLoadCalculationData = () => {
    if (hasUnsavedContent()) {
      setConfirmDialog({
        isOpen: true,
        title: "加载计算数据",
        message: "当前流程图是否要保存？",
        pendingAction: () => {
          setIsLoadCalculationDataDialogOpen(true)
          setIsOpen(false)
        },
      })
    } else {
      setIsLoadCalculationDataDialogOpen(true)
      setIsOpen(false)
    }
  }

  const handleNewFlowChartClick = () => {
    if (hasUnsavedContent()) {
      setConfirmDialog({
        isOpen: true,
        title: "新建流程图",
        message: "当前流程图是否要保存？",
        pendingAction: () => {
          onNewFlowChart?.()
          setIsOpen(false)
        },
      })
    } else {
      onNewFlowChart?.()
      setIsOpen(false)
    }
  }

  const handleImportClick = () => {
    if (hasUnsavedContent()) {
      setConfirmDialog({
        isOpen: true,
        title: "导入流程图",
        message: "当前流程图是否要保存？",
        pendingAction: () => {
          // 触发文件选择
          const fileInput = document.createElement("input")
          fileInput.type = "file"
          fileInput.accept = ".json"
          fileInput.onchange = (e) => {
            const files = (e.target as HTMLInputElement).files
            if (files && files.length > 0) {
              // 导入时使用文件名作为流程图名称
              const fileName = files[0].name.replace(/\.json$/, "")
              setCurrentFlowChartName?.(fileName)
              onImport?.(Array.from(files))
            }
          }
          fileInput.click()
          setIsOpen(false)
        },
      })
    } else {
      // 直接触发文件选择
      const fileInput = document.createElement("input")
      fileInput.type = "file"
      fileInput.accept = ".json"
      fileInput.onchange = (e) => {
        const files = (e.target as HTMLInputElement).files
        if (files && files.length > 0) {
          // 导入时使用文件名作为流程图名称
          const fileName = files[0].name.replace(/\.json$/, "")
          setCurrentFlowChartName?.(fileName)
          onImport?.(Array.from(files))
        }
      }
      fileInput.click()
      setIsOpen(false)
    }
  }

  return (
    <Box
      data-bubble-menu
      position="absolute"
      left="60px"
      bottom="20px"
      zIndex={1000}
      transition="left 0.3s ease"
    >
      {/* 气泡菜单展开的选项 */}
      {isOpen && (
        <VStack gap={2} mb={3} align="start">
          {/* 新建流程图按钮 */}
          <Button
            size="sm"
            variant="solid"
            colorScheme="green"
            onClick={handleNewFlowChartClick}
            bg="white"
            color="gray.700"
            border="1px"
            borderColor="gray.200"
            boxShadow="md"
            _hover={{ bg: "gray.50" }}
            minW="120px"
            justifyContent="flex-start"
          >
            <FiPlus />
            新建流程图
          </Button>

          {/* 本地导出按钮 */}
          {enableLocalImportExport && (
            <DownloadTrigger
              data={onExport?.() || ""}
              fileName={`${currentFlowChartName || "flowchart"}.json`}
              mimeType="application/json"
              asChild
            >
              <Button
                size="sm"
                variant="solid"
                colorScheme="blue"
                bg="white"
                color="gray.700"
                border="1px"
                borderColor="gray.200"
                boxShadow="md"
                _hover={{ bg: "gray.50" }}
                minW="120px"
                justifyContent="flex-start"
              >
                <FiDownload />
                本地导出
              </Button>
            </DownloadTrigger>
          )}

          {/* 本地导入按钮 */}
          {enableLocalImportExport && (
            <Button
              size="sm"
              variant="solid"
              colorScheme="blue"
              onClick={handleImportClick}
              bg="white"
              color="gray.700"
              border="1px"
              borderColor="gray.200"
              boxShadow="md"
              _hover={{ bg: "gray.50" }}
              minW="120px"
              justifyContent="flex-start"
            >
              <FiUpload />
              本地导入
            </Button>
          )}

          {/* 在线保存按钮 */}
          {enableOnlineSave && (
            <Button
              size="sm"
              variant="solid"
              colorScheme="blue"
              onClick={handleSaveClick}
              bg="white"
              color="gray.700"
              border="1px"
              borderColor="gray.200"
              boxShadow="md"
              _hover={{ bg: "gray.50" }}
              minW="120px"
              justifyContent="flex-start"
            >
              <FiSave />
              在线保存
            </Button>
          )}

          {/* 在线加载按钮 */}
          {enableOnlineLoad && (
            <Button
              size="sm"
              variant="solid"
              colorScheme="blue"
              onClick={handleLoadClick}
              bg="white"
              color="gray.700"
              border="1px"
              borderColor="gray.200"
              boxShadow="md"
              _hover={{ bg: "gray.50" }}
              minW="120px"
              justifyContent="flex-start"
            >
              <FiFolder />
              在线加载
            </Button>
          )}

          {/* 加载计算数据按钮 */}
          {enableLoadCalculationData && (
            <Button
              size="sm"
              variant="solid"
              colorScheme="blue"
              onClick={handleLoadCalculationData}
              bg="white"
              color="gray.700"
              border="1px"
              borderColor="gray.200"
              boxShadow="md"
              _hover={{ bg: "gray.50" }}
              minW="120px"
              justifyContent="flex-start"
            >
              <FiDatabase />
              加载计算数据
            </Button>
          )}
        </VStack>
      )}

      {/* 气泡菜单触发按钮 */}
      <IconButton
        size="lg"
        variant="solid"
        colorScheme="blue"
        aria-label="操作菜单"
        onClick={() => setIsOpen(!isOpen)}
        borderRadius="full"
        boxShadow="lg"
        _hover={{ transform: "scale(1.05)" }}
        transition="all 0.2s"
      >
        <FiMenu />
      </IconButton>

      {/* 确认对话框 */}
      {confirmDialog && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          onClose={() => setConfirmDialog(null)}
          onConfirm={handleConfirmAction}
          title={confirmDialog.title}
          message={confirmDialog.message}
        />
      )}

      {/* 自定义对话框管理器 */}
      {dialogManager}
      {DialogManagerComponent && (
        <DialogManagerComponent
          flowStore={flowStore}
          modelStore={modelStore}
          isSaveDialogOpen={isSaveDialogOpen}
          isLoadDialogOpen={isLoadDialogOpen}
          onCloseSaveDialog={() => setIsSaveDialogOpen(false)}
          onCloseLoadDialog={() => setIsLoadDialogOpen(false)}
        />
      )}

      {/* 自定义加载计算数据对话框 */}
      {loadCalculationDataDialog}
      {LoadCalculationDataDialogComponent && (
        <LoadCalculationDataDialogComponent
          isOpen={isLoadCalculationDataDialogOpen}
          onClose={() => setIsLoadCalculationDataDialogOpen(false)}
          flowStore={flowStore}
          modelStore={modelStore}
          config={loadCalculationDataDialogConfig}
        />
      )}
    </Box>
  )
}

export default BaseBubbleMenu
