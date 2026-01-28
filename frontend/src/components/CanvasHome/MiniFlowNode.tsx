import { Badge, Box, HStack, Text } from "@chakra-ui/react"
import type { Node, NodeProps } from "@xyflow/react"

export type MiniFlowNodeData = {
  label?: string
  nodeType?: string
}

export function MiniFlowNode({
  data,
  selected,
}: NodeProps<Node<MiniFlowNodeData>>) {
  return (
    <Box
      px={3}
      py={2}
      borderWidth="1px"
      borderColor={selected ? "blue.400" : "gray.200"}
      borderRadius="md"
      bg="white"
      _dark={{
        bg: "gray.900",
        borderColor: selected ? "blue.300" : "gray.700",
      }}
      boxShadow={selected ? "md" : "sm"}
      minW="120px"
    >
      <HStack justify="space-between" gap={2}>
        <Text fontSize="sm" fontWeight="semibold" lineClamp={1}>
          {data.label || "未命名"}
        </Text>
        {data.nodeType ? (
          <Badge variant="subtle" fontSize="10px">
            {data.nodeType}
          </Badge>
        ) : null}
      </HStack>
    </Box>
  )
}

