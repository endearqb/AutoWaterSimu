import {
  Box,
  Button,
  DownloadTrigger,
  IconButton,
  VStack,
} from "@chakra-ui/react"
import { useEffect, useState } from "react"
import { FiDownload, FiMenu, FiUpload } from "react-icons/fi"
import useFlowStore from "../../../stores/flowStore"
import type { RFState } from "../../../stores/flowStore"
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
  pendingAction: () => void
}

const BubbleMenu = ({ onExport, onImport, store }: BubbleMenuProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(
    null,
  )
  const flowStore = store || useFlowStore
  const { nodes, edges, currentFlowChartName, setCurrentFlowChartName } =
    flowStore()

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

  // 处理确认对话框的确认操作
  const handleConfirmAction = async (action: "save" | "export" | "skip") => {
    if (!confirmDialog) return

    try {
      switch (action) {
        case "export": {
          // 触发导出
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
          break
        }
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
              setCurrentFlowChartName(fileName)
              onImport(Array.from(files))
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
          setCurrentFlowChartName(fileName)
          onImport(Array.from(files))
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
          onClose={() => setConfirmDialog(null)}
          onConfirm={handleConfirmAction}
          title={confirmDialog.title}
          message={confirmDialog.message}
        />
      )}
    </Box>
  )
}

export default BubbleMenu
