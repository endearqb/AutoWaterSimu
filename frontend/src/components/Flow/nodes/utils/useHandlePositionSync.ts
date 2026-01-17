import { useUpdateNodeInternals } from "@xyflow/react"
import { type DependencyList, useEffect } from "react"

const useHandlePositionSync = (nodeId?: string, deps: DependencyList = []) => {
  const updateNodeInternals = useUpdateNodeInternals()

  useEffect(() => {
    if (!nodeId) return
    updateNodeInternals(nodeId)
  }, [nodeId, updateNodeInternals, ...deps])
}

export default useHandlePositionSync
