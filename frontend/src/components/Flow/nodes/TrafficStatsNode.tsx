import { Box, Flex, HStack, Icon, Text, VStack } from "@chakra-ui/react"
import { Handle, type NodeProps, Position } from "@xyflow/react"
import { memo, useEffect, useRef, useState } from "react"
import { MdShowChart } from "react-icons/md"
import { TbTrendingUp } from "react-icons/tb"
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

interface TrafficStatsData extends Record<string, unknown> {
  label?: string
  totalTraffic?: string
  period?: string
  organicTraffic?: number
  paidTraffic?: number
}

const TrafficStatsNode = ({ data, selected, id }: NodeProps<any>) => {
  const nodeData = data as TrafficStatsData
  const hoveredNodeId = useHoveredNodeId()
  const isHovered = hoveredNodeId === id
  const tint: GlassTint = "traffic"
  const accentColor = getAccentColor(tint)
  const hideTimerRef = useRef<number | null>(null)
  const [showHandles, setShowHandles] = useState<boolean>(!!selected)
  const handlesVisible = showHandles
  useHandlePositionSync(id, [
    nodeData.label,
    nodeData.totalTraffic,
    nodeData.period,
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
      minW={`${FLOW_GRID_SIZE * 14}px`}
      px={5}
      py={4}
      display="flex"
      flexDirection="column"
      gap={4}
    >
      <Handle
        type="target"
        position={Position.Left}
        isValidConnection={isNotSelfConnection}
        style={getHandleStyle(tint, handlesVisible, Position.Left)}
      />

      <HStack gap={2} align="center">
        <Icon as={TbTrendingUp} color={accentColor} boxSize={5} />
        <Text fontSize="sm" fontWeight="medium" color={accentColor}>
          {nodeData.label || "Organic Traffic"}
        </Text>
      </HStack>

      <VStack align="start" gap={2}>
        <Text fontSize="2xl" fontWeight="bold" color={accentColor}>
          {nodeData.totalTraffic || "120,669,547"}
          <Text as="span" fontSize="sm" color={accentColor} ml={1}>
            /{nodeData.period || "month"}
          </Text>
        </Text>
        <HStack gap={4}>
          <HStack gap={1}>
            <Box w={2} h={2} bg="teal.400" borderRadius="full" />
            <Text fontSize="xs" color={accentColor}>
              Organic traffic
            </Text>
          </HStack>
          <HStack gap={1}>
            <Box w={2} h={2} bg="red.400" borderRadius="full" />
            <Text fontSize="xs" color={accentColor}>
              Paid traffic
            </Text>
          </HStack>
        </HStack>
      </VStack>

      <Box
        position="relative"
        height="40px"
        bg="gray.50"
        borderRadius="md"
        p={2}
      >
        <Flex align="end" height="100%" gap={1}>
          {[30, 25, 35, 40, 45, 50, 55].map((value, index) => (
            <Box
              key={index}
              flex={1}
              height={`${value}%`}
              bg={index < 4 ? "teal.300" : "teal.400"}
              borderRadius="sm"
              opacity={0.85}
            />
          ))}
        </Flex>
        <Box position="absolute" top={2} right={2} color={accentColor}>
          <Icon as={MdShowChart} boxSize={3} />
        </Box>
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

export default memo(TrafficStatsNode)
