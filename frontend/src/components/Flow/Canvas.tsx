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
import React, { useEffect, useMemo, useRef } from "react"
import "@xyflow/react/dist/style.css"
import { Box } from "@chakra-ui/react"
import { useI18n } from "../../i18n"
import useFlowStore from "../../stores/flowStore"
import EditableEdge from "./edges/EditableEdge"
import ASM1Node from "./nodes/ASM1Node"
import ASMslimNode from "./nodes/ASMslimNode"
import DefaultNode from "./nodes/DefaultNode"
import InputNode from "./nodes/InputNode"
import OutputNode from "./nodes/OutputNode"
import {
  FLOW_GRID_SIZE,
  GLASS_NODE_RADIUS,
  getAccentColor,
  getOutlineColor,
  resolveTintFromNodeType,
} from "./nodes/utils/glass"

// 在组件外部定义节点类型，避免重新渲染
const nodeTypes: NodeTypes = {
  default: DefaultNode as any,
  input: InputNode as any,
  output: OutputNode as any,
  asm1: (props: any) => <ASM1Node {...props} store={useFlowStore as any} />,
  asmslim: ASMslimNode as any,
  asm1slim: ASMslimNode as any,
}

const Canvas = () => {
  const { t } = useI18n()
  const { screenToFlowPosition } = useReactFlow()
  const {
    nodes,
    edges,
    updateEdgeFlow,
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
    showMiniMap,
  } = useFlowStore()

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

  // 修改键盘事件监听
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
    // 从store中获取最新的节点数据
    const currentNode = nodes.find((n) => n.id === node.id)
    setSelectedNode(currentNode || node)
    setSelectedEdge(null) // 选中节点时取消边的选择
  }

  // 处理边点击事件
  const onEdgeClick = (_: React.MouseEvent, edge: Edge) => {
    // 从store中获取最新的边数据
    const currentEdge = edges.find((e) => e.id === edge.id)
    setSelectedEdge(currentEdge || edge)
    setSelectedNode(null) // 选中边时取消节点的选择
  }

  // 处理画布点击事件（取消选择）
  const onPaneClick = () => {
    setSelectedNode(null)
    setSelectedEdge(null)
  }

  // 处理拖拽放置事件 - 使用标准的React事件类型
  const onDragOver = (event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
  }

  // 处理放置事件 - 修改后的版本
  const onDrop = (event: React.DragEvent) => {
    event.preventDefault()

    const nodeType = event.dataTransfer.getData("application/reactflow/type")
    if (!nodeType) return

    // 使用screenToFlowPosition正确转换坐标
    const position = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    })

    // 创建新节点，为所有节点应用自定义样式
    const newNode: Node = {
      id: `${nodeType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: nodeType === "custom" ? "custom" : nodeType,
      position,
      data: {
        label:
          nodeType === "custom"
            ? t("flow.canvas.doubleClickEdit")
            : nodeType === "default"
              ? t("flow.node.default")
              : nodeType === "input"
                ? t("flow.node.input")
                : nodeType === "output"
                  ? t("flow.node.output")
                  : t("common.unknown"),
      },
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

  // 处理边双击事件
  // const onEdgeDoubleClick = (_: React.MouseEvent, edge: Edge) => {
  //   const currentFlow = (edge.data?.flow as number) || 0;
  //   const newFlow = prompt('请输入流量值(m³/h):', currentFlow.toString());
  //   if (newFlow !== null && !isNaN(parseFloat(newFlow))) {
  //     updateEdgeFlow(edge.id, parseFloat(newFlow));
  //   }
  // };

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
    >
      {/* 添加样式标签 */}
      <style>
        {`
          /* 隐藏 MiniMap 中的 ReactFlow 品牌链接 */
          .react-flow__minimap-mask a {
            display: none !important;
          }
        `}
      </style>
      <ReactFlow
        nodes={nodes.map((node) => {
          const tint = resolveTintFromNodeType(node.type)
          return {
            ...node,
            style: {
              ...node.style,
              ...(selectedNode?.id === node.id
                ? {
                    outline: `2px solid ${getOutlineColor(tint)}`,
                    outlineOffset: "2px",
                    borderRadius: GLASS_NODE_RADIUS,
                  }
                : {}),
            },
          }
        })}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick} // 添加边点击事件
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
    </Box>
  )
}

export default Canvas
