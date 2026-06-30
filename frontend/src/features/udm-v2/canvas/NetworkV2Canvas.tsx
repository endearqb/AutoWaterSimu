import { Box, Text } from "@chakra-ui/react"
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"

import { useUdmV2FlowStore } from "../state/useUdmV2FlowStore"

export function NetworkV2Canvas() {
  const nodes = useUdmV2FlowStore((state) => state.nodes)
  const edges = useUdmV2FlowStore((state) => state.edges)
  const onNodesChange = useUdmV2FlowStore((state) => state.onNodesChange)
  const onEdgesChange = useUdmV2FlowStore((state) => state.onEdgesChange)
  const onConnect = useUdmV2FlowStore((state) => state.onConnect)
  const setSelectedNodeId = useUdmV2FlowStore(
    (state) => state.setSelectedNodeId,
  )
  const setSelectedEdgeId = useUdmV2FlowStore(
    (state) => state.setSelectedEdgeId,
  )
  const setViewport = useUdmV2FlowStore((state) => state.setViewport)
  const showMiniMap = useUdmV2FlowStore((state) => state.showMiniMap)

  return (
    <Box h="full" minH="520px" position="relative" data-testid="udm-v2-canvas">
      <ReactFlow
        aria-label="UDM Network v2 canvas"
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onMoveEnd={(_, viewport) => setViewport(viewport)}
        onSelectionChange={({ nodes: selectedNodes, edges: selectedEdges }) => {
          setSelectedNodeId(selectedNodes[0]?.id ?? null)
          setSelectedEdgeId(selectedEdges[0]?.id ?? null)
        }}
        fitView
      >
        <Background color="#d4d8dd" gap={20} />
        <Controls />
        {showMiniMap && <MiniMap pannable zoomable />}
      </ReactFlow>

      {nodes.length === 0 && edges.length === 0 && (
        <Box
          position="absolute"
          inset="0"
          pointerEvents="none"
          display="grid"
          placeItems="center"
        >
          <Text color="fg.muted" fontSize="sm">
            Empty UDM Network v2 graph
          </Text>
        </Box>
      )}
    </Box>
  )
}
