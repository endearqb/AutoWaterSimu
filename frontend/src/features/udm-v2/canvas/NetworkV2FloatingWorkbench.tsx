import { Badge, Box, HStack, IconButton, Stack, Text } from "@chakra-ui/react"
import {
  ChevronDown,
  ChevronUp,
  GripHorizontal,
  Lock,
  Unlock,
} from "lucide-react"
import {
  type PointerEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react"

import { buildSecondaryClarifierV2Canvas } from "../composite/secondaryClarifierV2Canvas"
import { NetworkV2EdgeModeSelector } from "../edges/NetworkV2EdgeModeSelector"
import { useUdmV2Messages } from "../i18n"
import { NetworkV2NodePalette } from "../palette/NetworkV2NodePalette"
import { useUdmV2FlowStore } from "../state/useUdmV2FlowStore"

const STORAGE_KEY = "udm-v2-workbench"

type Preference = {
  collapsed: boolean
  locked: boolean
  x: number
  y: number
}

const readPreference = (): Preference => {
  if (typeof window === "undefined") {
    return { collapsed: false, locked: true, x: 12, y: 12 }
  }
  const defaults = {
    collapsed: window.matchMedia("(max-width: 480px)").matches,
    locked: true,
    x: 12,
    y: 12,
  }
  try {
    return {
      ...defaults,
      ...JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}"),
    }
  } catch {
    return defaults
  }
}

export function NetworkV2FloatingWorkbench({
  toolbar,
}: {
  toolbar: ReactNode
}) {
  const text = useUdmV2Messages()
  const [preference, setPreference] = useState(readPreference)
  const panelRef = useRef<HTMLDivElement>(null)
  const graphName = useUdmV2FlowStore((state) => state.currentNetworkGraphName)
  const dirty = useUdmV2FlowStore((state) => state.dirty)
  const activeEdgeKind = useUdmV2FlowStore((state) => state.activeEdgeKind)
  const setActiveEdgeKind = useUdmV2FlowStore(
    (state) => state.setActiveEdgeKind,
  )

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preference))
  }, [preference])

  const startDrag = (event: PointerEvent) => {
    if (preference.locked || !panelRef.current) return
    const panel = panelRef.current
    const parent = panel.parentElement
    if (!parent) return
    const pointerStart = { x: event.clientX, y: event.clientY }
    const positionStart = { x: preference.x, y: preference.y }
    const move = (next: globalThis.PointerEvent) => {
      const bounds = parent.getBoundingClientRect()
      const panelBounds = panel.getBoundingClientRect()
      setPreference((current) => ({
        ...current,
        x: Math.max(
          0,
          Math.min(
            bounds.width - panelBounds.width,
            positionStart.x + next.clientX - pointerStart.x,
          ),
        ),
        y: Math.max(
          0,
          Math.min(
            bounds.height - panelBounds.height,
            positionStart.y + next.clientY - pointerStart.y,
          ),
        ),
      }))
    }
    const stop = () => {
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", stop)
    }
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", stop)
  }

  const insertClarifier = () => {
    const graph = buildSecondaryClarifierV2Canvas()
    const state = useUdmV2FlowStore.getState()
    state.setNodes([...state.nodes, ...graph.nodes])
    state.setEdges([...state.edges, ...graph.edges])
  }

  return (
    <Box position="absolute" inset={0} zIndex={7} pointerEvents="none">
      <Box
        ref={panelRef}
        data-testid="udm-v2-workbench"
        position="absolute"
        left={{ base: "12px", md: `${preference.x}px` }}
        top={{ base: "12px", md: `${preference.y}px` }}
        pointerEvents="auto"
        w={{ base: "calc(100vw - 24px)", md: "min(720px, calc(100vw - 48px))" }}
        maxH="calc(100vh - 24px)"
        overflow="auto"
        bg="rgba(255,255,255,.9)"
        borderWidth="1px"
        borderColor="rgba(148,163,184,.45)"
        borderRadius="8px"
        boxShadow="0 12px 32px rgba(15,23,42,.16)"
        backdropFilter="blur(12px)"
      >
        <HStack
          px={2}
          py={1.5}
          borderBottomWidth={preference.collapsed ? 0 : "1px"}
        >
          <IconButton
            aria-label="Move workbench"
            size="xs"
            variant="ghost"
            cursor={preference.locked ? "default" : "grab"}
            onPointerDown={startDrag}
          >
            <GripHorizontal size={15} />
          </IconButton>
          <Text fontWeight="700">{text.workbench}</Text>
          <Text truncate fontSize="sm" flex="1">
            {graphName}
          </Text>
          {dirty && <Badge colorPalette="orange">dirty</Badge>}
          <IconButton
            aria-label={preference.locked ? text.unlock : text.lock}
            title={preference.locked ? text.unlock : text.lock}
            size="xs"
            variant="ghost"
            onClick={() =>
              setPreference((value) => ({ ...value, locked: !value.locked }))
            }
          >
            {preference.locked ? <Lock size={14} /> : <Unlock size={14} />}
          </IconButton>
          <IconButton
            aria-label={preference.collapsed ? text.expand : text.collapse}
            title={preference.collapsed ? text.expand : text.collapse}
            size="xs"
            variant="ghost"
            onClick={() =>
              setPreference((value) => ({
                ...value,
                collapsed: !value.collapsed,
              }))
            }
          >
            {preference.collapsed ? (
              <ChevronDown size={15} />
            ) : (
              <ChevronUp size={15} />
            )}
          </IconButton>
        </HStack>
        {!preference.collapsed && (
          <Stack gap={1} p={1}>
            {toolbar}
            <HStack align="start" gap={1} flexWrap="wrap">
              <Box flex="1" minW="280px">
                <NetworkV2EdgeModeSelector
                  activeKind={activeEdgeKind}
                  onChange={setActiveEdgeKind}
                />
              </Box>
              <NetworkV2NodePalette onInsertClarifier={insertClarifier} />
            </HStack>
          </Stack>
        )}
      </Box>
    </Box>
  )
}
