import type { EdgeProps } from "@xyflow/react"

import { useUdmV2FlowStore } from "../state/useUdmV2FlowStore"
import { NetworkV2EdgeShell } from "./NetworkV2EdgeShell"
import type { NetworkV2EdgeData } from "./edgeModel"

export function formatPumpV2EdgeLabel(data?: NetworkV2EdgeData) {
  const flow = data?.realtime_flow_balance?.value ?? data?.flow_spec?.value ?? 0
  const unit = data?.flow_spec?.unit ?? "m3/d"
  return `Pump Q ${flow} ${unit}`
}

export function PumpV2Edge(props: EdgeProps) {
  const data = props.data as NetworkV2EdgeData | undefined
  const updateEdgeData = useUdmV2FlowStore((state) => state.updateEdgeData)
  return (
    <NetworkV2EdgeShell
      {...props}
      kind="pump"
      generatedLabel={formatPumpV2EdgeLabel(data)}
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
