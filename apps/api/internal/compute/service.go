package compute

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"strings"
	"time"
)

type Service struct {
	store     Store
	artifacts ArtifactStore
	validator *ContractValidator
	now       func() time.Time
}

func NewService(store Store, artifacts ArtifactStore, validator *ContractValidator) *Service {
	return &Service{
		store:     store,
		artifacts: artifacts,
		validator: validator,
		now:       func() time.Time { return time.Now().UTC() },
	}
}

func (svc *Service) CreateJob(ctx context.Context, bytes []byte, headerIdempotencyKey string) (JobSnapshot, int, error) {
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
	existing, err := svc.store.FindJobByIdempotency(ctx, job.Context.SourceSystem, job.Context.RequestedBy, job.IdempotencyKey)
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
		CreatedBy:      job.Context.RequestedBy,
		PayloadHash:    payloadHash,
		InputJSON:      append([]byte(nil), bytes...),
		Attempt:        0,
		CreatedAt:      now,
		QueuedAt:       &now,
	}
	events := []EventRecord{
		{JobID: job.JobID, EventType: "job.created", EventJSON: mustJSON(map[string]any{"status": StatusCreated}), CreatedAt: now},
		{JobID: job.JobID, EventType: "job.queued", EventJSON: mustJSON(map[string]any{"status": StatusQueued}), CreatedAt: now},
	}
	if err := svc.store.InsertJob(ctx, record, events); err != nil {
		return JobSnapshot{}, 0, err
	}
	snapshot, err := svc.snapshot(ctx, job.JobID)
	return snapshot, 202, err
}

func (svc *Service) GetJob(ctx context.Context, jobID string) (JobSnapshot, error) {
	return svc.snapshot(ctx, required(jobID, "job_id"))
}

func (svc *Service) ListJobs(ctx context.Context, filter ListFilter) (ListJobsResponse, error) {
	jobs, next, total, err := svc.store.ListJobs(ctx, filter)
	if err != nil {
		return ListJobsResponse{}, err
	}
	items := make([]JobSnapshot, 0, len(jobs))
	for _, job := range jobs {
		artifacts, _ := svc.store.Artifacts(ctx, job.JobID)
		events, _ := svc.store.Events(ctx, job.JobID)
		items = append(items, JobSnapshot{Job: job, Artifacts: artifacts, EventCount: len(events)})
	}
	return ListJobsResponse{Items: items, NextCursor: next, TotalEstimate: total}, nil
}

func (svc *Service) Events(ctx context.Context, jobID string) ([]EventRecord, error) {
	return svc.store.Events(ctx, required(jobID, "job_id"))
}

func (svc *Service) Result(ctx context.Context, jobID string) (map[string]any, error) {
	snapshot, err := svc.snapshot(ctx, required(jobID, "job_id"))
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"job_id":      snapshot.Job.JobID,
		"status":      snapshot.Job.Status,
		"summary":     rawOrNull(snapshot.Job.Summary),
		"result_hash": snapshot.Job.ResultHash,
		"artifacts":   snapshot.Artifacts,
	}, nil
}

func (svc *Service) CancelJob(ctx context.Context, jobID string) (JobSnapshot, error) {
	job, err := svc.store.CancelJob(ctx, required(jobID, "job_id"), svc.now())
	if err != nil {
		return JobSnapshot{}, err
	}
	return svc.snapshot(ctx, job.JobID)
}

func (svc *Service) RegisterWorker(ctx context.Context, request map[string]any) (WorkerRecord, error) {
	workerID := stringValue(request, "worker_id")
	if workerID == "" {
		workerID = fmt.Sprintf("worker_%d", svc.now().UnixNano())
	}
	capabilities := mustJSON(request["capabilities"])
	if string(capabilities) == "null" {
		capabilities = mustJSON([]string{})
	}
	versions := mustJSON(request["supported_contract_versions"])
	if string(versions) == "null" {
		versions = mustJSON([]string{})
	}
	now := svc.now()
	worker := WorkerRecord{
		WorkerID:                  workerID,
		Capabilities:              capabilities,
		SupportedContractVersions: versions,
		RuntimeVersion:            stringValue(request, "runtime_version"),
		RegisteredAt:              now,
	}
	if err := svc.store.UpsertWorker(ctx, worker); err != nil {
		return WorkerRecord{}, err
	}
	return worker, nil
}

func (svc *Service) Claim(ctx context.Context, workerID string) (map[string]any, error) {
	lease := svc.now().Add(DefaultLeaseSeconds * time.Second)
	job, err := svc.store.ClaimNext(ctx, required(workerID, "worker_id"), lease)
	if err != nil {
		return nil, err
	}
	if job == nil {
		return map[string]any{"job": nil, "server_time": svc.now()}, nil
	}
	var input any
	_ = json.Unmarshal(job.InputJSON, &input)
	return map[string]any{"job": input, "attempt": job.Attempt, "lease_expires_at": lease, "server_time": svc.now()}, nil
}

func (svc *Service) Heartbeat(ctx context.Context, workerID, jobID string) (map[string]any, error) {
	lease := svc.now().Add(DefaultLeaseSeconds * time.Second)
	job, err := svc.store.Heartbeat(ctx, required(workerID, "worker_id"), required(jobID, "job_id"), lease)
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"job_id":           job.JobID,
		"cancel_requested": job.CancelRequested || job.Status == StatusCancelled,
		"job_terminal":     isTerminal(job.Status),
		"status":           job.Status,
		"lease_expires_at": lease,
		"server_time":      svc.now(),
	}, nil
}

func (svc *Service) UploadArtifact(ctx context.Context, workerID, jobID string, metadataText string, file multipart.File) (ArtifactRecord, error) {
	job, err := svc.store.FindJobByID(ctx, required(jobID, "job_id"))
	if err != nil {
		return ArtifactRecord{}, err
	}
	if job.Status != StatusRunning || job.WorkerID != required(workerID, "worker_id") {
		return ArtifactRecord{}, Conflict(CodeWorkerStale, "worker cannot write artifact for current job state")
	}
	metadata, err := DecodeArtifactMetadata(metadataText, svc.validator)
	if err != nil {
		return ArtifactRecord{}, err
	}
	artifactID := stringValue(metadata, "artifact_id")
	if artifactID == "" {
		return ArtifactRecord{}, ValidationError("artifact_id is required")
	}
	bytes, err := io.ReadAll(file)
	if err != nil {
		return ArtifactRecord{}, err
	}
	checksum := "sha256:" + SHA256Hex(bytes)
	if expected := stringValue(metadata, "checksum"); expected != checksum {
		return ArtifactRecord{}, ValidationError("artifact checksum mismatch")
	}
	objectKey := "jobs/" + jobID + "/" + artifactID + ".json"
	if err := svc.artifacts.Write(ctx, objectKey, bytes); err != nil {
		return ArtifactRecord{}, err
	}
	now := svc.now()
	artifact := ArtifactRecord{
		ArtifactID:      artifactID,
		JobID:           jobID,
		SchemaVersion:   stringValue(metadata, "schema_version"),
		ArtifactType:    stringValue(metadata, "artifact_type"),
		StorageProvider: "local_fs",
		ObjectKey:       objectKey,
		ContentType:     defaultString(stringValue(metadata, "content_type"), "application/json"),
		SizeBytes:       int64(len(bytes)),
		Checksum:        checksum,
		Metadata:        mustJSON(metadata["metadata"]),
		CreatedAt:       now,
	}
	event := EventRecord{JobID: jobID, EventType: "artifact.recorded", EventJSON: mustJSON(artifact), CreatedAt: now}
	if err := svc.store.InsertArtifact(ctx, artifact, event); err != nil {
		return ArtifactRecord{}, err
	}
	return artifact, nil
}

func (svc *Service) Complete(ctx context.Context, workerID, jobID string, attempt int, result map[string]any) (JobSnapshot, error) {
	job, err := svc.store.FindJobByID(ctx, required(jobID, "job_id"))
	if err != nil {
		return JobSnapshot{}, err
	}
	if job.WorkerID != required(workerID, "worker_id") || job.Attempt != attempt {
		return JobSnapshot{}, Conflict(CodeWorkerStale, "worker result is stale")
	}
	status := stringValue(result, "status")
	if !isTerminal(status) || status == StatusCancelled {
		return JobSnapshot{}, ValidationError("result.status must be succeeded, failed, or timed_out")
	}
	if svc.validator != nil {
		if err := svc.validator.Validate("compute_result.v1.json", result); err != nil {
			return JobSnapshot{}, err
		}
	}
	summary := mustJSON(result["summary"])
	resultHash, err := ResultHash(result)
	if err != nil {
		return JobSnapshot{}, err
	}
	errorCode := ""
	errorMessage := ""
	if status != StatusSucceeded {
		errorCode = defaultString(stringValue(result, "error_code"), "WORKER_FAILED")
		if summaryMap, ok := result["summary"].(map[string]any); ok {
			errorMessage = stringValue(summaryMap, "error_message")
		}
	}
	completed, err := svc.store.CompleteJob(ctx, jobID, workerID, attempt, status, summary, resultHash, errorCode, errorMessage, svc.now())
	if err != nil {
		return JobSnapshot{}, err
	}
	return svc.snapshot(ctx, completed.JobID)
}

func (svc *Service) Fail(ctx context.Context, workerID, jobID string, attempt int, errorCode, errorMessage string) (JobSnapshot, error) {
	result := map[string]any{
		"status":     StatusFailed,
		"error_code": defaultString(errorCode, "WORKER_FAILED"),
		"summary":    map[string]any{"error_message": defaultString(errorMessage, "worker failed")},
	}
	return svc.Complete(ctx, workerID, jobID, attempt, result)
}

func (svc *Service) TimeoutSweep(ctx context.Context) ([]JobRecord, error) {
	return svc.store.TimeoutExpired(ctx, svc.now())
}

func (svc *Service) DownloadArtifact(ctx context.Context, artifactID string) (ArtifactRecord, []byte, error) {
	artifact, err := svc.store.FindArtifact(ctx, required(artifactID, "artifact_id"))
	if err != nil {
		return ArtifactRecord{}, nil, err
	}
	bytes, err := svc.artifacts.Read(ctx, artifact.ObjectKey)
	if err != nil {
		return ArtifactRecord{}, nil, err
	}
	if "sha256:"+SHA256Hex(bytes) != artifact.Checksum {
		return ArtifactRecord{}, nil, NewAppError(500, CodeInternal, "artifact checksum verification failed", true, nil)
	}
	return *artifact, bytes, nil
}

func (svc *Service) snapshot(ctx context.Context, jobID string) (JobSnapshot, error) {
	job, err := svc.store.FindJobByID(ctx, jobID)
	if err != nil {
		return JobSnapshot{}, err
	}
	artifacts, err := svc.store.Artifacts(ctx, jobID)
	if err != nil {
		return JobSnapshot{}, err
	}
	events, err := svc.store.Events(ctx, jobID)
	if err != nil {
		return JobSnapshot{}, err
	}
	return JobSnapshot{Job: *job, Artifacts: artifacts, EventCount: len(events)}, nil
}

func rawOrNull(raw json.RawMessage) any {
	if len(raw) == 0 {
		return nil
	}
	var value any
	if err := json.Unmarshal(raw, &value); err != nil {
		return nil
	}
	return value
}

func required(value string, name string) string {
	if strings.TrimSpace(value) == "" {
		panic(ValidationError(name + " is required"))
	}
	return strings.TrimSpace(value)
}

func stringValue(value map[string]any, key string) string {
	raw, ok := value[key]
	if !ok || raw == nil {
		return ""
	}
	if text, ok := raw.(string); ok {
		return strings.TrimSpace(text)
	}
	return ""
}

func defaultString(value, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return value
}
