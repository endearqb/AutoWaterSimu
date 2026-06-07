package compute

import (
	"context"

	domainworkers "autowatersimu/apps/api/internal/domain/workers"
)

func (svc *Service) RegisterWorker(ctx context.Context, request map[string]any) (WorkerRecord, error) {
	return svc.workerLifecycle.RegisterWorker(ctx, request)
}

func (svc *Service) Claim(ctx context.Context, workerID string) (map[string]any, error) {
	return svc.workerLifecycle.Claim(ctx, workerID)
}

func (svc *Service) ClaimForScope(ctx context.Context, workerID string, filter ListFilter) (map[string]any, error) {
	return svc.workerLifecycle.ClaimForScope(ctx, workerID, domainworkers.ClaimScope{
		TenantID:  filter.TenantID,
		ProjectID: filter.ProjectID,
		SiteID:    filter.SiteID,
	})
}

func (svc *Service) Heartbeat(ctx context.Context, workerID, jobID string) (map[string]any, error) {
	return svc.workerLifecycle.Heartbeat(ctx, workerID, jobID)
}
