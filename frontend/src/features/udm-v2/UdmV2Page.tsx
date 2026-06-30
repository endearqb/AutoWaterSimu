import { ReactFlowProvider } from "@xyflow/react"
import { useEffect } from "react"

import { NetworkV2Canvas } from "./canvas/NetworkV2Canvas"
import { NetworkV2FlowLayout } from "./canvas/NetworkV2FlowLayout"
import { NetworkV2StatusBar } from "./canvas/NetworkV2StatusBar"
import { NetworkV2Toolbar } from "./canvas/NetworkV2Toolbar"
import { NetworkV2PropertyPanel } from "./inspector/NetworkV2PropertyPanel"
import { graphStateFromStandalonePayload } from "./services/standaloneFlowchartAdapter"
import { udmV2FlowchartService } from "./services/udmV2FlowchartService"
import { useUdmV2FlowStore } from "./state/useUdmV2FlowStore"

type UdmV2PageProps = {
  flowchartId?: string
}

export default function UdmV2Page({ flowchartId }: UdmV2PageProps) {
  const replaceGraph = useUdmV2FlowStore((state) => state.replaceGraph)
  const setCurrentGraph = useUdmV2FlowStore((state) => state.setCurrentGraph)
  const setRuntimeStatus = useUdmV2FlowStore((state) => state.setRuntimeStatus)

  useEffect(() => {
    if (flowchartId) {
      setRuntimeStatus("saving")
      udmV2FlowchartService
        .loadGraph(flowchartId)
        .then((payload) =>
          replaceGraph(graphStateFromStandalonePayload(payload, { id: flowchartId })),
        )
        .catch(() => setRuntimeStatus("failed"))
      return
    }
    setCurrentGraph({ id: null })
  }, [flowchartId, replaceGraph, setCurrentGraph, setRuntimeStatus])

  return (
    <ReactFlowProvider>
      <NetworkV2FlowLayout
        toolbar={<NetworkV2Toolbar />}
        canvas={<NetworkV2Canvas />}
        inspector={<NetworkV2PropertyPanel />}
        statusBar={<NetworkV2StatusBar />}
      />
    </ReactFlowProvider>
  )
}
