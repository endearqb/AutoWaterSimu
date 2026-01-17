import React, { useState } from "react"
import type { FlowChartPublic } from "../../../client/types.gen"
import useFlowStore from "../../../stores/flowStore"
import LoadDialog from "./LoadDialog"
import SaveDialog from "./SaveDialog"

interface DialogManagerProps {
  isSaveDialogOpen: boolean
  isLoadDialogOpen: boolean
  onCloseSaveDialog: () => void
  onCloseLoadDialog: () => void
}

const DialogManager: React.FC<DialogManagerProps> = ({
  isSaveDialogOpen,
  isLoadDialogOpen,
  onCloseSaveDialog,
  onCloseLoadDialog,
}) => {
  const {
    currentFlowChartId,
    currentFlowChartName,
    importedFileName,
    saveFlowChart,
    loadFlowChart,
    updateFlowChart,
    deleteFlowChart,
    getFlowCharts,
  } = useFlowStore()

  const [flowChartName, setFlowChartName] = useState("")
  const [flowChartDescription, setFlowChartDescription] = useState("")
  const [flowCharts, setFlowCharts] = useState<FlowChartPublic[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // 当保存对话框打开时，设置默认名称
  React.useEffect(() => {
    if (isSaveDialogOpen) {
      if (currentFlowChartName) {
        setFlowChartName(currentFlowChartName)
      } else if (importedFileName) {
        setFlowChartName(importedFileName)
      } else {
        setFlowChartName("未命名流程图")
      }
    }
  }, [isSaveDialogOpen, currentFlowChartName, importedFileName])

  // 当加载对话框打开时，获取流程图列表
  React.useEffect(() => {
    if (isLoadDialogOpen) {
      fetchFlowCharts()
    }
  }, [isLoadDialogOpen])

  // 处理保存流程图
  const handleSave = async () => {
    if (!flowChartName.trim()) {
      const { toaster } = await import("../../ui/toaster")
      toaster.create({
        title: "保存失败",
        description: "请输入流程图名称",
        type: "error",
        duration: 3000,
      })
      return
    }

    setIsLoading(true)
    try {
      let result
      if (currentFlowChartId) {
        // 更新现有流程图
        result = await updateFlowChart(
          currentFlowChartId,
          flowChartName,
          flowChartDescription,
        )
      } else {
        // 创建新流程图
        result = await saveFlowChart(flowChartName, flowChartDescription)
      }

      const { toaster } = await import("../../ui/toaster")
      toaster.create({
        title: result.success ? "保存成功" : "保存失败",
        description: result.message,
        type: result.success ? "success" : "error",
        duration: 3000,
      })

      if (result.success) {
        onCloseSaveDialog()
        setFlowChartName("")
        setFlowChartDescription("")
      }
    } catch (error) {
      const { toaster } = await import("../../ui/toaster")
      toaster.create({
        title: "保存失败",
        description: "网络错误或服务器异常",
        type: "error",
        duration: 3000,
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 处理另存为流程图
  const handleSaveAs = async () => {
    if (!flowChartName.trim()) {
      const { toaster } = await import("../../ui/toaster")
      toaster.create({
        title: "另存为失败",
        description: "请输入流程图名称",
        type: "error",
        duration: 3000,
      })
      return
    }

    setIsLoading(true)
    try {
      // 另存为总是创建新流程图，不管当前是否有ID
      const result = await saveFlowChart(flowChartName, flowChartDescription)

      const { toaster } = await import("../../ui/toaster")
      toaster.create({
        title: result.success ? "另存为成功" : "另存为失败",
        description: result.message,
        type: result.success ? "success" : "error",
        duration: 3000,
      })

      if (result.success) {
        onCloseSaveDialog()
        setFlowChartName("")
        setFlowChartDescription("")
      }
    } catch (error) {
      const { toaster } = await import("../../ui/toaster")
      toaster.create({
        title: "另存为失败",
        description: "网络错误或服务器异常",
        type: "error",
        duration: 3000,
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 处理加载流程图
  const handleLoad = async (flowChartId: string) => {
    setIsLoading(true)
    try {
      const result = await loadFlowChart(flowChartId)

      const { toaster } = await import("../../ui/toaster")
      toaster.create({
        title: result.success ? "加载成功" : "加载失败",
        description: result.message,
        type: result.success ? "success" : "error",
        duration: 3000,
      })

      if (result.success) {
        onCloseLoadDialog()
      }
    } catch (error) {
      const { toaster } = await import("../../ui/toaster")
      toaster.create({
        title: "加载失败",
        description: "网络错误或服务器异常",
        type: "error",
        duration: 3000,
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 处理删除流程图
  const handleDelete = async (flowChartId: string) => {
    setIsLoading(true)
    try {
      const result = await deleteFlowChart(flowChartId)

      const { toaster } = await import("../../ui/toaster")
      toaster.create({
        title: result.success ? "删除成功" : "删除失败",
        description: result.message,
        type: result.success ? "success" : "error",
        duration: 3000,
      })

      if (result.success) {
        // 重新获取流程图列表
        await fetchFlowCharts()
      }
    } catch (error) {
      const { toaster } = await import("../../ui/toaster")
      toaster.create({
        title: "删除失败",
        description: "网络错误或服务器异常",
        type: "error",
        duration: 3000,
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 获取流程图列表
  const fetchFlowCharts = async () => {
    try {
      const result = await getFlowCharts()
      if (result.success && result.data) {
        setFlowCharts(result.data)
      }
    } catch (error) {
      console.error("获取流程图列表失败:", error)
    }
  }

  return (
    <>
      <SaveDialog
        isOpen={isSaveDialogOpen}
        onClose={onCloseSaveDialog}
        currentFlowChartId={currentFlowChartId}
        flowChartName={flowChartName}
        flowChartDescription={flowChartDescription}
        isLoading={isLoading}
        onFlowChartNameChange={setFlowChartName}
        onFlowChartDescriptionChange={setFlowChartDescription}
        onSave={handleSave}
        onSaveAs={handleSaveAs}
      />

      <LoadDialog
        isOpen={isLoadDialogOpen}
        onClose={onCloseLoadDialog}
        flowCharts={flowCharts}
        isLoading={isLoading}
        onLoad={handleLoad}
        onDelete={handleDelete}
      />
    </>
  )
}

export default DialogManager
