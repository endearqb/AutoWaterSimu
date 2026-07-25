import { Box, Text, VStack } from "@chakra-ui/react"
import type React from "react"
import {
  type GlassTint,
  getAccentColor,
  getGlassNodeStyles,
  resolveTintFromNodeType,
} from "../nodes/utils/glass"

export interface NodeOption {
  type: string
  label: string
  ariaLabel?: string
  dragValue?: string
  tint?: GlassTint
  helpTitle?: string
  helpBody?: string
}

interface NodePaletteProps {
  nodeTypes: NodeOption[]
  dragEffect?: DataTransfer["effectAllowed"]
  dragMime?: string
  onNodeClick?: (node: NodeOption, event: React.MouseEvent) => void
}

const NodePalette = ({
  nodeTypes,
  dragEffect = "move",
  dragMime = "application/reactflow/type",
  onNodeClick,
}: NodePaletteProps) => {
  const handleDragStart = (event: React.DragEvent, node: NodeOption) => {
    event.dataTransfer.setData(dragMime, node.dragValue ?? node.type)
    event.dataTransfer.effectAllowed = dragEffect
  }

  return (
    <VStack gap={3} align="stretch">
      {nodeTypes.map((node) => {
        const { type, label } = node
        const tint: GlassTint = node.tint ?? resolveTintFromNodeType(type)
        const accentColor = getAccentColor(tint)
        const baseStyles = getGlassNodeStyles({ tint })
        const hoverStyles = getGlassNodeStyles({ tint, hovered: true })

        return (
          <Box
            as="button"
            key={type}
            draggable
            aria-label={node.ariaLabel ?? `Add ${label} node`}
            onDragStart={(event) => handleDragStart(event, node)}
            onClick={(event) => onNodeClick?.(node, event)}
            cursor="grab"
            userSelect="none"
            px={4}
            py={3}
            {...baseStyles}
            minW="auto"
            minH="auto"
            transition={`${baseStyles.transition}, transform 0.2s ease`}
            _hover={{
              boxShadow: hoverStyles.boxShadow,
              backdropFilter: hoverStyles.backdropFilter,
              transform: "translateY(-2px)",
            }}
          >
            <Text
              fontSize="sm"
              fontWeight="semibold"
              color={accentColor}
              textAlign="center"
            >
              {label}
            </Text>
          </Box>
        )
      })}
    </VStack>
  )
}

export default NodePalette
