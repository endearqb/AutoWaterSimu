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
}

interface NodePaletteProps {
  nodeTypes: NodeOption[]
}

const NodePalette = ({ nodeTypes }: NodePaletteProps) => {
  const handleDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData("application/reactflow/type", nodeType)
    event.dataTransfer.effectAllowed = "move"
  }

  return (
    <VStack gap={3} align="stretch">
      {nodeTypes.map(({ type, label }) => {
        const tint: GlassTint = resolveTintFromNodeType(type)
        const accentColor = getAccentColor(tint)
        const baseStyles = getGlassNodeStyles({ tint })
        const hoverStyles = getGlassNodeStyles({ tint, hovered: true })

        return (
          <Box
            key={type}
            draggable
            onDragStart={(event) => handleDragStart(event, type)}
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
