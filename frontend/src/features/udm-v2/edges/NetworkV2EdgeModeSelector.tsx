import { Box, Button, HStack, Stack, Text } from "@chakra-ui/react"
import { Activity, Droplets, Radio, Zap } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { formatUdmV2Message, useUdmV2Messages } from "../i18n"
import {
  NETWORK_V2_EDGE_KIND_OPTIONS,
  type NetworkV2EdgeKind,
} from "./edgeModel"
import { NETWORK_V2_EDGE_VISUALS } from "./edgeVisuals"

type NetworkV2EdgeModeSelectorProps = {
  activeKind: NetworkV2EdgeKind
  onChange: (kind: NetworkV2EdgeKind) => void
}

export const NETWORK_V2_EDGE_ICONS: Record<NetworkV2EdgeKind, LucideIcon> = {
  hydraulic: Droplets,
  pump: Zap,
  settling: Activity,
  signal: Radio,
}

export function NetworkV2EdgeModeSelector({
  activeKind,
  onChange,
}: NetworkV2EdgeModeSelectorProps) {
  const text = useUdmV2Messages()

  return (
    <Box px={2} py={1}>
      <Stack gap={1}>
        <Text fontSize="xs" fontWeight="700" color="fg.muted">
          {text.connections}
        </Text>
        <HStack gap={1} align="center">
          {NETWORK_V2_EDGE_KIND_OPTIONS.map((option) => {
            const Icon = NETWORK_V2_EDGE_ICONS[option.kind]
            const isActive = option.kind === activeKind
            const accent = NETWORK_V2_EDGE_VISUALS[option.kind].stroke
            const localized = text.edgeKinds[option.kind]
            return (
              <Button
                key={option.kind}
                size="xs"
                flex="1"
                minW="0"
                h="28px"
                px={1}
                variant="outline"
                borderColor={isActive ? accent : "border"}
                bg={isActive ? accent : "white"}
                color={isActive ? "white" : "fg"}
                title={localized.label}
                aria-label={formatUdmV2Message(text.createEdge, {
                  label: localized.label,
                })}
                onClick={() => onChange(option.kind)}
                _hover={{
                  bg: isActive ? accent : "bg.muted",
                  borderColor: accent,
                }}
              >
                <Icon size={14} />
                <Text display={{ base: "none", sm: "inline" }} fontSize="xs">
                  {localized.short}
                </Text>
              </Button>
            )
          })}
        </HStack>
      </Stack>
    </Box>
  )
}
