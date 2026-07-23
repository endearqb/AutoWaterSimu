import type { NodeProps } from "@xyflow/react"
import { GitBranch } from "lucide-react"

import { NetworkV2NodeShell } from "./NetworkV2NodeShell"
import type { NetworkV2NodeData } from "./nodeTypes"

export function SplitterV2Node(props: NodeProps) {
  return (
    <NetworkV2NodeShell
      id={props.id}
      data={props.data as NetworkV2NodeData}
      selected={props.selected}
      accent="#b45309"
      icon={GitBranch}
      subtitle="Hydraulic split junction"
    />
  )
}
