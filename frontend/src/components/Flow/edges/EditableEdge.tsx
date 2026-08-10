import { Box, Input } from "@chakra-ui/react"
import {
  BaseEdge,
  EdgeLabelRenderer,
  type EdgeProps,
  getSmoothStepPath,
} from "@xyflow/react"
import React, { useState } from "react"
import { useI18n } from "../../../i18n"

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
  const { t } = useI18n()
  const [isEditing, setIsEditing] = useState(false)
  const edgeData = (data || {}) as Record<string, any>
  const displayFlow = edgeData.flow
  const [tempFlow, setTempFlow] = useState<string>(String(displayFlow || ""))

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
    setTempFlow(String(displayFlow || ""))
  }

  const commit = (v: string) => {
    setIsEditing(false)
    const numValue = Number.parseFloat(v)
    if (!Number.isNaN(numValue)) {
      updateEdgeFlow(id, numValue)
    }
  }

  const flowText =
    displayFlow !== undefined && displayFlow !== null && displayFlow !== ""
      ? `${displayFlow}`
      : ""
  const isSelected = !!selected
  const edgeStyle = { stroke: "#2563eb", strokeWidth: 1.5 }
  const labelText = flowText

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          ...edgeStyle,
          strokeWidth: isSelected ? 3 : edgeStyle.strokeWidth,
          stroke: isSelected ? "hsl(222.2 47.4% 11.2%)" : edgeStyle.stroke,
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
                  setTempFlow(String(displayFlow || ""))
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
              placeholder={t("flow.edge.flowPlaceholder")}
            />
          ) : labelText ? (
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
              {labelText}
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
