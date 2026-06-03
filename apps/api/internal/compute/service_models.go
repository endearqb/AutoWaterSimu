package compute

import (
	"context"
	"encoding/json"
)

func (svc *Service) ScheduleBenchmarkCaseRun(ctx context.Context, modelKey, modelVersion, benchmarkCaseID string, request BenchmarkCaseRunRequest, defaultSourceSystem, defaultRequestedBy string) (JobSnapshot, int, error) {
	return svc.modelGovernance.ScheduleBenchmarkCaseRun(ctx, modelKey, modelVersion, benchmarkCaseID, request, defaultSourceSystem, defaultRequestedBy)
}

func (svc *Service) RegisterModelCatalog(ctx context.Context, bytes []byte, defaultSourceSystem, defaultRequestedBy string) (ModelCatalogRecord, int, error) {
	return svc.modelGovernance.RegisterModelCatalog(ctx, bytes, defaultSourceSystem, defaultRequestedBy)
}

func (svc *Service) ModelCatalog(ctx context.Context) (ModelCatalogResponse, error) {
	return svc.modelGovernance.ModelCatalog(ctx)
}

func (svc *Service) ModelCatalogModel(ctx context.Context, modelKey string) (ModelCatalogModel, error) {
	return svc.modelGovernance.ModelCatalogModel(ctx, modelKey)
}

func (svc *Service) ListModelCatalogSnapshots(ctx context.Context, filter ModelCatalogSnapshotFilter) (ListModelCatalogSnapshotsResponse, error) {
	return svc.modelGovernance.ListModelCatalogSnapshots(ctx, filter)
}

func (svc *Service) UpdateDefaultParameterSetStatus(ctx context.Context, modelKey, modelVersion string, request ParameterSetStatusUpdateRequest, defaultSourceSystem, defaultRequestedBy string) (ModelParameterSetTransitionResponse, int, error) {
	return svc.modelGovernance.UpdateDefaultParameterSetStatus(ctx, modelKey, modelVersion, request, defaultSourceSystem, defaultRequestedBy)
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
