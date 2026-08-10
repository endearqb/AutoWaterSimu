import { Position, getSmoothStepPath } from "@xyflow/react"
import type { EdgeProps, XYPosition } from "@xyflow/react"

import type { EdgeLaneInfo } from "./edgeLanes"

type RoutedPathInput = Pick<
  EdgeProps,
  | "sourcePosition"
  | "sourceX"
  | "sourceY"
  | "targetPosition"
  | "targetX"
  | "targetY"
> & { lanes?: EdgeLaneInfo }

function anchor(
  x: number,
  y: number,
  position: Position,
  offset: number,
  distance: number,
): XYPosition {
  if (position === Position.Left) return { x: x - distance, y: y + offset }
  if (position === Position.Right) return { x: x + distance, y: y + offset }
  if (position === Position.Top) return { x: x + offset, y: y - distance }
  return { x: x + offset, y: y + distance }
}

export function getNetworkV2RoutedPath(props: RoutedPathInput) {
  const distance = Math.min(
    24,
    Math.max(
      10,
      Math.hypot(props.targetX - props.sourceX, props.targetY - props.sourceY) /
        6,
    ),
  )
  const sourceAnchor = anchor(
    props.sourceX,
    props.sourceY,
    props.sourcePosition,
    props.lanes?.source.offset ?? 0,
    distance,
  )
  const targetAnchor = anchor(
    props.targetX,
    props.targetY,
    props.targetPosition,
    props.lanes?.target.offset ?? 0,
    distance,
  )
  const [middlePath, labelX, labelY] = getSmoothStepPath({
    sourcePosition: props.sourcePosition,
    sourceX: sourceAnchor.x,
    sourceY: sourceAnchor.y,
    targetPosition: props.targetPosition,
    targetX: targetAnchor.x,
    targetY: targetAnchor.y,
    borderRadius: 8,
    offset: 12,
  })
  const middle = middlePath.replace(
    /^M\s*[-+]?[\d.eE]+\s*,?\s*[-+]?[\d.eE]+/,
    "",
  )
  const horizontal =
    Math.abs(props.targetX - props.sourceX) >=
    Math.abs(props.targetY - props.sourceY)
  const sourceOffset = props.lanes?.source.offset ?? 0
  const targetOffset = props.lanes?.target.offset ?? 0
  const dominantOffset =
    Math.abs(sourceOffset) >= Math.abs(targetOffset)
      ? sourceOffset
      : targetOffset

  return [
    `M ${props.sourceX},${props.sourceY} L ${sourceAnchor.x},${sourceAnchor.y} ${middle} L ${props.targetX},${props.targetY}`,
    labelX + (horizontal ? 0 : dominantOffset * 0.25),
    labelY + (horizontal ? dominantOffset * 0.25 : 0),
  ] as const
}

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
  return getNetworkV2RoutedPath(props)
}
