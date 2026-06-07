package compute

import (
	domainjobs "autowatersimu/apps/api/internal/domain/jobs"
	"context"
	"time"
)

func (store *MemoryStore) UpsertWorker(ctx context.Context, worker WorkerRecord) error {
	store.mu.Lock()
	defer store.mu.Unlock()
	var before *WorkerRecord
	if existing, ok := store.workers[worker.WorkerID]; ok {
		copy := existing
		before = &copy
	}
	store.workers[worker.WorkerID] = worker
	store.appendMutationAuditLocked(workerRegistrationAudit(ctx, before, worker))
	return nil
}

func (store *MemoryStore) FindWorkerByID(_ context.Context, workerID string) (*WorkerRecord, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	worker, ok := store.workers[workerID]
	if !ok {
		return nil, ValidationError("worker is not registered")
	}
	return &worker, nil
}

func (store *MemoryStore) ClaimNext(ctx context.Context, worker WorkerRecord, leaseExpiresAt time.Time, filter ListFilter) (*JobRecord, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	var selected *JobRecord
	for _, job := range store.jobs {
		if job.Status != StatusQueued || job.CancelRequested {
			continue
		}
		if !recordMatchesListFilterDataScope(filter, job.TenantID, job.ProjectID, job.SiteID) {
			continue
		}
		if !domainjobs.MatchesWorker(
			domainjobs.ClaimCandidate{
				SchemaVersion: job.SchemaVersion,
				InputJSON:     job.InputJSON,
			},
			domainjobs.WorkerCapabilities{
				Capabilities:              worker.Capabilities,
				SupportedContractVersions: worker.SupportedContractVersions,
			},
		) {
			continue
		}
		if selected == nil || job.CreatedAt.Before(selected.CreatedAt) || (job.CreatedAt.Equal(selected.CreatedAt) && job.JobID < selected.JobID) {
			copy := job
			selected = &copy
		}
	}
	if selected == nil {
		return nil, nil
	}
	now := time.Now().UTC()
	selected.Status = StatusRunning
	selected.WorkerID = worker.WorkerID
	selected.Attempt++
	selected.ClaimedAt = &now
	selected.StartedAt = &now
	selected.LeaseExpiresAt = &leaseExpiresAt
	store.jobs[selected.JobID] = *selected
	store.appendEventLocked(EventRecord{
		JobID:     selected.JobID,
		EventType: "job.running",
		EventJSON: workerClaimEventJSON(ctx, now, *selected, worker.WorkerID, selected.Attempt),
		CreatedAt: now,
	})
	return selected, nil
}

func (store *MemoryStore) Heartbeat(_ context.Context, workerID, jobID string, leaseExpiresAt time.Time) (*JobRecord, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	job, ok := store.jobs[jobID]
	if !ok {
		return nil, NotFound(CodeJobNotFound, "job not found")
	}
	now := time.Now().UTC()
	worker := store.workers[workerID]
	worker.WorkerID = workerID
	worker.CurrentJobID = jobID
	worker.HeartbeatAt = &now
	store.workers[workerID] = worker
	if job.Status == StatusRunning && job.WorkerID == workerID {
		job.LeaseExpiresAt = &leaseExpiresAt
		store.jobs[jobID] = job
	}
	return &job, nil
}
