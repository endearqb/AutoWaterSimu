import { Box, Input } from "@chakra-ui/react"
import { BaseEdge, EdgeLabelRenderer, type EdgeProps } from "@xyflow/react"
import { type KeyboardEvent, type MouseEvent, useState } from "react"

import { useEdgeLane } from "./EdgeLaneContext"
import type { NetworkV2EdgeData, NetworkV2EdgeKind } from "./edgeModel"
import { getNetworkV2RoutedPath } from "./edgePath"
import { NETWORK_V2_EDGE_VISUALS } from "./edgeVisuals"

type NetworkV2EdgeShellProps = EdgeProps & {
  generatedLabel: string
  kind: NetworkV2EdgeKind
  editValue?: string
  editInputType?: "number" | "text"
  onCommitEdit?: (value: string) => void
}

export function NetworkV2EdgeShell(props: NetworkV2EdgeShellProps) {
  const lanes = useEdgeLane(props.id)
  const visual = NETWORK_V2_EDGE_VISUALS[props.kind]
  const data = props.data as NetworkV2EdgeData | undefined
  const [edgePath, labelX, labelY] = getNetworkV2RoutedPath({
    ...props,
    lanes,
  })
  const customLabel = data?.ui?.label?.trim()
  const visibleLabel =
    customLabel || (props.selected ? props.generatedLabel : "")
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState("")

  const beginEdit = (event: MouseEvent) => {
    if (!props.onCommitEdit) return
    event.stopPropagation()
    setDraft(props.editValue ?? "")
    setEditing(true)
  }
  const commit = () => {
    setEditing(false)
    props.onCommitEdit?.(draft)
  }
  const cancel = () => {
    setEditing(false)
    setDraft(props.editValue ?? "")
  }
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    event.stopPropagation()
    if (event.key === "Enter") commit()
    if (event.key === "Escape") cancel()
  }

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={props.markerEnd}
        interactionWidth={18}
        style={{
          ...props.style,
          stroke: visual.stroke,
          strokeDasharray: visual.dasharray,
          strokeLinecap: "round",
          strokeLinejoin: "round",
          strokeWidth: props.selected ? 2.75 : 1.35,
          opacity: props.selected ? 1 : visual.opacity,
        }}
      />
      {visibleLabel && (
        <EdgeLabelRenderer>
          <Box
            position="absolute"
            transform={`translate(-50%, -50%) translate(${labelX}px,${labelY}px)`}
            pointerEvents="all"
            className="nodrag nopan"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
          >
            {editing ? (
              <Input
                aria-label={`Edit ${props.kind} edge`}
                type={props.editInputType ?? "text"}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onBlur={commit}
                onKeyDown={onKeyDown}
                size="sm"
                width="120px"
                bg="white"
                borderColor={visual.stroke}
                autoFocus
              />
            ) : (
              <Box
                onDoubleClick={beginEdit}
                cursor={props.onCommitEdit ? "text" : "default"}
                bg="rgba(255,255,255,.86)"
                borderWidth="1px"
                borderColor={props.selected ? visual.stroke : "border"}
                borderRadius="4px"
                fontSize="10px"
                px={1.5}
                py={1}
                whiteSpace="nowrap"
                backdropFilter="blur(6px)"
              >
                {visibleLabel}
              </Box>
            )}
          </Box>
        </EdgeLabelRenderer>
      )}
    </>
  )
}
