import type {
  NetworkProcessGraphV1,
  NetworkSimulationInputV1,
} from "../contracts/generated"

export type ToNetworkSimulationInputV1Options = {
  simulationInputId?: string
  parameters?: Partial<NetworkSimulationInputV1["parameters"]>
  runtimeOptions?: Partial<NetworkSimulationInputV1["runtime_options"]>
  metadata?: Record<string, unknown>
}

export function toNetworkSimulationInputV1(
  graph: NetworkProcessGraphV1,
  options: ToNetworkSimulationInputV1Options = {},
): NetworkSimulationInputV1 {
  return {
    schema_version: "network_simulation_input.v1",
    simulation_input_id:
      options.simulationInputId || `${graph.network_graph_id}_input_v1`,
    job_type: "simulation.udm_network.v1",
    network_graph_id: graph.network_graph_id,
    network_graph_version: graph.version,
    component_schemas: graph.component_schemas,
    nodes: graph.nodes,
    edges: graph.edges,
    flow_constraints: graph.flow_constraints,
    signal_bindings: graph.signal_bindings,
    parameters: {
      duration_days: 1,
      output_step_days: 0.01,
      solver_backend: "scipy",
      solver_method: "BDF",
      rtol: 1e-6,
      atol: 1e-9,
      ...options.parameters,
    },
    runtime_options: {
      strict_flow_balance: true,
      strict_mass_balance: true,
      profile: "network_v2",
      ...options.runtimeOptions,
    },
    metadata: options.metadata,
  }
}
