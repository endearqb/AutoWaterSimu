import type { NodeProps } from "@xyflow/react"
import { RadioTower } from "lucide-react"

import { useUdmV2Messages } from "../i18n"
import { NetworkV2NodeShell } from "./NetworkV2NodeShell"
import type { NetworkV2NodeData } from "./nodeTypes"

export function ControllerV2Node(props: NodeProps) {
  const text = useUdmV2Messages()
  return (
    <NetworkV2NodeShell
      id={props.id}
      data={props.data as NetworkV2NodeData}
      selected={props.selected}
      tint="traffic"
      icon={RadioTower}
      subtitle={text.nodeSubtitles.controller}
    />
  )
}
