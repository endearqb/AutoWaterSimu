import type { EdgeProps } from "@xyflow/react"

import { useUdmV2FlowStore } from "../state/useUdmV2FlowStore"
import { NetworkV2EdgeShell } from "./NetworkV2EdgeShell"
import type { NetworkV2EdgeData } from "./edgeModel"

export function formatSignalV2EdgeLabel(data?: NetworkV2EdgeData) {
  return data?.signal_spec?.signal_name || "signal"
}

export function SignalV2Edge(props: EdgeProps) {
  const data = props.data as NetworkV2EdgeData | undefined
  const updateEdgeData = useUdmV2FlowStore((state) => state.updateEdgeData)
  return (
    <NetworkV2EdgeShell
      {...props}
      kind="signal"
      generatedLabel={formatSignalV2EdgeLabel(data)}
      editValue={data?.signal_spec?.signal_name ?? ""}
      onCommitEdit={(signalName) =>
        updateEdgeData(props.id, {
          signal_spec: {
            ...data?.signal_spec,
            signal_name: signalName.trim() || "signal",
          },
        })
      }
    />
  )
}
