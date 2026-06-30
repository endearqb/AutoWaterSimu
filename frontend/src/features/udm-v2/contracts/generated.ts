import type { NetworkV2ComponentPolicy, NetworkV2FlowSpec } from "../edges/edgeModel"

export type NetworkProcessGraphV1ComponentSchema = {
  component_schema_id: string
  components: string[]
  unit: string
  metadata?: Record<string, unknown>
}

export type NetworkProcessGraphV1Port = {
  port_id: string
  port_kind:
    | "hydraulic_in"
    | "hydraulic_out"
    | "settling_in"
    | "settling_out"
    | "signal_in"
    | "signal_out"
}

export type NetworkProcessGraphV1Node = {
  node_id: string
  node_type: string
  process_unit_type: string
  component_schema_id: string
  initial_conditions: Record<string, number>
  volume?: number
  ports: NetworkProcessGraphV1Port[]
  model_binding: {
    model_kind: string
    model_id?: string
    model_version?: string
    model_hash?: string
    reaction_enabled: boolean
  }
  parameter_binding: Record<string, unknown>
  unit_metadata: Record<string, unknown>
  metadata?: Record<string, unknown>
}

export type NetworkProcessGraphV1Edge = {
  edge_id: string
  edge_kind: "hydraulic" | "pump" | "settling" | "signal"
  source_node_id: string
  source_port: string
  target_node_id: string
  target_port: string
  component_policy: NetworkV2ComponentPolicy
  stream_adapter?: Record<string, unknown> | null
  flow_spec?: NetworkV2FlowSpec
  transport_model?: Record<string, unknown> | null
  pump?: Record<string, unknown>
  signal_spec?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

export type NetworkProcessGraphV1 = {
  schema_version: "network_process_graph.v1"
  network_graph_id: string
  version: number
  source_canvas_graph_id?: string
  component_schemas: NetworkProcessGraphV1ComponentSchema[]
  nodes: NetworkProcessGraphV1Node[]
  edges: NetworkProcessGraphV1Edge[]
  flow_constraints: Array<Record<string, unknown>>
  signal_bindings: Array<Record<string, unknown>>
  composites: Array<Record<string, unknown>>
  validation: {
    status: "valid"
    errors: []
    warnings: string[]
  }
  metadata?: Record<string, unknown>
}

export type NetworkSimulationInputV1 = {
  schema_version: "network_simulation_input.v1"
  simulation_input_id: string
  job_type: "simulation.udm_network.v1"
  network_graph_id: string
  network_graph_version: number
  component_schemas: NetworkProcessGraphV1ComponentSchema[]
  nodes: NetworkProcessGraphV1Node[]
  edges: NetworkProcessGraphV1Edge[]
  flow_constraints: Array<Record<string, unknown>>
  signal_bindings: Array<Record<string, unknown>>
  parameters: {
    duration_days: number
    output_step_days: number
    solver_backend: string
    solver_method: string
    rtol: number
    atol: number
    [key: string]: unknown
  }
  runtime_options: {
    strict_flow_balance: boolean
    strict_mass_balance: boolean
    profile: string
    [key: string]: unknown
  }
  metadata?: Record<string, unknown>
}
