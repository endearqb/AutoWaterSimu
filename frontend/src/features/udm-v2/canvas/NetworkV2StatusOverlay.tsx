import { Badge, Box, HStack, Text } from "@chakra-ui/react"
import { useMemo } from "react"

import { solveRealtimeFlowBalance } from "../flow/realtimeFlowBalance"
import { useUdmV2FlowStore } from "../state/useUdmV2FlowStore"

export function NetworkV2StatusOverlay() {
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
          {nodes.length}N / {edges.length}E
        </Text>
        <Badge variant="subtle" colorPalette="blue">
          {runtime}
        </Badge>
        <Badge
          variant="subtle"
          colorPalette={balance.status === "balanced" ? "green" : "orange"}
        >
          flow {balance.status}
        </Badge>
        {diagnostics > 0 && (
          <Badge variant="subtle" colorPalette="red">
            {diagnostics} diagnostics
          </Badge>
        )}
      </HStack>
    </Box>
  )
}
