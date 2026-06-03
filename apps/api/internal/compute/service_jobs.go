package compute

import "context"

func (svc *Service) CreateJob(ctx context.Context, bytes []byte, headerIdempotencyKey string) (JobSnapshot, int, error) {
	return svc.jobLifecycle.CreateJob(ctx, bytes, headerIdempotencyKey)
}

func (svc *Service) GetJob(ctx context.Context, jobID string) (JobSnapshot, error) {
	return svc.jobLifecycle.GetJob(ctx, jobID)
}

func (svc *Service) ListJobs(ctx context.Context, filter ListFilter) (ListJobsResponse, error) {
	return svc.jobLifecycle.ListJobs(ctx, filter)
}

func (svc *Service) Events(ctx context.Context, jobID string) ([]EventRecord, error) {
	return svc.jobLifecycle.Events(ctx, jobID)
}

func (svc *Service) CancelJob(ctx context.Context, jobID string) (JobSnapshot, error) {
	return svc.jobLifecycle.CancelJob(ctx, jobID)
}

func (svc *Service) Complete(ctx context.Context, workerID, jobID string, attempt int, result map[string]any) (JobSnapshot, error) {
	return svc.jobLifecycle.Complete(ctx, workerID, jobID, attempt, result)
}

func (svc *Service) Fail(ctx context.Context, workerID, jobID string, attempt int, errorCode, errorMessage string) (JobSnapshot, error) {
	return svc.jobLifecycle.Fail(ctx, workerID, jobID, attempt, errorCode, errorMessage)
}

func (svc *Service) TimeoutSweep(ctx context.Context) ([]JobRecord, error) {
	return svc.jobLifecycle.TimeoutSweep(ctx)
}
