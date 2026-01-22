import { Box, Tabs } from "@chakra-ui/react"
import type { Edge } from "@xyflow/react"
import { useState } from "react"

import type { ASM3ResultData } from "./asm3-analysis"
import { useI18n } from "../../../i18n"
import AIReportPanel from "./panels/AIReportPanel"
import DataQualityPanel from "./panels/DataQualityPanel"
import EdgeConcentrationPanel from "./panels/EdgeConcentrationPanel"
import SpatialProfilePanel from "./panels/SpatialProfilePanel"

interface EdgeParameterConfig {
  a: number
  b: number
}

interface ASM3AnalyzerProps {
  /** ASM3计算结果数据 */
  resultData: ASM3ResultData
  /** 连接线数据 */
  edges?: Edge[]
  /** 连接线参数配置 */
  edgeParameterConfigs?: Record<string, Record<string, EdgeParameterConfig>>
}

/**
 * ASM3计算结果分析器组件
 * 用于分析和可视化ASM3模型的计算结果
 */
const ASM3Analyzer = ({
  resultData,
  edges = [],
  edgeParameterConfigs = {},
}: ASM3AnalyzerProps) => {
  const [activeTab, setActiveTab] = useState(0)
  const { t } = useI18n()

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
          <Tabs.Trigger value="tab-3">{t("flow.analysis.tabs.aiReport")}</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="tab-0">
          <DataQualityPanel resultData={resultData} modelType="asm3" />
        </Tabs.Content>

        <Tabs.Content value="tab-1">
          <SpatialProfilePanel resultData={resultData} modelType="asm3" />
        </Tabs.Content>

        <Tabs.Content value="tab-2">
          <EdgeConcentrationPanel
            resultData={resultData}
            edges={edges}
            edgeParameterConfigs={edgeParameterConfigs}
            modelType="asm3"
          />
        </Tabs.Content>

        <Tabs.Content value="tab-3">
          <AIReportPanel resultData={resultData} modelType="asm3" />
        </Tabs.Content>
      </Tabs.Root>
    </Box>
  )
}

export default ASM3Analyzer
