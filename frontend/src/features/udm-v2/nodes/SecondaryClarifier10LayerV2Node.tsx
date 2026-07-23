import type { NodeProps } from "@xyflow/react"
import { Layers3 } from "lucide-react"

import { NetworkV2NodeShell } from "./NetworkV2NodeShell"
import type { NetworkV2NodeData } from "./nodeTypes"

export function SecondaryClarifier10LayerV2Node(props: NodeProps) {
  return (
    <NetworkV2NodeShell
      id={props.id}
      data={props.data as NetworkV2NodeData}
      selected={props.selected}
      accent="#15803d"
      icon={Layers3}
      subtitle="10-layer settling reference"
    />
  )
}
