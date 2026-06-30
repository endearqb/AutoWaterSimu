import type { EdgeProps } from "@xyflow/react"

import type { NetworkV2EdgeData } from "./edgeModel"
import { NetworkV2EdgeShell } from "./NetworkV2EdgeShell"

export function formatPumpV2EdgeLabel(data?: NetworkV2EdgeData) {
  const flow = data?.flow_spec?.value ?? 0
  const unit = data?.flow_spec?.unit ?? "m3/d"
  return `Pump Q ${flow} ${unit}`
}

export function PumpV2Edge(props: EdgeProps) {
  return (
    <NetworkV2EdgeShell
      {...props}
      label={formatPumpV2EdgeLabel(props.data as NetworkV2EdgeData)}
      stroke="#b45309"
    />
  )
}
