import { getSmoothStepPath } from "@xyflow/react"
import type { EdgeProps } from "@xyflow/react"

export function getNetworkV2SmoothPath(
  props: Pick<
    EdgeProps,
    | "sourcePosition"
    | "sourceX"
    | "sourceY"
    | "targetPosition"
    | "targetX"
    | "targetY"
  >,
) {
  return getSmoothStepPath({
    sourcePosition: props.sourcePosition,
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    targetPosition: props.targetPosition,
    targetX: props.targetX,
    targetY: props.targetY,
  })
}
