import { Box } from "@chakra-ui/react"
import { type ReactNode, useEffect, useState } from "react"

import { useUdmV2FlowStore } from "../state/useUdmV2FlowStore"
import { NetworkV2FloatingWorkbench } from "./NetworkV2FloatingWorkbench"
import { NetworkV2InspectorDrawer } from "./NetworkV2InspectorDrawer"
import { NetworkV2StatusOverlay } from "./NetworkV2StatusOverlay"

const PIN_KEY = "udm-v2-inspector-pinned"

type NetworkV2FlowLayoutProps = {
  canvas: ReactNode
  inspector: ReactNode
  statusBar: ReactNode
  toolbar: ReactNode
}

export function NetworkV2FlowLayout({
  canvas,
  inspector,
  statusBar,
  toolbar,
}: NetworkV2FlowLayoutProps) {
  const selectedNodeId = useUdmV2FlowStore((state) => state.selectedNodeId)
  const selectedEdgeId = useUdmV2FlowStore((state) => state.selectedEdgeId)
  const clearSelection = useUdmV2FlowStore((state) => state.clearSelection)
  const [pinned, setPinned] = useState(
    () =>
      typeof window !== "undefined" &&
      window.localStorage.getItem(PIN_KEY) === "true",
  )
  const open = pinned || Boolean(selectedNodeId || selectedEdgeId)

  useEffect(() => {
    window.localStorage.setItem(PIN_KEY, String(pinned))
  }, [pinned])

  return (
    <Box
      h="100dvh"
      minH="520px"
      position="relative"
      overflow="hidden"
      bg="bg.subtle"
      data-udm-v2-editor
    >
      <Box
        position="absolute"
        insetY={0}
        left={0}
        right={{ base: 0, md: open ? "360px" : 0 }}
        transition="right .18s ease"
        css={{
          "@media (prefers-reduced-motion: reduce)": { transition: "none" },
        }}
      >
        {canvas}
      </Box>
      <NetworkV2FloatingWorkbench toolbar={toolbar} />
      <NetworkV2StatusOverlay />
      {statusBar}
      <NetworkV2InspectorDrawer
        isOpen={open}
        pinned={pinned}
        onPinChange={setPinned}
        onClose={() => {
          setPinned(false)
          clearSelection()
        }}
      >
        {inspector}
      </NetworkV2InspectorDrawer>
    </Box>
  )
}
