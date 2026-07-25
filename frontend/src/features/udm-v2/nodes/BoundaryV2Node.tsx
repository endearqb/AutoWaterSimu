import type { NodeProps } from "@xyflow/react"
import { SquareArrowOutUpRight } from "lucide-react"

import { NetworkV2NodeShell } from "./NetworkV2NodeShell"
import type { NetworkV2NodeData } from "./nodeTypes"

export function BoundaryV2Node(props: NodeProps) {
  const data = props.data as NetworkV2NodeData
  const isSink =
    data.boundary?.boundary_kind === "sink" ||
    data.boundary?.boundary_kind === "effluent"
  return (
    <NetworkV2NodeShell
      id={props.id}
      data={data}
      selected={props.selected}
      tint={isSink ? "output" : "input"}
      icon={SquareArrowOutUpRight}
      subtitle={isSink ? "Effluent boundary" : "Influent boundary"}
    />
  )
}
