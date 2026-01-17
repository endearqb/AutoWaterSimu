import { Box, HStack, Icon, Text } from "@chakra-ui/react"
import { Handle, type NodeProps, Position } from "@xyflow/react"
import { memo, useEffect, useRef, useState } from "react"
import { FaWallet } from "react-icons/fa"
import GlassNodeContainer from "./GlassNodeContainer"
import { isNotSelfConnection } from "./utils/connectionGuards"
import {
  FLOW_GRID_SIZE,
  type GlassTint,
  HANDLE_HIDE_DELAY_MS,
  getAccentColor,
  getHandleStyle,
} from "./utils/glass"
import { useHoveredNodeId } from "./utils/hoverContext"
import useHandlePositionSync from "./utils/useHandlePositionSync"

interface CashWalletData extends Record<string, unknown> {
  label?: string
  amount?: string
  currency?: string
}

const CashWalletNode = ({ data, selected, id }: NodeProps<any>) => {
  const nodeData = data as CashWalletData
  const hoveredNodeId = useHoveredNodeId()
  const isHovered = hoveredNodeId === id
  const tint: GlassTint = "cash"
  const accentColor = getAccentColor(tint)
  const hideTimerRef = useRef<number | null>(null)
  const [showHandles, setShowHandles] = useState<boolean>(!!selected)
  const handlesVisible = showHandles
  useHandlePositionSync(id, [
    nodeData.label,
    nodeData.amount,
    nodeData.currency,
  ])

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
      minW={`${FLOW_GRID_SIZE * 11}px`}
      px={5}
      py={4}
      display="flex"
      flexDirection="column"
      gap={3}
    >
      <Handle
        type="target"
        position={Position.Left}
        isValidConnection={isNotSelfConnection}
        style={getHandleStyle(tint, handlesVisible, Position.Left)}
      />

      <HStack gap={3} mb={2} align="center">
        <Icon as={FaWallet} color={accentColor} boxSize={5} />
        <Text fontSize="sm" fontWeight="medium" color={accentColor}>
          {nodeData.label || "池体"}
        </Text>
      </HStack>

      <Box>
        <Text fontSize="xs" color={accentColor}>
          {nodeData.currency || "Vol:"}
        </Text>
        <Text fontSize="2xl" fontWeight="bold" color={accentColor}>
          {nodeData.amount || "749.00"}
        </Text>
      </Box>

      <Handle
        type="source"
        position={Position.Right}
        isValidConnection={isNotSelfConnection}
        style={getHandleStyle(tint, handlesVisible, Position.Right)}
      />
    </GlassNodeContainer>
  )
}

export default memo(CashWalletNode)
