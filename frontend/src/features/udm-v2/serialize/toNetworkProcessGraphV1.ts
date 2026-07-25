import type { Edge, Node } from "@xyflow/react"

import { secondaryClarifierV2Expand } from "../composite/secondaryClarifierV2Expand"
import type {
  NetworkProcessGraphV1,
  NetworkProcessGraphV1ComponentSchema,
  NetworkProcessGraphV1Edge,
  NetworkProcessGraphV1Node,
  NetworkProcessGraphV1Port,
} from "../contracts/generated"
import type { NetworkV2EdgeData } from "../edges/edgeModel"
import {
  DEFAULT_NETWORK_V2_COMPONENT_SCHEMA_ID,
  type NetworkV2NodeData,
  type NetworkV2Port,
  createNetworkV2NodeData,
} from "../nodes/nodeTypes"
import { normalizePortKind } from "../nodes/portKinds"
import type { NetworkV2FlowConstraint } from "./semanticValidation"

export type ToNetworkProcessGraphV1Input = {
  nodes: Node<NetworkV2NodeData>[]
  edges: Edge<NetworkV2EdgeData>[]
  flowConstraints?: NetworkV2FlowConstraint[]
  graphId?: string
  version?: number
  sourceCanvasGraphId?: string
  signalBindings?: Array<Record<string, unknown>>
  metadata?: Record<string, unknown>
}

export function toNetworkProcessGraphV1({
  nodes,
  edges,
  flowConstraints = [],
  graphId = "udm_network_v2_canvas",
  version = 1,
  sourceCanvasGraphId,
  signalBindings = [],
  metadata = {},
}: ToNetworkProcessGraphV1Input): NetworkProcessGraphV1 {
  const componentSchemas = new Map<
    string,
    NetworkProcessGraphV1ComponentSchema
  >()
  const graphNodes: NetworkProcessGraphV1Node[] = []
  const graphEdges: NetworkProcessGraphV1Edge[] = []
  const graphFlowConstraints: Array<Record<string, unknown>> = []
  const composites: Array<Record<string, unknown>> = []

  for (const node of nodes) {
    if (
      node.data.node_kind === "secondary_clarifier_10_layer" &&
      node.data.composite
    ) {
      const expanded = secondaryClarifierV2Expand(node.data.composite, {
        compositeId: node.id,
      })
      mergeComponentSchemas(componentSchemas, expanded.component_schemas)
      graphNodes.push(...expanded.nodes)
      graphEdges.push(...expanded.edges)
      graphFlowConstraints.push(...expanded.flow_constraints)
      composites.push(...expanded.composites)
      continue
    }

    graphNodes.push(toProcessNode(node))
    mergeComponentSchemas(componentSchemas, [componentSchemaForNode(node.data)])
  }

  for (const edge of edges) {
    const graphEdge = toProcessEdge(edge)
    if (graphEdge) {
      graphEdges.push(graphEdge)
    }
  }

  graphFlowConstraints.push(...flowConstraints.flatMap(toProcessFlowConstraint))

  return withoutUndefined({
    schema_version: "network_process_graph.v1",
    network_graph_id: graphId,
    version,
    source_canvas_graph_id: sourceCanvasGraphId,
    component_schemas: [...componentSchemas.values()],
    nodes: graphNodes,
    edges: graphEdges,
    flow_constraints: graphFlowConstraints,
    signal_bindings: signalBindings,
    composites,
    validation: { status: "valid", errors: [], warnings: [] },
    metadata: { ...metadata, created_by_feature: "features/udm-v2" },
  }) as NetworkProcessGraphV1
}

export function stableStringify(value: unknown) {
  return JSON.stringify(sortJson(value), null, 2)
}

function toProcessNode(
  node: Node<NetworkV2NodeData>,
): NetworkProcessGraphV1Node {
  return withoutUndefined({
    node_id: node.id,
    node_type:
      node.data.node_kind === "boundary"
        ? node.data.boundary?.boundary_kind === "sink" ||
          node.data.boundary?.boundary_kind === "effluent"
          ? "sink"
          : "source"
        : node.data.node_kind,
    process_unit_type: node.data.process_unit_type,
    component_schema_id: node.data.component_schema_id,
    initial_conditions: node.data.initial_conditions,
    volume: node.data.volume_m3,
    ports: node.data.ports.map(toProcessPort),
    model_binding: {
      ...node.data.model_binding,
      model_kind: toProcessModelKind(node.data.model_binding.model_kind),
      model_version:
        node.data.model_binding.model_version === undefined
          ? undefined
          : String(node.data.model_binding.model_version),
    },
    parameter_binding: node.data.parameter_binding,
    unit_metadata: {
      volume: "m3",
      concentration: "mg/L",
    },
    metadata: {
      ui: {
        label: node.data.label,
        position: node.position,
        collapsed: node.data.ui?.collapsed,
      },
    },
  }) as NetworkProcessGraphV1Node
}

function toProcessEdge(
  edge: Edge<NetworkV2EdgeData>,
): NetworkProcessGraphV1Edge | null {
  if (!edge.data) {
    return null
  }

  return withoutUndefined({
    edge_id: edge.id,
    edge_kind: edge.data.edge_kind,
    source_node_id: edge.source,
    source_port: edge.sourceHandle || "out",
    target_node_id: edge.target,
    target_port: edge.targetHandle || "in",
    component_policy: edge.data.component_policy,
    stream_adapter: edge.data.stream_adapter ?? null,
    flow_spec: edge.data.flow_spec,
    transport_model: edge.data.transport_model,
    pump: edge.data.pump,
    signal_spec: edge.data.signal_spec,
    metadata: {
      ui: edge.data.ui,
      react_flow_type: edge.type,
    },
  }) as NetworkProcessGraphV1Edge
}

function toProcessPort(port: NetworkV2Port): NetworkProcessGraphV1Port {
  return {
    port_id: port.id,
    port_kind: normalizePortKind(port),
  }
}

function toProcessModelKind(
  modelKind: NetworkV2NodeData["model_binding"]["model_kind"],
) {
  return modelKind === "passive" ? "passive_udm" : modelKind
}

function componentSchemaForNode(
  nodeData: NetworkV2NodeData,
): NetworkProcessGraphV1ComponentSchema {
  const components = Object.keys(nodeData.initial_conditions)
  return {
    component_schema_id:
      nodeData.component_schema_id || DEFAULT_NETWORK_V2_COMPONENT_SCHEMA_ID,
    components: components.length > 0 ? components : ["COD", "X_TSS"],
    unit: "mg/L",
  }
}

function mergeComponentSchemas(
  target: Map<string, NetworkProcessGraphV1ComponentSchema>,
  schemas: NetworkProcessGraphV1ComponentSchema[],
) {
  for (const schema of schemas) {
    if (!target.has(schema.component_schema_id)) {
      target.set(schema.component_schema_id, schema)
    }
  }
}

function toProcessFlowConstraint(
  constraint: NetworkV2FlowConstraint,
): Array<Record<string, unknown>> {
  if (constraint.constraint_kind === "residual" && constraint.edge_id) {
    return [
      {
        constraint_id: constraint.id,
        constraint_type: "residual",
        node_id: "graph",
        known_outflow_edges: constraint.edge_ids || [],
        residual_edge_id: constraint.edge_id,
      },
    ]
  }

  if (
    constraint.constraint_kind === "ratio" &&
    constraint.edge_id &&
    constraint.edge_ids?.[0] &&
    typeof constraint.ratio === "number"
  ) {
    return [
      {
        constraint_id: constraint.id,
        constraint_type: "ratio_to_edge",
        edge_id: constraint.edge_id,
        reference_edge_id: constraint.edge_ids[0],
        ratio: constraint.ratio,
      },
    ]
  }

  if (constraint.constraint_kind === "split" && constraint.edge_ids?.length) {
    const value = constraint.value ?? 1 / constraint.edge_ids.length
    return [
      {
        constraint_id: constraint.id,
        constraint_type: "split_fraction",
        edge_fractions: Object.fromEntries(
          constraint.edge_ids.map((edgeId) => [edgeId, value]),
        ),
        sum_to_one: false,
      },
    ]
  }

  return []
}

export function withoutUndefined(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(withoutUndefined)
  }
  if (!value || typeof value !== "object") {
    return value
  }
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .map(([key, entry]) => [key, withoutUndefined(entry)]),
  )
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortJson)
  }
  if (!value || typeof value !== "object") {
    return value
  }
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, sortJson((value as Record<string, unknown>)[key])]),
  )
}

export function createFallbackNetworkV2NodeData(
  kind: NetworkV2NodeData["node_kind"],
) {
  return createNetworkV2NodeData(kind)
}
