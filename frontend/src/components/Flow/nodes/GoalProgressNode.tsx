import {
  AbsoluteCenter,
  Box,
  HStack,
  Icon,
  Input,
  ProgressCircle,
  Text,
  VStack,
} from "@chakra-ui/react"
import { Handle, type NodeProps, Position } from "@xyflow/react"
import { memo, useEffect, useRef, useState } from "react"
import { FcOrgUnit } from "react-icons/fc"
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

interface GoalProgressData extends Record<string, unknown> {
  label?: string
  progress?: number
  amount?: string
  currency?: string
}

const GoalProgressNode = ({ data, selected, id }: NodeProps<any>) => {
  const nodeData = data as GoalProgressData
  const hoveredNodeId = useHoveredNodeId()
  const isHovered = hoveredNodeId === id
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [isEditingAmount, setIsEditingAmount] = useState(false)
  const [title, setTitle] = useState(nodeData.label || "反应池")
  const [amount, setAmount] = useState(nodeData.amount || "5,000.00")
  const tint: GlassTint = "goal"
  const accentColor = getAccentColor(tint)
  const hideTimerRef = useRef<number | null>(null)
  const [showHandles, setShowHandles] = useState<boolean>(!!selected)
  const handlesVisible = showHandles
  useHandlePositionSync(id, [title, amount])

  const endEditTitle = () => setIsEditingTitle(false)
  const endEditAmount = () => setIsEditingAmount(false)

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

  const renderHandles = (position: Position, ids: string[]) =>
    ids.map((handleId) => (
      <Handle
        key={handleId}
        type={handleId.includes("target") ? "target" : "source"}
        position={position}
        id={handleId}
        isValidConnection={isNotSelfConnection}
        style={getHandleStyle(tint, handlesVisible, position)}
      />
    ))

  return (
    <GlassNodeContainer
      tint={tint}
      selected={selected}
      hovered={isHovered}
      minW={`${FLOW_GRID_SIZE * 8}px`}
      px={4}
      py={3}
    >
      {renderHandles(Position.Top, ["top-target", "top-source"])}
      {renderHandles(Position.Left, ["left-target", "left-source"])}

      <VStack align="stretch" gap={2}>
        <HStack gap={1}>
          <Icon as={FcOrgUnit} boxSize={4} />
          {isEditingTitle ? (
            <Input
              {...INLINE_EDIT_INPUT_PROPS}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={endEditTitle}
              onKeyDown={(e) =>
                (e.key === "Enter" || e.key === "Escape") && endEditTitle()
              }
              fontSize="xs"
              fontWeight="medium"
              color={accentColor}
              autoFocus
            />
          ) : (
            <Text
              fontSize="xs"
              fontWeight="medium"
              color={accentColor}
              onDoubleClick={() => setIsEditingTitle(true)}
              cursor="pointer"
            >
              {title}
            </Text>
          )}
        </HStack>

        <VStack align="start" gap={1}>
          <HStack gap={2} align="center">
            <Box>
              <ProgressCircle.Root
                size="xs"
                value={nodeData.progress || 100}
                colorPalette="green"
              >
                <ProgressCircle.Circle>
                  <ProgressCircle.Track />
                  <ProgressCircle.Range />
                </ProgressCircle.Circle>
                <AbsoluteCenter>
                  <ProgressCircle.ValueText
                    color={accentColor}
                    fontSize="6px"
                  />
                </AbsoluteCenter>
              </ProgressCircle.Root>
            </Box>
            {isEditingAmount ? (
              <HStack>
                <Text fontSize="2xs" color={accentColor}>
                  {nodeData.currency || "Vol:"}
                </Text>
                <Input
                  {...INLINE_EDIT_INPUT_PROPS}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  onBlur={endEditAmount}
                  onKeyDown={(e) =>
                    (e.key === "Enter" || e.key === "Escape") && endEditAmount()
                  }
                  fontSize="2xs"
                  color={accentColor}
                  autoFocus
                  w="60px"
                />
                <Text fontSize="2xs" color={accentColor}>
                  {nodeData.currency || " m³"}
                </Text>
              </HStack>
            ) : (
              <Text
                fontSize="2xs"
                fontWeight="medium"
                color={accentColor}
                onDoubleClick={() => setIsEditingAmount(true)}
                cursor="pointer"
              >
                {nodeData.currency || "Vol:"} {amount}
                {nodeData.currency ? "" : " m³"}
              </Text>
            )}
          </HStack>
        </VStack>
      </VStack>

      {renderHandles(Position.Right, ["right-target", "right-source"])}
      {renderHandles(Position.Bottom, ["bottom-target", "bottom-source"])}
    </GlassNodeContainer>
  )
}

export default memo(GoalProgressNode)
