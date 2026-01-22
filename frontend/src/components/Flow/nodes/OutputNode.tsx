import { Box, Input, Text } from "@chakra-ui/react"
import { Handle, type NodeProps, Position } from "@xyflow/react"
import { memo, useEffect, useRef, useState } from "react"
import { useI18n } from "../../../i18n"
import useFlowStore from "../../../stores/flowStore"
import type { RFState } from "../../../stores/flowStore"
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

interface OutputNodeData extends Record<string, unknown> {
  label?: string
  number?: string | number
}

interface OutputNodeProps extends NodeProps<any> {
  store?: () => RFState
}

const OutputNode = ({ data, selected, id, store }: OutputNodeProps) => {
  const nodeData = data as OutputNodeData
  const { t, language } = useI18n()
  const flowStore = store || useFlowStore
  const { updateNodeParameter } = flowStore()
  const [isEditing, setIsEditing] = useState(false)
  const [label, setLabel] = useState(
    nodeData.label || nodeData.number || t("flow.node.output"),
  )
  const hoveredNodeId = useHoveredNodeId()
  const isHovered = hoveredNodeId === id
  const inputRef = useRef<HTMLInputElement>(null)
  const tint: GlassTint = "output"
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
    setLabel(nodeData.label || nodeData.number || t("flow.node.output"))
  }, [nodeData.label, nodeData.number, language])

  const handleDoubleClick = () => setIsEditing(true)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      setIsEditing(false)
      updateNodeParameter(id, "label", label)
    } else if (e.key === "Escape") {
      setLabel(nodeData.label || nodeData.number || t("flow.node.output"))
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

      <Handle
        type="target"
        position={Position.Top}
        id="top-target"
        isValidConnection={isNotSelfConnection}
        style={getHandleStyle(tint, handlesVisible, Position.Top)}
      />

      <Handle
        type="target"
        position={Position.Left}
        id="left-target"
        isValidConnection={isNotSelfConnection}
        style={getHandleStyle(tint, handlesVisible, Position.Left)}
      />

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
            fontWeight="normal"
            color={accentColor}
          />
        ) : (
          <Text
            fontSize="sm"
            fontWeight="normal"
            color={accentColor}
            textAlign="center"
            userSelect="none"
            whiteSpace="pre-line"
          >
            {label}
          </Text>
        )}
      </Box>

      <Handle
        type="target"
        position={Position.Right}
        id="right-target"
        isValidConnection={isNotSelfConnection}
        style={getHandleStyle(tint, handlesVisible, Position.Right)}
      />

      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom-target"
        isValidConnection={isNotSelfConnection}
        style={getHandleStyle(tint, handlesVisible, Position.Bottom)}
      />
    </GlassNodeContainer>
  )
}

export default memo(OutputNode)
