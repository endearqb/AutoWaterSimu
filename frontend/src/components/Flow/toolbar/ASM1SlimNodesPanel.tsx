import NodePalette from "./NodePalette"

const nodeTypes = [
  { type: "input", label: "进水节点" },
  { type: "output", label: "出水节点" },
  { type: "asmslim", label: "ASM Slim 节点" },
  { type: "default", label: "默认节点" },
]

const ASM1SlimNodesPanel = () => <NodePalette nodeTypes={nodeTypes} />

export default ASM1SlimNodesPanel
