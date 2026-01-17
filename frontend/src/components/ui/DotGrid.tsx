import { Box } from "@chakra-ui/react"
import type React from "react"
import { useEffect, useRef } from "react"

interface DotGridProps {
  dotSize?: number
  gap?: number
  baseColor?: string
  className?: string
  style?: React.CSSProperties
}

export const DotGrid: React.FC<DotGridProps> = ({
  dotSize = 2,
  gap = 32,
  baseColor = "#5227FF",
  className = "",
  style = {},
}) => {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const createDots = () => {
      const containerRect = container.getBoundingClientRect()
      const cols = Math.floor(containerRect.width / gap)
      const rows = Math.floor(containerRect.height / gap)

      // Clear existing dots
      container.innerHTML = ""

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x = col * gap + gap / 2
          const y = row * gap + gap / 2

          const dotElement = document.createElement("div")
          dotElement.style.position = "absolute"
          dotElement.style.width = `${dotSize}px`
          dotElement.style.height = `${dotSize}px`
          dotElement.style.backgroundColor = baseColor
          dotElement.style.borderRadius = "50%"
          dotElement.style.left = `${x - dotSize / 2}px`
          dotElement.style.top = `${y - dotSize / 2}px`
          dotElement.style.pointerEvents = "none"

          container.appendChild(dotElement)
        }
      }
    }

    const handleResize = () => {
      createDots()
    }

    // Initialize
    createDots()

    // Event listeners
    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [dotSize, gap, baseColor])

  return (
    <Box
      ref={containerRef}
      position="absolute"
      top={0}
      left={0}
      right={0}
      bottom={0}
      overflow="hidden"
      pointerEvents="none"
      className={className}
      style={style}
    />
  )
}

export default DotGrid
