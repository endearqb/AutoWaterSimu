import {
  Box,
  Button,
  DownloadTrigger,
  IconButton,
  VStack,
} from "@chakra-ui/react"
import { type ReactNode, useEffect, useRef, useState } from "react"
import {
  FiDatabase,
  FiDownload,
  FiFolder,
  FiMenu,
  FiPlus,
  FiSave,
  FiUpload,
} from "react-icons/fi"
import { useI18n } from "../../../i18n"
import type { BaseModelState } from "../../../stores/baseModelStore"
import { confirmDebug } from "../../../utils/confirmDebug"
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
  /** 额外菜单动作（用于模型特定入口） */
  extraMenuItems?: Array<{
    key: string
    label: string
    icon?: ReactNode
    onClick: () => void
  }>
}

/**
 * 确认对话框状态接口
 */
interface ConfirmDialogState {
  isOpen: boolean
  title: string
  message: string
}

type PendingActionKind = "import" | "generic"

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
  extraMenuItems = [],
}: BaseBubbleMenuProps<TJob, TFlowChart>) => {
  const { t } = useI18n()
  const scope = "BaseBubbleMenu"
  const [isOpen, setIsOpen] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(
    null,
  )
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false)
  const [isLoadDialogOpen, setIsLoadDialogOpen] = useState(false)
  const [isLoadCalculationDataDialogOpen, setIsLoadCalculationDataDialogOpen] =
    useState(false)
  const pendingActionRef = useRef<(() => void) | null>(null)
  const pendingActionKindRef = useRef<PendingActionKind | null>(null)
  const confirmDialogOpenRef = useRef(false)

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
    confirmDialogOpenRef.current = Boolean(confirmDialog?.isOpen)
  }, [confirmDialog?.isOpen])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (confirmDialogOpenRef.current) {
        return
      }
      const target = event.target as HTMLElement
      const bubbleMenu = document.querySelector("[data-bubble-menu]")
      // 不关闭气泡菜单如果点击在 Dialog 中（Portal 渲染的内容）
      if (
        target.closest("[data-confirm-dialog-content]") ||
        target.closest("[data-confirm-dialog-backdrop]") ||
        target.closest("[role='dialog']") ||
        target.closest("[data-dialog-backdrop]")
      ) {
        return
      }
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
  }, [isOpen, confirmDialog?.isOpen])

  // 检查是否有未保存的内容
  const hasUnsavedContent = () => {
    return nodes.length > 0 || edges.length > 0
  }

  const clearPendingAction = () => {
    pendingActionRef.current = null
    pendingActionKindRef.current = null
  }

  const openImportFilePicker = () => {
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

  // 统一设置 confirmDialog state 和 pendingActionRef
  const showConfirmDialog = (
    title: string,
    message: string,
    action: () => void,
    kind: PendingActionKind = "generic",
  ) => {
    confirmDebug(
      scope,
      "showConfirmDialog",
      { title, kind, isOpen, hasPending: !!pendingActionRef.current },
      { breakpoint: true },
    )
    confirmDialogOpenRef.current = true
    pendingActionRef.current = action
    pendingActionKindRef.current = kind
    setIsOpen(false)
    setConfirmDialog({ isOpen: true, title, message })
  }

  // 处理保存按钮点击
  const handleOpenSaveDialog = () => {
    confirmDebug(scope, "openSaveDialog")
    setIsSaveDialogOpen(true)
  }

  // 处理加载按钮点击
  const handleOpenLoadDialog = () => {
    setIsLoadDialogOpen(true)
  }

  // 处理确认对话框的确认操作
  const handleConfirmAction = async (action: "save" | "export" | "skip") => {
    const pendingAction = pendingActionRef.current
    confirmDebug(
      scope,
      "handleConfirmAction-start",
      {
        action,
        hasPending: !!pendingAction,
        pendingKind: pendingActionKindRef.current,
      },
      { breakpoint: true },
    )

    try {
      switch (action) {
        case "save":
          // 保存成功后由 onSaveSuccess 决定是否执行 pending action
          handleOpenSaveDialog()
          break
        case "export":
          // 触发导出
          confirmDebug(scope, "handleConfirmAction-export-before")
          if (onExport) {
            const exportData = onExport()
            const blob = new Blob([exportData], { type: "application/json" })
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `${t("flow.menu.defaultFlowchartName")}-${new Date().toISOString().split("T")[0]}.json`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
          }
          // 导出后执行 pending action
          pendingAction?.()
          confirmDebug(scope, "handleConfirmAction-export-after", {
            executedPending: !!pendingAction,
          })
          clearPendingAction()
          break
        case "skip":
          // 不保存，直接执行待处理的操作
          pendingAction?.()
          confirmDebug(scope, "handleConfirmAction-skip-after", {
            executedPending: !!pendingAction,
          })
          clearPendingAction()
          break
      }
    } catch (error) {
      confirmDebug(scope, "handleConfirmAction-error", {
        action,
        error: error instanceof Error ? error.message : String(error),
      })
      console.error(t("flow.menu.actionFailed"), error)
      clearPendingAction()
    } finally {
      confirmDebug(scope, "handleConfirmAction-finally-closeConfirm")
      confirmDialogOpenRef.current = false
      setConfirmDialog(null)
    }
  }

  const handleSaveSuccess = async () => {
    try {
      const pendingAction = pendingActionRef.current
      const pendingActionKind = pendingActionKindRef.current
      confirmDebug(
        scope,
        "handleSaveSuccess-start",
        {
          hasPending: !!pendingAction,
          pendingActionKind,
        },
        { breakpoint: true },
      )
      if (!pendingAction || !pendingActionKind) return

      if (pendingActionKind === "import") {
        const { toaster } = await import("../../ui/toaster")
        toaster.create({
          title: t("flow.menu.importFlowchart"),
          description: t("flow.menu.importRetryAfterSave"),
          type: "info",
          duration: 3000,
        })
        confirmDebug(scope, "handleSaveSuccess-import-toast")
        clearPendingAction()
        return
      }

      pendingAction()
      confirmDebug(scope, "handleSaveSuccess-executed-pending")
      clearPendingAction()
    } catch (error) {
      confirmDebug(scope, "handleSaveSuccess-error", {
        error: error instanceof Error ? error.message : String(error),
      })
      console.error(t("flow.menu.actionFailed"), error)
      clearPendingAction()
    }
  }

  const handleSaveClick = () => {
    clearPendingAction()
    handleOpenSaveDialog()
    setIsOpen(false)
  }

  const handleLoadClick = () => {
    if (hasUnsavedContent()) {
      showConfirmDialog(
        t("flow.menu.loadFlowchart"),
        t("flow.menu.confirmSaveMessage"),
        () => {
          handleOpenLoadDialog()
          setIsOpen(false)
        },
      )
    } else {
      handleOpenLoadDialog()
      setIsOpen(false)
    }
  }

  const handleLoadCalculationData = () => {
    if (hasUnsavedContent()) {
      showConfirmDialog(
        t("flow.menu.loadCalculationData"),
        t("flow.menu.confirmSaveMessage"),
        () => {
          setIsLoadCalculationDataDialogOpen(true)
          setIsOpen(false)
        },
      )
    } else {
      setIsLoadCalculationDataDialogOpen(true)
      setIsOpen(false)
    }
  }

  const handleNewFlowChartClick = () => {
    if (hasUnsavedContent()) {
      showConfirmDialog(
        t("flow.menu.newFlowchart"),
        t("flow.menu.confirmSaveMessage"),
        () => {
          onNewFlowChart?.()
          setIsOpen(false)
        },
      )
    } else {
      onNewFlowChart?.()
      setIsOpen(false)
    }
  }

  const handleImportClick = () => {
    if (hasUnsavedContent()) {
      showConfirmDialog(
        t("flow.menu.importFlowchart"),
        t("flow.menu.confirmSaveMessage"),
        () => {
          openImportFilePicker()
        },
        "import",
      )
    } else {
      openImportFilePicker()
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
          {extraMenuItems.map((item) => (
            <Button
              key={item.key}
              size="sm"
              variant="solid"
              colorScheme="blue"
              onClick={() => {
                item.onClick()
                setIsOpen(false)
              }}
              bg="white"
              color="gray.700"
              border="1px"
              borderColor="gray.200"
              boxShadow="md"
              _hover={{ bg: "gray.50" }}
              minW="120px"
              justifyContent="flex-start"
            >
              {item.icon}
              {item.label}
            </Button>
          ))}

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
            {t("flow.menu.newFlowchart")}
          </Button>

          {/* 本地导出按钮 */}
          {enableLocalImportExport && (
            <DownloadTrigger
              data={onExport?.() || ""}
              fileName={`${currentFlowChartName || t("flow.menu.defaultFlowchartName")}.json`}
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
                {t("flow.menu.localExport")}
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
              {t("flow.menu.localImport")}
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
              {t("flow.menu.saveOnline")}
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
              {t("flow.menu.loadOnline")}
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
              {t("flow.menu.loadCalculationData")}
            </Button>
          )}
        </VStack>
      )}

      {/* 气泡菜单触发按钮 */}
      <IconButton
        size="lg"
        variant="solid"
        colorScheme="blue"
        aria-label={t("flow.menu.actionsAriaLabel")}
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
          onDismiss={() => {
            confirmDebug(scope, "confirmDialog-dismiss")
            confirmDialogOpenRef.current = false
            setConfirmDialog(null)
            clearPendingAction()
          }}
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
          onSaveSuccess={handleSaveSuccess}
          onCloseSaveDialog={() => {
            confirmDebug(scope, "closeSaveDialog")
            setIsSaveDialogOpen(false)
            clearPendingAction()
          }}
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
