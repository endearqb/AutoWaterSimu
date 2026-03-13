import { Box, Tabs } from "@chakra-ui/react"
import type { Edge } from "@xyflow/react"
import { useMemo, useState } from "react"

import { useI18n } from "../../../i18n"
import { buildUdmDisplayMapsFromNodes } from "../../../utils/udmRuntimeDisplay"
import AIReportPanel from "./panels/AIReportPanel"
import DataQualityPanel from "./panels/DataQualityPanel"
import EdgeConcentrationPanel from "./panels/EdgeConcentrationPanel"
import SpatialProfilePanel from "./panels/SpatialProfilePanel"
import type { UDMResultData } from "./udm-analysis"

interface EdgeParameterConfig {
  a: number
  b: number
}

interface UDMAnalyzerProps {
  resultData: UDMResultData
  edges?: Edge[]
  nodes?: Array<{ type?: string; data?: Record<string, unknown> }>
  edgeParameterConfigs?: Record<string, Record<string, EdgeParameterConfig>>
}

const UDMAnalyzer = ({
  resultData,
  edges = [],
  nodes = [],
  edgeParameterConfigs = {},
}: UDMAnalyzerProps) => {
  const [activeTab, setActiveTab] = useState(0)
  const { t } = useI18n()
  const udmDisplayMaps = useMemo(
    () =>
      buildUdmDisplayMapsFromNodes(
        nodes.map((node) => ({
          type: node.type,
          data: node.data ?? {},
        })),
      ),
    [nodes],
  )

  return (
    <Box w="full" h="full" p={4} overflowY="auto">
      <Tabs.Root
        value={`tab-${activeTab}`}
        onValueChange={(details) =>
          setActiveTab(Number.parseInt(details.value.replace("tab-", "")))
        }
        variant="enclosed"
      >
        <Tabs.List>
          <Tabs.Trigger value="tab-0">
            {t("flow.analysis.tabs.t95SteadyCheck")}
          </Tabs.Trigger>
          <Tabs.Trigger value="tab-1">
            {t("flow.analysis.tabs.spatialProfile")}
          </Tabs.Trigger>
          <Tabs.Trigger value="tab-2">
            {t("flow.analysis.tabs.edgeConcentration")}
          </Tabs.Trigger>
          <Tabs.Trigger value="tab-3">
            {t("flow.analysis.tabs.aiReport")}
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="tab-0">
          <DataQualityPanel resultData={resultData} modelType="udm" />
        </Tabs.Content>

        <Tabs.Content value="tab-1">
          <SpatialProfilePanel
            resultData={resultData}
            modelType="udm"
            udmVariableLabels={udmDisplayMaps.variableLabels}
          />
        </Tabs.Content>

        <Tabs.Content value="tab-2">
          <EdgeConcentrationPanel
            resultData={resultData}
            edges={edges}
            edgeParameterConfigs={edgeParameterConfigs}
            modelType="udm"
            udmVariableLabels={udmDisplayMaps.variableLabels}
          />
        </Tabs.Content>

        <Tabs.Content value="tab-3">
          <AIReportPanel resultData={resultData} modelType="udm" />
        </Tabs.Content>
      </Tabs.Root>
    </Box>
  )
}

export default UDMAnalyzer
