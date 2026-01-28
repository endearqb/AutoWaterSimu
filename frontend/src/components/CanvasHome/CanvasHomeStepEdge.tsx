import { Box } from "@chakra-ui/react"
import {
  BaseEdge,
  EdgeLabelRenderer,
  type EdgeProps,
  getSmoothStepPath,
} from "@xyflow/react"
import { memo } from "react"

export const CanvasHomeStepEdge = memo(function CanvasHomeStepEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  data,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  const flow = (data as any)?.flow
  const text =
    typeof flow === "number" || typeof flow === "string" ? String(flow) : ""

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      {text ? (
        <EdgeLabelRenderer>
          <Box
            position="absolute"
            transform={`translate(-50%, -50%) translate(${labelX}px,${labelY}px)`}
            fontSize="10px"
            px={2}
            py={1}
            borderRadius="4px"
            bg="white"
            borderWidth="1px"
            borderColor="gray.200"
            _dark={{ bg: "gray.900", borderColor: "gray.700" }}
            pointerEvents="none"
          >
            {text}
          </Box>
        </EdgeLabelRenderer>
      ) : null}
    </>
  )
})

