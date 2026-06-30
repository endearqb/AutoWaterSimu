import type { ComputeJob, JobSnapshot } from "@/client/compute"
import { computeJobApi } from "@/features/compute-jobs/api"

import {
  validateNetworkProcessGraphContract,
  validateNetworkSimulationInputContract,
} from "../serialize/contractValidation"
import { toNetworkProcessGraphV1 } from "../serialize/toNetworkProcessGraphV1"
import { toNetworkSimulationInputV1 } from "../serialize/toNetworkSimulationInputV1"
import type {
  UdmV2FlowStore,
  UdmV2RuntimeStatus,
} from "../state/createUdmV2FlowStore"

export const UDM_NETWORK_NOT_EXECUTABLE_YET = "UDM_NETWORK_NOT_EXECUTABLE_YET"
export const UDM_V2_NOT_EXECUTABLE_MESSAGE =
  "UDM Network v2 wire path 已注册，simulation worker runtime 尚未执行。"

export type UdmV2JobSnapshot = {
  job: JobSnapshot
  runtimeStatus: UdmV2RuntimeStatus
  message?: string
}

type ComputeApi = Pick<typeof computeJobApi, "createJob">

export function createUdmV2ComputeService(api: ComputeApi = computeJobApi) {
  return {
    async submitNetwork(
      state: Pick<
        UdmV2FlowStore,
        | "nodes"
        | "edges"
        | "flowConstraints"
        | "currentNetworkGraphId"
        | "currentNetworkGraphVersion"
      >,
    ): Promise<UdmV2JobSnapshot> {
      const graph = toNetworkProcessGraphV1({
        graphId: state.currentNetworkGraphId || "udm_network_v2_canvas",
        version: state.currentNetworkGraphVersion || 1,
        nodes: state.nodes,
        edges: state.edges,
        flowConstraints: state.flowConstraints,
      })
      const graphReport = validateNetworkProcessGraphContract(graph)
      if (graphReport.status === "invalid") {
        throw new Error("UDM_V2_GRAPH_CONTRACT_INVALID")
      }

      const input = toNetworkSimulationInputV1(graph)
      const inputReport = validateNetworkSimulationInputContract(input)
      if (inputReport.status === "invalid") {
        throw new Error("UDM_V2_INPUT_CONTRACT_INVALID")
      }

      const { job, idempotencyKey } = buildUdmV2ComputeJob(input)
      const snapshot = await api.createJob(job, idempotencyKey)
      return normalizeUdmV2JobSnapshot(snapshot)
    },
  }
}

export const udmV2ComputeService = createUdmV2ComputeService()

export function buildUdmV2ComputeJob(input: Record<string, unknown>): {
  job: ComputeJob
  idempotencyKey: string
} {
  const suffix = uniqueSuffix()
  const idempotencyKey = `idem_udm_v2_${suffix}`
  return {
    idempotencyKey,
    job: {
      schema_version: "compute_job.v1",
      job_id: `job_udm_v2_${suffix}`,
      job_type: "simulation.udm_network.v1",
      queue: "simulation",
      request_id: `req_udm_v2_${suffix}`,
      idempotency_key: idempotencyKey,
      payload: input,
    },
  }
}

export function normalizeUdmV2JobSnapshot(
  snapshot: JobSnapshot,
): UdmV2JobSnapshot {
  const errorCode = String(
    snapshot.job.error_code ||
      (snapshot.job.summary as { error_code?: unknown } | undefined)
        ?.error_code ||
      "",
  )
  if (errorCode === UDM_NETWORK_NOT_EXECUTABLE_YET) {
    return {
      job: snapshot,
      runtimeStatus: "runtime_pending",
      message: UDM_V2_NOT_EXECUTABLE_MESSAGE,
    }
  }
  return {
    job: snapshot,
    runtimeStatus: snapshot.job.status === "failed" ? "failed" : "idle",
  }
}

function uniqueSuffix() {
  const uuid = globalThis.crypto?.randomUUID?.()
  return uuid ? uuid.replace(/-/g, "").slice(0, 12) : Date.now().toString(36)
}
