import { Box, HStack, Text } from "@chakra-ui/react"
import { Handle, Position } from "@xyflow/react"
import type { LucideIcon } from "lucide-react"
import type { CSSProperties } from "react"

import type {
  NetworkV2NodeData,
  NetworkV2Port,
  NetworkV2PortPlacement,
} from "./nodeTypes"

type NetworkV2NodeShellProps = {
  data: NetworkV2NodeData
  selected?: boolean
  accent: string
  icon: LucideIcon
  subtitle: string
}

const positionByPlacement: Record<NetworkV2PortPlacement, Position> = {
  left: Position.Left,
  right: Position.Right,
  top: Position.Top,
  bottom: Position.Bottom,
}

const isTargetPort = (port: NetworkV2Port) =>
  port.role === "inlet" || port.role === "signal_in"

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
  data,
  selected,
  accent,
  icon: Icon,
  subtitle,
}: NetworkV2NodeShellProps) {
  return (
    <Box
      as="fieldset"
      aria-label={`${data.label} ${data.node_kind} node`}
      minW="168px"
      maxW="220px"
      bg="white"
      borderWidth={selected ? "2px" : "1px"}
      borderColor={selected ? accent : "border"}
      borderRadius="6px"
      boxShadow={selected ? "0 10px 24px rgba(15, 23, 42, 0.18)" : "sm"}
      px={3}
      py={2}
    >
      {data.ports.map((port) => (
        <Handle
          key={port.id}
          id={port.id}
          type={isTargetPort(port) ? "target" : "source"}
          position={positionByPlacement[port.placement]}
          aria-label={`${data.label} ${port.label} port`}
          title={port.label}
          style={{
            width: 10,
            height: 10,
            border: "2px solid white",
            background: accent,
            ...handleStyle(port, data.ports),
          }}
        />
      ))}

      <HStack gap={2} align="center">
        <Icon size={16} color={accent} />
        <Text fontWeight="700" fontSize="sm" lineHeight="1.2">
          {data.label}
        </Text>
      </HStack>
      <Text mt={1} fontSize="xs" color="fg.muted">
        {subtitle}
      </Text>
    </Box>
  )
}
