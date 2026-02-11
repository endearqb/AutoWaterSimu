import { Card, Text, VStack } from "@chakra-ui/react"
import type React from "react"

import { useI18n } from "../../../../i18n"
import type { ASM1ResultData } from "../asm1-analysis"
import type { UDMResultData } from "../udm-analysis"

interface AIReportPanelProps {
  resultData?: ASM1ResultData | UDMResultData
  modelType?: "asm1" | "asm1slim" | "asm3" | "udm"
}

const AIReportPanel: React.FC<AIReportPanelProps> = () => {
  const { t } = useI18n()

  return (
    <Card.Root>
      <Card.Body>
        <VStack align="center" justify="center" h="400px" gap={4}>
          <Text fontSize="xl" color="gray.500" textAlign="center">
            {t("flow.analysis.aiReportTitle")}
          </Text>
          <Text fontSize="lg" color="gray.400" textAlign="center">
            {t("flow.analysis.aiReportComingSoon")}
          </Text>
          <Text fontSize="sm" color="gray.300" textAlign="center">
            {t("flow.analysis.aiReportDescription")}
          </Text>
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}

export default AIReportPanel
