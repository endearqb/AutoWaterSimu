import { ReactFlowProvider } from "@xyflow/react"
import { useEffect } from "react"

import { NetworkV2Canvas } from "./canvas/NetworkV2Canvas"
import { NetworkV2FlowLayout } from "./canvas/NetworkV2FlowLayout"
import { NetworkV2StatusBar } from "./canvas/NetworkV2StatusBar"
import { NetworkV2Toolbar } from "./canvas/NetworkV2Toolbar"
import { NetworkV2PropertyPanel } from "./inspector/NetworkV2PropertyPanel"
import { useUdmV2FlowStore } from "./state/useUdmV2FlowStore"

type UdmV2PageProps = {
  flowchartId?: string
}

export default function UdmV2Page({ flowchartId }: UdmV2PageProps) {
  const setCurrentGraph = useUdmV2FlowStore((state) => state.setCurrentGraph)

  useEffect(() => {
    if (flowchartId) {
      setCurrentGraph({ id: flowchartId })
    }
  }, [flowchartId, setCurrentGraph])

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
