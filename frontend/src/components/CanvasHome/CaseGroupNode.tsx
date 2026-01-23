import { Box, Button, HStack, Text } from "@chakra-ui/react"
import { Link } from "@tanstack/react-router"
import type { NodeProps } from "@xyflow/react"

export type CaseGroupNodeData = {
  title: string
  subtitle?: string
  jsonUrl: string
  downloadFilename: string
  openUrl: string
}

export function CaseGroupNode({ data, selected }: NodeProps<CaseGroupNodeData>) {
  return (
    <Box
      w="100%"
      h="100%"
      bg="transparent"
      position="relative"
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
        borderColor="gray.200"
        _dark={{ borderColor: "gray.700" }}
      >
        <Text fontSize="xs" fontWeight="semibold" lineHeight="1.2">
          {data.title}
        </Text>
        {data.subtitle ? (
          <Text fontSize="10px" color="gray.500" lineHeight="1.2">
            {data.subtitle}
          </Text>
        ) : null}
        <HStack mt={2} gap={2} flexWrap="wrap">
          <Button asChild size="xs" variant="outline" className="nodrag">
            <a href={data.jsonUrl} download={data.downloadFilename}>
              下载
            </a>
          </Button>
          <Button asChild size="xs" className="nodrag">
            <Link to={data.openUrl} search={{}}>
              打开模型页
            </Link>
          </Button>
        </HStack>
      </Box>
    </Box>
  )
}
