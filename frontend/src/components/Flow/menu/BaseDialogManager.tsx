import React, { useState } from "react"
import { useI18n } from "../../../i18n"
import type { BaseModelState } from "../../../stores/baseModelStore"
import type { RFState } from "../../../stores/flowStore"
import LoadDialog from "./LoadDialog"
import SaveDialog from "./SaveDialog"

/**
 * 通用DialogManager组件的Props接口
 * @template TFlowChart - 流程图类型
 */
export interface BaseDialogManagerProps<TFlowChart> {
  /** 流程图Store */
  flowStore?: () => RFState
  /** 模型Store */
  modelStore?: () => BaseModelState<any, TFlowChart, any, any, any>
  /** 是否打开保存对话框 */
  isSaveDialogOpen: boolean
  /** 是否打开加载对话框 */
  isLoadDialogOpen: boolean
  /** 关闭保存对话框回调 */
  onCloseSaveDialog: () => void
  /** 关闭加载对话框回调 */
  onCloseLoadDialog: () => void
}

/**
 * 通用DialogManager组件
 * 管理保存和加载流程图的对话框
 * @template TFlowChart - 流程图类型
 */
const BaseDialogManager = <
  TFlowChart extends { id?: string; name?: string; description?: string },
>({
  flowStore,
  modelStore,
  isSaveDialogOpen,
  isLoadDialogOpen,
  onCloseSaveDialog,
  onCloseLoadDialog,
}: BaseDialogManagerProps<TFlowChart>) => {
  const { t } = useI18n()
  const [flowChartName, setFlowChartName] = useState("")
  const [flowChartDescription, setFlowChartDescription] = useState("")
  const [flowCharts, setFlowCharts] = useState<TFlowChart[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // 获取流程图状态
  const flowState = flowStore?.()
  const currentFlowChartId = flowState?.currentFlowChartId
  const currentFlowChartName = flowState?.currentFlowChartName
  const importedFileName = flowState?.importedFileName
  const saveFlowChart = flowState?.saveFlowChart
  const loadFlowChart = flowState?.loadFlowChart
  const updateFlowChart = flowState?.updateFlowChart
  const deleteFlowChart = flowState?.deleteFlowChart
  const getFlowCharts = flowState?.getFlowCharts
  const exportFlowData = flowState?.exportFlowData
  const importFlowData = flowState?.importFlowData

  // 获取模型状态
  const modelState = modelStore?.()
  const modelFlowcharts = modelState?.flowcharts || []
  const getModelFlowcharts = modelState?.getFlowcharts
  const createModelFlowchart = modelState?.createFlowchart
  const updateModelFlowchart = modelState?.updateFlowchart
  const deleteModelFlowchart = modelState?.deleteFlowchart

  // 当保存对话框打开时，设置默认名称
  React.useEffect(() => {
    if (isSaveDialogOpen) {
      if (currentFlowChartName) {
        setFlowChartName(currentFlowChartName)
      } else if (importedFileName) {
        setFlowChartName(importedFileName)
      } else {
        setFlowChartName(t("flow.menu.untitledFlowchart"))
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
        title: t("flow.menu.saveFailed"),
        description: t("flow.menu.enterFlowchartName"),
        type: "error",
        duration: 3000,
      })
      return
    }

    setIsLoading(true)
    try {
      let result

      // 优先使用模型Store的方法
      if (modelState && createModelFlowchart && updateModelFlowchart) {
        if (currentFlowChartId) {
          // 更新现有流程图
          const flowData = exportFlowData ? exportFlowData() : {}
          result = await updateModelFlowchart(currentFlowChartId, {
            name: flowChartName,
            description: flowChartDescription,
            flow_data: flowData,
          } as any)
          result = { success: true, message: t("flow.menu.updateSuccess") }
        } else {
          // 创建新流程图
          const flowData = exportFlowData ? exportFlowData() : {}
          await createModelFlowchart({
            name: flowChartName,
            description: flowChartDescription,
            flow_data: flowData,
          } as any)
          result = { success: true, message: t("flow.menu.saveSuccess") }
        }
      } else if (flowState && saveFlowChart && updateFlowChart) {
        // 使用流程图Store的方法
        if (currentFlowChartId) {
          result = await updateFlowChart(
            currentFlowChartId,
            flowChartName,
            flowChartDescription,
          )
        } else {
          result = await saveFlowChart(flowChartName, flowChartDescription)
        }
      } else {
        throw new Error(t("flow.menu.noSaveMethod"))
      }

      const { toaster } = await import("../../ui/toaster")
      toaster.create({
        title: result.success
          ? t("flow.menu.saveSuccess")
          : t("flow.menu.saveFailed"),
        description:
          result.message ||
          (result.success
            ? t("flow.menu.saveSuccess")
            : t("flow.menu.saveFailed")),
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
        title: t("flow.menu.saveFailed"),
        description: t("flow.menu.networkError"),
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
        title: t("flow.menu.saveAsFailed"),
        description: t("flow.menu.enterFlowchartName"),
        type: "error",
        duration: 3000,
      })
      return
    }

    setIsLoading(true)
    try {
      let result

      // 优先使用模型Store的方法
      if (modelState && createModelFlowchart) {
        await createModelFlowchart({
          name: flowChartName,
          description: flowChartDescription,
        } as any)
        result = { success: true, message: t("flow.menu.saveAsSuccess") }
      } else if (flowState && saveFlowChart) {
        // 另存为总是创建新流程图，不管当前是否有ID
        result = await saveFlowChart(flowChartName, flowChartDescription)
      } else {
        throw new Error(t("flow.menu.noSaveMethod"))
      }

      const { toaster } = await import("../../ui/toaster")
      toaster.create({
        title: result.success
          ? t("flow.menu.saveAsSuccess")
          : t("flow.menu.saveAsFailed"),
        description:
          result.message ||
          (result.success
            ? t("flow.menu.saveAsSuccess")
            : t("flow.menu.saveAsFailed")),
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
        title: t("flow.menu.saveAsFailed"),
        description: t("flow.menu.networkError"),
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
      let result
      let flowchartData

      // 优先使用模型Store的方法
      if (modelState?.getFlowchart) {
        flowchartData = await modelState.getFlowchart(flowChartId)

        // 如果有flow_data，导入到流程图编辑器
        if (
          flowchartData &&
          (flowchartData as any).flow_data &&
          importFlowData
        ) {
          importFlowData((flowchartData as any).flow_data)
        }

        // 设置流程图名称
        if (
          flowchartData &&
          (flowchartData as any).name &&
          flowState?.setCurrentFlowChartName
        ) {
          flowState.setCurrentFlowChartName((flowchartData as any).name)
        }

        result = { success: true, message: t("flow.menu.loadSuccess") }
      } else if (flowState && loadFlowChart) {
        result = await loadFlowChart(flowChartId)
      } else {
        throw new Error(t("flow.menu.noLoadMethod"))
      }

      const { toaster } = await import("../../ui/toaster")
      toaster.create({
        title: result.success
          ? t("flow.menu.loadSuccess")
          : t("flow.menu.loadFailed"),
        description:
          result.message ||
          (result.success
            ? t("flow.menu.loadSuccess")
            : t("flow.menu.loadFailed")),
        type: result.success ? "success" : "error",
        duration: 3000,
      })

      if (result.success) {
        onCloseLoadDialog()
      }
    } catch (error) {
      const { toaster } = await import("../../ui/toaster")
      toaster.create({
        title: t("flow.menu.loadFailed"),
        description: t("flow.menu.networkError"),
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
      let result

      // 优先使用模型Store的方法
      if (modelState && deleteModelFlowchart) {
        await deleteModelFlowchart(flowChartId)
        result = { success: true, message: t("flow.menu.deleteSuccess") }
      } else if (flowState && deleteFlowChart) {
        result = await deleteFlowChart(flowChartId)
      } else {
        throw new Error(t("flow.menu.noDeleteMethod"))
      }

      const { toaster } = await import("../../ui/toaster")
      toaster.create({
        title: result.success
          ? t("flow.menu.deleteSuccess")
          : t("flow.menu.deleteFailed"),
        description:
          result.message ||
          (result.success
            ? t("flow.menu.deleteSuccess")
            : t("flow.menu.deleteFailed")),
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
        title: t("flow.menu.deleteFailed"),
        description: t("flow.menu.networkError"),
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
      // 优先使用模型Store的方法
      if (modelState && getModelFlowcharts) {
        const result = await getModelFlowcharts()
        if (result && Array.isArray(result.data)) {
          setFlowCharts(result.data as unknown as TFlowChart[])
        } else if (Array.isArray(result)) {
          setFlowCharts(result as unknown as TFlowChart[])
        }
      } else if (flowState && getFlowCharts) {
        const result = await getFlowCharts()
        if (result.success && result.data) {
          setFlowCharts(result.data as unknown as TFlowChart[])
        }
      } else {
        // 使用模型状态中的流程图列表
        setFlowCharts(modelFlowcharts as unknown as TFlowChart[])
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
        currentFlowChartId={currentFlowChartId || null}
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
        flowCharts={flowCharts as any[]}
        isLoading={isLoading}
        onLoad={handleLoad}
        onDelete={handleDelete}
      />
    </>
  )
}

export default BaseDialogManager
