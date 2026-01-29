import { Box, Text, VStack } from "@chakra-ui/react"
import type React from "react"
import {
  type GlassTint,
  getAccentColor,
  getGlassNodeStyles,
  resolveTintFromNodeType,
} from "../nodes/utils/glass"

interface NodeOption {
  type: string
  label: string
  helpTitle?: string
  helpBody?: string
}

interface NodePaletteProps {
  nodeTypes: NodeOption[]
  onNodeClick?: (node: NodeOption, event: React.MouseEvent) => void
}

const NodePalette = ({ nodeTypes, onNodeClick }: NodePaletteProps) => {
  const handleDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData("application/reactflow/type", nodeType)
    event.dataTransfer.effectAllowed = "move"
  }

  return (
    <VStack gap={3} align="stretch">
      {nodeTypes.map((node) => {
        const { type, label } = node
        const tint: GlassTint = resolveTintFromNodeType(type)
        const accentColor = getAccentColor(tint)
        const baseStyles = getGlassNodeStyles({ tint })
        const hoverStyles = getGlassNodeStyles({ tint, hovered: true })

        return (
          <Box
            key={type}
            draggable
            onDragStart={(event) => handleDragStart(event, type)}
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
