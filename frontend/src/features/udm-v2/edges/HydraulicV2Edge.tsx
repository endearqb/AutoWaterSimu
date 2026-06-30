import type { EdgeProps } from "@xyflow/react"

import type { NetworkV2EdgeData } from "./edgeModel"
import { NetworkV2EdgeShell } from "./NetworkV2EdgeShell"

export function formatHydraulicV2EdgeLabel(data?: NetworkV2EdgeData) {
  const flow = data?.flow_spec?.value ?? 0
  const unit = data?.flow_spec?.unit ?? "m3/d"
  return `Q ${flow} ${unit}`
}

export function HydraulicV2Edge(props: EdgeProps) {
  return (
    <NetworkV2EdgeShell
      {...props}
      label={formatHydraulicV2EdgeLabel(props.data as NetworkV2EdgeData)}
      stroke="#2563eb"
    />
  )
}
