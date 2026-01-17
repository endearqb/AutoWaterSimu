import {
  Background,
  BackgroundVariant,
  Controls,
  type Edge,
  type EdgeTypes,
  MarkerType,
  MiniMap,
  type Node,
  type NodeTypes,
  ReactFlow,
  useReactFlow,
} from "@xyflow/react"
import React, { useEffect, useMemo, useRef, useState } from "react"
import "@xyflow/react/dist/style.css"
import { Box } from "@chakra-ui/react"
import useFlowStore from "../../stores/flowStore"
import EditableEdge from "./edges/EditableEdge"
import {
  FLOW_GRID_SIZE,
  NODE_HOVER_PAD_PX,
  getAccentColor,
  resolveTintFromNodeType,
} from "./nodes/utils/glass"
import { HoverContext } from "./nodes/utils/hoverContext"

// 默认节点数据工厂函数类型
type DefaultNodeDataFactory = (nodeType: string) => {
  label: string
  [key: string]: any
}

interface FlowCanvasProps {
  nodeTypes: NodeTypes
  defaultNodeDataFactory: DefaultNodeDataFactory
  store?: () => any // 可选的自定义 store
}

const FlowCanvas = ({
  nodeTypes,
  defaultNodeDataFactory,
  store,
}: FlowCanvasProps) => {
  const { screenToFlowPosition } = useReactFlow()
  const flowStore = store || useFlowStore

  // 只在这里取一次 action；用 ref 保持"可更新而不致使 edgeTypes 变引用"
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    setSelectedNode,
    setSelectedEdge,
    deleteSelectedEdge,
    deleteSelectedNode,
    selectedEdge,
    selectedNode,
    addNode,
    updateEdgeFlow,
    showMiniMap,
  } = flowStore()

  const updateEdgeFlowRef = useRef(updateEdgeFlow)
  useEffect(() => {
    updateEdgeFlowRef.current = updateEdgeFlow
  }, [updateEdgeFlow])

  // ✅ edgeTypes 只创建一次；内部通过 ref 拿到最新的 updateEdgeFlow
  const edgeTypes: EdgeTypes = useMemo(() => {
    const EditableEdgeWithAction: React.FC<any> = (props) => (
      <EditableEdge
        {...props}
        updateEdgeFlow={(id: string, val: number) =>
          updateEdgeFlowRef.current(id, val)
        }
      />
    )
    EditableEdgeWithAction.displayName = "EditableEdgeWithAction"
    return { editable: React.memo(EditableEdgeWithAction) }
  }, []) // 注意：空依赖，永不变

  // 键盘事件监听
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Delete") {
        if (selectedEdge) {
          deleteSelectedEdge()
        } else if (selectedNode) {
          deleteSelectedNode()
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [selectedEdge, selectedNode, deleteSelectedEdge, deleteSelectedNode])

  // 处理节点点击事件
  const onNodeClick = (_: React.MouseEvent, node: Node) => {
    const currentNode = nodes.find((n: Node) => n.id === node.id)
    setSelectedNode(currentNode || node)
    setSelectedEdge(null) // 选中节点时取消边的选择
  }

  // 处理边点击事件
  const onEdgeClick = (_: React.MouseEvent, edge: Edge) => {
    const currentEdge = edges.find((e: Edge) => e.id === edge.id)
    setSelectedEdge(currentEdge || edge)
    setSelectedNode(null) // 选中边时取消节点的选择
  }

  // 处理画布点击事件（取消选择）
  const onPaneClick = () => {
    setSelectedNode(null)
    setSelectedEdge(null)
  }

  // 处理拖拽放置事件
  const onDragOver = (event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
  }

  // 处理放置事件
  const onDrop = (event: React.DragEvent) => {
    event.preventDefault()

    const nodeType = event.dataTransfer.getData("application/reactflow/type")
    if (!nodeType) return

    // 使用screenToFlowPosition正确转换坐标
    const position = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    })

    // 使用传入的工厂函数生成节点数据
    const nodeData = defaultNodeDataFactory(nodeType)

    // 创建新节点
    const newNode: Node = {
      id: `${nodeType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: nodeType === "custom" ? "custom" : nodeType,
      position,
      data: nodeData,
      // 为所有节点应用自定义样式
      style: {
        border: 0,
        padding: 0,
        background: "transparent",
        width: "auto",
        height: "auto",
      },
    }

    // 添加到store中
    addNode(newNode)
  }

  const rafLockRef = useRef(false)

  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)

  const handleMouseMove: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (rafLockRef.current) return
    rafLockRef.current = true
    requestAnimationFrame(() => {
      try {
        const x = e.clientX
        const y = e.clientY
        const nodesEls =
          document.querySelectorAll<HTMLElement>(".react-flow__node")
        let found: string | null = null
        for (const el of Array.from(nodesEls)) {
          const rect = el.getBoundingClientRect()
          const left = rect.left - NODE_HOVER_PAD_PX
          const right = rect.right + NODE_HOVER_PAD_PX
          const top = rect.top - NODE_HOVER_PAD_PX
          const bottom = rect.bottom + NODE_HOVER_PAD_PX
          if (x >= left && x <= right && y >= top && y <= bottom) {
            const id =
              el.getAttribute("data-id") || (el as any).dataset?.id || null
            found = id
            break
          }
        }
        setHoveredNodeId(found)
      } finally {
        rafLockRef.current = false
      }
    })
  }

  return (
    <Box
      width="100%"
      height="100%"
      // 移动端优化样式
      style={{
        touchAction: "none", // 禁用浏览器默认触摸行为
        userSelect: "none", // 禁用文本选择
        WebkitUserSelect: "none",
        MozUserSelect: "none",
        msUserSelect: "none",
        // 移动端调整
        width: window.innerWidth <= 768 ? "100vw" : "100%",
        height: window.innerWidth <= 768 ? "100vh" : "100%",
        position: window.innerWidth <= 768 ? "relative" : "static",
      }}
      onMouseMove={handleMouseMove}
    >
      {/* 添加样式标签 */}
      <style>
        {`
          /* 隐藏 MiniMap 中的 ReactFlow 品牌链接 */
          .react-flow__minimap-mask a {
            display: none !important;
          }

          /* 移除 React Flow 节点的默认选中阴影 */
          .react-flow {
            --xy-node-boxshadow-selected: none;
          }
        `}
      </style>
      <HoverContext.Provider value={{ hoveredNodeId }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          onPaneClick={onPaneClick}
          onDragOver={onDragOver}
          onDrop={onDrop}
          fitView
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          // 启用网格对齐功能
          snapToGrid={true}
          snapGrid={[FLOW_GRID_SIZE / 4, FLOW_GRID_SIZE / 4]}
          // 移动端优化配置
          minZoom={0.1}
          maxZoom={window.innerWidth > 768 ? 2 : 4} // 桌面端禁用放大，移动端允许放大
          panOnScroll={true}
          panOnDrag={true}
          zoomOnScroll={true}
          zoomOnPinch={true}
          zoomOnDoubleClick={window.innerWidth > 768} // 桌面端启用双击缩放，移动端禁用
          selectionOnDrag={window.innerWidth > 768} // 桌面端启用拖拽选择，移动端禁用
          // 触摸设备支持
          deleteKeyCode={window.innerWidth > 768 ? "Delete" : null} // 桌面端启用键盘删除，移动端禁用
          multiSelectionKeyCode={window.innerWidth > 768 ? "Meta" : null} // 桌面端启用多选快捷键，移动端禁用
          defaultEdgeOptions={{
            type: "editable",
            markerEnd: {
              type: MarkerType.Arrow,
              width: 20,
              height: 20,
            },
            style: {
              strokeWidth: 1,
            },
          }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={FLOW_GRID_SIZE}
            size={1}
            color="hsl(215.4 16.3% 56.9%)"
          />
          <Controls position="bottom-left" />
          {showMiniMap && (
            <MiniMap
              // 根据节点类型设置不同颜色
              nodeColor={(node) =>
                getAccentColor(resolveTintFromNodeType(node.type))
              }
              nodeStrokeColor="hsl(215.4 16.3% 46.9%)"
              nodeStrokeWidth={1}
              nodeBorderRadius={3}
              // 更好的遮罩效果
              maskColor="hsla(0, 0%, 0%, 0.05)"
              // 启用交互
              pannable={true}
              zoomable={true}
              position="bottom-right"
              style={{
                backgroundColor: "hsl(0 0% 100% / 0.95)",
                border: "1px solid hsl(214.3 31.8% 91.4%)",
                borderRadius: "6px",
                backdropFilter: "blur(8px)",
                boxShadow: "0 4px 6px -1px hsla(222.2, 84%, 4.9%, 0.1)",
                // 移动端调整 - 使用JavaScript检测
                width: window.innerWidth <= 768 ? "80px" : undefined,
                height: window.innerWidth <= 768 ? "60px" : undefined,
                bottom: window.innerWidth <= 768 ? "100px" : undefined,
                right: window.innerWidth <= 768 ? "20px" : undefined,
                display: window.innerWidth <= 480 ? "none" : "block",
              }}
            />
          )}
        </ReactFlow>
      </HoverContext.Provider>
    </Box>
  )
}

export default FlowCanvas
export type { DefaultNodeDataFactory }
