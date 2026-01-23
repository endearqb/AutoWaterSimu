import { Box, Tabs } from "@chakra-ui/react"
import type { Edge } from "@xyflow/react"
import { useState } from "react"
import type {
  ASM1SlimResultData,
  EdgeParameterConfig,
} from "./asm1slim-analysis"
import { useI18n } from "../../../i18n"
import {
  AIReportPanel,
  DataQualityPanel,
  EdgeConcentrationPanel,
  SpatialProfilePanel,
} from "./panels"

interface ASM1SlimAnalyzerProps {
  /** ASM1Slim计算结果数据 */
  resultData: ASM1SlimResultData
  /** 连接线数据 */
  edges?: Edge[]
  /** 连接线参数配置 */
  edgeParameterConfigs?: Record<string, Record<string, EdgeParameterConfig>>
}

/**
 * ASM1Slim计算结果分析器组件
 * 用于分析和可视化ASM1Slim模型的计算结果
 */
const ASM1SlimAnalyzer = ({
  resultData,
  edges = [],
  edgeParameterConfigs = {},
}: ASM1SlimAnalyzerProps) => {
  const [activeTab, setActiveTab] = useState(0)
  const { t } = useI18n()

  return (
    <Box w="full" h="full" p={4} overflowY="auto">
      {/* <Flex justifyContent="space-between" alignItems="center" mb={4}>
        <Heading size="lg">ASM1Slim计算结果分析</Heading>
        {showCloseButton && (
          <Button variant="outline" onClick={onClose}>
            关闭
          </Button>
        )}
      </Flex> */}

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
          <DataQualityPanel resultData={resultData} modelType="asm1slim" />
        </Tabs.Content>

        <Tabs.Content value="tab-1">
          <SpatialProfilePanel resultData={resultData} modelType="asm1slim" />
        </Tabs.Content>

        <Tabs.Content value="tab-2">
          <EdgeConcentrationPanel
            resultData={resultData}
            edges={edges}
            edgeParameterConfigs={edgeParameterConfigs}
            modelType="asm1slim"
          />
        </Tabs.Content>

        <Tabs.Content value="tab-3">
          <AIReportPanel />
        </Tabs.Content>
      </Tabs.Root>
    </Box>
  )
}

export default ASM1SlimAnalyzer
