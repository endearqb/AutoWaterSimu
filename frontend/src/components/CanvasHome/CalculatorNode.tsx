import { Box } from "@chakra-ui/react"
import type { NodeProps } from "@xyflow/react"
import { useLayoutEffect, useMemo, useRef, useState } from "react"
import AORCalculator from "../calculators/AORCalculator"
import { DWACalculator } from "../calculators/DWACalculator"
import { LSICalculator } from "../calculators/LSICalculator"
import StandardAO from "../calculators/StandardAO"

export type CalculatorNodeData = {
  kind: "lsi" | "standardAO" | "aor" | "dwa"
}

const TARGET_HEIGHT_PX = 500
const BASE_WIDTH_PX = 740
const STABLE_EPS_PX = 1

export function CalculatorNode({ data }: NodeProps<CalculatorNodeData>) {
  const Calculator = useMemo(() => {
    switch (data.kind) {
      case "lsi":
        return LSICalculator
      case "standardAO":
        return StandardAO
      case "aor":
        return AORCalculator
      case "dwa":
        return DWACalculator
    }
  }, [data.kind])

  const contentRef = useRef<HTMLDivElement | null>(null)
  const [scale, setScale] = useState(1)

  useLayoutEffect(() => {
    const el = contentRef.current
    if (!el) return

    let raf = 0
    let frames = 0
    let stable = 0
    let prevW = 0
    let prevH = 0

    const tick = () => {
      frames += 1
      const rawH = el.offsetHeight
      const rawW = el.offsetWidth

      if (rawH && rawW) {
        const dw = Math.abs(rawW - prevW)
        const dh = Math.abs(rawH - prevH)
        if (dw < STABLE_EPS_PX && dh < STABLE_EPS_PX) {
          stable += 1
        } else {
          stable = 0
        }
        prevW = rawW
        prevH = rawH

        if (stable >= 2 || frames >= 12) {
          const nextScale = Math.min(1, TARGET_HEIGHT_PX / rawH)
          setScale(nextScale)
          return
        }
      }

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [data.kind])

  return (
    <Box
      w={`${BASE_WIDTH_PX}px`}
      h={`${TARGET_HEIGHT_PX}px`}
      overflow="hidden"
      position="relative"
    >
      <Box
        className="drag-handle"
        cursor="grab"
        position="absolute"
        top={0}
        left={0}
        right={0}
        h="22px"
        zIndex={2}
      />
      <Box
        className="nodrag"
        ref={contentRef}
        transform={`scale(${scale})`}
        transformOrigin="top left"
        w={`${BASE_WIDTH_PX}px`}
      >
        <Calculator />
      </Box>
    </Box>
  )
}
