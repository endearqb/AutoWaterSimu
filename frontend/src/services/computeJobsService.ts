import { OpenAPI as ComputeOpenAPI, DefaultService } from "@/client/compute"
import type {
  ArtifactRecord,
  ComputeJob,
  ContractValidationResponse,
  DraftConfirmationRecord,
  EvidencePackage,
  GetComputeJobEventsResponse,
  GetComputeJobResultResponse,
  JobSnapshot,
  ListJobsResponse,
  ListModelRunsResponse,
  ModelCatalog,
  ModelCatalogRecord,
  ModelParameterSetTransitionResponse,
  ParameterSetStatusUpdateRequest,
  ProcessGraphRecord as ComputeProcessGraphRecord,
} from "@/client/compute"
import type { ApiRequestOptions } from "@/client/compute/core/ApiRequestOptions"
import {
  SUPPORTED_JOB_TYPE,
  canvasGraphToProcessGraph,
  legacyFlowExportToCanvasGraph,
  processGraphToSimulationInput,
} from "@/contracts"
import type {
  LegacyFlowExport,
  ProcessGraph,
  SimulationInput,
} from "@/contracts"

export interface ComputeHealthStatus {
  health: unknown
  ready: unknown
}

export interface ListComputeJobsParams {
  status?: string
  cursor?: string
  limit?: number
}

export interface ListModelRunsParams {
  cursor?: string
  jobId?: string
  limit?: number
  modelKey?: string
  modelVersion?: string
}

export interface BuildFlowComputeJobResult {
  job: ComputeJob
  idempotencyKey: string
  processGraph: ProcessGraph
  simulationInput: SimulationInput
}

export interface EvidenceDownloadResult {
  jobId: string
  filename: string
  checksum?: string
}

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

const computeApiPath = (path: string) =>
  `${ComputeOpenAPI.BASE.replace(/\/$/, "")}${path}`

const resolveComputeToken = async () => {
  if (typeof ComputeOpenAPI.TOKEN === "function") {
    return ComputeOpenAPI.TOKEN({
      method: "GET",
      url: "",
    } as ApiRequestOptions<string>)
  }
  return ComputeOpenAPI.TOKEN || ""
}

const readErrorBody = async (response: Response): Promise<unknown> => {
  const text = await response.text()
  if (!text) {
    return { message: response.statusText || "Request failed" }
  }
  try {
    return JSON.parse(text)
  } catch {
    return { message: text }
  }
}

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

export const computeJobsService = {
  checkHealth(): Promise<ComputeHealthStatus> {
    return Promise.all([
      DefaultService.getHealthz(),
      DefaultService.getReadyz(),
    ]).then(([health, ready]) => ({ health, ready }))
  },

  listJobs(params: ListComputeJobsParams = {}): Promise<ListJobsResponse> {
    return DefaultService.listComputeJobs({
      cursor: params.cursor,
      limit: params.limit ?? 20,
      status: params.status || undefined,
    })
  },

  getJob(jobId: string): Promise<JobSnapshot> {
    return DefaultService.getComputeJob({ jobId })
  },

  getJobResult(jobId: string): Promise<GetComputeJobResultResponse> {
    return DefaultService.getComputeJobResult({ jobId })
  },

  getJobEvents(jobId: string): Promise<GetComputeJobEventsResponse> {
    return DefaultService.getComputeJobEvents({ jobId })
  },

  listModelRuns(
    params: ListModelRunsParams = {},
  ): Promise<ListModelRunsResponse> {
    return DefaultService.listModelRuns({
      cursor: params.cursor,
      jobId: params.jobId || undefined,
      limit: params.limit ?? 20,
      modelKey: params.modelKey || undefined,
      modelVersion: params.modelVersion || undefined,
    })
  },

  listModelCatalog(): Promise<ModelCatalog> {
    return DefaultService.listModelCatalog()
  },

  registerModelCatalog(catalog: ModelCatalog): Promise<ModelCatalogRecord> {
    return DefaultService.registerModelCatalog({ requestBody: catalog })
  },

  updateDefaultParameterSetStatus(
    modelKey: string,
    modelVersion: string,
    request: ParameterSetStatusUpdateRequest,
  ): Promise<ModelParameterSetTransitionResponse> {
    return DefaultService.updateDefaultParameterSetStatus({
      modelKey,
      modelVersion,
      requestBody: request,
    })
  },

  validateContractDocument(
    document: Record<string, unknown>,
  ): Promise<ContractValidationResponse> {
    return DefaultService.validateContract({ requestBody: document })
  },

  confirmDraftDocument(
    document: Record<string, unknown>,
  ): Promise<ContractValidationResponse> {
    return DefaultService.confirmDraft({ requestBody: document })
  },

  getDraftConfirmation(
    confirmationId: string,
  ): Promise<DraftConfirmationRecord> {
    return DefaultService.getDraftConfirmation({ confirmationId })
  },

  promoteDraftConfirmationToSimulationCheck(
    confirmationId: string,
  ): Promise<JobSnapshot> {
    return DefaultService.promoteDraftConfirmationToSimulationCheck({
      confirmationId,
    })
  },

  registerProcessGraph(
    processGraph: ProcessGraph,
  ): Promise<ComputeProcessGraphRecord> {
    return DefaultService.registerProcessGraph({ requestBody: processGraph })
  },

  getProcessGraph(
    processGraphId: string,
    version = 1,
  ): Promise<ComputeProcessGraphRecord> {
    return DefaultService.getProcessGraph({ processGraphId, version })
  },

  createDemoJob(): Promise<JobSnapshot> {
    const { job, idempotencyKey } = buildMaterialBalanceDemoJob()
    return DefaultService.createComputeJob({
      idempotencyKey,
      requestBody: job,
    })
  },

  createJobFromFlowExport(
    flowExport: LegacyFlowExport,
    name?: string,
  ): Promise<JobSnapshot> {
    const { job, idempotencyKey } = buildComputeJobFromFlowExport(
      flowExport,
      name,
    )
    return DefaultService.createComputeJob({
      idempotencyKey,
      requestBody: job,
    })
  },

  cancelJob(jobId: string): Promise<JobSnapshot> {
    return DefaultService.cancelComputeJob({ jobId })
  },

  async downloadArtifact(artifact: ArtifactRecord): Promise<void> {
    const blob = await DefaultService.downloadArtifact({
      artifactId: artifact.artifact_id,
    })
    const objectName =
      artifact.object_key.split("/").pop() || artifact.artifact_id
    downloadBlob(blob, objectName)
  },

  async downloadEvidencePackage(
    jobId: string,
  ): Promise<EvidenceDownloadResult> {
    const token = await resolveComputeToken()
    const response = await fetch(
      computeApiPath(
        `/api/v1/compute/jobs/${encodeURIComponent(jobId)}/evidence`,
      ),
      {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      },
    )
    if (!response.ok) {
      const body = await readErrorBody(response)
      throw Object.assign(new Error("Evidence download failed"), {
        body,
        status: response.status,
      })
    }
    const evidence = (await response.json()) as EvidencePackage
    const checksum = response.headers.get("X-Evidence-Checksum") || undefined
    const evidenceRecord = evidence as EvidencePackage & {
      evidence_package_id?: unknown
    }
    const evidenceId =
      typeof evidenceRecord.evidence_package_id === "string" &&
      evidenceRecord.evidence_package_id.length > 0
        ? evidenceRecord.evidence_package_id
        : `evidence_${jobId}`
    const blob = new Blob([JSON.stringify(evidence, null, 2)], {
      type: "application/json",
    })
    const filename = `${evidenceId}.json`
    downloadBlob(blob, filename)
    return { checksum, filename, jobId }
  },
}
