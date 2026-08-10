import type { NodeProps } from "@xyflow/react"
import { Layers3 } from "lucide-react"

import { useUdmV2Messages } from "../i18n"
import { NetworkV2NodeShell } from "./NetworkV2NodeShell"
import type { NetworkV2NodeData } from "./nodeTypes"

export function SecondaryClarifier10LayerV2Node(props: NodeProps) {
  const text = useUdmV2Messages()
  return (
    <NetworkV2NodeShell
      id={props.id}
      data={props.data as NetworkV2NodeData}
      selected={props.selected}
      tint="asm1"
      icon={Layers3}
      subtitle={text.nodeSubtitles.clarifier}
    />
  )
}
