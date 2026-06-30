import type { EdgeProps } from "@xyflow/react"

import { NetworkV2EdgeShell } from "./NetworkV2EdgeShell"

export function formatSettlingV2EdgeLabel() {
  return "J_TSS"
}

export function SettlingV2Edge(props: EdgeProps) {
  return (
    <NetworkV2EdgeShell
      {...props}
      label={formatSettlingV2EdgeLabel()}
      stroke="#15803d"
      strokeDasharray="6 4"
    />
  )
}
