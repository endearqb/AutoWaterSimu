import type { Edge, Node } from "@xyflow/react"

import {
  type ConnectionValidationCode,
  validateNetworkV2Connection,
} from "../edges/connectionRules"
import {
  type NetworkV2ComponentPolicy,
  type NetworkV2EdgeData,
  isNetworkV2EdgeTypeKindMatch,
} from "../edges/edgeModel"
import type { NetworkV2NodeData } from "../nodes/nodeTypes"

export type NetworkV2DiagnosticCode =
  | "SETTLING_VOLUME_CONTRIBUTION_FORBIDDEN"
  | "SIGNAL_VOLUME_CONTRIBUTION_FORBIDDEN"
  | "SIGNAL_MASS_CONTRIBUTION_FORBIDDEN"
  | "FLOW_SPEC_REQUIRED"
  | "EDGE_TYPE_KIND_MISMATCH"
  | "UNKNOWN_COMPONENT_IN_POLICY"
  | "FLOW_CONSTRAINT_EDGE_NOT_FOUND"
  | "FLOW_CONSTRAINT_INVALID_VALUE"
  | "EDGE_SOURCE_NODE_NOT_FOUND"
  | "EDGE_TARGET_NODE_NOT_FOUND"
  | "EDGE_SOURCE_PORT_NOT_FOUND"
  | "EDGE_TARGET_PORT_NOT_FOUND"
  | "EDGE_SOURCE_DIRECTION_INVALID"
  | "EDGE_TARGET_DIRECTION_INVALID"
  | "EDGE_PORT_KIND_INCOMPATIBLE"
  | "SELF_CONNECTION_FORBIDDEN"
  | "CONTRACT_SCHEMA_INVALID"

export type NetworkV2Diagnostic = {
  code: NetworkV2DiagnosticCode
  severity: "error" | "warning"
  message: string
  element?: {
    kind: "node" | "edge" | "graph" | "flow_constraint" | "component_schema"
    id?: string
  }
  fieldPath?: string
  schemaInstancePath?: string
  suggestion?: string
}

export type NetworkV2FlowConstraint = {
  id: string
  constraint_kind: "split" | "ratio" | "residual"
  edge_id?: string
  edge_ids?: string[]
  value?: number
  ratio?: number
}

export type NetworkV2ValidationReport = {
  status: "valid" | "invalid"
  diagnostics: NetworkV2Diagnostic[]
}

export type ValidateNetworkV2GraphInput = {
  nodes: Node<NetworkV2NodeData>[]
  edges: Edge<NetworkV2EdgeData>[]
  flowConstraints: NetworkV2FlowConstraint[]
}

export function validateNetworkV2Graph({
  nodes,
  edges,
  flowConstraints,
}: ValidateNetworkV2GraphInput): NetworkV2ValidationReport {
  const diagnostics: NetworkV2Diagnostic[] = []
  const knownComponents = collectKnownComponents(nodes)
  const edgeIds = new Set(edges.map((edge) => edge.id))

  for (const edge of edges) {
    const edgeKind = edge.data?.edge_kind
    if (!edgeKind) {
      continue
    }

    const connection = validateNetworkV2Connection({
      connection: edge,
      nodes,
      edgeKind,
    })
    if (!connection.valid) {
      diagnostics.push(
        edgeDiagnostic(edge.id, connectionDiagnostic(connection.code, edge)),
      )
    }

    if (!isNetworkV2EdgeTypeKindMatch({ edgeKind, edgeType: edge.type })) {
      diagnostics.push(
        edgeDiagnostic(edge.id, {
          code: "EDGE_TYPE_KIND_MISMATCH",
          fieldPath: "edge_kind",
          message: "edge.type must match edge.data.edge_kind.",
        }),
      )
    }

    if (edgeKind === "settling" && edge.data?.flow_spec) {
      diagnostics.push(
        edgeDiagnostic(edge.id, {
          code: "SETTLING_VOLUME_CONTRIBUTION_FORBIDDEN",
          fieldPath: "flow_spec",
          message: "Settling edges must not define flow_spec.",
        }),
      )
    }

    if (edgeKind === "signal" && edge.data?.flow_spec) {
      diagnostics.push(
        edgeDiagnostic(edge.id, {
          code: "SIGNAL_VOLUME_CONTRIBUTION_FORBIDDEN",
          fieldPath: "flow_spec",
          message: "Signal edges must not define flow_spec.",
        }),
      )
    }

    if (edgeKind === "signal" && edge.data?.transport_model) {
      diagnostics.push(
        edgeDiagnostic(edge.id, {
          code: "SIGNAL_MASS_CONTRIBUTION_FORBIDDEN",
          fieldPath: "transport_model",
          message: "Signal edges must not define transport_model.",
        }),
      )
    }

    if (
      (edgeKind === "hydraulic" || edgeKind === "pump") &&
      !edge.data?.flow_spec
    ) {
      diagnostics.push(
        edgeDiagnostic(edge.id, {
          code: "FLOW_SPEC_REQUIRED",
          fieldPath: "flow_spec",
          message: "Hydraulic and pump edges require flow_spec.",
        }),
      )
    }

    if (edge.data?.component_policy) {
      diagnostics.push(
        ...validateComponentPolicy(
          edge.id,
          edge.data.component_policy,
          knownComponents,
        ),
      )
    }
  }

  for (const constraint of flowConstraints) {
    const referencedEdges = [
      constraint.edge_id,
      ...(constraint.edge_ids || []),
    ].filter(Boolean) as string[]

    for (const edgeId of referencedEdges) {
      if (!edgeIds.has(edgeId)) {
        diagnostics.push({
          code: "FLOW_CONSTRAINT_EDGE_NOT_FOUND",
          severity: "error",
          message: `Flow constraint references missing edge ${edgeId}.`,
          element: { kind: "flow_constraint", id: constraint.id },
          fieldPath: "edge_ids",
        })
      }
    }

    const scalar = constraint.value ?? constraint.ratio
    if (
      (constraint.constraint_kind === "split" ||
        constraint.constraint_kind === "ratio") &&
      (typeof scalar !== "number" || scalar <= 0 || scalar > 1)
    ) {
      diagnostics.push({
        code: "FLOW_CONSTRAINT_INVALID_VALUE",
        severity: "error",
        message: "Split and ratio constraints require a value in (0, 1].",
        element: { kind: "flow_constraint", id: constraint.id },
        fieldPath: constraint.ratio === undefined ? "value" : "ratio",
      })
    }
  }

  return {
    status: diagnostics.some((diagnostic) => diagnostic.severity === "error")
      ? "invalid"
      : "valid",
    diagnostics,
  }
}

function connectionDiagnostic(
  code: ConnectionValidationCode,
  edge: Edge<NetworkV2EdgeData>,
) {
  const mapped = {
    MISSING_ENDPOINT: edge.sourceHandle
      ? "EDGE_TARGET_PORT_NOT_FOUND"
      : "EDGE_SOURCE_PORT_NOT_FOUND",
    SELF_CONNECTION: "SELF_CONNECTION_FORBIDDEN",
    SOURCE_NODE_NOT_FOUND: "EDGE_SOURCE_NODE_NOT_FOUND",
    TARGET_NODE_NOT_FOUND: "EDGE_TARGET_NODE_NOT_FOUND",
    SOURCE_PORT_NOT_FOUND: "EDGE_SOURCE_PORT_NOT_FOUND",
    TARGET_PORT_NOT_FOUND: "EDGE_TARGET_PORT_NOT_FOUND",
    SOURCE_DIRECTION_INVALID: "EDGE_SOURCE_DIRECTION_INVALID",
    TARGET_DIRECTION_INVALID: "EDGE_TARGET_DIRECTION_INVALID",
    EDGE_KIND_INCOMPATIBLE: "EDGE_PORT_KIND_INCOMPATIBLE",
  } satisfies Record<ConnectionValidationCode, NetworkV2DiagnosticCode>
  const fieldPath = code.startsWith("SOURCE")
    ? "sourceHandle"
    : code.startsWith("TARGET")
      ? "targetHandle"
      : "sourceHandle/targetHandle"
  return {
    code: mapped[code],
    fieldPath,
    message: `Invalid ${edge.data?.edge_kind ?? "network"} connection: ${code}.`,
  }
}

function collectKnownComponents(nodes: Node<NetworkV2NodeData>[]) {
  const components = new Set(["COD", "X_TSS"])
  for (const node of nodes) {
    for (const component of Object.keys(node.data.initial_conditions || {})) {
      components.add(component)
    }
  }
  return components
}

function validateComponentPolicy(
  edgeId: string,
  policy: NetworkV2ComponentPolicy,
  knownComponents: Set<string>,
) {
  const diagnostics: NetworkV2Diagnostic[] = []
  for (const field of ["include", "exclude"] as const) {
    for (const component of policy[field]) {
      if (!knownComponents.has(component)) {
        diagnostics.push(
          edgeDiagnostic(edgeId, {
            code: "UNKNOWN_COMPONENT_IN_POLICY",
            fieldPath: `component_policy.${field}`,
            message: `Unknown component in policy: ${component}.`,
          }),
        )
      }
    }
  }
  return diagnostics
}

function edgeDiagnostic(
  edgeId: string,
  input: {
    code: NetworkV2DiagnosticCode
    fieldPath: string
    message: string
  },
): NetworkV2Diagnostic {
  return {
    code: input.code,
    severity: "error",
    message: input.message,
    element: { kind: "edge", id: edgeId },
    fieldPath: input.fieldPath,
  }
}
