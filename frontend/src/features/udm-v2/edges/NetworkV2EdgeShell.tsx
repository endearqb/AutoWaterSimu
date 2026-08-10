import { Box, Input } from "@chakra-ui/react"
import { BaseEdge, EdgeLabelRenderer, type EdgeProps } from "@xyflow/react"
import { type KeyboardEvent, type MouseEvent, useState } from "react"

import { EdgeQuickToolbar } from "@/components/Flow/shared/EdgeQuickToolbar"

import { formatUdmV2Message, useUdmV2Messages } from "../i18n"
import { useUdmV2FlowStore } from "../state/useUdmV2FlowStore"
import { useEdgeLane } from "./EdgeLaneContext"
import { NETWORK_V2_EDGE_ICONS } from "./NetworkV2EdgeModeSelector"
import { validateNetworkV2Connection } from "./connectionRules"
import {
  NETWORK_V2_EDGE_KINDS,
  type NetworkV2EdgeData,
  type NetworkV2EdgeKind,
} from "./edgeModel"
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
  const text = useUdmV2Messages()
  const lanes = useEdgeLane(props.id)
  const visual = NETWORK_V2_EDGE_VISUALS[props.kind]
  const data = props.data as NetworkV2EdgeData | undefined
  const nodes = useUdmV2FlowStore((state) => state.nodes)
  const selectedEdgeId = useUdmV2FlowStore((state) => state.selectedEdgeId)
  const setSelectedEdgeId = useUdmV2FlowStore(
    (state) => state.setSelectedEdgeId,
  )
  const changeEdgeKind = useUdmV2FlowStore((state) => state.changeEdgeKind)
  const [edgePath, labelX, labelY] = getNetworkV2RoutedPath({
    ...props,
    lanes,
  })
  const customLabel = data?.ui?.label?.trim()
  const visibleLabel =
    customLabel && customLabel !== props.generatedLabel
      ? `${customLabel} · ${props.generatedLabel}`
      : customLabel || props.generatedLabel
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState("")
  const selected = props.selected || selectedEdgeId === props.id

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
          strokeWidth: selected ? 2.75 : 1.35,
          opacity: selected ? 1 : visual.opacity,
        }}
      />
      <EdgeLabelRenderer>
        <Box
          position="absolute"
          transform={`translate(-50%, -50%) translate(${labelX}px,${labelY}px)`}
          pointerEvents="all"
          className="nodrag nopan"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation()
            setSelectedEdgeId(props.id)
          }}
        >
          {selected && (
            <Box
              position="absolute"
              left="50%"
              bottom="calc(100% + 8px)"
              transform="translateX(-50%)"
              zIndex={2}
            >
              <EdgeQuickToolbar
                ariaLabel={text.edgeQuickToolbar}
                value={props.kind}
                options={NETWORK_V2_EDGE_KINDS.map((kind) => {
                  const Icon = NETWORK_V2_EDGE_ICONS[kind]
                  const localized = text.edgeKinds[kind]
                  const compatible = validateNetworkV2Connection({
                    connection: {
                      source: props.source,
                      target: props.target,
                      sourceHandle: props.sourceHandleId ?? null,
                      targetHandle: props.targetHandleId ?? null,
                    },
                    nodes,
                    edgeKind: kind,
                  }).valid
                  return {
                    value: kind,
                    label: localized.label,
                    shortLabel: localized.short,
                    icon: <Icon size={13} />,
                    accent: NETWORK_V2_EDGE_VISUALS[kind].stroke,
                    disabled: !compatible,
                  }
                })}
                onChange={(kind) => changeEdgeKind(props.id, kind)}
              />
            </Box>
          )}
          {editing ? (
            <Input
              aria-label={formatUdmV2Message(text.editEdge, {
                label: text.edgeKinds[props.kind].label,
              })}
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
              borderColor={selected ? visual.stroke : "border"}
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
    </>
  )
}
