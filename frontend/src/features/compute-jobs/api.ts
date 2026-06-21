import { DefaultService } from "@/client/compute"
import type {
  EvidenceReferenceResolution,
  GetComputeJobEventsResponse,
  GetComputeJobResultResponse,
  JobSnapshot,
  ListJobsResponse,
  ProductionReadinessReport,
} from "@/client/compute"
import type { LegacyFlowExport } from "@/contracts"
import { computeApiBaseUrl } from "@/shared/api/computeApiClient"
import type {
  ComputeHealthStatus,
  ListComputeJobsParams,
} from "@/shared/api/computeTypes"

import {
  buildComputeJobFromFlowExport,
  buildMaterialBalanceDemoJob,
} from "./builders"

export const computeJobApi = {
  getBaseUrl(): string {
    return computeApiBaseUrl()
  },

  checkHealth(): Promise<ComputeHealthStatus> {
    return Promise.all([
      DefaultService.getHealthz(),
      DefaultService.getReadyz(),
    ]).then(([health, ready]) => ({ health, ready }))
  },

  getMetrics(): Promise<string> {
    return DefaultService.getMetrics().then((metrics) =>
      typeof metrics === "string" ? metrics : String(metrics ?? ""),
    )
  },

  listJobs(params: ListComputeJobsParams = {}): Promise<ListJobsResponse> {
    return DefaultService.listComputeJobs({
      cursor: params.cursor,
      jobType: params.jobType,
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

  resolveEvidenceReference(
    jobId: string,
    evidenceRef: string,
  ): Promise<EvidenceReferenceResolution> {
    return DefaultService.resolveEvidenceReference({
      jobId,
      ref: evidenceRef,
    })
  },

  getProductionReadiness(jobId: string): Promise<ProductionReadinessReport> {
    return DefaultService.getComputeJobProductionReadiness({ jobId })
  },

  createDemoJob(): Promise<JobSnapshot> {
    const { job, idempotencyKey } = buildMaterialBalanceDemoJob()
    return DefaultService.createComputeJob({
      idempotencyKey,
      requestBody: job,
    })
  },

  createJob(job: Record<string, unknown>, idempotencyKey?: string) {
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
}
