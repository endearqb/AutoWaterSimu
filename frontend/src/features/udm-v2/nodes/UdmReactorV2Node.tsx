import type { NodeProps } from "@xyflow/react"
import { FlaskConical } from "lucide-react"

import { NetworkV2NodeShell } from "./NetworkV2NodeShell"
import type { NetworkV2NodeData } from "./nodeTypes"

export function UdmReactorV2Node(props: NodeProps) {
  return (
    <NetworkV2NodeShell
      id={props.id}
      data={props.data as NetworkV2NodeData}
      selected={props.selected}
      tint="udm"
      icon={FlaskConical}
      subtitle="UDM reaction unit"
    />
  )
}
