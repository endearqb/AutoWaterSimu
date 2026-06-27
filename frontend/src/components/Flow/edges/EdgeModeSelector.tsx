import { Box, Button, HStack, Text } from "@chakra-ui/react"
import type { IconType } from "react-icons"
import { FiActivity, FiLayers, FiRadio, FiZap } from "react-icons/fi"
import {
  NETWORK_EDGE_KIND_OPTIONS,
  type NetworkEdgeKind,
} from "../../../types/networkEdges"

type EdgeModeSelectorProps = {
  activeKind: NetworkEdgeKind
  onChange: (kind: NetworkEdgeKind) => void
}

const icons: Record<NetworkEdgeKind, IconType> = {
  hydraulic: FiActivity,
  pump: FiZap,
  settling: FiLayers,
  signal: FiRadio,
}

const accentByKind: Record<NetworkEdgeKind, string> = {
  hydraulic: "#2563eb",
  pump: "#b45309",
  settling: "#15803d",
  signal: "#7c3aed",
}

function EdgeModeSelector({ activeKind, onChange }: EdgeModeSelectorProps) {
  return (
    <Box
      position="absolute"
      top={3}
      left={3}
      zIndex={5}
      pointerEvents="all"
      bg="white"
      border="1px solid"
      borderColor="gray.200"
      borderRadius="6px"
      boxShadow="0 8px 20px rgba(15, 23, 42, 0.12)"
      px={2}
      py={2}
    >
      <HStack gap={1} align="center">
        <Text fontSize="xs" fontWeight="600" color="gray.600" px={1}>
          Edge
        </Text>
        {NETWORK_EDGE_KIND_OPTIONS.map((option) => {
          const Icon = icons[option.kind]
          const isActive = option.kind === activeKind
          const accent = accentByKind[option.kind]
          return (
            <Button
              key={option.kind}
              size="xs"
              minW={{ base: "32px", md: "72px" }}
              h="28px"
              px={{ base: 0, md: 2 }}
              variant="outline"
              borderColor={isActive ? accent : "gray.200"}
              bg={isActive ? accent : "white"}
              color={isActive ? "white" : "gray.700"}
              title={`${option.label}: ${option.description}`}
              aria-label={`Create ${option.label} edge`}
              onClick={() => onChange(option.kind)}
              _hover={{
                bg: isActive ? accent : "gray.50",
                borderColor: accent,
              }}
            >
              <Icon />
              <Text display={{ base: "none", md: "inline" }}>
                {option.shortLabel}
              </Text>
            </Button>
          )
        })}
      </HStack>
    </Box>
  )
}

export default EdgeModeSelector

