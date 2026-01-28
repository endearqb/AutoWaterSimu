import { Box, Button, HStack, Text } from "@chakra-ui/react"
import { Link } from "@tanstack/react-router"
import type { Node, NodeProps } from "@xyflow/react"
import { GROUP_FRAME_STYLE, HEAD_BAR_STYLE } from "./headBarStyles"

export type CaseGroupNodeData = {
  title: string
  subtitle?: string
  jsonUrl: string
  downloadFilename: string
  openUrl: string
}

export function CaseGroupNode({
  data,
  selected,
}: NodeProps<Node<CaseGroupNodeData>>) {
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
