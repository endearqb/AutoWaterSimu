import type { NodeProps } from "@xyflow/react"
import { FlaskConical } from "lucide-react"

import { useUdmV2Messages } from "../i18n"
import { NetworkV2NodeShell } from "./NetworkV2NodeShell"
import type { NetworkV2NodeData } from "./nodeTypes"

export function UdmReactorV2Node(props: NodeProps) {
  const text = useUdmV2Messages()
  return (
    <NetworkV2NodeShell
      id={props.id}
      data={props.data as NetworkV2NodeData}
      selected={props.selected}
      tint="udm"
      icon={FlaskConical}
      subtitle={text.nodeSubtitles.udmReactor}
    />
  )
}
