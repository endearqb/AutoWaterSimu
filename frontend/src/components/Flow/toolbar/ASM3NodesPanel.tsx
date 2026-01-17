import NodePalette from "./NodePalette"

const nodeTypes = [
  { type: "input", label: "进水节点" },
  { type: "output", label: "出水节点" },
  { type: "asm3", label: "ASM3 节点" },
  { type: "default", label: "默认节点" },
]

const ASM3NodesPanel = () => <NodePalette nodeTypes={nodeTypes} />

export default ASM3NodesPanel
