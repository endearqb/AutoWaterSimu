import { HStack, Text, VStack } from "@chakra-ui/react"
import { useNavigate } from "@tanstack/react-router"
import type React from "react"
import { useState } from "react"
import { FiEdit3, FiGitMerge } from "react-icons/fi"

import type {
  MaterialBalanceResultSummary,
  UDMJobPublic,
} from "../../../client/types.gen"
import type { EdgeParameterConfig } from "../../../config/modelConfigs"
import { useI18n } from "../../../i18n"
import { udmService } from "../../../services/udmService"
import { useUDMFlowStore } from "../../../stores/udmFlowStore"
import { useUDMStore } from "../../../stores/udmStore"
import type { UDMNodeData } from "../../../types/udmNodeData"
import HybridUDMSetupDialog from "../../UDM/HybridUDMSetupDialog"
import UDMModelEditorDialog from "../../UDM/UDMModelEditorDialog"
import BaseBubbleMenu from "./BaseBubbleMenu"
import BaseDialogManager from "./BaseDialogManager"
import BaseLoadCalculationDataDialog from "./BaseLoadCalculationDataDialog"

interface UDMBubbleMenuProps {
  onExport?: () => string
  onImport?: (files: File[]) => void
  onNewFlowChart?: () => void
}

const UDMBubbleMenu: React.FC<UDMBubbleMenuProps> = ({
  onExport,
  onImport,
  onNewFlowChart,
}) => {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [isModelEditorOpen, setIsModelEditorOpen] = useState(false)
  const [isHybridSetupOpen, setIsHybridSetupOpen] = useState(false)

  const selectedNode = useUDMFlowStore((state) => state.selectedNode)
  const flowEdges = useUDMFlowStore((state) => state.edges)
  const flowNodes = useUDMFlowStore((state) => state.nodes)
  const udmNodeData =
    selectedNode?.type === "udm"
      ? (selectedNode.data as UDMNodeData)
      : undefined
  const selectedModelId = udmNodeData?.udmModelId || udmNodeData?.udmModel?.id

  const handleLoadJobData = async (
    job: UDMJobPublic,
    flowStore?: {
      importFlowData?: (data: Record<string, unknown>) => {
        success: boolean
        message?: string
      }
      customParameters?: Array<{ name: string }>
      removeCustomParameter?: (name: string) => void
      addCustomParameter?: (name: string, description?: string) => void
      setNodes?: (nodes: unknown[]) => void
      setEdges?: (edges: unknown[]) => void
      updateEdgeParameterConfig?: (
        edgeId: string,
        paramName: string,
        config: EdgeParameterConfig,
      ) => void
      setCurrentFlowChartName?: (name: string) => void
      setCurrentJobId?: (jobId: string) => void
    },
    modelStore?: {
      getResultSummary?: (jobId: string) => Promise<unknown>
      getFinalValues?: (jobId: string) => Promise<unknown>
      getCalculationStatus?: (jobId: string) => Promise<unknown>
    },
  ) => {
    const jobId = job.job_id
    const jobName = job.job_name

    const jobDataResponse = await udmService.getJobInputData(jobId)
    const flowchartData = jobDataResponse.input_data as
      | {
          nodes?: unknown[]
          edges?: unknown[]
          customParameters?: Array<{ name: string; description?: string }>
          edgeParameterConfigs?: Record<
            string,
            Record<string, EdgeParameterConfig>
          >
        }
      | undefined

    if (!flowchartData) {
      throw new Error(t("flow.simulation.validation.inputEmpty"))
    }

    console.log("Load UDM job data:", {
      nodesCount: flowchartData.nodes?.length || 0,
      edgesCount: flowchartData.edges?.length || 0,
      hasCustomParameters: !!flowchartData.customParameters,
      hasEdgeParameterConfigs: !!flowchartData.edgeParameterConfigs,
    })

    if (flowStore) {
      const importResult = flowStore.importFlowData?.(flowchartData)
      if (!importResult?.success) {
        console.warn(
          "importFlowData failed, fallback to manual assignment:",
          importResult?.message,
        )

        if (
          flowchartData.customParameters &&
          Array.isArray(flowchartData.customParameters)
        ) {
          const currentParams = [...(flowStore.customParameters || [])]
          currentParams.forEach((param) => {
            flowStore.removeCustomParameter?.(param.name)
          })

          flowchartData.customParameters.forEach((param) => {
            flowStore.addCustomParameter?.(param.name, param.description)
          })
        }

        flowStore.setNodes?.(flowchartData.nodes || [])
        flowStore.setEdges?.(flowchartData.edges || [])

        if (flowchartData.edgeParameterConfigs) {
          Object.entries(flowchartData.edgeParameterConfigs).forEach(
            ([edgeId, configs]: [
              string,
              Record<string, EdgeParameterConfig>,
            ]) => {
              Object.entries(configs).forEach(
                ([paramName, config]: [string, EdgeParameterConfig]) => {
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

    if (flowStore) {
      flowStore.setCurrentFlowChartName?.(jobName)
      flowStore.setCurrentJobId?.(jobId)
    }

    if (job.status === "success" && modelStore) {
      try {
        await Promise.all([
          modelStore.getResultSummary?.(jobId),
          modelStore.getFinalValues?.(jobId),
          modelStore.getCalculationStatus?.(jobId),
        ])
      } catch (error) {
        console.error(t("flow.simulation.loadResultFailed"), error)
      }
    }
  }

  const renderResultSummary = (summary: MaterialBalanceResultSummary) => {
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
          <Text fontWeight="bold">
            {t("flow.simulation.convergenceStatus")}
          </Text>
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
    <>
      <BaseBubbleMenu
        flowStore={useUDMFlowStore}
        modelStore={useUDMStore}
        onExport={onExport}
        onImport={onImport}
        onNewFlowChart={onNewFlowChart}
        config={{
          enableOnlineSave: true,
          enableOnlineLoad: true,
          enableLoadCalculationData: true,
          enableLocalImportExport: true,
        }}
        extraMenuItems={[
          {
            key: "udm-hybrid-setup",
            label: t("flow.hybridSetup.title"),
            icon: <FiGitMerge />,
            onClick: () => setIsHybridSetupOpen(true),
          },
          {
            key: "udm-model-editor",
            label: t("flow.udmEditor.actions.openModelEditor"),
            icon: <FiEdit3 />,
            onClick: () => setIsModelEditorOpen(true),
          },
        ]}
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
          renderResultSummary,
        }}
      />
      <UDMModelEditorDialog
        isOpen={isModelEditorOpen}
        onClose={() => setIsModelEditorOpen(false)}
        initialModelId={selectedModelId}
      />
      <HybridUDMSetupDialog
        isOpen={isHybridSetupOpen}
        onClose={() => setIsHybridSetupOpen(false)}
        flowEdges={flowEdges}
        flowNodes={flowNodes}
        onOpenHybridPage={() => {
          setIsHybridSetupOpen(false)
          navigate({ to: "/hybrid" })
        }}
      />
    </>
  )
}

export default UDMBubbleMenu
