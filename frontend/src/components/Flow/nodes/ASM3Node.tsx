import { Box, Input, Text } from "@chakra-ui/react"
import { Handle, type NodeProps, Position } from "@xyflow/react"
import { memo, useEffect, useRef, useState } from "react"
import { useASM3FlowStore } from "../../../stores/asm3FlowStore"
import type { ASM3FlowState } from "../../../stores/asm3FlowStore"
import GlassNodeContainer from "./GlassNodeContainer"
import { isNotSelfConnection } from "./utils/connectionGuards"
import { INLINE_EDIT_INPUT_PROPS } from "./utils/editableInputProps"
import {
  FLOW_GRID_SIZE,
  type GlassTint,
  HANDLE_HIDE_DELAY_MS,
  getAccentColor,
  getHandleStyle,
} from "./utils/glass"
import { useHoveredNodeId } from "./utils/hoverContext"
import useHandlePositionSync from "./utils/useHandlePositionSync"

interface ASM3NodeData extends Record<string, unknown> {
  label?: string
  volume?: string | number
  X_H?: string | number
  X_A?: string | number
  X_S?: string | number
  X_I?: string | number
  X_ND?: string | number
  X_STO?: string | number
  S_O?: string | number
  S_S?: string | number
  S_NO?: string | number
  S_NH?: string | number
  S_ND?: string | number
  S_ALK?: string | number
  S_I?: string | number
}

interface ASM3NodeProps extends NodeProps<any> {
  store?: () => ASM3FlowState
}

const ASM3Node = ({ data, selected, id, store }: ASM3NodeProps) => {
  const nodeData = data as ASM3NodeData
  const flowStore = store || useASM3FlowStore
  const { updateNodeParameter } = flowStore()
  const [isEditing, setIsEditing] = useState(false)
  const [label, setLabel] = useState(nodeData.label || "ASM3 节点")
  const hoveredNodeId = useHoveredNodeId()
  const isHovered = hoveredNodeId === id
  const inputRef = useRef<HTMLInputElement>(null)
  const tint: GlassTint = "asm3"
  const accentColor = getAccentColor(tint)
  const hideTimerRef = useRef<number | null>(null)
  const [showHandles, setShowHandles] = useState<boolean>(!!selected)
  const handlesVisible = showHandles
  useHandlePositionSync(id, [label])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  useEffect(() => {
    setLabel(nodeData.label || "ASM3 节点")
  }, [nodeData.label])

  const handleDoubleClick = () => setIsEditing(true)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      setIsEditing(false)
      updateNodeParameter(id, "label", label)
    } else if (e.key === "Escape") {
      setLabel(nodeData.label || "ASM3 节点")
      setIsEditing(false)
    }
  }

  const handleBlur = () => {
    setIsEditing(false)
    updateNodeParameter(id, "label", label)
  }

  useEffect(() => {
    const active = isHovered || !!selected
    if (active) {
      setShowHandles(true)
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current)
        hideTimerRef.current = null
      }
    } else {
      if (!hideTimerRef.current) {
        hideTimerRef.current = window.setTimeout(() => {
          setShowHandles(false)
          hideTimerRef.current = null
        }, HANDLE_HIDE_DELAY_MS)
      }
    }
    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current)
        hideTimerRef.current = null
      }
    }
  }, [isHovered, selected])

  return (
    <GlassNodeContainer
      tint={tint}
      selected={selected}
      hovered={isHovered}
      minW={`${FLOW_GRID_SIZE * 6}px`}
      minH={`${FLOW_GRID_SIZE * 2}px`}
      px={4}
      py={3}
      display="flex"
      alignItems="center"
      justifyContent="center"
      position="relative"
      onDoubleClick={handleDoubleClick}
      cursor={isEditing ? "text" : "pointer"}
    >
      <Box
        position="absolute"
        left="6px"
        top="8px"
        bottom="8px"
        width="3px"
        borderRadius="full"
        bg={accentColor}
      />

      {["top-target", "top-source"].map((handleId) => (
        <Handle
          key={handleId}
          type={handleId.includes("target") ? "target" : "source"}
          position={Position.Top}
          id={handleId}
          isValidConnection={isNotSelfConnection}
          style={getHandleStyle(tint, handlesVisible, Position.Top)}
        />
      ))}

      {["left-target", "left-source"].map((handleId) => (
        <Handle
          key={handleId}
          type={handleId.includes("target") ? "target" : "source"}
          position={Position.Left}
          id={handleId}
          isValidConnection={isNotSelfConnection}
          style={getHandleStyle(tint, handlesVisible, Position.Left)}
        />
      ))}

      <Box px={3} w="100%" maxW="100%">
        {isEditing ? (
          <Input
            {...INLINE_EDIT_INPUT_PROPS}
            ref={inputRef}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            textAlign="center"
            fontSize="xs"
            fontWeight="medium"
            color={accentColor}
          />
        ) : (
          <Text
            fontSize="sm"
            fontWeight="medium"
            color={accentColor}
            textAlign="center"
            userSelect="none"
            whiteSpace="pre-line"
          >
            {label}
          </Text>
        )}
      </Box>

      {["right-target", "right-source"].map((handleId) => (
        <Handle
          key={handleId}
          type={handleId.includes("target") ? "target" : "source"}
          position={Position.Right}
          id={handleId}
          isValidConnection={isNotSelfConnection}
          style={getHandleStyle(tint, handlesVisible, Position.Right)}
        />
      ))}

      {["bottom-target", "bottom-source"].map((handleId) => (
        <Handle
          key={handleId}
          type={handleId.includes("target") ? "target" : "source"}
          position={Position.Bottom}
          id={handleId}
          isValidConnection={isNotSelfConnection}
          style={getHandleStyle(tint, handlesVisible, Position.Bottom)}
        />
      ))}
    </GlassNodeContainer>
  )
}

export default memo(ASM3Node)
