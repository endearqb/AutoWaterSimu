import { Box, Text } from "@chakra-ui/react"
import type { Node, NodeProps } from "@xyflow/react"
import { GROUP_FRAME_STYLE, HEAD_BAR_STYLE } from "./headBarStyles"

export type GenericGroupNodeData = {
  title: string
  subtitle?: string
  variant?: "calculator"
}

export function GenericGroupNode({
  data,
  selected,
}: NodeProps<Node<GenericGroupNodeData>>) {
  return (
    <Box
      w="100%"
      h="100%"
      position="relative"
      {...GROUP_FRAME_STYLE}
      borderColor={selected ? "blue.400" : "gray.300"}
      _dark={{ borderColor: selected ? "blue.300" : "gray.600" }}
    >
      <Box
        position="absolute"
        top={2}
        left={3}
        {...HEAD_BAR_STYLE}
        px={2}
        py={1}
        borderColor={selected ? "blue.400" : "gray.300"}
        _dark={{
          bg: "rgba(17,24,39,0.6)",
          borderColor: selected ? "blue.300" : "gray.600",
        }}
      >
        <Text fontSize="xs" fontWeight="semibold" lineHeight="1.2">
          {data.title}
        </Text>
        {data.subtitle ? (
          <Text fontSize="10px" color="gray.500" lineHeight="1.2">
            {data.subtitle}
          </Text>
        ) : null}
      </Box>
    </Box>
  )
}
