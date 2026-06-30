import { Badge, Box, Heading, Stack, Text } from "@chakra-ui/react"

import { useUdmV2FlowStore } from "../state/useUdmV2FlowStore"
import { FlowConstraintsV2Editor } from "./FlowConstraintsV2Editor"
import { HydraulicV2Fields } from "./HydraulicV2Fields"
import { NodeSchemaV2Editor } from "./NodeSchemaV2Editor"
import { PumpV2Fields } from "./PumpV2Fields"
import { SettlingV2Fields } from "./SettlingV2Fields"
import { SignalV2Fields } from "./SignalV2Fields"

export function NetworkV2PropertyPanel() {
  const nodes = useUdmV2FlowStore((state) => state.nodes)
  const edges = useUdmV2FlowStore((state) => state.edges)
  const selectedNodeId = useUdmV2FlowStore((state) => state.selectedNodeId)
  const selectedEdgeId = useUdmV2FlowStore((state) => state.selectedEdgeId)
  const diagnostics = useUdmV2FlowStore((state) => state.diagnostics)
  const flowConstraints = useUdmV2FlowStore((state) => state.flowConstraints)
  const validationReport = useUdmV2FlowStore((state) => state.validationReport)
  const updateNodeData = useUdmV2FlowStore((state) => state.updateNodeData)
  const setFlowConstraints = useUdmV2FlowStore(
    (state) => state.setFlowConstraints,
  )
  const validateGraph = useUdmV2FlowStore((state) => state.validateGraph)

  const selectedNode = nodes.find((node) => node.id === selectedNodeId)
  const selectedEdge = edges.find((edge) => edge.id === selectedEdgeId)

  return (
    <Stack gap={5} p={4} align="stretch">
      <Box>
        <Heading as="h2" size="sm">
          Inspector
        </Heading>
        <Text mt={1} fontSize="xs" color="fg.muted">
          {selectedNode
            ? "Node schema"
            : selectedEdge
              ? "Edge fields"
              : "Graph settings"}
        </Text>
      </Box>

      {selectedNode ? (
        <NodeSchemaV2Editor
          node={selectedNode}
          onPatch={(patch) => updateNodeData(selectedNode.id, patch)}
        />
      ) : selectedEdge ? (
        <EdgeFields edgeId={selectedEdge.id} />
      ) : (
        <Text color="fg.muted" fontSize="sm">
          Select a node or edge to edit element fields.
        </Text>
      )}

      <Box borderTopWidth="1px" borderColor="border" pt={4}>
        <FlowConstraintsV2Editor
          constraints={flowConstraints}
          onChange={setFlowConstraints}
          onValidate={validateGraph}
        />
      </Box>

      <Stack gap={2}>
        <Badge
          alignSelf="flex-start"
          colorPalette={validationReport?.status === "invalid" ? "red" : "green"}
          variant="subtle"
        >
          {validationReport?.status || "not validated"}
        </Badge>
        {diagnostics.map((diagnostic) => (
          <Box
            key={`${diagnostic.code}-${diagnostic.element?.id || "graph"}-${diagnostic.fieldPath || ""}`}
            borderWidth="1px"
            borderColor={diagnostic.severity === "error" ? "red.200" : "yellow.200"}
            bg={diagnostic.severity === "error" ? "red.50" : "yellow.50"}
            p={2}
            borderRadius="4px"
          >
            <Text fontSize="xs" fontWeight="700">
              {diagnostic.code}
            </Text>
            <Text fontSize="xs">{diagnostic.message}</Text>
            {diagnostic.fieldPath && (
              <Text fontSize="xs" color="fg.muted">
                {diagnostic.fieldPath}
              </Text>
            )}
          </Box>
        ))}
      </Stack>
    </Stack>
  )
}

function EdgeFields({ edgeId }: { edgeId: string }) {
  const edge = useUdmV2FlowStore((state) =>
    state.edges.find((item) => item.id === edgeId),
  )
  const diagnostics = useUdmV2FlowStore((state) => state.diagnostics)
  const updateEdgeData = useUdmV2FlowStore((state) => state.updateEdgeData)

  if (!edge?.data) {
    return null
  }

  const props = {
    edge,
    diagnostics,
    onPatch: (patch: Parameters<typeof updateEdgeData>[1]) =>
      updateEdgeData(edge.id, patch),
  }

  if (edge.data.edge_kind === "pump") {
    return <PumpV2Fields {...props} />
  }
  if (edge.data.edge_kind === "settling") {
    return <SettlingV2Fields {...props} />
  }
  if (edge.data.edge_kind === "signal") {
    return <SignalV2Fields {...props} />
  }
  return <HydraulicV2Fields {...props} />
}
