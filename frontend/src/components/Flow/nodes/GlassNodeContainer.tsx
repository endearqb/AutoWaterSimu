import { Box, type BoxProps } from "@chakra-ui/react"
import { forwardRef } from "react"
import { type GlassTint, getGlassNodeStyles } from "./utils/glass"

export interface GlassNodeContainerProps extends BoxProps {
  tint: GlassTint
  selected?: boolean
  hovered?: boolean
}

const GlassNodeContainer = forwardRef<HTMLDivElement, GlassNodeContainerProps>(
  ({ tint, selected, hovered, children, ...rest }, ref) => {
    const baseStyles = getGlassNodeStyles({ tint, selected, hovered })

    return (
      <Box
        ref={ref}
        data-glass-node
        data-glass-tint={tint}
        {...baseStyles}
        {...rest}
      >
        {children}
      </Box>
    )
  },
)

GlassNodeContainer.displayName = "GlassNodeContainer"

export default GlassNodeContainer
