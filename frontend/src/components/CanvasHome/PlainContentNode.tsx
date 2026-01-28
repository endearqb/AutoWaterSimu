import { Box } from "@chakra-ui/react"
import type { Node, NodeProps } from "@xyflow/react"
import type { ReactNode } from "react"

export type PlainContentNodeData = {
  content: ReactNode
  width?: number
}

export function PlainContentNode({ data }: NodeProps<Node<PlainContentNodeData>>) {
  return (
    <Box position="relative" w={data.width ? `${data.width}px` : undefined}>
      <Box
        className="drag-handle"
        cursor="grab"
        position="absolute"
        top={0}
        left={0}
        right={0}
        h="18px"
        zIndex={2}
      />
      <Box className="nodrag" pt="18px">
        {data.content}
      </Box>
    </Box>
  )
}
