import { Box, Center, Spinner, Text } from "@chakra-ui/react"
import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
  type NodeTypes,
  useEdgesState,
  useNodesState,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { useEffect, useMemo, useState } from "react"

import ASM1Node from "@/components/Flow/nodes/ASM1Node"
import ASMslimNode from "@/components/Flow/nodes/ASMslimNode"
import DefaultNode from "@/components/Flow/nodes/DefaultNode"
import InputNode from "@/components/Flow/nodes/InputNode"
import OutputNode from "@/components/Flow/nodes/OutputNode"

type RawFlowchart = {
  nodes?: Array<{
    id: string
    type?: string
    position?: { x: number; y: number }
    data?: Record<string, unknown>
  }>
  edges?: Array<{
    id?: string
    source: string
    target: string
    sourceHandle?: string | null
    targetHandle?: string | null
    data?: Record<string, unknown>
  }>
}

const normalizeRawFlowchart = (raw: unknown): RawFlowchart => {
  if (!raw || typeof raw !== "object") return { nodes: [], edges: [] }
  const obj = raw as Partial<RawFlowchart>
  return {
    nodes: Array.isArray(obj.nodes) ? obj.nodes : [],
    edges: Array.isArray(obj.edges) ? obj.edges : [],
  }
}

export function CaseFlowPreview(props: { jsonUrl: string }) {
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  useEffect(() => {
    const controller = new AbortController()
    setIsLoading(true)
    setLoadError(null)

    const load = async () => {
      try {
        const res = await fetch(props.jsonUrl, { signal: controller.signal })
        if (!res.ok) {
          throw new Error(`Failed to load JSON (${res.status})`)
        }
        const raw = (await res.json()) as unknown
        const json = normalizeRawFlowchart(raw)

        const nextNodes: Node[] = (json.nodes ?? []).map((n) => ({
          id: n.id,
          type: n.type || "default",
          position: n.position ?? { x: 0, y: 0 },
          data: n.data || {},
        }))
        const nextEdges: Edge[] = (json.edges ?? []).map((e, idx) => ({
          id: e.id ?? `e-${idx}`,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle,
          targetHandle: e.targetHandle,
          markerEnd: { type: MarkerType.ArrowClosed },
          data: e.data || {},
        }))

        if (!controller.signal.aborted) {
          setNodes(nextNodes)
          setEdges(nextEdges)
          setIsLoading(false)
        }
      } catch (err) {
        if (controller.signal.aborted) return
        const message = err instanceof Error ? err.message : String(err)
        setLoadError(message)
        setIsLoading(false)
      }
    }

    load()
    return () => controller.abort()
  }, [props.jsonUrl, setEdges, setNodes])

  const readOnlyStore = useMemo(
    () =>
      () =>
        ({
          updateNodeParameter: () => {},
        }) as any,
    [],
  )

  const nodeTypes: NodeTypes = useMemo(
    () => ({
      input: (p: any) => <InputNode {...p} store={readOnlyStore} />,
      output: (p: any) => <OutputNode {...p} store={readOnlyStore} />,
      default: (p: any) => <DefaultNode {...p} store={readOnlyStore} />,
      asm1: (p: any) => <ASM1Node {...p} store={readOnlyStore} />,
      asmslim: (p: any) => <ASMslimNode {...p} store={readOnlyStore} />,
      asm1slim: (p: any) => <ASMslimNode {...p} store={readOnlyStore} />,
    }),
    [readOnlyStore],
  )

  if (isLoading) {
    return (
      <Center w="full" h="full">
        <Spinner />
      </Center>
    )
  }

  if (loadError) {
    return (
      <Center w="full" h="full" px={6}>
        <Text color="red.600" fontSize="sm">
          {loadError}
        </Text>
      </Center>
    )
  }

  return (
    <Box w="full" h="full" bg="white">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        fitViewOptions={{ padding: 0.22, maxZoom: 1.1 }}
        minZoom={0.05}
        maxZoom={1.6}
        nodesConnectable={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={18}
          size={1}
          color="rgba(0,0,0,0.10)"
        />
        <MiniMap pannable zoomable />
        <Controls />
      </ReactFlow>
    </Box>
  )
}
