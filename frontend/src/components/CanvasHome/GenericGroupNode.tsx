import { Box, Text } from "@chakra-ui/react"
import type { NodeProps } from "@xyflow/react"

export type GenericGroupNodeData = {
  title: string
  subtitle?: string
  variant?: "calculator"
}

export function GenericGroupNode({ data, selected }: NodeProps<GenericGroupNodeData>) {
  const isCalculatorGroup = data.variant === "calculator"
  return (
    <Box
      w="100%"
      h="100%"
      bg="transparent"
      position="relative"
      borderWidth={isCalculatorGroup ? "2px" : "0px"}
      borderStyle={isCalculatorGroup ? "solid" : "none"}
      borderColor={selected ? "blue.400" : "gray.300"}
      _dark={{ borderColor: selected ? "blue.300" : "gray.600" }}
      borderRadius={isCalculatorGroup ? "lg" : "0px"}
    >
      <Box
        position="absolute"
        top={2}
        left={3}
        bg="white"
        _dark={{ bg: "gray.900" }}
        borderRadius="md"
        px={2}
        py={1}
        borderWidth="1px"
        borderColor={selected ? "blue.400" : "gray.200"}
        _dark={{ borderColor: selected ? "blue.300" : "gray.700" }}
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
