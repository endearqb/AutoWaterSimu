import { Box, Input } from "@chakra-ui/react"
import {
  BaseEdge,
  EdgeLabelRenderer,
  type EdgeProps,
  getSmoothStepPath,
} from "@xyflow/react"
import React, { useState } from "react"

interface EditableEdgeProps extends EdgeProps {
  updateEdgeFlow: (id: string, value: number) => void
}

const EditableEdge: React.FC<EditableEdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
  selected, // <- React Flow 会注入
  updateEdgeFlow,
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [tempFlow, setTempFlow] = useState<string>(String(data?.flow || ""))

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  const handleFlowDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsEditing(true)
    setTempFlow(String(data?.flow || ""))
  }

  const commit = (v: string) => {
    setIsEditing(false)
    const numValue = Number.parseFloat(v)
    if (!Number.isNaN(numValue)) {
      updateEdgeFlow(id, numValue)
    }
  }

  const flowText = data?.flow ? `${data.flow} ` : ""
  const isSelected = !!selected

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: isSelected ? 3 : 1,
          stroke: isSelected ? "hsl(222.2 47.4% 11.2%)" : style?.stroke,
        }}
      />
      <EdgeLabelRenderer>
        <Box
          position="absolute"
          transform={`translate(-50%, -50%) translate(${labelX}px,${labelY}px)`}
          fontSize="9px"
          pointerEvents="all"
          className="nodrag nopan"
          onClick={(e) => e.stopPropagation()} // 防止点击透传到画布
        >
          {isEditing ? (
            <Input
              type="number"
              step="0.01"
              min="0"
              value={tempFlow}
              onChange={(e) => setTempFlow(e.target.value)}
              onBlur={() => commit(tempFlow)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commit(tempFlow)
                if (e.key === "Escape") {
                  setIsEditing(false)
                  setTempFlow(String(data?.flow || ""))
                }
              }}
              size="sm"
              width="120px"
              fontSize="12px"
              autoFocus
              bg="white"
              border="1px solid hsl(214.3 31.8% 91.4%)"
              borderRadius="4px"
              px={2}
              py={1}
              placeholder="流量值"
            />
          ) : // 只有当有流量值时才显示可点击区域
          flowText ? (
            <Box
              onDoubleClick={handleFlowDoubleClick}
              cursor="pointer"
              bg={isSelected ? "blue.50" : "white"}
              border={`1px solid ${isSelected ? "hsl(222.2 47.4% 11.2%)" : "hsl(214.3 31.8% 91.4%)"}`}
              borderRadius="4px"
              px={2}
              py={1}
              textAlign="center"
              _hover={{
                bg: isSelected
                  ? "hsl(222.2 47.4% 11.2% / 0.1)"
                  : "hsl(214.3 31.8% 91.4%)",
                borderColor: isSelected
                  ? "hsl(222.2 47.4% 11.2%)"
                  : "hsl(215.4 16.3% 56.9%)",
              }}
            >
              {flowText}
            </Box>
          ) : (
            // 没有流量值时显示透明的可点击区域
            <Box
              onDoubleClick={handleFlowDoubleClick}
              cursor="pointer"
              width="20px"
              height="20px"
              bg={isSelected ? "hsl(222.2 47.4% 11.2% / 0.1)" : "transparent"}
              border={isSelected ? "1px solid hsl(222.2 47.4% 11.2%)" : "none"}
              borderRadius="50%"
              _hover={{ bg: "hsl(215.4 16.3% 56.9% / 0.1)" }}
            />
          )}
        </Box>
      </EdgeLabelRenderer>
    </>
  )
}

export default React.memo(EditableEdge)
