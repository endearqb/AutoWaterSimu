import type { ListModelRunsParams } from "@/shared/api/computeTypes"

import { computeModelGovernanceApi } from "./api"

export interface ModelPromotionTarget {
  modelKey: string
  modelVersion: string
}

export const modelGovernanceVersionKey = (
  modelKey: string,
  modelVersion: string,
) => `${modelKey}:${modelVersion}`

export const modelGovernanceQueryKeys = {
  root: ["model-governance"] as const,
  catalog: ["model-governance", "catalog"] as const,
  catalogSummary: ["model-catalog"] as const,
  modelRuns: (filters: ListModelRunsParams) => ["model-runs", filters] as const,
  promotionPlans: (targets: ModelPromotionTarget[]) =>
    [
      "model-governance",
      "promotion-plans",
      targets
        .map((target) =>
          modelGovernanceVersionKey(target.modelKey, target.modelVersion),
        )
        .join("|"),
    ] as const,
  snapshots: (cursor: string) =>
    ["model-governance", "snapshots", cursor] as const,
}

export const modelCatalogQueryOptions = (
  queryKey: readonly unknown[] = modelGovernanceQueryKeys.catalog,
) => ({
  queryFn: computeModelGovernanceApi.listModelCatalog,
  queryKey,
})

export const modelCatalogSnapshotsQueryOptions = (cursor: string) => ({
  queryFn: () =>
    computeModelGovernanceApi.listModelCatalogSnapshots({
      catalogId: "default",
      cursor: cursor || undefined,
      limit: 20,
    }),
  queryKey: modelGovernanceQueryKeys.snapshots(cursor),
})

export const modelRunsQueryOptions = (filters: ListModelRunsParams) => ({
  queryFn: () =>
    computeModelGovernanceApi.listModelRuns({
      jobId: filters.jobId?.trim(),
      limit: 20,
      modelKey: filters.modelKey?.trim(),
      modelVersion: filters.modelVersion?.trim(),
    }),
  queryKey: modelGovernanceQueryKeys.modelRuns(filters),
})

export const defaultParameterSetPromotionPlansQueryOptions = (
  targets: ModelPromotionTarget[],
) => ({
  enabled: targets.length > 0,
  queryFn: async () => {
    const entries = await Promise.all(
      targets.map(async (target) => {
        const plan =
          await computeModelGovernanceApi.getDefaultParameterSetPromotionPlan(
            target.modelKey,
            target.modelVersion,
          )
        return [
          modelGovernanceVersionKey(target.modelKey, target.modelVersion),
          plan,
        ] as const
      }),
    )
    return Object.fromEntries(entries)
  },
  queryKey: modelGovernanceQueryKeys.promotionPlans(targets),
})
