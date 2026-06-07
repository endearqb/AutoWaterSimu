package compute

import (
	"context"
	"encoding/json"
	"strings"
)

func (svc *Service) ScheduleBenchmarkCaseRun(ctx context.Context, modelKey, modelVersion, benchmarkCaseID string, request BenchmarkCaseRunRequest, defaultSourceSystem, defaultRequestedBy string) (JobSnapshot, int, error) {
	return svc.modelGovernance.ScheduleBenchmarkCaseRun(ctx, modelKey, modelVersion, benchmarkCaseID, request, defaultSourceSystem, defaultRequestedBy)
}

func (svc *Service) RegisterModelCatalog(ctx context.Context, bytes []byte, defaultSourceSystem, defaultRequestedBy string) (ModelCatalogRecord, int, error) {
	return svc.modelGovernance.RegisterModelCatalog(ctx, bytes, defaultSourceSystem, defaultRequestedBy)
}

func (svc *Service) RegisterModelCatalogForScope(ctx context.Context, bytes []byte, defaultSourceSystem, defaultRequestedBy string, filter ModelCatalogSnapshotFilter) (ModelCatalogRecord, int, error) {
	return svc.modelGovernance.RegisterModelCatalogForScope(ctx, bytes, defaultSourceSystem, defaultRequestedBy, filter)
}

func (svc *Service) ModelCatalog(ctx context.Context) (ModelCatalogResponse, error) {
	return svc.modelGovernance.ModelCatalog(ctx)
}

func (svc *Service) ModelCatalogForRead(ctx context.Context, filter ModelCatalogSnapshotFilter) (ModelCatalogResponse, *ModelCatalogRecord, error) {
	return svc.modelGovernance.ModelCatalogForRead(ctx, filter)
}

func (svc *Service) ModelCatalogModel(ctx context.Context, modelKey string) (ModelCatalogModel, error) {
	return svc.modelGovernance.ModelCatalogModel(ctx, modelKey)
}

func (svc *Service) ModelCatalogModelForRead(ctx context.Context, modelKey string, filter ModelCatalogSnapshotFilter) (ModelCatalogModel, *ModelCatalogRecord, error) {
	return svc.modelGovernance.ModelCatalogModelForRead(ctx, modelKey, filter)
}

func (svc *Service) ListModelCatalogSnapshots(ctx context.Context, filter ModelCatalogSnapshotFilter) (ListModelCatalogSnapshotsResponse, error) {
	return svc.modelGovernance.ListModelCatalogSnapshots(ctx, filter)
}

func (svc *Service) UpdateDefaultParameterSetStatus(ctx context.Context, modelKey, modelVersion string, request ParameterSetStatusUpdateRequest, defaultSourceSystem, defaultRequestedBy string) (ModelParameterSetTransitionResponse, int, error) {
	return svc.modelGovernance.UpdateDefaultParameterSetStatus(ctx, modelKey, modelVersion, request, defaultSourceSystem, defaultRequestedBy)
}

func (svc *Service) UpdateDefaultParameterSetStatusForScope(ctx context.Context, modelKey, modelVersion string, request ParameterSetStatusUpdateRequest, defaultSourceSystem, defaultRequestedBy string, filter ModelCatalogSnapshotFilter) (ModelParameterSetTransitionResponse, int, error) {
	return svc.modelGovernance.UpdateDefaultParameterSetStatusForScope(ctx, modelKey, modelVersion, request, defaultSourceSystem, defaultRequestedBy, filter)
}

func (svc *Service) DefaultParameterSetPromotionPlan(ctx context.Context, modelKey, modelVersion string) (ModelParameterSetPromotionPlan, error) {
	return svc.modelGovernance.DefaultParameterSetPromotionPlan(ctx, modelKey, modelVersion)
}

func (svc *Service) PromoteDefaultParameterSetToApproved(ctx context.Context, modelKey, modelVersion string, request ParameterSetPromotionRequest, defaultSourceSystem, defaultRequestedBy string) (ModelParameterSetTransitionResponse, int, error) {
	return svc.modelGovernance.PromoteDefaultParameterSetToApproved(ctx, modelKey, modelVersion, request, defaultSourceSystem, defaultRequestedBy)
}

func (svc *Service) RegisterBenchmarkRun(ctx context.Context, bytes []byte, defaultSourceSystem, defaultRequestedBy string) (BenchmarkRunRecord, int, error) {
	return svc.modelGovernance.RegisterBenchmarkRun(ctx, bytes, defaultSourceSystem, defaultRequestedBy)
}

func (svc *Service) RegisterBenchmarkRunForScope(ctx context.Context, bytes []byte, defaultSourceSystem, defaultRequestedBy string, filter ListFilter) (BenchmarkRunRecord, int, error) {
	if listFilterHasDataScope(filter) {
		jobID, err := benchmarkRunJobIDFromBytes(bytes)
		if err != nil {
			return BenchmarkRunRecord{}, 0, err
		}
		job, err := svc.store.FindJobByID(ctx, jobID)
		if err != nil {
			return BenchmarkRunRecord{}, 0, err
		}
		if err := authorizeListFilterDataScope(filter, "benchmark run job", job.TenantID, job.ProjectID, job.SiteID); err != nil {
			return BenchmarkRunRecord{}, 0, err
		}
	}
	return svc.RegisterBenchmarkRun(ctx, bytes, defaultSourceSystem, defaultRequestedBy)
}

func (svc *Service) GetBenchmarkRun(ctx context.Context, benchmarkRunID string) (BenchmarkRunRecord, error) {
	return svc.modelGovernance.GetBenchmarkRun(ctx, benchmarkRunID)
}

func (svc *Service) ListBenchmarkRuns(ctx context.Context, filter BenchmarkRunFilter) (ListBenchmarkRunsResponse, error) {
	return svc.modelGovernance.ListBenchmarkRuns(ctx, filter)
}

func (svc *Service) GetModelRun(ctx context.Context, modelRunID string) (json.RawMessage, error) {
	return svc.modelGovernance.GetModelRun(ctx, modelRunID)
}

func (svc *Service) ListModelRuns(ctx context.Context, filter ModelRunFilter) (ListModelRunsResponse, error) {
	return svc.modelGovernance.ListModelRuns(ctx, filter)
}

func benchmarkRunJobIDFromBytes(bytes []byte) (string, error) {
	var document map[string]any
	if err := json.Unmarshal(bytes, &document); err != nil {
		return "", ValidationError("benchmark_run JSON is invalid")
	}
	jobID := strings.TrimSpace(stringValue(document, "job_id"))
	if jobID == "" {
		return "", ValidationError("job_id is required")
	}
	return jobID, nil
}
