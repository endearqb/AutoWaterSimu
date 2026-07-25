import type { NodeProps } from "@xyflow/react"
import { Layers3 } from "lucide-react"

import { NetworkV2NodeShell } from "./NetworkV2NodeShell"
import type { NetworkV2NodeData } from "./nodeTypes"

export function ClarifierLayerV2Node(props: NodeProps) {
  return (
    <NetworkV2NodeShell
      id={props.id}
      data={props.data as NetworkV2NodeData}
      selected={props.selected}
      tint="asm1"
      icon={Layers3}
      subtitle="Secondary clarifier layer"
    />
  )
}
