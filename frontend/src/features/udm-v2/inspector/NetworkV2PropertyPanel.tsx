import {
  Badge,
  Box,
  Button,
  HStack,
  Heading,
  Stack,
  Text,
} from "@chakra-ui/react"
import { useState } from "react"

import { useUdmV2Messages } from "../i18n"
import { useUdmV2FlowStore } from "../state/useUdmV2FlowStore"
import { FlowConstraintsV2Editor } from "./FlowConstraintsV2Editor"
import { HydraulicV2Fields } from "./HydraulicV2Fields"
import { NodeSchemaV2Editor } from "./NodeSchemaV2Editor"
import { PumpV2Fields } from "./PumpV2Fields"
import { SecondaryClarifierV2ConfigPanel } from "./SecondaryClarifierV2ConfigPanel"
import { SettlingV2Fields } from "./SettlingV2Fields"
import { SignalV2Fields } from "./SignalV2Fields"

export function NetworkV2PropertyPanel() {
  const text = useUdmV2Messages()
  const [section, setSection] = useState<"element" | "diagnostics" | "graph">(
    "element",
  )
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
  const selectedDiagnostics = diagnostics.filter(
    (diagnostic) =>
      !diagnostic.element ||
      diagnostic.element.id === selectedNodeId ||
      diagnostic.element.id === selectedEdgeId,
  )

  return (
    <Stack gap={4} p={4} align="stretch">
      <Box>
        <Heading as="h2" size="sm">
          {text.inspector}
        </Heading>
        <Text mt={1} fontSize="xs" color="fg.muted">
          {selectedNode
            ? text.nodeSchema
            : selectedEdge
              ? text.edgeFields
              : text.graphSettings}
        </Text>
      </Box>

      <HStack gap={1}>
        {(["element", "diagnostics", "graph"] as const).map((value) => (
          <Button
            key={value}
            size="xs"
            flex="1"
            variant={section === value ? "solid" : "outline"}
            onClick={() => setSection(value)}
          >
            {text[value]}
          </Button>
        ))}
      </HStack>

      {section === "element" &&
        (selectedNode ? (
          <Stack gap={4}>
            <NodeSchemaV2Editor
              node={selectedNode}
              onPatch={(patch) => updateNodeData(selectedNode.id, patch)}
            />
            {selectedNode.data.node_kind === "secondary_clarifier_10_layer" && (
              <SecondaryClarifierV2ConfigPanel
                config={selectedNode.data.composite}
                onPatch={(patch) => updateNodeData(selectedNode.id, patch)}
              />
            )}
          </Stack>
        ) : selectedEdge ? (
          <EdgeFields edgeId={selectedEdge.id} />
        ) : (
          <Text color="fg.muted" fontSize="sm">
            {text.selectElement}
          </Text>
        ))}

      {section === "graph" && (
        <Stack gap={3}>
          <FlowConstraintsV2Editor
            constraints={flowConstraints}
            onChange={setFlowConstraints}
            onValidate={validateGraph}
          />
          <Badge
            alignSelf="flex-start"
            colorPalette={
              validationReport?.status === "invalid" ? "red" : "green"
            }
            variant="subtle"
          >
            {validationReport?.status || text.notValidated}
          </Badge>
        </Stack>
      )}

      {section === "diagnostics" && (
        <Stack gap={2}>
          {selectedDiagnostics.length === 0 && (
            <Text color="fg.muted" fontSize="sm">
              {text.noDiagnostics}
            </Text>
          )}
          {selectedDiagnostics.map((diagnostic) => (
            <Box
              key={`${diagnostic.code}-${diagnostic.element?.id || "graph"}-${diagnostic.fieldPath || ""}`}
              borderWidth="1px"
              borderColor={
                diagnostic.severity === "error" ? "red.200" : "yellow.200"
              }
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
      )}
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
