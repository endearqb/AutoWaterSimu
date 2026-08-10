import type { EdgeProps } from "@xyflow/react"

import { useUdmV2FlowStore } from "../state/useUdmV2FlowStore"
import { formatHydraulicV2EdgeLabel } from "./HydraulicV2Edge"
import { NetworkV2EdgeShell } from "./NetworkV2EdgeShell"
import type { NetworkV2EdgeData } from "./edgeModel"

export function formatPumpV2EdgeLabel(data?: NetworkV2EdgeData) {
  return formatHydraulicV2EdgeLabel(data)
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
