import type { ComputeJob } from "@/client/compute"
import type { ProcessGraph, SimulationInput } from "@/contracts"

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

export interface ListBenchmarkRunsParams {
  benchmarkCaseId?: string
  cursor?: string
  jobId?: string
  limit?: number
  modelKey: string
  modelVersion: string
  parameterSetId?: string
}

export interface ListModelCatalogSnapshotsParams {
  catalogId?: string
  cursor?: string
  limit?: number
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

export type {
  ArtifactRecord,
  ArtifactRetentionAction,
  ArtifactRetentionSweepReport,
  ContractValidationResponse,
  EventRecord,
  EvidenceReferenceResolution,
  JobSnapshot,
  ModelCatalog,
  ModelCatalogRecord,
  ModelParameterSetPromotionPlan,
  ModelRun,
  ProductionReadinessReport,
} from "@/client/compute"
