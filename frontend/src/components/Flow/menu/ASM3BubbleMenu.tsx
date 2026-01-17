import { HStack, Text, VStack } from "@chakra-ui/react"
import type React from "react"
import type { ASM3JobPublic } from "../../../client/types.gen"
import { asm3Service } from "../../../services/asm3Service"
import { useASM3FlowStore } from "../../../stores/asm3FlowStore"
import { useASM3Store } from "../../../stores/asm3Store"
import BaseBubbleMenu from "./BaseBubbleMenu"
import BaseDialogManager from "./BaseDialogManager"
import BaseLoadCalculationDataDialog from "./BaseLoadCalculationDataDialog"

/**
 * ASM3模型的BubbleMenu组件
 * 使用通用BaseBubbleMenu和ASM3Store
 */
interface ASM3BubbleMenuProps {
  onExport?: () => string
  onImport?: (files: File[]) => void
  onNewFlowChart?: () => void
}

const ASM3BubbleMenu: React.FC<ASM3BubbleMenuProps> = ({
  onExport,
  onImport,
  onNewFlowChart,
}) => {
  // 自定义加载任务数据的处理函数
  const handleLoadJobData = async (
    job: ASM3JobPublic,
    flowStore?: any,
    modelStore?: any,
  ) => {
    const jobId = job.job_id
    const jobName = job.job_name

    // 获取输入数据和结果数据
    const jobDataResponse = await asm3Service.getJobInputData(jobId)

    // 现在input_data直接是原始flowchart数据
    const flowchartData = jobDataResponse.input_data as any

    // 验证数据完整性
    if (!flowchartData) {
      throw new Error("输入数据为空")
    }

    console.log("加载数据:", {
      nodesCount: flowchartData.nodes?.length || 0,
      edgesCount: flowchartData.edges?.length || 0,
      hasCustomParameters: !!flowchartData.customParameters,
      hasEdgeParameterConfigs: !!flowchartData.edgeParameterConfigs,
    })

    if (flowStore) {
      // 使用flowStore的importFlowData方法来正确导入数据
      const importResult = flowStore.importFlowData?.(flowchartData)
      if (!importResult?.success) {
        console.warn(
          "使用importFlowData导入失败，回退到手动设置:",
          importResult?.message,
        )

        // 回退到手动设置方式
        // 先恢复自定义参数（必须在设置节点和边之前）
        if (
          flowchartData.customParameters &&
          Array.isArray(flowchartData.customParameters)
        ) {
          // 清空现有的自定义参数
          const currentParams = [...(flowStore.customParameters || [])]
          currentParams.forEach((param: any) => {
            flowStore.removeCustomParameter?.(param.name)
          })

          // 添加新的自定义参数
          flowchartData.customParameters.forEach((param: any) => {
            flowStore.addCustomParameter?.(param.name, param.description)
          })
        }

        // 然后设置节点和边（这样节点和边会包含正确的自定义参数值）
        flowStore.setNodes?.(flowchartData.nodes || [])
        flowStore.setEdges?.(flowchartData.edges || [])

        // 最后恢复边参数配置
        if (flowchartData.edgeParameterConfigs) {
          Object.entries(flowchartData.edgeParameterConfigs).forEach(
            ([edgeId, configs]: [string, any]) => {
              Object.entries(configs).forEach(
                ([paramName, config]: [string, any]) => {
                  flowStore.updateEdgeParameterConfig?.(
                    edgeId,
                    paramName,
                    config,
                  )
                },
              )
            },
          )
        }
      }
    }

    // 设置流程图名称和当前任务ID
    if (flowStore) {
      flowStore.setCurrentFlowChartName?.(jobName)
      flowStore.setCurrentJobId?.(jobId)
    }

    // 如果任务已完成，加载计算结果数据
    if (job.status === "success" && modelStore) {
      try {
        // 并行加载计算结果摘要和最终值数据
        await Promise.all([
          modelStore.getResultSummary?.(jobId),
          modelStore.getFinalValues?.(jobId),
          modelStore.getCalculationStatus?.(jobId),
        ])
      } catch (error) {
        console.error("加载计算结果失败:", error)
      }
    }
  }

  // 自定义结果摘要渲染函数
  const renderResultSummary = (summary: any) => {
    return (
      <VStack align="start" gap={2} fontSize="sm">
        <HStack>
          <Text fontWeight="bold">总模拟时间:</Text>
          <Text>{summary.total_time || "N/A"} 小时</Text>
        </HStack>
        <HStack>
          <Text fontWeight="bold">总采样数:</Text>
          <Text>{summary.total_steps}</Text>
        </HStack>
        <HStack>
          <Text fontWeight="bold">计算耗时:</Text>
          <Text>{summary.calculation_time_seconds?.toFixed(2)} 秒</Text>
        </HStack>
        <HStack>
          <Text fontWeight="bold">收敛状态:</Text>
          <Text>{summary.convergence_status}</Text>
        </HStack>
        {summary.final_mass_balance_error && (
          <HStack>
            <Text fontWeight="bold">最终质量平衡误差:</Text>
            <Text>{summary.final_mass_balance_error.toExponential(2)}</Text>
          </HStack>
        )}
        <HStack>
          <Text fontWeight="bold">最终总体积:</Text>
          <Text>{summary.final_total_volume?.toFixed(2)}</Text>
        </HStack>
      </VStack>
    )
  }

  return (
    <BaseBubbleMenu
      flowStore={useASM3FlowStore}
      modelStore={useASM3Store}
      onExport={onExport}
      onImport={onImport}
      onNewFlowChart={onNewFlowChart}
      config={{
        enableOnlineSave: true, // ASM3模型支持在线保存
        enableOnlineLoad: true, // ASM3模型支持在线加载
        enableLoadCalculationData: true,
        enableLocalImportExport: true,
      }}
      DialogManagerComponent={BaseDialogManager}
      LoadCalculationDataDialogComponent={BaseLoadCalculationDataDialog}
      loadCalculationDataDialogConfig={{
        pageSize: 10,
        jobNameField: "job_name",
        jobIdField: "job_id",
        jobStatusField: "status",
        jobCreatedAtField: "created_at",
        jobCompletedAtField: "completed_at",
        statusTextMap: {
          pending: "等待中",
          running: "计算中",
          success: "已完成",
          failed: "失败",
          cancelled: "已取消",
        },
        statusColorMap: {
          pending: "yellow",
          running: "blue",
          success: "green",
          failed: "red",
          cancelled: "gray",
        },
        onLoadJobData: handleLoadJobData,
        renderResultSummary: renderResultSummary,
      }}
    />
  )
}

export default ASM3BubbleMenu
