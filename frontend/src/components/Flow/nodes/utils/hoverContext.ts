import { createContext, useContext } from "react"

export type HoverContextValue = {
  hoveredNodeId: string | null
}

export const HoverContext = createContext<HoverContextValue>({
  hoveredNodeId: null,
})

export const useHoveredNodeId = () => {
  return useContext(HoverContext).hoveredNodeId
}
