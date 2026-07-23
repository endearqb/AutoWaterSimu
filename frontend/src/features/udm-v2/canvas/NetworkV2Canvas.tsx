import { Box, Text } from "@chakra-ui/react"
import {
  Background,
  BackgroundVariant,
  type Connection,
  Controls,
  type Edge,
  MiniMap,
  ReactFlow,
  useReactFlow,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { type DragEvent, useCallback, useMemo, useState } from "react"

import { EdgeLaneProvider } from "../edges/EdgeLaneContext"
import { validateNetworkV2Connection } from "../edges/connectionRules"
import { computeEdgeLanes } from "../edges/edgeLanes"
import type { NetworkV2EdgeData } from "../edges/edgeModel"
import { networkV2EdgeTypes } from "../edges/edgeTypes"
import { NETWORK_V2_EDGE_VISUALS } from "../edges/edgeVisuals"
import { decorateEdgesForRender } from "../edges/renderEdgeVisuals"
import { solveRealtimeFlowBalance } from "../flow/realtimeFlowBalance"
import { useUdmV2Messages } from "../i18n"
import { NetworkV2InteractionProvider } from "../interaction/NetworkV2InteractionContext"
import {
  createNetworkV2Node,
  networkV2NodeTypes,
  normalizeNetworkV2NodeKind,
} from "../nodes/nodeTypes"
import { NETWORK_V2_NODE_DRAG_MIME } from "../palette/NetworkV2NodePalette"
import { useUdmV2FlowStore } from "../state/useUdmV2FlowStore"

export function NetworkV2Canvas() {
  const text = useUdmV2Messages()
  const { screenToFlowPosition } = useReactFlow()
  const nodes = useUdmV2FlowStore((state) => state.nodes)
  const edges = useUdmV2FlowStore((state) => state.edges)
  const viewport = useUdmV2FlowStore((state) => state.viewport)
  const activeEdgeKind = useUdmV2FlowStore((state) => state.activeEdgeKind)
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
  const clearSelection = useUdmV2FlowStore((state) => state.clearSelection)
  const setViewport = useUdmV2FlowStore((state) => state.setViewport)
  const showMiniMap = useUdmV2FlowStore((state) => state.showMiniMap)
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [connectionInProgress, setConnectionInProgress] = useState(false)

  const lanes = useMemo(() => computeEdgeLanes(edges), [edges])
  const balance = useMemo(
    () => solveRealtimeFlowBalance(nodes, edges),
    [nodes, edges],
  )
  const renderedEdges = useMemo(
    () =>
      decorateEdgesForRender(
        edges.map((edge) => ({
          ...edge,
          data: edge.data && {
            ...edge.data,
            realtime_flow_balance: {
              status: balance.status,
              value: balance.flows[edge.id],
              residual: balance.maxResidual,
            },
          },
        })),
      ),
    [balance, edges],
  )
  const isValidConnection = useCallback(
    (connection: Connection | Edge<NetworkV2EdgeData>) =>
      validateNetworkV2Connection({
        connection,
        nodes,
        edgeKind: activeEdgeKind,
      }).valid,
    [activeEdgeKind, nodes],
  )

  const onDrop = (event: DragEvent) => {
    event.preventDefault()
    const kind = event.dataTransfer.getData(NETWORK_V2_NODE_DRAG_MIME)
    if (!kind) return
    addNode(
      createNetworkV2Node(
        normalizeNetworkV2NodeKind(kind),
        screenToFlowPosition({ x: event.clientX, y: event.clientY }),
      ),
    )
  }
  const activeVisual = NETWORK_V2_EDGE_VISUALS[activeEdgeKind]
  const mobile =
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 768px)").matches

  return (
    <Box
      h="full"
      minH="520px"
      position="relative"
      data-testid="udm-v2-canvas"
      css={{
        "& .react-flow__edge-interaction": {
          stroke: "transparent",
          pointerEvents: "stroke",
        },
      }}
    >
      <NetworkV2InteractionProvider
        value={{ activeEdgeKind, connectionInProgress, hoveredNodeId }}
      >
        <EdgeLaneProvider value={lanes}>
          <ReactFlow
            aria-label="UDM Network v2 canvas"
            nodes={nodes}
            edges={renderedEdges}
            nodeTypes={networkV2NodeTypes}
            edgeTypes={networkV2EdgeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            isValidConnection={isValidConnection}
            onDragOver={(event) => {
              event.preventDefault()
              event.dataTransfer.dropEffect = "copy"
            }}
            onDrop={onDrop}
            onMoveEnd={(_, nextViewport) => setViewport(nextViewport)}
            onNodeClick={(_, node) => setSelectedNodeId(node.id)}
            onEdgeClick={(_, edge) => setSelectedEdgeId(edge.id)}
            onPaneClick={clearSelection}
            onNodeMouseEnter={(_, node) => setHoveredNodeId(node.id)}
            onNodeMouseLeave={() => setHoveredNodeId(null)}
            onConnectStart={() => setConnectionInProgress(true)}
            onConnectEnd={() => setConnectionInProgress(false)}
            connectionLineStyle={{
              stroke: activeVisual.stroke,
              strokeWidth: 1.5,
              strokeDasharray: activeVisual.dasharray,
            }}
            defaultViewport={viewport ?? undefined}
            fitView={!viewport}
            fitViewOptions={{ padding: 0.15, maxZoom: 1 }}
            snapToGrid
            snapGrid={[5, 5]}
            minZoom={0.1}
            maxZoom={2}
            panOnScroll
            panOnDrag
            zoomOnScroll
            zoomOnPinch
            zoomOnDoubleClick={!mobile}
            selectionOnDrag={!mobile}
            deleteKeyCode={mobile ? null : "Delete"}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              color="hsl(215.4 16.3% 56.9%)"
            />
            <Controls position="bottom-left" />
            {showMiniMap && (
              <MiniMap
                position="bottom-right"
                pannable
                zoomable
                nodeStrokeWidth={1}
                nodeBorderRadius={3}
                maskColor="hsla(0,0%,0%,.05)"
              />
            )}
          </ReactFlow>
        </EdgeLaneProvider>
      </NetworkV2InteractionProvider>

      {nodes.length === 0 && (
        <Box
          position="absolute"
          inset="0"
          display="grid"
          placeItems="center"
          pointerEvents="none"
        >
          <Text color="fg.muted" fontSize="sm">
            {text.canvasEmpty}
          </Text>
        </Box>
      )}
    </Box>
  )
}
