import { Badge, Box, HStack, Text } from "@chakra-ui/react"
import { useMemo } from "react"

import { solveRealtimeFlowBalance } from "../flow/realtimeFlowBalance"
import { formatUdmV2Message, useUdmV2Messages } from "../i18n"
import { useUdmV2FlowStore } from "../state/useUdmV2FlowStore"

export function NetworkV2StatusOverlay() {
  const text = useUdmV2Messages()
  const nodes = useUdmV2FlowStore((state) => state.nodes)
  const edges = useUdmV2FlowStore((state) => state.edges)
  const runtime = useUdmV2FlowStore((state) => state.runtimeStatus)
  const diagnostics = useUdmV2FlowStore((state) => state.diagnostics.length)
  const balance = useMemo(
    () => solveRealtimeFlowBalance(nodes, edges),
    [nodes, edges],
  )

  return (
    <Box
      position="absolute"
      left="50%"
      bottom={{ base: 3, md: 4 }}
      transform="translateX(-50%)"
      zIndex={6}
      pointerEvents="none"
      maxW="calc(100% - 240px)"
    >
      <HStack
        gap={2}
        px={2.5}
        py={1.5}
        bg="rgba(255,255,255,.84)"
        borderWidth="1px"
        borderColor="border"
        borderRadius="6px"
        backdropFilter="blur(8px)"
        fontSize="xs"
        whiteSpace="nowrap"
      >
        <Text>
          {nodes.length}
          {text.nodeCountShort} / {edges.length}
          {text.edgeCountShort}
        </Text>
        <Badge variant="subtle" colorPalette="blue">
          {text.runtimeStatuses[runtime]}
        </Badge>
        <Badge
          variant="subtle"
          colorPalette={balance.status === "balanced" ? "green" : "orange"}
        >
          {text.flowPrefix} {text.flowStatuses[balance.status]}
        </Badge>
        {diagnostics > 0 && (
          <Badge variant="subtle" colorPalette="red">
            {formatUdmV2Message(text.diagnosticsCount, {
              count: diagnostics,
            })}
          </Badge>
        )}
      </HStack>
    </Box>
  )
}
