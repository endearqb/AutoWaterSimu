package compute

import (
	"context"
	"time"

	domainworkers "autowatersimu/apps/api/internal/domain/workers"
)

type workerStoreAdapter struct {
	store WorkerStore
}

func (adapter workerStoreAdapter) UpsertWorker(ctx context.Context, worker WorkerRecord) error {
	return adapter.store.UpsertWorker(ctx, worker)
}

func (adapter workerStoreAdapter) FindWorkerByID(ctx context.Context, workerID string) (*WorkerRecord, error) {
	return adapter.store.FindWorkerByID(ctx, workerID)
}

func (adapter workerStoreAdapter) ClaimNext(ctx context.Context, worker WorkerRecord, leaseExpiresAt time.Time) (*domainworkers.ClaimedJob, error) {
	job, err := adapter.store.ClaimNext(ctx, worker, leaseExpiresAt)
	if err != nil {
		return nil, err
	}
	if job == nil {
		return nil, nil
	}
	return &domainworkers.ClaimedJob{
		InputJSON: job.InputJSON,
		Attempt:   job.Attempt,
	}, nil
}

func (adapter workerStoreAdapter) Heartbeat(ctx context.Context, workerID, jobID string, leaseExpiresAt time.Time) (*domainworkers.HeartbeatJob, error) {
	job, err := adapter.store.Heartbeat(ctx, workerID, jobID, leaseExpiresAt)
	if err != nil {
		return nil, err
	}
	if job == nil {
		return nil, nil
	}
	return &domainworkers.HeartbeatJob{
		JobID:           job.JobID,
		CancelRequested: job.CancelRequested || job.Status == StatusCancelled,
		Terminal:        isTerminal(job.Status),
		Status:          job.Status,
	}, nil
}
