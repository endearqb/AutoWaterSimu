package compute

import (
	"context"
	"encoding/json"
	"strings"
	"time"

	domainevidence "autowatersimu/apps/api/internal/domain/evidence"
	domainjobs "autowatersimu/apps/api/internal/domain/jobs"
	domainmodels "autowatersimu/apps/api/internal/domain/models"
)

type JobLifecycleService struct {
	jobs          JobStore
	modelRuns     ModelRunStore
	validator     *ContractValidator
	now           func() time.Time
	listArtifacts func(context.Context, string) ([]ArtifactRecord, error)
}

func NewJobLifecycleService(jobs JobStore, modelRuns ModelRunStore, validator *ContractValidator, now func() time.Time, listArtifacts func(context.Context, string) ([]ArtifactRecord, error)) *JobLifecycleService {
	if now == nil {
		now = func() time.Time { return time.Now().UTC() }
	}
	return &JobLifecycleService{
		jobs:          jobs,
		modelRuns:     modelRuns,
		validator:     validator,
		now:           now,
		listArtifacts: listArtifacts,
	}
}

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

func (svc *JobLifecycleService) GetJob(ctx context.Context, jobID string) (JobSnapshot, error) {
	return svc.snapshot(ctx, required(jobID, "job_id"))
}

func (svc *JobLifecycleService) ListJobs(ctx context.Context, filter ListFilter) (ListJobsResponse, error) {
	jobs, next, total, err := svc.jobs.ListJobs(ctx, filter)
	if err != nil {
		return ListJobsResponse{}, err
	}
	items := make([]JobSnapshot, 0, len(jobs))
	for _, job := range jobs {
		artifacts, _ := svc.listArtifacts(ctx, job.JobID)
		events, _ := svc.jobs.Events(ctx, job.JobID)
		items = append(items, snapshotFrom(job, artifacts, len(events)))
	}
	return ListJobsResponse{Items: items, NextCursor: next, TotalEstimate: total}, nil
}

func (svc *JobLifecycleService) Events(ctx context.Context, jobID string) ([]EventRecord, error) {
	events, err := svc.jobs.Events(ctx, required(jobID, "job_id"))
	if err != nil {
		return nil, err
	}
	if events == nil {
		events = []EventRecord{}
	}
	return events, nil
}

func (svc *JobLifecycleService) CancelJob(ctx context.Context, jobID string) (JobSnapshot, error) {
	job, err := svc.jobs.CancelJob(ctx, required(jobID, "job_id"), svc.now())
	if err != nil {
		return JobSnapshot{}, err
	}
	return svc.snapshot(ctx, job.JobID)
}

func (svc *JobLifecycleService) Complete(ctx context.Context, workerID, jobID string, attempt int, result map[string]any) (JobSnapshot, error) {
	job, err := svc.jobs.FindJobByID(ctx, required(jobID, "job_id"))
	if err != nil {
		return JobSnapshot{}, err
	}
	if job.WorkerID != required(workerID, "worker_id") || job.Attempt != attempt {
		return JobSnapshot{}, Conflict(CodeWorkerStale, "worker result is stale")
	}
	completion, ok := domainjobs.WorkerResultCompletionFromResult(result)
	if !ok {
		return JobSnapshot{}, ValidationError("result.status must be succeeded, failed, or timed_out")
	}
	if svc.validator != nil {
		if err := svc.validator.Validate("compute_result.v1.json", result); err != nil {
			return JobSnapshot{}, err
		}
	}
	modelRuns, err := svc.modelRunsFromResult(result, jobID)
	if err != nil {
		return JobSnapshot{}, err
	}
	resultHash, err := ResultHash(result)
	if err != nil {
		return JobSnapshot{}, err
	}
	summary := mustJSON(domainevidence.StoredResultSummary(result))
	completed, err := svc.jobs.CompleteJob(ctx, jobID, workerID, attempt, completion.Status, summary, resultHash, completion.ErrorCode, completion.ErrorMessage, svc.now())
	if err != nil {
		return JobSnapshot{}, err
	}
	if err := svc.modelRuns.InsertModelRuns(ctx, jobID, modelRuns, svc.now()); err != nil {
		return JobSnapshot{}, err
	}
	return svc.snapshot(ctx, completed.JobID)
}

func (svc *JobLifecycleService) Fail(ctx context.Context, workerID, jobID string, attempt int, errorCode, errorMessage string) (JobSnapshot, error) {
	job, err := svc.jobs.FindJobByID(ctx, required(jobID, "job_id"))
	if err != nil {
		return JobSnapshot{}, err
	}
	summary := map[string]any{
		"error_code":    defaultString(errorCode, domainjobs.DefaultWorkerFailureCode),
		"error_message": defaultString(errorMessage, "worker failed"),
	}
	result := map[string]any{
		"schema_version": "compute_result.v1",
		"job_id":         job.JobID,
		"job_type":       job.JobType,
		"status":         StatusFailed,
		"summary":        summary,
		"data":           map[string]any{},
		"quality":        map[string]any{"data_quality": "none", "warnings": []any{summary["error_message"]}},
		"artifacts":      []any{},
		"runtime_audit":  map[string]any{"model_runs": []any{}, "timings_ms": map[string]any{}, "fallback_used": false, "fallback_reason": "worker reported failure"},
	}
	return svc.Complete(ctx, workerID, jobID, attempt, result)
}

func (svc *JobLifecycleService) TimeoutSweep(ctx context.Context) ([]JobRecord, error) {
	return svc.jobs.TimeoutExpired(ctx, svc.now())
}

func (svc *JobLifecycleService) snapshot(ctx context.Context, jobID string) (JobSnapshot, error) {
	job, err := svc.jobs.FindJobByID(ctx, jobID)
	if err != nil {
		return JobSnapshot{}, err
	}
	artifacts, err := svc.listArtifacts(ctx, jobID)
	if err != nil {
		return JobSnapshot{}, err
	}
	events, err := svc.jobs.Events(ctx, jobID)
	if err != nil {
		return JobSnapshot{}, err
	}
	return snapshotFrom(*job, artifacts, len(events)), nil
}

func (svc *JobLifecycleService) modelRunsFromResult(result map[string]any, jobID string) ([]json.RawMessage, error) {
	documents, err := domainmodels.ModelRunDocumentsFromComputeResult(result, jobID)
	if err != nil {
		return nil, ValidationError(err.Error())
	}
	modelRuns := make([]json.RawMessage, 0, len(documents))
	for _, modelRun := range documents {
		if svc.validator != nil {
			if err := svc.validator.Validate("model_run.v1.json", modelRun); err != nil {
				return nil, err
			}
		}
		modelRuns = append(modelRuns, mustJSON(modelRun))
	}
	return modelRuns, nil
}
