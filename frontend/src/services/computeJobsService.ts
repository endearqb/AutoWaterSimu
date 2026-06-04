import { computeContractsApi } from "@/features/contracts/api"
import { computeJobApi } from "@/features/compute-jobs/api"
import { computeSimulationRegistryApi } from "@/features/compute-jobs/processGraphApi"
import { computeArtifactsApi } from "@/features/lifecycle/api"
import { computeModelGovernanceApi } from "@/features/model-governance/api"

export {
  buildComputeJobFromFlowExport,
  buildMaterialBalanceDemoJob,
} from "@/features/compute-jobs/builders"

export type {
  BuildFlowComputeJobResult,
  ComputeHealthStatus,
  EvidenceDownloadResult,
  ListBenchmarkRunsParams,
  ListComputeJobsParams,
  ListModelCatalogSnapshotsParams,
  ListModelRunsParams,
} from "@/shared/api/computeTypes"

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
} from "@/shared/api/computeTypes"

export const computeJobsService = {
  ...computeJobApi,
  ...computeArtifactsApi,
  ...computeModelGovernanceApi,
  ...computeContractsApi,
  ...computeSimulationRegistryApi,
}
