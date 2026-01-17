"use client"

import { Tooltip as ChakraTooltip } from "@chakra-ui/react"
import * as React from "react"

export interface TooltipProps {
  children: React.ReactNode
  content: React.ReactNode
  showArrow?: boolean
  placement?: string
  openDelay?: number
  closeDelay?: number
}

export const Tooltip = React.forwardRef<HTMLDivElement, TooltipProps>(
  function Tooltip(props, _ref) {
    const { children, content, showArrow, placement, openDelay, closeDelay } =
      props

    return (
      <ChakraTooltip.Root
        openDelay={openDelay}
        closeDelay={closeDelay}
        positioning={{ placement: placement as any }}
      >
        <ChakraTooltip.Trigger asChild>{children}</ChakraTooltip.Trigger>
        <ChakraTooltip.Positioner>
          <ChakraTooltip.Content>
            {showArrow && <ChakraTooltip.Arrow />}
            {content}
          </ChakraTooltip.Content>
        </ChakraTooltip.Positioner>
      </ChakraTooltip.Root>
    )
  },
)
