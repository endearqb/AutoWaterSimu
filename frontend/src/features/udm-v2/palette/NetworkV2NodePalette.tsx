import { Box, Button, HStack, Text, VStack } from "@chakra-ui/react"
import {
  FlaskConical,
  GitBranch,
  Layers3,
  RadioTower,
  SquareArrowOutUpRight,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { DragEvent } from "react"

import {
  NETWORK_V2_NODE_KIND_OPTIONS,
  type NetworkV2NodeKind,
} from "../nodes/nodeTypes"

export const NETWORK_V2_NODE_DRAG_MIME =
  "application/x-autowatersimu-udm-v2-node"

const icons: Record<NetworkV2NodeKind, LucideIcon> = {
  boundary: SquareArrowOutUpRight,
  udm_reactor: FlaskConical,
  secondary_clarifier_10_layer: Layers3,
  splitter: GitBranch,
  controller: RadioTower,
}

type NetworkV2NodePaletteProps = {
  onDragStart?: (kind: NetworkV2NodeKind) => void
}

export function NetworkV2NodePalette({
  onDragStart,
}: NetworkV2NodePaletteProps) {
  const handleDragStart =
    (kind: NetworkV2NodeKind) => (event: DragEvent<HTMLButtonElement>) => {
      event.dataTransfer.setData(NETWORK_V2_NODE_DRAG_MIME, kind)
      event.dataTransfer.effectAllowed = "copy"
      onDragStart?.(kind)
    }

  return (
    <Box
      position="absolute"
      top="64px"
      left={3}
      zIndex={5}
      pointerEvents="all"
      bg="white"
      borderWidth="1px"
      borderColor="border"
      borderRadius="6px"
      boxShadow="0 8px 20px rgba(15, 23, 42, 0.12)"
      p={2}
      w="220px"
    >
      <Text fontSize="xs" fontWeight="700" color="fg.muted" mb={2}>
        Nodes
      </Text>
      <VStack gap={1} align="stretch">
        {NETWORK_V2_NODE_KIND_OPTIONS.map((option) => {
          const Icon = icons[option.kind]
          return (
            <Button
              key={option.kind}
              draggable
              onDragStart={handleDragStart(option.kind)}
              variant="ghost"
              size="sm"
              justifyContent="flex-start"
              title={option.description}
              aria-label={`Add ${option.label} node`}
            >
              <HStack gap={2} minW={0}>
                <Icon size={15} />
                <Text truncate>{option.shortLabel}</Text>
              </HStack>
            </Button>
          )
        })}
      </VStack>
    </Box>
  )
}
