import type { NodeProps } from "@xyflow/react"
import { RadioTower } from "lucide-react"

import { NetworkV2NodeShell } from "./NetworkV2NodeShell"
import type { NetworkV2NodeData } from "./nodeTypes"

export function ControllerV2Node(props: NodeProps) {
  return (
    <NetworkV2NodeShell
      data={props.data as NetworkV2NodeData}
      selected={props.selected}
      accent="#0f766e"
      icon={RadioTower}
      subtitle="Signal controller"
    />
  )
}
