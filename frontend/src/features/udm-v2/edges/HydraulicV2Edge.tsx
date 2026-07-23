import type { EdgeProps } from "@xyflow/react"

import { useUdmV2FlowStore } from "../state/useUdmV2FlowStore"
import { NetworkV2EdgeShell } from "./NetworkV2EdgeShell"
import type { NetworkV2EdgeData } from "./edgeModel"

export function formatHydraulicV2EdgeLabel(data?: NetworkV2EdgeData) {
  const flow = data?.realtime_flow_balance?.value ?? data?.flow_spec?.value ?? 0
  const unit = data?.flow_spec?.unit ?? "m3/d"
  return `Q ${flow} ${unit}`
}

export function HydraulicV2Edge(props: EdgeProps) {
  const data = props.data as NetworkV2EdgeData | undefined
  const updateEdgeData = useUdmV2FlowStore((state) => state.updateEdgeData)
  return (
    <NetworkV2EdgeShell
      {...props}
      kind="hydraulic"
      generatedLabel={formatHydraulicV2EdgeLabel(data)}
      editInputType="number"
      editValue={String(data?.flow_spec?.value ?? "")}
      onCommitEdit={(raw) => {
        const value = Number(raw)
        if (Number.isFinite(value)) {
          updateEdgeData(props.id, {
            flow_spec: { ...data?.flow_spec, mode: "fixed", value },
          })
        }
      }}
    />
  )
}
