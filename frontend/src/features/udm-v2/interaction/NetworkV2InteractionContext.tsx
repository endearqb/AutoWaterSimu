import { type ReactNode, createContext, useContext } from "react"

import type { NetworkV2EdgeKind } from "../edges/edgeModel"

type NetworkV2InteractionState = {
  activeEdgeKind: NetworkV2EdgeKind
  connectionInProgress: boolean
  hoveredNodeId: string | null
}

const NetworkV2InteractionContext = createContext<NetworkV2InteractionState>({
  activeEdgeKind: "hydraulic",
  connectionInProgress: false,
  hoveredNodeId: null,
})

export function NetworkV2InteractionProvider({
  children,
  value,
}: {
  children: ReactNode
  value: NetworkV2InteractionState
}) {
  return (
    <NetworkV2InteractionContext.Provider value={value}>
      {children}
    </NetworkV2InteractionContext.Provider>
  )
}

export const useNetworkV2Interaction = () =>
  useContext(NetworkV2InteractionContext)
