package compute

import (
	"context"
	"encoding/json"
	"strings"
)

func (svc *JobLifecycleService) CreateJob(ctx context.Context, bytes []byte, headerIdempotencyKey string) (JobSnapshot, int, error) {
	job, err := DecodeComputeJob(bytes, svc.validator)
	if err != nil {
		return JobSnapshot{}, 0, err
	}
	if strings.TrimSpace(headerIdempotencyKey) != "" {
		job.IdempotencyKey = strings.TrimSpace(headerIdempotencyKey)
		if job.Raw != nil {
			job.Raw["idempotency_key"] = job.IdempotencyKey
			bytes, _ = json.Marshal(job.Raw)
		}
	}
	payloadHash, err := PayloadHash(job)
	if err != nil {
		return JobSnapshot{}, 0, err
	}
	existing, err := svc.jobs.FindJobByIdempotency(ctx, job.Context.SourceSystem, job.Context.RequestedBy, job.IdempotencyKey)
	if err != nil {
		return JobSnapshot{}, 0, err
	}
	if existing != nil {
		if existing.PayloadHash != payloadHash {
			return JobSnapshot{}, 0, Conflict(CodeIdempotencyConflict, "idempotency key was reused with a different payload")
		}
		snapshot, err := svc.snapshot(ctx, existing.JobID)
		return snapshot, 200, err
	}
	now := svc.now()
	record := JobRecord{
		JobID:          job.JobID,
		SchemaVersion:  job.SchemaVersion,
		JobType:        job.JobType,
		Queue:          job.Queue,
		Status:         StatusQueued,
		RequestID:      job.RequestID,
		IdempotencyKey: job.IdempotencyKey,
		SourceSystem:   job.Context.SourceSystem,
		RequestedBy:    job.Context.RequestedBy,
		TraceID:        job.Context.TraceID,
		TenantID:       job.Context.TenantID,
		ProjectID:      job.Context.ProjectID,
		SiteID:         job.Context.SiteID,
		CreatedBy:      job.Context.RequestedBy,
		PayloadHash:    payloadHash,
		InputJSON:      append([]byte(nil), bytes...),
		Attempt:        0,
		CreatedAt:      now,
		QueuedAt:       &now,
	}
	events := []EventRecord{
		{
			JobID:     job.JobID,
			EventType: "job.created",
			EventJSON: eventJSONWithAudit(
				map[string]any{"status": StatusCreated},
				mutationAuditEnvelope(ctx, now, job.Context.RequestedBy, "service:job_lifecycle.create", "ComputeJob", job.JobID, "job.create", nil, map[string]any{"status": StatusCreated}, "compute job accepted", job.Context.TraceID, ""),
			),
			CreatedAt: now,
		},
		{
			JobID:     job.JobID,
			EventType: "job.queued",
			EventJSON: eventJSONWithAudit(
				map[string]any{"status": StatusQueued},
				mutationAuditEnvelope(ctx, now, job.Context.RequestedBy, "service:job_lifecycle.create", "ComputeJob", job.JobID, "job.queue", nil, map[string]any{"status": StatusQueued}, "compute job queued", job.Context.TraceID, ""),
			),
			CreatedAt: now,
		},
	}
	if err := svc.jobs.InsertJob(ctx, record, events); err != nil {
		return JobSnapshot{}, 0, err
	}
	snapshot, err := svc.snapshot(ctx, job.JobID)
	return snapshot, 202, err
}
