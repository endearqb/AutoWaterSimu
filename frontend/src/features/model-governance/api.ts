import { DefaultService } from "@/client/compute"
import type {
  BenchmarkCaseRunRequest,
  BenchmarkRun,
  BenchmarkRunRecord,
  JobSnapshot,
  ListBenchmarkRunsResponse,
  ListModelCatalogSnapshotsResponse,
  ListModelRunsResponse,
  ModelCatalog,
  ModelCatalogRecord,
  ModelParameterSetPromotionPlan,
  ModelParameterSetTransitionResponse,
  ParameterSetPromotionRequest,
  ParameterSetStatusUpdateRequest,
} from "@/client/compute"
import type {
  ListBenchmarkRunsParams,
  ListModelCatalogSnapshotsParams,
  ListModelRunsParams,
} from "@/shared/api/computeTypes"

export const computeModelGovernanceApi = {
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

  listModelCatalogSnapshots(
    params: ListModelCatalogSnapshotsParams = {},
  ): Promise<ListModelCatalogSnapshotsResponse> {
    return DefaultService.listModelCatalogSnapshots({
      catalogId: params.catalogId || undefined,
      cursor: params.cursor,
      limit: params.limit ?? 20,
    })
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

  getDefaultParameterSetPromotionPlan(
    modelKey: string,
    modelVersion: string,
    jobId?: string,
  ): Promise<ModelParameterSetPromotionPlan> {
    return DefaultService.getDefaultParameterSetPromotionPlan({
      jobId: jobId || undefined,
      modelKey,
      modelVersion,
    })
  },

  promoteDefaultParameterSetToApproved(
    modelKey: string,
    modelVersion: string,
    request: ParameterSetPromotionRequest = {},
    jobId?: string,
  ): Promise<ModelParameterSetTransitionResponse> {
    return DefaultService.promoteDefaultParameterSetToApproved({
      jobId: jobId || undefined,
      modelKey,
      modelVersion,
      requestBody: request,
    })
  },

  listBenchmarkRuns(
    params: ListBenchmarkRunsParams,
  ): Promise<ListBenchmarkRunsResponse> {
    return DefaultService.listBenchmarkRuns({
      benchmarkCaseId: params.benchmarkCaseId || undefined,
      cursor: params.cursor,
      jobId: params.jobId || undefined,
      limit: params.limit ?? 20,
      modelKey: params.modelKey,
      modelVersion: params.modelVersion,
      parameterSetId: params.parameterSetId || undefined,
    })
  },

  scheduleBenchmarkCaseRun(
    modelKey: string,
    modelVersion: string,
    benchmarkCaseId: string,
    request: BenchmarkCaseRunRequest = {},
  ): Promise<JobSnapshot> {
    return DefaultService.scheduleBenchmarkCaseRun({
      benchmarkCaseId,
      modelKey,
      modelVersion,
      requestBody: request,
    })
  },

  recordBenchmarkRun(
    modelKey: string,
    modelVersion: string,
    benchmarkRun: BenchmarkRun,
  ): Promise<BenchmarkRunRecord> {
    return DefaultService.recordBenchmarkRun({
      modelKey,
      modelVersion,
      requestBody: benchmarkRun,
    })
  },

  getBenchmarkRun(benchmarkRunId: string): Promise<BenchmarkRunRecord> {
    return DefaultService.getBenchmarkRun({ benchmarkRunId })
  },
}
