import type { Connection, Edge } from "@xyflow/react"

/**
 * Rejects connections where source and target belong to the same node.
 */
export const isNotSelfConnection = (connection: Connection | Edge) => {
  const { source, target } = connection
  if (!source || !target) {
    return true
  }
  return source !== target
}
