import { Box, IconButton } from "@chakra-ui/react"
import type { ReactNode } from "react"
import { FiChevronLeft, FiChevronRight } from "react-icons/fi"
import { getGlassPanelStyles } from "../nodes/utils/glass"

export const INSPECTOR_PANEL_WIDTH = 360

interface BaseInspectorContainerProps {
  isOpen: boolean
  onToggle: () => void
  children: ReactNode
  title?: string
  width?: number
  topOffset?: number
  bottomOffset?: number
}

const BaseInspectorContainer = ({
  isOpen,
  onToggle,
  children,
  width = INSPECTOR_PANEL_WIDTH,
  topOffset = 8,
  bottomOffset = 8,
}: BaseInspectorContainerProps) => {
  const panelGlass = getGlassPanelStyles()
  const { transition: _panelTransition, ...panelSurface } = panelGlass

  const height = `calc(100vh - ${topOffset + bottomOffset}px)`

  return (
    <Box
      position="fixed"
      right={`${topOffset}px`}
      top={`${topOffset}px`}
      h={height}
      w={`${width}px`}
      transform={isOpen ? "translateX(0)" : "translateX(110%)"}
      transition="transform 0.18s ease, box-shadow 0.2s ease"
      zIndex={1000}
      {...panelSurface}
      backgroundColor="rgba(255,255,255,0.45)"
      backdropFilter="blur(2px)"
    >
      <IconButton
        position="absolute"
        left="-40px"
        top="50%"
        transform="translateY(-50%)"
        size="sm"
        variant="ghost"
        aria-label={isOpen ? "折叠检查器" : "展开检查器"}
        onClick={onToggle}
        borderRadius="full"
        bg="rgba(255,255,255,0.7)"
        _hover={{ bg: "rgba(255,255,255,0.9)" }}
        borderWidth="1px"
        borderColor="rgba(255,255,255,0.85)"
        boxShadow="0 2px 6px rgba(0,0,0,0.18)"
        backdropFilter="blur(8px)"
        zIndex={1001}
      >
        {isOpen ? <FiChevronRight /> : <FiChevronLeft />}
      </IconButton>

      <Box
        h="100%"
        overflowY="auto"
        p={4}
        bg="rgba(255,255,255,0.08)"
        borderTop="1px solid rgba(255,255,255,0.15)"
        backdropFilter="blur(4px)"
      >
        {children}
      </Box>
    </Box>
  )
}

export default BaseInspectorContainer
export type { BaseInspectorContainerProps }
