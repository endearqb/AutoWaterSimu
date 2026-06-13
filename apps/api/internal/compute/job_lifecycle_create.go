package compute

import (
	"context"
	"encoding/json"
	"strings"

	domainjobs "autowatersimu/apps/api/internal/domain/jobs"
)

func (svc *JobLifecycleService) CreateJob(ctx context.Context, bytes []byte, headerIdempotencyKey string) (JobSnapshot, int, error) {
	return svc.CreateJobForScope(ctx, bytes, headerIdempotencyKey, ListFilter{})
}

func (svc *JobLifecycleService) CreateJobForScope(ctx context.Context, bytes []byte, headerIdempotencyKey string, filter ListFilter) (JobSnapshot, int, error) {
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
	if err := authorizeListFilterDataScope(filter, "job", job.Context.TenantID, job.Context.ProjectID, job.Context.SiteID); err != nil {
		return JobSnapshot{}, 0, err
	}
	existing, err := svc.jobs.FindJobByIdempotency(ctx, job.Context.SourceSystem, job.Context.RequestedBy, job.IdempotencyKey)
	if err != nil {
		return JobSnapshot{}, 0, err
	}
	idempotencyDecision := domainjobs.DecideCreateIdempotency(createIdempotencyRecordFromJobRecord(existing), payloadHash)
	if idempotencyDecision.Conflict {
		return JobSnapshot{}, 0, Conflict(CodeIdempotencyConflict, "idempotency key was reused with a different payload")
	}
	if idempotencyDecision.ReusedJobID != "" {
		snapshot, err := svc.snapshot(ctx, idempotencyDecision.ReusedJobID)
		return snapshot, 200, err
	}
	now := svc.now()
	queuedJob := domainjobs.NewQueuedJob(domainjobs.CreateInput{
		JobID:          job.JobID,
		SchemaVersion:  job.SchemaVersion,
		JobType:        job.JobType,
		Queue:          job.Queue,
		RequestID:      job.RequestID,
		IdempotencyKey: job.IdempotencyKey,
		Context: domainjobs.CreateContext{
			SourceSystem: job.Context.SourceSystem,
			RequestedBy:  job.Context.RequestedBy,
			TraceID:      job.Context.TraceID,
			TenantID:     job.Context.TenantID,
			ProjectID:    job.Context.ProjectID,
			SiteID:       job.Context.SiteID,
		},
		PayloadHash: payloadHash,
		InputJSON:   bytes,
		CreatedAt:   now,
	})
	record := jobRecordFromDomainQueuedJob(queuedJob)
	events := jobCreateEventsFromDomainPlans(ctx, queuedJob, domainjobs.CreateEventPlans())
	if err := svc.jobs.InsertJob(ctx, record, events); err != nil {
		return JobSnapshot{}, 0, err
	}
	snapshot, err := svc.snapshot(ctx, job.JobID)
	return snapshot, 202, err
}

func jobRecordFromDomainQueuedJob(job domainjobs.QueuedJob) JobRecord {
	queuedAt := job.QueuedAt
	return JobRecord{
		JobID:          job.JobID,
		SchemaVersion:  job.SchemaVersion,
		JobType:        job.JobType,
		Queue:          job.Queue,
		Status:         job.Status,
		RequestID:      job.RequestID,
		IdempotencyKey: job.IdempotencyKey,
		SourceSystem:   job.SourceSystem,
		RequestedBy:    job.RequestedBy,
		TraceID:        job.TraceID,
		TenantID:       job.TenantID,
		ProjectID:      job.ProjectID,
		SiteID:         job.SiteID,
		CreatedBy:      job.CreatedBy,
		PayloadHash:    job.PayloadHash,
		InputJSON:      append([]byte(nil), job.InputJSON...),
		Attempt:        job.Attempt,
		CreatedAt:      job.CreatedAt,
		QueuedAt:       &queuedAt,
	}
}

func jobCreateEventsFromDomainPlans(ctx context.Context, job domainjobs.QueuedJob, plans []domainjobs.CreateEventPlan) []EventRecord {
	events := make([]EventRecord, 0, len(plans))
	for _, plan := range plans {
		after := map[string]any{"status": plan.Status}
		events = append(events, EventRecord{
			JobID:     job.JobID,
			EventType: plan.EventType,
			EventJSON: eventJSONWithAudit(
				after,
				mutationAuditEnvelope(ctx, job.CreatedAt, job.RequestedBy, "service:job_lifecycle.create", "ComputeJob", job.JobID, plan.Action, nil, after, plan.Reason, job.TraceID, ""),
			),
			CreatedAt: job.CreatedAt,
		})
	}
	return events
}

func createIdempotencyRecordFromJobRecord(job *JobRecord) *domainjobs.CreateIdempotencyRecord {
	if job == nil {
		return nil
	}
	return &domainjobs.CreateIdempotencyRecord{
		JobID:       job.JobID,
		PayloadHash: job.PayloadHash,
	}
}
