import { Box, Text } from "@chakra-ui/react"
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  useReactFlow,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import type { DragEvent } from "react"

import { NetworkV2EdgeModeSelector } from "../edges/NetworkV2EdgeModeSelector"
import { networkV2EdgeTypeByKind } from "../edges/edgeModel"
import { networkV2EdgeTypes } from "../edges/edgeTypes"
import {
  createNetworkV2Node,
  networkV2NodeTypes,
  normalizeNetworkV2NodeKind,
} from "../nodes/nodeTypes"
import {
  NETWORK_V2_NODE_DRAG_MIME,
  NetworkV2NodePalette,
} from "../palette/NetworkV2NodePalette"
import { useUdmV2FlowStore } from "../state/useUdmV2FlowStore"

export function NetworkV2Canvas() {
  const { screenToFlowPosition } = useReactFlow()
  const nodes = useUdmV2FlowStore((state) => state.nodes)
  const edges = useUdmV2FlowStore((state) => state.edges)
  const onNodesChange = useUdmV2FlowStore((state) => state.onNodesChange)
  const onEdgesChange = useUdmV2FlowStore((state) => state.onEdgesChange)
  const onConnect = useUdmV2FlowStore((state) => state.onConnect)
  const addNode = useUdmV2FlowStore((state) => state.addNode)
  const setSelectedNodeId = useUdmV2FlowStore(
    (state) => state.setSelectedNodeId,
  )
  const setSelectedEdgeId = useUdmV2FlowStore(
    (state) => state.setSelectedEdgeId,
  )
  const setViewport = useUdmV2FlowStore((state) => state.setViewport)
  const showMiniMap = useUdmV2FlowStore((state) => state.showMiniMap)
  const activeEdgeKind = useUdmV2FlowStore((state) => state.activeEdgeKind)
  const setActiveEdgeKind = useUdmV2FlowStore(
    (state) => state.setActiveEdgeKind,
  )

  const handleDragOver = (event: DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = "copy"
  }

  const handleDrop = (event: DragEvent) => {
    event.preventDefault()
    const rawKind = event.dataTransfer.getData(NETWORK_V2_NODE_DRAG_MIME)
    if (!rawKind) {
      return
    }

    const kind = normalizeNetworkV2NodeKind(rawKind)
    addNode(
      createNetworkV2Node(
        kind,
        screenToFlowPosition({ x: event.clientX, y: event.clientY }),
      ),
    )
  }

  return (
    <Box h="full" minH="520px" position="relative" data-testid="udm-v2-canvas">
      <NetworkV2EdgeModeSelector
        activeKind={activeEdgeKind}
        onChange={setActiveEdgeKind}
      />
      <NetworkV2NodePalette />
      <ReactFlow
        aria-label="UDM Network v2 canvas"
        nodes={nodes}
        edges={edges}
        nodeTypes={networkV2NodeTypes}
        edgeTypes={networkV2EdgeTypes}
        defaultEdgeOptions={{
          type: networkV2EdgeTypeByKind[activeEdgeKind],
        }}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
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
