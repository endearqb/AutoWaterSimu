import type { NodeProps } from "@xyflow/react"
import { SquareArrowOutUpRight } from "lucide-react"

import { NetworkV2NodeShell } from "./NetworkV2NodeShell"
import type { NetworkV2NodeData } from "./nodeTypes"

export function BoundaryV2Node(props: NodeProps) {
  return (
    <NetworkV2NodeShell
      id={props.id}
      data={props.data as NetworkV2NodeData}
      selected={props.selected}
      accent="#2563eb"
      icon={SquareArrowOutUpRight}
      subtitle="Boundary source or sink"
    />
  )
}
