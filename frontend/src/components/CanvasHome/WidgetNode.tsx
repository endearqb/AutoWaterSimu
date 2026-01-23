import { Box, Card, HStack, Text } from "@chakra-ui/react"
import type { NodeProps } from "@xyflow/react"
import type { ReactNode } from "react"

export type WidgetNodeData = {
  title: string
  subtitle?: string
  content: ReactNode
  minW?: string | number
  maxW?: string | number
  maxH?: string | number
}

export function WidgetNode({ data, selected }: NodeProps<WidgetNodeData>) {
  return (
    <Card.Root
      borderWidth="1px"
      borderColor={selected ? "blue.400" : "gray.200"}
      _dark={{ borderColor: selected ? "blue.300" : "gray.700" }}
      boxShadow={selected ? "lg" : "md"}
      bg="white"
      _dark={{ bg: "gray.900" }}
      minW={data.minW ?? 360}
      maxW={data.maxW ?? 720}
      maxH={data.maxH}
      overflow="hidden"
    >
      <Card.Header px={4} py={3}>
        <HStack justify="space-between" gap={3}>
          <Box minW={0}>
            <Text fontSize="md" fontWeight="semibold" noOfLines={1}>
              {data.title}
            </Text>
            {data.subtitle ? (
              <Text fontSize="xs" color="gray.500" noOfLines={1}>
                {data.subtitle}
              </Text>
            ) : null}
          </Box>
        </HStack>
      </Card.Header>
      <Card.Body px={4} py={3}>
        {data.content}
      </Card.Body>
    </Card.Root>
  )
}

