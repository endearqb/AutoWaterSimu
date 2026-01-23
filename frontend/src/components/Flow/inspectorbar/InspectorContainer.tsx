import { Box, Heading, Text } from "@chakra-ui/react"
import { useI18n } from "../../../i18n"
import useFlowStore from "../../../stores/flowStore"
import type { RFState } from "../../../stores/flowStore"
import PropertyPanel from "./PropertyPanel"

interface InspectorContainerProps {
  store?: () => RFState // 可选的自定义store
}

function InspectorContainer({}: InspectorContainerProps = {}) {
  const { t } = useI18n()
  const { selectedNode, selectedEdge } = useFlowStore()

  const renderContent = () => {
    if (!selectedNode && !selectedEdge) {
      return (
        <Box>
          <Heading size="md" mb={4}>
            {t("flow.inspector.title")}
          </Heading>
          <Text color="gray.500">{t("flow.inspector.emptyState")}</Text>
        </Box>
      )
    }

    if (selectedNode) {
      return (
        <Box>
          <PropertyPanel isNode={true} />
        </Box>
      )
    }

    if (selectedEdge) {
      return (
        <Box>
          <Heading size="md" mb={4}>
            {t("flow.inspector.edgeTitle")}
          </Heading>
          <PropertyPanel isNode={false} />
        </Box>
      )
    }

    return null
  }

  return renderContent()
}

export default InspectorContainer
