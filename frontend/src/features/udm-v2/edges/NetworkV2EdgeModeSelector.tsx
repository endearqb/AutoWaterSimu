import { Box, Button, HStack, Text } from "@chakra-ui/react"
import { Activity, Droplets, Radio, Zap } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import {
  NETWORK_V2_EDGE_KIND_OPTIONS,
  type NetworkV2EdgeKind,
} from "./edgeModel"
import { NETWORK_V2_EDGE_VISUALS } from "./edgeVisuals"

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

export function NetworkV2EdgeModeSelector({
  activeKind,
  onChange,
}: NetworkV2EdgeModeSelectorProps) {
  return (
    <Box px={2} py={2}>
      <HStack gap={1} align="center">
        <Text fontSize="xs" fontWeight="600" color="fg.muted" px={1}>
          Edge
        </Text>
        {NETWORK_V2_EDGE_KIND_OPTIONS.map((option) => {
          const Icon = icons[option.kind]
          const isActive = option.kind === activeKind
          const accent = NETWORK_V2_EDGE_VISUALS[option.kind].stroke
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
