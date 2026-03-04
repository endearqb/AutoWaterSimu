import {
  Box,
  Button,
  DownloadTrigger,
  IconButton,
  VStack,
} from "@chakra-ui/react"
import { useEffect, useRef, useState } from "react"
import { FiDownload, FiMenu, FiUpload } from "react-icons/fi"
import { useI18n } from "../../../i18n"
import useFlowStore from "../../../stores/flowStore"
import type { RFState } from "../../../stores/flowStore"
import { confirmDebug } from "../../../utils/confirmDebug"
import BaseDialogManager from "./BaseDialogManager"
import ConfirmDialog from "./ConfirmDialog"

interface BubbleMenuProps {
  onExport: () => string
  onImport: (files: File[]) => void
  store?: () => RFState // 可选的自定义 store
}

interface ConfirmDialogState {
  isOpen: boolean
  title: string
  message: string
}

type PendingActionKind = "import" | "generic"

const BubbleMenu = ({ onExport, onImport, store }: BubbleMenuProps) => {
  const { t } = useI18n()
  const scope = "BubbleMenu"
  const [isOpen, setIsOpen] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(
    null,
  )
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false)
  const flowStore = store || useFlowStore
  const { nodes, edges, currentFlowChartName, setCurrentFlowChartName } =
    flowStore()
  const pendingActionRef = useRef<(() => void) | null>(null)
  const pendingActionKindRef = useRef<PendingActionKind | null>(null)
  const confirmDialogOpenRef = useRef(false)

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
        setCurrentFlowChartName(fileName)
        onImport(Array.from(files))
      }
    }
    fileInput.click()
    setIsOpen(false)
  }

  const showConfirmDialog = (
    title: string,
    message: string,
    action: () => void,
    kind: PendingActionKind = "generic",
  ) => {
    confirmDebug(
      scope,
      "showConfirmDialog",
      { title, kind, hasPending: !!pendingActionRef.current },
      { breakpoint: true },
    )
    confirmDialogOpenRef.current = true
    pendingActionRef.current = action
    pendingActionKindRef.current = kind
    setIsOpen(false)
    setConfirmDialog({
      isOpen: true,
      title,
      message,
    })
  }

  const handleOpenSaveDialog = () => {
    confirmDebug(scope, "openSaveDialog")
    setIsSaveDialogOpen(true)
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
          handleOpenSaveDialog()
          break
        case "export": {
          // 触发导出
          confirmDebug(scope, "handleConfirmAction-export-before")
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

          // 导出后执行待处理的操作
          pendingAction?.()
          confirmDebug(scope, "handleConfirmAction-export-after", {
            executedPending: !!pendingAction,
          })
          clearPendingAction()
          break
        }
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
          {/* 导出按钮 */}
          <DownloadTrigger
            data={onExport}
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
              本地保存
            </Button>
          </DownloadTrigger>

          {/* 导入按钮 */}
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

      <BaseDialogManager
        flowStore={flowStore}
        isSaveDialogOpen={isSaveDialogOpen}
        isLoadDialogOpen={false}
        onSaveSuccess={handleSaveSuccess}
        onCloseSaveDialog={() => {
          confirmDebug(scope, "closeSaveDialog")
          setIsSaveDialogOpen(false)
          clearPendingAction()
        }}
        onCloseLoadDialog={() => {}}
      />
    </Box>
  )
}

export default BubbleMenu
