import type { EdgeProps } from "@xyflow/react"

import type { NetworkV2EdgeData } from "./edgeModel"
import { NetworkV2EdgeShell } from "./NetworkV2EdgeShell"

export function formatSignalV2EdgeLabel(data?: NetworkV2EdgeData) {
  return data?.signal_spec?.signal_name || "signal"
}

export function SignalV2Edge(props: EdgeProps) {
  return (
    <NetworkV2EdgeShell
      {...props}
      label={formatSignalV2EdgeLabel(props.data as NetworkV2EdgeData)}
      stroke="#7c3aed"
      strokeDasharray="1 6"
    />
  )
}
