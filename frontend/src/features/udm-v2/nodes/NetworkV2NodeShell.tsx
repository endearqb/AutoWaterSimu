import { Box, HStack, Input, Text } from "@chakra-ui/react"
import { Handle, Position, useUpdateNodeInternals } from "@xyflow/react"
import type { LucideIcon } from "lucide-react"
import {
  type CSSProperties,
  type KeyboardEvent,
  useEffect,
  useState,
} from "react"

import GlassNodeContainer from "@/components/Flow/nodes/GlassNodeContainer"
import {
  type GlassTint,
  getAccentColor,
} from "@/components/Flow/nodes/utils/glass"
import { useNetworkV2Interaction } from "../interaction/NetworkV2InteractionContext"
import { useUdmV2FlowStore } from "../state/useUdmV2FlowStore"
import type {
  NetworkV2NodeData,
  NetworkV2Port,
  NetworkV2PortPlacement,
} from "./nodeTypes"
import { edgeKindsForPort, isTargetPort } from "./portKinds"

type NetworkV2NodeShellProps = {
  id: string
  data: NetworkV2NodeData
  selected?: boolean
  tint: GlassTint
  icon: LucideIcon
  subtitle: string
}

const positionByPlacement: Record<NetworkV2PortPlacement, Position> = {
  left: Position.Left,
  right: Position.Right,
  top: Position.Top,
  bottom: Position.Bottom,
}

function handleStyle(
  port: NetworkV2Port,
  ports: NetworkV2Port[],
): CSSProperties {
  const sidePorts = ports.filter((item) => item.placement === port.placement)
  const index = sidePorts.findIndex((item) => item.id === port.id)
  const offset = `${((index + 1) / (sidePorts.length + 1)) * 100}%`

  if (port.placement === "left" || port.placement === "right") {
    return { top: offset }
  }
  return { left: offset }
}

export function NetworkV2NodeShell({
  id,
  data,
  selected,
  tint,
  icon: Icon,
  subtitle,
}: NetworkV2NodeShellProps) {
  const { activeEdgeKind, connectionInProgress, hoveredNodeId } =
    useNetworkV2Interaction()
  const updateNodeData = useUdmV2FlowStore((state) => state.updateNodeData)
  const updateNodeInternals = useUpdateNodeInternals()
  const accent = getAccentColor(tint)
  const shouldShow =
    Boolean(selected) || hoveredNodeId === id || connectionInProgress
  const [handlesVisible, setHandlesVisible] = useState(shouldShow)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(data.label)

  useEffect(() => {
    if (shouldShow) {
      setHandlesVisible(true)
      return
    }
    const timer = window.setTimeout(() => setHandlesVisible(false), 500)
    return () => window.clearTimeout(timer)
  }, [shouldShow])

  const commitLabel = () => {
    const label = draft.trim()
    if (label && label !== data.label) {
      updateNodeData(id, { label })
      updateNodeInternals(id)
    } else {
      setDraft(data.label)
    }
    setEditing(false)
  }

  const onLabelKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    event.stopPropagation()
    if (event.key === "Enter") commitLabel()
    if (event.key === "Escape") {
      setDraft(data.label)
      setEditing(false)
    }
  }

  return (
    <GlassNodeContainer
      as="fieldset"
      aria-label={`${data.label} ${data.node_kind} node`}
      tint={tint}
      selected={selected}
      hovered={hoveredNodeId === id}
      minW="168px"
      maxW="240px"
      px={3}
      py={2}
    >
      <Box
        position="absolute"
        left="6px"
        top="8px"
        bottom="8px"
        width="3px"
        borderRadius="full"
        bg={accent}
      />
      {data.ports.map((port) => {
        const compatible = edgeKindsForPort(port).includes(activeEdgeKind)
        return (
          <Handle
            key={port.id}
            id={port.id}
            type={isTargetPort(port) ? "target" : "source"}
            position={positionByPlacement[port.placement]}
            aria-label={`${data.label} ${port.label} port`}
            title={port.label}
            style={{
              width: 8,
              height: 8,
              border: "1px solid rgba(255,255,255,.9)",
              background: accent,
              opacity: handlesVisible ? (compatible ? 1 : 0.18) : 0,
              pointerEvents: handlesVisible && compatible ? "auto" : "none",
              transition: "opacity .16s ease",
              ...handleStyle(port, data.ports),
            }}
          />
        )
      })}

      <HStack gap={2} align="center">
        <Icon size={16} color={accent} />
        {editing ? (
          <Input
            className="nodrag"
            aria-label="Rename node"
            value={draft}
            size="xs"
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commitLabel}
            onKeyDown={onLabelKeyDown}
            autoFocus
          />
        ) : (
          <Text
            fontWeight="700"
            fontSize="sm"
            lineHeight="1.2"
            onDoubleClick={(event) => {
              event.stopPropagation()
              setEditing(true)
            }}
          >
            {data.label}
          </Text>
        )}
      </HStack>
      <Text mt={1} fontSize="xs" color="fg.muted">
        {subtitle}
      </Text>
    </GlassNodeContainer>
  )
}
