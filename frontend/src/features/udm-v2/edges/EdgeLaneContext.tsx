import { type ReactNode, createContext, useContext } from "react"

import type { EdgeLaneMap } from "./edgeLanes"

const EdgeLaneContext = createContext<EdgeLaneMap>(new Map())

export function EdgeLaneProvider({
  children,
  value,
}: {
  children: ReactNode
  value: EdgeLaneMap
}) {
  return (
    <EdgeLaneContext.Provider value={value}>
      {children}
    </EdgeLaneContext.Provider>
  )
}

export const useEdgeLane = (edgeId: string) =>
  useContext(EdgeLaneContext).get(edgeId)
