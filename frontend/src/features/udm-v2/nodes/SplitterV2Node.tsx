import type { NodeProps } from "@xyflow/react"
import { GitBranch } from "lucide-react"

import { useUdmV2Messages } from "../i18n"
import { NetworkV2NodeShell } from "./NetworkV2NodeShell"
import type { NetworkV2NodeData } from "./nodeTypes"

export function SplitterV2Node(props: NodeProps) {
  const text = useUdmV2Messages()
  return (
    <NetworkV2NodeShell
      id={props.id}
      data={props.data as NetworkV2NodeData}
      selected={props.selected}
      tint="default"
      icon={GitBranch}
      subtitle={text.nodeSubtitles.splitter}
    />
  )
}
