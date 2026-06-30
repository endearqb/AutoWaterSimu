import { Box } from "@chakra-ui/react"
import { BaseEdge, EdgeLabelRenderer } from "@xyflow/react"
import type { EdgeProps } from "@xyflow/react"

import { getNetworkV2SmoothPath } from "./edgePath"

type NetworkV2EdgeShellProps = EdgeProps & {
  label: string
  stroke: string
  strokeDasharray?: string
}

export function NetworkV2EdgeShell(props: NetworkV2EdgeShellProps) {
  const [edgePath, labelX, labelY] = getNetworkV2SmoothPath(props)
  const strokeWidth = props.selected ? 3 : 2

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={props.markerEnd}
        style={{
          ...props.style,
          stroke: props.stroke,
          strokeDasharray: props.strokeDasharray,
          strokeWidth,
        }}
      />
      <EdgeLabelRenderer>
        <Box
          position="absolute"
          transform={`translate(-50%, -50%) translate(${labelX}px,${labelY}px)`}
          pointerEvents="all"
          className="nodrag nopan"
          bg={props.selected ? "blue.50" : "white"}
          borderWidth="1px"
          borderColor={props.selected ? "blue.600" : "border"}
          borderRadius="4px"
          color="fg"
          fontSize="10px"
          px={2}
          py={1}
          shadow="sm"
        >
          {props.label}
        </Box>
      </EdgeLabelRenderer>
    </>
  )
}
