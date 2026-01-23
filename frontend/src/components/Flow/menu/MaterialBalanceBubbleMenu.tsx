import { HStack, Text, VStack } from "@chakra-ui/react"
import type React from "react"
import { MaterialBalanceService } from "../../../client/sdk.gen"
import type { MaterialBalanceJobPublic } from "../../../client/types.gen"
import { useI18n } from "../../../i18n"
import useFlowStore from "../../../stores/flowStore"
import { useMaterialBalanceStore } from "../../../stores/materialBalanceStore"
import BaseBubbleMenu from "./BaseBubbleMenu"
import BaseDialogManager from "./BaseDialogManager"
import BaseLoadCalculationDataDialog from "./BaseLoadCalculationDataDialog"

/**
 * MaterialBalance模型的BubbleMenu组件
 * 使用通用BaseBubbleMenu和MaterialBalanceStore
 */
interface MaterialBalanceBubbleMenuProps {
  onExport?: () => string
  onImport?: (files: File[]) => void
  onNewFlowChart?: () => void
  store?: () => any
  flowStore?: () => any
}

const MaterialBalanceBubbleMenu: React.FC<MaterialBalanceBubbleMenuProps> = ({
  onExport,
  onImport,
  onNewFlowChart,
  // store, // 暂时未使用
  flowStore,
}) => {
  const { t } = useI18n()
  // 自定义加载任务数据的处理函数
  const handleLoadJobData = async (
    job: MaterialBalanceJobPublic,
    flowStore?: any,
    modelStore?: any,
  ) => {
    const jobId = job.job_id
    const jobName = job.job_name

    // 获取输入数据和结果数据
    const jobDataResponse = await MaterialBalanceService.getJobInputData({
      jobId: jobId,
    })

    // 现在input_data直接是原始flowchart数据
    const flowchartData = jobDataResponse.input_data as any

    // 验证数据完整性
    if (!flowchartData) {
      throw new Error(t("flow.simulation.validation.inputEmpty"))
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
        console.error(t("flow.simulation.loadResultFailed"), error)
        // 不阻止主要的数据加载流程
      }
    }
  }

  // 自定义结果摘要渲染函数
  const renderResultSummary = (summary: any) => {
    return (
      <VStack align="start" gap={2} fontSize="sm">
        <HStack>
          <Text fontWeight="bold">{t("flow.simulation.totalTime")}</Text>
          <Text>
            {summary.total_time || t("common.notAvailable")}{" "}
            {t("flow.simulation.unit.hours")}
          </Text>
        </HStack>
        <HStack>
          <Text fontWeight="bold">{t("flow.simulation.totalSteps")}</Text>
          <Text>{summary.total_steps}</Text>
        </HStack>
        <HStack>
          <Text fontWeight="bold">{t("flow.simulation.calculationTime")}</Text>
          <Text>
            {summary.calculation_time_seconds?.toFixed(2)}{" "}
            {t("flow.simulation.unit.seconds")}
          </Text>
        </HStack>
        <HStack>
          <Text fontWeight="bold">{t("flow.simulation.convergenceStatus")}</Text>
          <Text>{summary.convergence_status}</Text>
        </HStack>
        {summary.final_mass_balance_error && (
          <HStack>
            <Text fontWeight="bold">
              {t("flow.simulation.finalMassBalanceError")}
            </Text>
            <Text>{summary.final_mass_balance_error.toExponential(2)}</Text>
          </HStack>
        )}
        <HStack>
          <Text fontWeight="bold">{t("flow.simulation.finalTotalVolume")}</Text>
          <Text>{summary.final_total_volume?.toFixed(2)}</Text>
        </HStack>
      </VStack>
    )
  }

  return (
    <BaseBubbleMenu
      flowStore={flowStore || useFlowStore}
      modelStore={useMaterialBalanceStore}
      onExport={onExport}
      onImport={onImport}
      onNewFlowChart={onNewFlowChart}
      config={{
        enableOnlineSave: true, // 启用在线保存功能
        enableOnlineLoad: true, // 已实现flowchart API，启用在线加载
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
          pending: t("flow.jobStatus.pending"),
          running: t("flow.jobStatus.running"),
          success: t("flow.jobStatus.success"),
          failed: t("flow.jobStatus.failed"),
          cancelled: t("flow.jobStatus.cancelled"),
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

export default MaterialBalanceBubbleMenu
