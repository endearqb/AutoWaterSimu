import { Badge, HStack, Text } from "@chakra-ui/react"

import { useUdmV2FlowStore } from "../state/useUdmV2FlowStore"

export function NetworkV2StatusBar() {
  const nodeCount = useUdmV2FlowStore((state) => state.nodes.length)
  const edgeCount = useUdmV2FlowStore((state) => state.edges.length)
  const graphFamily = useUdmV2FlowStore((state) => state.graphFamily)
  const graphName = useUdmV2FlowStore((state) => state.currentNetworkGraphName)
  const dirty = useUdmV2FlowStore((state) => state.dirty)
  const runtimeStatus = useUdmV2FlowStore((state) => state.runtimeStatus)

  return (
    <HStack
      minH="36px"
      px={3}
      borderWidth="1px"
      borderColor="border"
      bg="bg"
      fontSize="sm"
      justify="space-between"
    >
      <HStack gap={3}>
        <Text fontWeight="medium">{graphName}</Text>
        <Badge variant="subtle">{graphFamily}</Badge>
        {dirty && <Badge colorPalette="orange">dirty</Badge>}
      </HStack>
      <HStack gap={3} color="fg.muted">
        <Text>{nodeCount} nodes</Text>
        <Text>{edgeCount} edges</Text>
        <Badge colorPalette="blue">{runtimeStatus}</Badge>
      </HStack>
    </HStack>
  )
}
