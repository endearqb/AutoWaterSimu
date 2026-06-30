import { Box, Flex, Heading, Text } from "@chakra-ui/react"
import type { ReactNode } from "react"

type NetworkV2FlowLayoutProps = {
  canvas: ReactNode
  inspector: ReactNode
  statusBar: ReactNode
  toolbar: ReactNode
}

export function NetworkV2FlowLayout({
  canvas,
  inspector,
  statusBar,
  toolbar,
}: NetworkV2FlowLayoutProps) {
  return (
    <Flex direction="column" h="calc(100vh - 32px)" minH="640px" gap={3}>
      <Flex align="center" justify="space-between" gap={4}>
        <Box>
          <Heading as="h1" size="lg" letterSpacing="0">
            UDM Network v2
          </Heading>
          <Text color="fg.muted" fontSize="sm">
            Runtime status is pending until the worker implementation lands.
          </Text>
        </Box>
        {toolbar}
      </Flex>

      <Flex flex="1" minH={0} gap={3}>
        <Box
          flex="1"
          minW={0}
          borderWidth="1px"
          borderColor="border"
          bg="bg"
          overflow="hidden"
        >
          {canvas}
        </Box>
        <Box
          w={{ base: "280px", xl: "340px" }}
          borderWidth="1px"
          borderColor="border"
          bg="bg"
          overflow="auto"
        >
          {inspector}
        </Box>
      </Flex>

      {statusBar}
    </Flex>
  )
}
