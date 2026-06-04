import { computeArtifactsApi } from "./computeArtifactsApi"
import { computeContractsApi } from "./computeContractsApi"
import { computeJobApi } from "./computeJobApi"
import { computeModelGovernanceApi } from "./computeModelGovernanceApi"
import { computeSimulationRegistryApi } from "./computeSimulationRegistryApi"

export {
  buildComputeJobFromFlowExport,
  buildMaterialBalanceDemoJob,
} from "./computeJobBuilders"

export type {
  BuildFlowComputeJobResult,
  ComputeHealthStatus,
  EvidenceDownloadResult,
  ListBenchmarkRunsParams,
  ListComputeJobsParams,
  ListModelCatalogSnapshotsParams,
  ListModelRunsParams,
} from "./computeJobsTypes"

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
} from "./computeJobsTypes"

export const computeJobsService = {
  ...computeJobApi,
  ...computeArtifactsApi,
  ...computeModelGovernanceApi,
  ...computeContractsApi,
  ...computeSimulationRegistryApi,
}
