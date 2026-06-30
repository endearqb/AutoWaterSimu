import { Box, Button, HStack, Text } from "@chakra-ui/react"
import { Activity, Droplets, Radio, Zap } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import {
  NETWORK_V2_EDGE_KIND_OPTIONS,
  type NetworkV2EdgeKind,
} from "./edgeModel"

type NetworkV2EdgeModeSelectorProps = {
  activeKind: NetworkV2EdgeKind
  onChange: (kind: NetworkV2EdgeKind) => void
}

const icons: Record<NetworkV2EdgeKind, LucideIcon> = {
  hydraulic: Droplets,
  pump: Zap,
  settling: Activity,
  signal: Radio,
}

const accentByKind: Record<NetworkV2EdgeKind, string> = {
  hydraulic: "#2563eb",
  pump: "#b45309",
  settling: "#15803d",
  signal: "#7c3aed",
}

export function NetworkV2EdgeModeSelector({
  activeKind,
  onChange,
}: NetworkV2EdgeModeSelectorProps) {
  return (
    <Box
      position="absolute"
      top={3}
      left={3}
      zIndex={5}
      pointerEvents="all"
      bg="white"
      borderWidth="1px"
      borderColor="border"
      borderRadius="6px"
      boxShadow="0 8px 20px rgba(15, 23, 42, 0.12)"
      px={2}
      py={2}
    >
      <HStack gap={1} align="center">
        <Text fontSize="xs" fontWeight="600" color="fg.muted" px={1}>
          Edge
        </Text>
        {NETWORK_V2_EDGE_KIND_OPTIONS.map((option) => {
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
              borderColor={isActive ? accent : "border"}
              bg={isActive ? accent : "white"}
              color={isActive ? "white" : "fg"}
              title={option.label}
              aria-label={`Create ${option.label} edge`}
              onClick={() => onChange(option.kind)}
              _hover={{
                bg: isActive ? accent : "bg.muted",
                borderColor: accent,
              }}
            >
              <Icon size={14} />
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
