import type { ArtifactRecord } from "@/client/compute"
import type { LegacyFlowExport } from "@/contracts"

import { computeJobApi } from "./api"

export interface ResolveEvidenceReferenceInput {
  jobId: string
  evidenceRef: string
}

export const computeJobQueryKeys = {
  health: ["compute-api-health"] as const,
  list: (status: string) => ["compute-jobs", { status }] as const,
  detail: (jobId: string | null | undefined) =>
    ["compute-job", jobId] as const,
  result: (jobId: string | null | undefined) =>
    ["compute-job-result", jobId] as const,
  events: (jobId: string | null | undefined) =>
    ["compute-job-events", jobId] as const,
  productionReadiness: (jobId: string | null | undefined) =>
    ["compute-job-production-readiness", jobId] as const,
}

export const getComputeJobsBaseUrl = (): string => computeJobApi.getBaseUrl()

export const computeHealthQueryOptions = () => ({
  queryFn: computeJobApi.checkHealth,
  queryKey: computeJobQueryKeys.health,
})

export const listComputeJobsQueryOptions = (status: string) => ({
  queryFn: () =>
    computeJobApi.listJobs({
      limit: 20,
      status: status.trim(),
    }),
  queryKey: computeJobQueryKeys.list(status),
})

export const computeJobDetailQueryOptions = (
  jobId: string | null | undefined,
) => ({
  enabled: Boolean(jobId),
  queryFn: () => computeJobApi.getJob(jobId as string),
  queryKey: computeJobQueryKeys.detail(jobId),
})

export const computeJobResultQueryOptions = (
  jobId: string | null | undefined,
) => ({
  enabled: Boolean(jobId),
  queryFn: () => computeJobApi.getJobResult(jobId as string),
  queryKey: computeJobQueryKeys.result(jobId),
})

export const computeJobEventsQueryOptions = (
  jobId: string | null | undefined,
) => ({
  enabled: Boolean(jobId),
  queryFn: () => computeJobApi.getJobEvents(jobId as string),
  queryKey: computeJobQueryKeys.events(jobId),
})

export const computeJobProductionReadinessQueryOptions = (
  jobId: string | null | undefined,
  enabled = Boolean(jobId),
) => ({
  enabled,
  queryFn: () => computeJobApi.getProductionReadiness(jobId as string),
  queryKey: computeJobQueryKeys.productionReadiness(jobId),
})

export const createDemoJobMutationOptions = () => ({
  mutationFn: computeJobApi.createDemoJob,
})

export const createJobFromFlowExportMutationOptions = (
  flowExport: () => LegacyFlowExport,
  name?: string,
) => ({
  mutationFn: () => computeJobApi.createJobFromFlowExport(flowExport(), name),
})

export const cancelComputeJobMutationOptions = () => ({
  mutationFn: (jobId: string) => computeJobApi.cancelJob(jobId),
})

export const resolveEvidenceReferenceMutationOptions = () => ({
  mutationFn: ({ evidenceRef, jobId }: ResolveEvidenceReferenceInput) =>
    computeJobApi.resolveEvidenceReference(jobId, evidenceRef),
})

export type { ArtifactRecord }
