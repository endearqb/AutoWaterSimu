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
	now := time.Now().UTC()
	for _, job := range store.jobs {
		if job.Status != StatusRunning || job.WorkerID != worker.WorkerID || job.LeaseExpiresAt == nil || job.LeaseExpiresAt.Before(now) {
			continue
		}
		if !recordMatchesListFilterDataScope(filter, job.TenantID, job.ProjectID, job.SiteID) {
			continue
		}
		before := job
		mutation, ok := domainjobs.NewHeartbeatMutation(domainjobs.HeartbeatRecord{
			JobID:    job.JobID,
			Status:   job.Status,
			WorkerID: job.WorkerID,
		}, worker.WorkerID, now, leaseExpiresAt)
		if ok {
			applyHeartbeatMutationToJobRecord(&job, mutation)
			store.jobs[job.JobID] = job
			store.appendEventLocked(EventRecord{
				JobID:     job.JobID,
				EventType: mutation.EventType,
				EventJSON: workerHeartbeatEventJSON(ctx, mutation.HeartbeatAt, before, job, mutation.WorkerID),
				CreatedAt: mutation.HeartbeatAt,
			})
		}
		return &job, nil
	}
	var selected *JobRecord
	var selectedClaim *domainjobs.ClaimRecord
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
		claimRecord := domainjobs.ClaimRecord{
			JobID:         job.JobID,
			SchemaVersion: job.SchemaVersion,
			InputJSON:     job.InputJSON,
			Attempt:       job.Attempt,
			CreatedAt:     job.CreatedAt,
		}
		if domainjobs.PreferClaimRecord(selectedClaim, claimRecord) {
			copy := job
			selected = &copy
			selectedClaim = &claimRecord
		}
	}
	if selected == nil {
		return nil, nil
	}
	mutation := domainjobs.NewClaimMutation(*selectedClaim, worker.WorkerID, now, leaseExpiresAt)
	applyClaimMutationToJobRecord(selected, mutation)
	store.jobs[selected.JobID] = *selected
	store.appendEventLocked(EventRecord{
		JobID:     selected.JobID,
		EventType: mutation.EventType,
		EventJSON: workerClaimEventJSON(ctx, mutation.ClaimedAt, *selected, mutation.WorkerID, mutation.Attempt),
		CreatedAt: mutation.ClaimedAt,
	})
	return selected, nil
}

func applyClaimMutationToJobRecord(job *JobRecord, mutation domainjobs.ClaimMutation) {
	job.Status = mutation.Status
	job.WorkerID = mutation.WorkerID
	job.Attempt = mutation.Attempt
	job.ClaimedAt = &mutation.ClaimedAt
	job.StartedAt = &mutation.StartedAt
	job.LeaseExpiresAt = &mutation.LeaseExpiresAt
}

func (store *MemoryStore) Heartbeat(ctx context.Context, workerID, jobID string, leaseExpiresAt time.Time) (*JobRecord, error) {
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
	mutation, ok := domainjobs.NewHeartbeatMutation(domainjobs.HeartbeatRecord{
		JobID:    job.JobID,
		Status:   job.Status,
		WorkerID: job.WorkerID,
	}, workerID, now, leaseExpiresAt)
	if ok {
		before := job
		applyHeartbeatMutationToJobRecord(&job, mutation)
		store.jobs[jobID] = job
		store.appendEventLocked(EventRecord{
			JobID:     jobID,
			EventType: mutation.EventType,
			EventJSON: workerHeartbeatEventJSON(ctx, mutation.HeartbeatAt, before, job, mutation.WorkerID),
			CreatedAt: mutation.HeartbeatAt,
		})
	}
	return &job, nil
}

func applyHeartbeatMutationToJobRecord(job *JobRecord, mutation domainjobs.HeartbeatMutation) {
	job.LeaseExpiresAt = &mutation.LeaseExpiresAt
}
