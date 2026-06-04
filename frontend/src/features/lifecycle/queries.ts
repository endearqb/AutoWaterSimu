import type {
  ArtifactRecord,
  ArtifactRetentionSweepRequest,
} from "@/client/compute"
import { computeJobApi } from "@/features/compute-jobs/api"

import { computeArtifactsApi } from "./api"

export const computeLifecycleQueryKeys = {
  health: ["compute-lifecycle", "health"] as const,
  metrics: ["compute-lifecycle", "metrics"] as const,
  root: ["compute-lifecycle"] as const,
}

export const computeLifecycleHealthQueryOptions = () => ({
  queryFn: () => computeJobApi.checkHealth(),
  queryKey: computeLifecycleQueryKeys.health,
})

export const computeLifecycleMetricsQueryOptions = () => ({
  queryFn: () => computeJobApi.getMetrics(),
  queryKey: computeLifecycleQueryKeys.metrics,
})

export const sweepArtifactRetentionMutationOptions = (
  request: () => ArtifactRetentionSweepRequest,
) => ({
  mutationFn: () => computeArtifactsApi.sweepArtifactRetention(request()),
})

export const downloadArtifactMutationOptions = () => ({
  mutationFn: (artifact: ArtifactRecord) =>
    computeArtifactsApi.downloadArtifact(artifact),
})

export const downloadEvidencePackageMutationOptions = () => ({
  mutationFn: (jobId: string) => computeArtifactsApi.downloadEvidencePackage(jobId),
})
