import { Box, Text } from "@chakra-ui/react"

import NodePalette, {
  type NodeOption,
} from "@/components/Flow/toolbar/NodePalette"
import { useI18n } from "@/i18n"

export const NETWORK_V2_NODE_DRAG_MIME =
  "application/x-autowatersimu-udm-v2-node"

type NetworkV2NodePaletteProps = {
  onInsertClarifier?: () => void
}

export function NetworkV2NodePalette({
  onInsertClarifier,
}: NetworkV2NodePaletteProps) {
  const { t } = useI18n()
  const nodeTypes: NodeOption[] = [
    {
      type: "boundary_source",
      label: t("flow.node.input"),
      ariaLabel: "Add Influent node",
      tint: "input",
    },
    {
      type: "boundary_sink",
      label: t("flow.node.output"),
      ariaLabel: "Add Effluent node",
      tint: "output",
    },
    { type: "udm_reactor", label: t("flow.node.udm"), tint: "udm" },
    {
      type: "secondary_clarifier_10_layer",
      label: "Secondary Clarifier",
      tint: "asm1",
    },
    { type: "splitter", label: "Splitter", tint: "default" },
    { type: "controller", label: "Controller", tint: "traffic" },
  ]

  return (
    <Box p={2} minW="180px">
      <Text fontSize="xs" fontWeight="700" color="fg.muted" mb={2}>
        Nodes
      </Text>
      <NodePalette
        nodeTypes={nodeTypes}
        dragEffect="copy"
        dragMime={NETWORK_V2_NODE_DRAG_MIME}
        onNodeClick={(node) => {
          if (node.type === "secondary_clarifier_10_layer") {
            onInsertClarifier?.()
          }
        }}
      />
    </Box>
  )
}
