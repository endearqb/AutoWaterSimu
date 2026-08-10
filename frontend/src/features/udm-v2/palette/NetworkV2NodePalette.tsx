import { Box, Text } from "@chakra-ui/react"

import NodePalette, {
  type NodeOption,
} from "@/components/Flow/toolbar/NodePalette"
import { formatUdmV2Message, useUdmV2Messages } from "../i18n"

export const NETWORK_V2_NODE_DRAG_MIME =
  "application/x-autowatersimu-udm-v2-node"

type NetworkV2NodePaletteProps = {
  onInsertClarifier?: () => void
}

export function NetworkV2NodePalette({
  onInsertClarifier,
}: NetworkV2NodePaletteProps) {
  const text = useUdmV2Messages()
  const nodeTypes: NodeOption[] = [
    {
      type: "boundary_source",
      label: text.labels.influent,
      ariaLabel: formatUdmV2Message(text.addNode, {
        label: text.labels.influent,
      }),
      tint: "input",
    },
    {
      type: "boundary_sink",
      label: text.labels.effluent,
      ariaLabel: formatUdmV2Message(text.addNode, {
        label: text.labels.effluent,
      }),
      tint: "output",
    },
    {
      type: "udm_reactor",
      label: text.labels.udmNode,
      ariaLabel: formatUdmV2Message(text.addNode, {
        label: text.labels.udmNode,
      }),
      tint: "udm",
    },
    {
      type: "secondary_clarifier_10_layer",
      label: text.labels.secondaryClarifier,
      ariaLabel: formatUdmV2Message(text.addNode, {
        label: text.labels.secondaryClarifier,
      }),
      tint: "asm1",
    },
    {
      type: "splitter",
      label: text.labels.splitter,
      ariaLabel: formatUdmV2Message(text.addNode, {
        label: text.labels.splitter,
      }),
      tint: "default",
    },
    {
      type: "controller",
      label: text.labels.controller,
      ariaLabel: formatUdmV2Message(text.addNode, {
        label: text.labels.controller,
      }),
      tint: "traffic",
    },
  ]

  return (
    <Box px={2} py={1}>
      <Text fontSize="xs" fontWeight="700" color="fg.muted" mb={1}>
        {text.nodes}
      </Text>
      <NodePalette
        nodeTypes={nodeTypes}
        dragEffect="copy"
        dragMime={NETWORK_V2_NODE_DRAG_MIME}
        columns={2}
        density="compact"
        onNodeClick={(node) => {
          if (node.type === "secondary_clarifier_10_layer") {
            onInsertClarifier?.()
          }
        }}
      />
    </Box>
  )
}
