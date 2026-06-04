import type { ComputeJob } from "@/client/compute"
import {
  SUPPORTED_JOB_TYPE,
  canvasGraphToProcessGraph,
  legacyFlowExportToCanvasGraph,
  processGraphToSimulationInput,
} from "@/contracts"
import type { LegacyFlowExport } from "@/contracts"

import type { BuildFlowComputeJobResult } from "./computeJobsTypes"

const uniqueSuffix = () => {
  const uuid = globalThis.crypto?.randomUUID?.()
  if (uuid) {
    return uuid.replace(/-/g, "").slice(0, 12)
  }
  return Date.now().toString(36)
}

export const buildMaterialBalanceDemoJob = (): {
  job: ComputeJob
  idempotencyKey: string
} => {
  const suffix = uniqueSuffix()
  const now = new Date().toISOString()
  const jobId = `job_web_demo_${suffix}`
  const requestId = `req_web_demo_${suffix}`
  const idempotencyKey = `idem_web_demo_${suffix}`

  return {
    idempotencyKey,
    job: {
      schema_version: "compute_job.v1",
      job_id: jobId,
      job_type: "simulation.material_balance.v1",
      queue: "simulation",
      request_id: requestId,
      idempotency_key: idempotencyKey,
      payload: {
        schema_version: "simulation_input.v1",
        simulation_input_id: `si_web_demo_${suffix}`,
        process_graph_id: `pg_web_demo_${suffix}`,
        process_graph_version: 1,
        job_type: "simulation.material_balance.v1",
        component_schema: {
          component_schema_id: "material_balance_components.v1",
          components: ["COD"],
          unit: "mg/L",
        },
        nodes: [
          {
            node_id: "n_in",
            node_type: "input",
            initial_volume: 1.0,
            initial_concentrations: { COD: 10.0 },
            is_inlet: true,
            is_outlet: false,
          },
          {
            node_id: "n_tank",
            node_type: "tank",
            initial_volume: 10.0,
            initial_concentrations: { COD: 0.0 },
            is_inlet: false,
            is_outlet: false,
          },
          {
            node_id: "n_out",
            node_type: "output",
            initial_volume: 1.0,
            initial_concentrations: { COD: 0.0 },
            is_inlet: false,
            is_outlet: true,
          },
        ],
        edges: [
          {
            edge_id: "e_in_tank",
            source_node_id: "n_in",
            target_node_id: "n_tank",
            flow_rate: 100.0,
            concentration_transform: { COD: { a: 1.0, b: 0.0 } },
          },
          {
            edge_id: "e_tank_out",
            source_node_id: "n_tank",
            target_node_id: "n_out",
            flow_rate: 100.0,
            concentration_transform: { COD: { a: 1.0, b: 0.0 } },
          },
        ],
        parameters: {
          hours: 4.0,
          steps_per_hour: 60,
          solver_method: "scipy_solver",
          tolerance: 0.000001,
        },
        runtime_options: {},
      },
      context: {
        source_system: "autowatersimu-web",
        requested_by: "user:web-demo",
        trace_id: `trace_web_demo_${suffix}`,
      },
      execution: {
        time_limit_sec: 600,
        priority: "normal",
        required_capabilities: ["material_balance", "ode"],
      },
      created_at: now,
    },
  }
}

export const buildComputeJobFromFlowExport = (
  flowExport: LegacyFlowExport,
  name = "Current Material Balance Flow",
): BuildFlowComputeJobResult => {
  const suffix = uniqueSuffix()
  const canvasGraph = legacyFlowExportToCanvasGraph(
    flowExport,
    `web_flow_${suffix}`,
    name,
  )
  const processGraph = canvasGraphToProcessGraph(canvasGraph)
  const simulationInput = {
    ...processGraphToSimulationInput(processGraph),
    simulation_input_id: `si_web_flow_${suffix}`,
  }
  const jobId = `job_web_flow_${suffix}`
  const requestId = `req_web_flow_${suffix}`
  const idempotencyKey = `idem_web_flow_${suffix}`

  return {
    idempotencyKey,
    job: {
      schema_version: "compute_job.v1",
      job_id: jobId,
      job_type: SUPPORTED_JOB_TYPE,
      queue: "simulation",
      request_id: requestId,
      idempotency_key: idempotencyKey,
      payload: simulationInput,
      context: {
        source_system: "autowatersimu-web",
        requested_by: "user:current-flow",
        trace_id: `trace_web_flow_${suffix}`,
      },
      execution: {
        time_limit_sec: 600,
        priority: "normal",
        required_capabilities: ["material_balance", "ode"],
      },
      created_at: new Date().toISOString(),
      metadata: {
        source: "legacy_flow_export",
        source_canvas_graph_id: processGraph.source_canvas_graph_id,
        process_graph_id: processGraph.process_graph_id,
      },
    },
    processGraph,
    simulationInput,
  }
}
