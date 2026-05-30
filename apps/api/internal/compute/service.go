package compute

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"sort"
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

func (svc *Service) CreateSimulationCheck(ctx context.Context, bytes []byte) (JobSnapshot, int, error) {
	var request map[string]any
	if err := json.Unmarshal(bytes, &request); err != nil {
		return JobSnapshot{}, 0, ValidationError("simulation_request JSON is invalid")
	}
	if svc.validator != nil {
		if err := svc.validator.Validate("simulation_request.v1.json", request); err != nil {
			return JobSnapshot{}, 0, err
		}
	}
	requestID := required(stringValue(request, "request_id"), "request_id")
	jobType := required(stringValue(request, "job_type"), "job_type")
	inputRef := mapValue(request, "input_ref")
	if inputRef == nil {
		return JobSnapshot{}, 0, ValidationError("simulation_request.input_ref is required")
	}
	sourceSystem := required(stringValue(request, "source_system"), "source_system")
	requestedBy := required(stringValue(request, "requested_by"), "requested_by")
	simulationInput, err := svc.resolveSimulationInput(ctx, inputRef, sourceSystem, requestedBy, jobType)
	if err != nil {
		return JobSnapshot{}, 0, err
	}
	if stringValue(simulationInput, "job_type") != "" && stringValue(simulationInput, "job_type") != jobType {
		return JobSnapshot{}, 0, ValidationError("simulation_request job_type must match simulation_input job_type")
	}

	metadata := mapValue(request, "metadata")
	externalRefs := mapValue(request, "external_refs")
	traceID := defaultString(stringValue(metadata, "trace_id"), "trace_simcheck_"+safeIDPart(requestID))
	jobID := defaultString(stringValue(metadata, "job_id"), "job_simcheck_"+safeIDPart(requestID))
	idempotencyKey := defaultString(stringValue(metadata, "idempotency_key"), "simcheck:"+requestID)
	jobContext := map[string]any{
		"source_system": sourceSystem,
		"requested_by":  requestedBy,
		"trace_id":      traceID,
	}
	for _, key := range []string{"tenant_id", "project_id"} {
		if value := stringValue(metadata, key); value != "" {
			jobContext[key] = value
		}
	}
	if externalRefs != nil {
		jobContext["external_refs"] = externalRefs
	}

	job := map[string]any{
		"schema_version":  "compute_job.v1",
		"job_id":          jobID,
		"job_type":        jobType,
		"queue":           "simulation",
		"request_id":      requestID,
		"idempotency_key": idempotencyKey,
		"payload":         simulationInput,
		"context":         jobContext,
		"execution":       simulationCheckExecution(jobType),
		"created_at":      svc.now().Format(time.RFC3339Nano),
		"metadata":        simulationCheckMetadata(requestID, inputRef, externalRefs),
	}
	jobBytes, err := json.Marshal(job)
	if err != nil {
		return JobSnapshot{}, 0, err
	}
	return svc.CreateJob(ctx, jobBytes, idempotencyKey)
}

func (svc *Service) RegisterSimulationInput(ctx context.Context, bytes []byte, defaultSourceSystem, defaultRequestedBy string) (SimulationInputRecord, int, error) {
	var input map[string]any
	if err := json.Unmarshal(bytes, &input); err != nil {
		return SimulationInputRecord{}, 0, ValidationError("simulation_input JSON is invalid")
	}
	record, err := svc.simulationInputRecord(input, defaultSourceSystem, defaultRequestedBy)
	if err != nil {
		return SimulationInputRecord{}, 0, err
	}
	created, err := svc.store.UpsertSimulationInput(ctx, record)
	if err != nil {
		return SimulationInputRecord{}, 0, err
	}
	if created {
		return record, 201, nil
	}
	existing, err := svc.store.FindSimulationInput(ctx, record.SimulationInputID)
	if err != nil {
		return SimulationInputRecord{}, 0, err
	}
	return *existing, 200, nil
}

func (svc *Service) GetSimulationInput(ctx context.Context, simulationInputID string) (SimulationInputRecord, error) {
	record, err := svc.store.FindSimulationInput(ctx, required(simulationInputID, "simulation_input_id"))
	if err != nil {
		return SimulationInputRecord{}, err
	}
	return *record, nil
}

func (svc *Service) RegisterProcessGraph(ctx context.Context, bytes []byte, defaultSourceSystem, defaultRequestedBy string) (ProcessGraphRecord, int, error) {
	var processGraph map[string]any
	if err := json.Unmarshal(bytes, &processGraph); err != nil {
		return ProcessGraphRecord{}, 0, ValidationError("process_graph JSON is invalid")
	}
	record, err := svc.processGraphRecord(processGraph, defaultSourceSystem, defaultRequestedBy)
	if err != nil {
		return ProcessGraphRecord{}, 0, err
	}
	created, err := svc.store.UpsertProcessGraph(ctx, record)
	if err != nil {
		return ProcessGraphRecord{}, 0, err
	}
	if created {
		return record, 201, nil
	}
	existing, err := svc.store.FindProcessGraph(ctx, record.ProcessGraphID, record.Version)
	if err != nil {
		return ProcessGraphRecord{}, 0, err
	}
	return *existing, 200, nil
}

func (svc *Service) GetProcessGraph(ctx context.Context, processGraphID string, version int) (ProcessGraphRecord, error) {
	if version <= 0 {
		version = 1
	}
	record, err := svc.store.FindProcessGraph(ctx, required(processGraphID, "process_graph_id"), version)
	if err != nil {
		return ProcessGraphRecord{}, err
	}
	return *record, nil
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
		items = append(items, snapshotFrom(job, artifacts, len(events)))
	}
	return ListJobsResponse{Items: items, NextCursor: next, TotalEstimate: total}, nil
}

func (svc *Service) Events(ctx context.Context, jobID string) ([]EventRecord, error) {
	events, err := svc.store.Events(ctx, required(jobID, "job_id"))
	if err != nil {
		return nil, err
	}
	if events == nil {
		events = []EventRecord{}
	}
	return events, nil
}

func (svc *Service) Result(ctx context.Context, jobID string) (map[string]any, error) {
	snapshot, err := svc.snapshot(ctx, required(jobID, "job_id"))
	if err != nil {
		return nil, err
	}
	modelRuns, err := svc.store.ModelRuns(ctx, snapshot.Job.JobID)
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"job_id":      snapshot.Job.JobID,
		"status":      snapshot.Job.Status,
		"summary":     rawOrNull(snapshot.Job.Summary),
		"result_hash": snapshot.Job.ResultHash,
		"artifacts":   snapshot.Artifacts,
		"model_runs":  rawMessagesOrEmpty(modelRuns),
	}, nil
}

func (svc *Service) EvidencePackage(ctx context.Context, jobID string) (map[string]any, string, error) {
	snapshot, err := svc.snapshot(ctx, required(jobID, "job_id"))
	if err != nil {
		return nil, "", err
	}
	if strings.TrimSpace(snapshot.Job.ResultHash) == "" {
		return nil, "", Conflict(CodeEvidenceUnavailable, "job result is not available")
	}
	events, err := svc.store.Events(ctx, snapshot.Job.JobID)
	if err != nil {
		return nil, "", err
	}
	modelRuns, err := svc.store.ModelRuns(ctx, snapshot.Job.JobID)
	if err != nil {
		return nil, "", err
	}
	inputRef, inputHash, processGraphRef, simulationInputRef := evidenceInputRefs(snapshot.Job.InputJSON)
	artifactRefs := make([]any, 0, len(snapshot.Artifacts))
	for _, artifact := range snapshot.Artifacts {
		artifactRefs = append(artifactRefs, artifact.ArtifactID)
	}
	modelRunRefs := make([]any, 0, len(modelRuns))
	warnings := []any{}
	for _, modelRun := range modelRuns {
		modelRunID, _, _, _, _, _ := modelRunFieldsFromRaw(modelRun)
		if modelRunID != "" {
			modelRunRefs = append(modelRunRefs, modelRunID)
		}
		for _, warning := range warningsFromModelRun(modelRun) {
			warnings = append(warnings, warning)
		}
	}
	if snapshot.Job.ErrorMessage != "" {
		warnings = append(warnings, snapshot.Job.ErrorMessage)
	}
	governance, err := svc.evidenceGovernance(ctx, modelRuns)
	if err != nil {
		return nil, "", err
	}
	evidence := map[string]any{
		"schema_version":       "evidence_package.v1",
		"evidence_package_id":  "evidence_" + safeIDPart(snapshot.Job.JobID),
		"job_id":               snapshot.Job.JobID,
		"input_hash":           inputHash,
		"result_hash":          snapshot.Job.ResultHash,
		"process_graph_ref":    processGraphRef,
		"simulation_input_ref": simulationInputRef,
		"model_run_refs":       modelRunRefs,
		"artifact_refs":        artifactRefs,
		"runtime_audit": map[string]any{
			"job_status":      snapshot.Job.Status,
			"job_type":        snapshot.Job.JobType,
			"job_timeline":    evidenceTimeline(events),
			"artifact_count":  len(snapshot.Artifacts),
			"model_run_count": len(modelRuns),
			"input_ref":       inputRef,
		},
		"governance":   governance,
		"warnings":     warnings,
		"generated_at": svc.now().Format(time.RFC3339Nano),
		"metadata": map[string]any{
			"source_system": snapshot.Job.SourceSystem,
			"requested_by":  snapshot.Job.RequestedBy,
			"trace_id":      snapshot.Job.TraceID,
			"tenant_id":     snapshot.Job.TenantID,
			"project_id":    snapshot.Job.ProjectID,
		},
	}
	if svc.validator != nil {
		if err := svc.validator.Validate("evidence_package.v1.json", evidence); err != nil {
			return nil, "", err
		}
	}
	checksum, err := ResultHash(evidence)
	if err != nil {
		return nil, "", err
	}
	return evidence, checksum, nil
}

func (svc *Service) ResolveEvidenceReference(ctx context.Context, jobID, evidenceRef string) (EvidenceReferenceResolution, error) {
	snapshot, err := svc.snapshot(ctx, required(jobID, "job_id"))
	if err != nil {
		return EvidenceReferenceResolution{}, err
	}
	if strings.TrimSpace(snapshot.Job.ResultHash) == "" {
		return EvidenceReferenceResolution{}, Conflict(CodeEvidenceUnavailable, "job result is not available")
	}
	refType, refID := parseEvidenceRef(required(evidenceRef, "ref"))
	if refType == "" {
		if resolution, ok := svc.resolveModelRunEvidenceRef(ctx, snapshot.Job.JobID, evidenceRef, refID); ok {
			return resolution, nil
		}
		if resolution, ok := svc.resolveArtifactEvidenceRef(ctx, snapshot.Job.JobID, evidenceRef, refID); ok {
			return resolution, nil
		}
		return EvidenceReferenceResolution{}, NotFound(CodeEvidenceRefNotFound, "evidence reference not found")
	}
	switch refType {
	case "model_run":
		resolution, ok := svc.resolveModelRunEvidenceRef(ctx, snapshot.Job.JobID, evidenceRef, refID)
		if ok {
			return resolution, nil
		}
	case "artifact":
		resolution, ok := svc.resolveArtifactEvidenceRef(ctx, snapshot.Job.JobID, evidenceRef, refID)
		if ok {
			return resolution, nil
		}
	case "job":
		if refID == snapshot.Job.JobID {
			return EvidenceReferenceResolution{
				JobID:       snapshot.Job.JobID,
				EvidenceRef: evidenceRef,
				RefType:     refType,
				RefID:       refID,
				Resolved:    true,
				Payload:     snapshot.Job,
			}, nil
		}
	case "simulation_input":
		if payload := simulationInputPayloadForEvidence(snapshot.Job.InputJSON, refID); payload != nil {
			return EvidenceReferenceResolution{
				JobID:       snapshot.Job.JobID,
				EvidenceRef: evidenceRef,
				RefType:     refType,
				RefID:       refID,
				Resolved:    true,
				Payload:     payload,
			}, nil
		}
	}
	return EvidenceReferenceResolution{}, NotFound(CodeEvidenceRefNotFound, "evidence reference not found")
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
	worker, err := svc.store.FindWorkerByID(ctx, required(workerID, "worker_id"))
	if err != nil {
		return nil, err
	}
	lease := svc.now().Add(DefaultLeaseSeconds * time.Second)
	job, err := svc.store.ClaimNext(ctx, *worker, lease)
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
	retentionPolicy, retainUntil, err := artifactRetention(metadata)
	if err != nil {
		return ArtifactRecord{}, err
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
		RetentionPolicy: retentionPolicy,
		RetainUntil:     retainUntil,
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
	modelRuns, err := svc.modelRunsFromResult(result, jobID)
	if err != nil {
		return JobSnapshot{}, err
	}
	resultHash, err := ResultHash(result)
	if err != nil {
		return JobSnapshot{}, err
	}
	summaryValue := result["summary"]
	if riskFindings, ok := result["risk_findings"]; ok {
		if summaryMap, ok := result["summary"].(map[string]any); ok {
			summaryCopy := make(map[string]any, len(summaryMap)+1)
			for key, value := range summaryMap {
				summaryCopy[key] = value
			}
			summaryCopy["risk_findings"] = riskFindings
			summaryValue = summaryCopy
		}
	}
	summary := mustJSON(summaryValue)
	errorCode := ""
	errorMessage := ""
	if status != StatusSucceeded {
		if summaryMap, ok := result["summary"].(map[string]any); ok {
			errorCode = stringValue(summaryMap, "error_code")
			errorMessage = stringValue(summaryMap, "error_message")
		}
		errorCode = defaultString(errorCode, "WORKER_FAILED")
	}
	completed, err := svc.store.CompleteJob(ctx, jobID, workerID, attempt, status, summary, resultHash, errorCode, errorMessage, svc.now())
	if err != nil {
		return JobSnapshot{}, err
	}
	if err := svc.store.InsertModelRuns(ctx, jobID, modelRuns, svc.now()); err != nil {
		return JobSnapshot{}, err
	}
	return svc.snapshot(ctx, completed.JobID)
}

func (svc *Service) Fail(ctx context.Context, workerID, jobID string, attempt int, errorCode, errorMessage string) (JobSnapshot, error) {
	job, err := svc.store.FindJobByID(ctx, required(jobID, "job_id"))
	if err != nil {
		return JobSnapshot{}, err
	}
	summary := map[string]any{
		"error_code":    defaultString(errorCode, "WORKER_FAILED"),
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

func (svc *Service) TimeoutSweep(ctx context.Context) ([]JobRecord, error) {
	return svc.store.TimeoutExpired(ctx, svc.now())
}

func (svc *Service) RegisterModelCatalog(ctx context.Context, bytes []byte, defaultSourceSystem, defaultRequestedBy string) (ModelCatalogRecord, int, error) {
	var catalog map[string]any
	if err := json.Unmarshal(bytes, &catalog); err != nil {
		return ModelCatalogRecord{}, 0, ValidationError("model_catalog JSON is invalid")
	}
	record, err := svc.modelCatalogRecord(catalog, defaultSourceSystem, defaultRequestedBy)
	if err != nil {
		return ModelCatalogRecord{}, 0, err
	}
	stored, created, err := svc.store.UpsertModelCatalog(ctx, record)
	if err != nil {
		return ModelCatalogRecord{}, 0, err
	}
	if !created {
		return stored, http.StatusOK, nil
	}
	return stored, http.StatusCreated, nil
}

func (svc *Service) ModelCatalog(ctx context.Context) (ModelCatalogResponse, error) {
	record, err := svc.store.LatestModelCatalog(ctx, "default")
	if err == nil {
		var catalog ModelCatalogResponse
		if err := json.Unmarshal(record.Payload, &catalog); err != nil {
			return ModelCatalogResponse{}, NewAppError(500, CodeInternal, "persisted model catalog JSON is invalid", true, nil)
		}
		if err := svc.validateModelCatalog(catalog); err != nil {
			return ModelCatalogResponse{}, err
		}
		return catalog, nil
	}
	if appErr := ToAppError(err); appErr.ErrorCode != CodeModelCatalogNotFound {
		return ModelCatalogResponse{}, err
	}
	catalog := builtInModelCatalog(svc.now().Format(time.RFC3339Nano))
	if err := svc.validateModelCatalog(catalog); err != nil {
		return ModelCatalogResponse{}, err
	}
	return catalog, nil
}

func (svc *Service) ModelCatalogModel(ctx context.Context, modelKey string) (ModelCatalogModel, error) {
	catalog, err := svc.ModelCatalog(ctx)
	if err != nil {
		return ModelCatalogModel{}, err
	}
	modelKey = required(modelKey, "model_key")
	for _, model := range catalog.Models {
		if model.ModelKey == modelKey {
			return model, nil
		}
	}
	return ModelCatalogModel{}, NotFound("MODEL_NOT_FOUND", "model not found")
}

func (svc *Service) UpdateDefaultParameterSetStatus(ctx context.Context, modelKey, modelVersion string, request ParameterSetStatusUpdateRequest, defaultSourceSystem, defaultRequestedBy string) (ModelParameterSetTransitionResponse, int, error) {
	modelKey = required(modelKey, "model_key")
	modelVersion = required(modelVersion, "model_version")
	toStatus := strings.TrimSpace(request.ToStatus)
	if !validParameterSetStatus(toStatus) {
		return ModelParameterSetTransitionResponse{}, 0, ValidationError("to_status must be one of draft, candidate, validated, approved, retired")
	}
	if request.FromStatus != "" && !validParameterSetStatus(request.FromStatus) {
		return ModelParameterSetTransitionResponse{}, 0, ValidationError("from_status must be one of draft, candidate, validated, approved, retired")
	}
	catalog, err := svc.ModelCatalog(ctx)
	if err != nil {
		return ModelParameterSetTransitionResponse{}, 0, err
	}
	modelIndex, versionIndex := findModelVersionIndex(catalog, modelKey, modelVersion)
	if modelIndex < 0 || versionIndex < 0 {
		return ModelParameterSetTransitionResponse{}, 0, NotFound("MODEL_NOT_FOUND", "model version not found")
	}
	parameterSet := catalog.Models[modelIndex].Versions[versionIndex].DefaultParameterSet
	if parameterSet == nil {
		return ModelParameterSetTransitionResponse{}, 0, NotFound(CodeParameterSetNotFound, "default parameter set not found")
	}
	if request.ParameterSetID != "" && strings.TrimSpace(request.ParameterSetID) != parameterSet.ParameterSetID {
		return ModelParameterSetTransitionResponse{}, 0, NotFound(CodeParameterSetNotFound, "parameter set not found")
	}
	fromStatus := strings.TrimSpace(parameterSet.Status)
	if request.FromStatus != "" && strings.TrimSpace(request.FromStatus) != fromStatus {
		return ModelParameterSetTransitionResponse{}, 0, Conflict(CodeParameterSetTransitionFailed, "parameter set current status does not match from_status")
	}
	if fromStatus == toStatus {
		hash, err := ResultHash(catalog)
		if err != nil {
			return ModelParameterSetTransitionResponse{}, 0, err
		}
		return ModelParameterSetTransitionResponse{
			ModelKey:           modelKey,
			ModelVersion:       modelVersion,
			ParameterSetID:     parameterSet.ParameterSetID,
			FromStatus:         fromStatus,
			ToStatus:           toStatus,
			CatalogPayloadHash: hash,
			CreatedSnapshot:    false,
			Catalog:            catalog,
		}, http.StatusOK, nil
	}
	if !allowedParameterSetTransition(fromStatus, toStatus) {
		return ModelParameterSetTransitionResponse{}, 0, Conflict(CodeParameterSetTransitionFailed, "parameter set status transition is not allowed")
	}
	parameterSet.Status = toStatus
	parameterSet.Metadata = copyStringAnyMap(parameterSet.Metadata)
	parameterSet.Metadata["last_status_transition"] = map[string]any{
		"from_status": fromStatus,
		"to_status":   toStatus,
		"reason":      strings.TrimSpace(request.Reason),
		"metadata":    request.Metadata,
		"changed_by":  defaultString(defaultRequestedBy, "compute-api"),
		"changed_at":  svc.now().Format(time.RFC3339Nano),
	}
	catalog.Models[modelIndex].Versions[versionIndex].DefaultParameterSet = parameterSet
	catalog.GeneratedAt = svc.now().Format(time.RFC3339Nano)
	catalog.Metadata = copyStringAnyMap(catalog.Metadata)
	catalog.Metadata["last_parameter_set_transition"] = map[string]any{
		"model_key":        modelKey,
		"model_version":    modelVersion,
		"parameter_set_id": parameterSet.ParameterSetID,
		"from_status":      fromStatus,
		"to_status":        toStatus,
		"reason":           strings.TrimSpace(request.Reason),
		"metadata":         request.Metadata,
		"changed_by":       defaultString(defaultRequestedBy, "compute-api"),
		"changed_at":       svc.now().Format(time.RFC3339Nano),
	}
	record, err := svc.modelCatalogRecord(modelCatalogResponseToMap(catalog), defaultSourceSystem, defaultRequestedBy)
	if err != nil {
		return ModelParameterSetTransitionResponse{}, 0, err
	}
	stored, created, err := svc.store.UpsertModelCatalog(ctx, record)
	if err != nil {
		return ModelParameterSetTransitionResponse{}, 0, err
	}
	status := http.StatusCreated
	if !created {
		status = http.StatusOK
	}
	response := ModelParameterSetTransitionResponse{
		ModelKey:           modelKey,
		ModelVersion:       modelVersion,
		ParameterSetID:     parameterSet.ParameterSetID,
		FromStatus:         fromStatus,
		ToStatus:           toStatus,
		CatalogPayloadHash: stored.PayloadHash,
		CreatedSnapshot:    created,
		Catalog:            catalog,
	}
	return response, status, nil
}

func (svc *Service) validateModelCatalog(catalog ModelCatalogResponse) error {
	if svc.validator == nil {
		return nil
	}
	var value map[string]any
	bytes, err := json.Marshal(catalog)
	if err != nil {
		return err
	}
	if err := json.Unmarshal(bytes, &value); err != nil {
		return err
	}
	return svc.validator.Validate("model_catalog.v1.json", value)
}

func (svc *Service) GetModelRun(ctx context.Context, modelRunID string) (json.RawMessage, error) {
	return svc.store.FindModelRun(ctx, required(modelRunID, "model_run_id"))
}

func (svc *Service) ListModelRuns(ctx context.Context, filter ModelRunFilter) (ListModelRunsResponse, error) {
	modelRuns, next, total, err := svc.store.ListModelRuns(ctx, filter)
	if err != nil {
		return ListModelRunsResponse{}, err
	}
	return ListModelRunsResponse{
		Items:         rawMessagesOrEmpty(modelRuns),
		NextCursor:    next,
		TotalEstimate: total,
	}, nil
}

func (svc *Service) ValidateContractDocument(bytes []byte) (ContractValidationResponse, error) {
	response := ContractValidationResponse{
		SchemaVersion: "contract_validation.v1",
		Errors:        []ContractValidationIssue{},
		Warnings:      []string{},
	}
	var document map[string]any
	if err := json.Unmarshal(bytes, &document); err != nil {
		return response, ValidationError("contract document JSON is invalid")
	}
	schemaVersion := stringValue(document, "schema_version")
	response.DocumentSchemaVersion = schemaVersion
	if schemaVersion == "" {
		response.Errors = append(response.Errors, ContractValidationIssue{
			Path:    "/schema_version",
			Message: "schema_version is required",
		})
		return response, nil
	}
	schemaName, ok := ContractSchemaName(schemaVersion)
	if !ok {
		response.Errors = append(response.Errors, ContractValidationIssue{
			Path:    "/schema_version",
			Message: "unsupported schema_version: " + schemaVersion,
		})
		return response, nil
	}
	response.ContractSchema = schemaName
	if svc.validator == nil {
		return response, NewAppError(500, CodeInternal, "contract validator is not configured", true, nil)
	}
	if err := svc.validator.Validate(schemaName, document); err != nil {
		response.Errors = append(response.Errors, ContractValidationIssue{
			Path:    "/",
			Message: err.Error(),
		})
		return response, nil
	}
	response.Valid = true
	return response, nil
}

func (svc *Service) ConfirmDraftDocument(ctx context.Context, bytes []byte, defaultSourceSystem, defaultRequestedBy string) (ContractValidationResponse, error) {
	response, err := svc.ValidateContractDocument(bytes)
	if err != nil || !response.Valid {
		return response, err
	}
	var document map[string]any
	if err := json.Unmarshal(bytes, &document); err != nil {
		return response, ValidationError("draft confirmation JSON is invalid")
	}
	if stringValue(document, "schema_version") != "draft_confirmation.v1" {
		response.Valid = false
		response.Errors = append(response.Errors, ContractValidationIssue{
			Path:    "/schema_version",
			Message: "schema_version must be draft_confirmation.v1",
		})
		return response, nil
	}
	draft := mapValue(document, "draft")
	if draft == nil {
		response.Valid = false
		response.Errors = append(response.Errors, ContractValidationIssue{
			Path:    "/draft",
			Message: "draft is required",
		})
		return response, nil
	}
	expectedDraftSchema := stringValue(document, "draft_schema_version")
	actualDraftSchema := stringValue(draft, "schema_version")
	if actualDraftSchema != expectedDraftSchema {
		response.Valid = false
		response.Errors = append(response.Errors, ContractValidationIssue{
			Path:    "/draft/schema_version",
			Message: "draft.schema_version must match draft_schema_version",
		})
	}
	expectedDraftID := stringValue(document, "draft_id")
	actualDraftID := stringValue(draft, "draft_id")
	if actualDraftID == "" {
		actualDraftID = stringValue(draft, "constraint_id")
	}
	if actualDraftID != expectedDraftID {
		response.Valid = false
		response.Errors = append(response.Errors, ContractValidationIssue{
			Path:    "/draft_id",
			Message: "draft_id must match the embedded draft id",
		})
	}
	if requiresConfirmation, ok := draft["requires_confirmation"].(bool); !ok || !requiresConfirmation {
		response.Valid = false
		response.Errors = append(response.Errors, ContractValidationIssue{
			Path:    "/draft/requires_confirmation",
			Message: "embedded draft must explicitly require confirmation",
		})
	}
	draftSchemaName, ok := ContractSchemaName(actualDraftSchema)
	if !ok {
		response.Valid = false
		response.Errors = append(response.Errors, ContractValidationIssue{
			Path:    "/draft/schema_version",
			Message: "unsupported draft schema_version: " + actualDraftSchema,
		})
	} else if svc.validator == nil {
		return response, NewAppError(500, CodeInternal, "contract validator is not configured", true, nil)
	} else if err := svc.validator.Validate(draftSchemaName, draft); err != nil {
		response.Valid = false
		response.Errors = append(response.Errors, ContractValidationIssue{
			Path:    "/draft",
			Message: err.Error(),
		})
	}
	if response.Valid {
		record, err := svc.draftConfirmationRecord(document, defaultSourceSystem, defaultRequestedBy)
		if err != nil {
			return response, err
		}
		created, err := svc.store.UpsertDraftConfirmation(ctx, record)
		if err != nil {
			return response, err
		}
		if !created {
			existing, err := svc.store.FindDraftConfirmation(ctx, record.ConfirmationID)
			if err != nil {
				return response, err
			}
			record = *existing
			response.Warnings = append(response.Warnings, "draft confirmation already existed; no compute job was created")
		} else {
			response.Warnings = append(response.Warnings, "draft confirmation persisted; no compute job was created")
		}
		response.ConfirmationRecord = &record
	}
	return response, nil
}

func (svc *Service) GetDraftConfirmation(ctx context.Context, confirmationID string) (DraftConfirmationRecord, error) {
	record, err := svc.store.FindDraftConfirmation(ctx, required(confirmationID, "confirmation_id"))
	if err != nil {
		return DraftConfirmationRecord{}, err
	}
	return *record, nil
}

func (svc *Service) ConstraintApplicationPlan(ctx context.Context, confirmationID string) (ConstraintApplicationPlan, error) {
	record, err := svc.store.FindDraftConfirmation(ctx, required(confirmationID, "confirmation_id"))
	if err != nil {
		return ConstraintApplicationPlan{}, err
	}
	if record.Decision != "approved" {
		return ConstraintApplicationPlan{}, Conflict(CodeDraftConfirmationNotApproved, "draft confirmation is not approved")
	}
	if record.DraftSchemaVersion != "constraint_draft.v1" {
		return ConstraintApplicationPlan{}, ValidationError("only constraint_draft.v1 can produce a constraint application plan")
	}
	var confirmation map[string]any
	if err := json.Unmarshal(record.Payload, &confirmation); err != nil {
		return ConstraintApplicationPlan{}, NewAppError(500, CodeInternal, "stored draft confirmation JSON is invalid", true, nil)
	}
	draft := mapValue(confirmation, "draft")
	if draft == nil {
		return ConstraintApplicationPlan{}, ValidationError("draft confirmation draft is required")
	}
	if svc.validator != nil {
		if err := svc.validator.Validate("constraint_draft.v1.json", draft); err != nil {
			return ConstraintApplicationPlan{}, err
		}
	}
	targetRef := mapValue(draft, "target_ref")
	if targetRef == nil {
		return ConstraintApplicationPlan{}, ValidationError("constraint_draft.target_ref is required")
	}
	constraints, ok := draft["constraints"].([]any)
	if !ok {
		return ConstraintApplicationPlan{}, ValidationError("constraint_draft.constraints is required")
	}
	return ConstraintApplicationPlan{
		SchemaVersion:              "constraint_application_plan.v1",
		ConfirmationID:             record.ConfirmationID,
		DraftID:                    record.DraftID,
		ConstraintID:               stringValue(draft, "constraint_id"),
		Scope:                      stringValue(draft, "scope"),
		TargetRef:                  targetRef,
		Constraints:                constraints,
		ApplicationMode:            "advisory_only",
		WouldCreateJob:             false,
		WouldModifyTarget:          false,
		ProductionApprovalRequired: true,
		Warnings: []string{
			"constraint application plan is advisory only; no compute job was created",
			"production approval is owned by the consuming approval system",
		},
	}, nil
}

func (svc *Service) PromoteDraftConfirmationToSimulationCheck(ctx context.Context, confirmationID string) (JobSnapshot, int, error) {
	record, err := svc.store.FindDraftConfirmation(ctx, required(confirmationID, "confirmation_id"))
	if err != nil {
		return JobSnapshot{}, 0, err
	}
	if record.Decision != "approved" {
		return JobSnapshot{}, 0, Conflict(CodeDraftConfirmationNotApproved, "draft confirmation is not approved")
	}
	if record.DraftSchemaVersion != "agent_scenario_draft.v1" {
		return JobSnapshot{}, 0, ValidationError("only agent_scenario_draft.v1 can be promoted to a simulation check")
	}
	var confirmation map[string]any
	if err := json.Unmarshal(record.Payload, &confirmation); err != nil {
		return JobSnapshot{}, 0, NewAppError(500, CodeInternal, "stored draft confirmation JSON is invalid", true, nil)
	}
	draft := mapValue(confirmation, "draft")
	if draft == nil {
		return JobSnapshot{}, 0, ValidationError("draft confirmation draft is required")
	}
	proposedRequest := mapValue(draft, "proposed_request")
	if proposedRequest == nil {
		return JobSnapshot{}, 0, ValidationError("agent_scenario_draft.proposed_request is required")
	}
	if svc.validator != nil {
		if err := svc.validator.Validate("simulation_request.v1.json", proposedRequest); err != nil {
			return JobSnapshot{}, 0, err
		}
	}
	requestBytes, err := json.Marshal(proposedRequest)
	if err != nil {
		return JobSnapshot{}, 0, err
	}
	return svc.CreateSimulationCheck(ctx, requestBytes)
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
	return snapshotFrom(*job, artifacts, len(events)), nil
}

func (svc *Service) draftConfirmationRecord(document map[string]any, defaultSourceSystem, defaultRequestedBy string) (DraftConfirmationRecord, error) {
	payload, err := json.Marshal(document)
	if err != nil {
		return DraftConfirmationRecord{}, err
	}
	metadata := mapValue(document, "metadata")
	metadataBytes := json.RawMessage("null")
	if metadata != nil {
		metadataBytes, err = json.Marshal(metadata)
		if err != nil {
			return DraftConfirmationRecord{}, err
		}
	}
	confirmedAt, err := time.Parse(time.RFC3339, required(stringValue(document, "confirmed_at"), "confirmed_at"))
	if err != nil {
		return DraftConfirmationRecord{}, ValidationError("confirmed_at must be RFC3339 date-time")
	}
	return DraftConfirmationRecord{
		ConfirmationID:     required(stringValue(document, "confirmation_id"), "confirmation_id"),
		SchemaVersion:      "draft_confirmation.v1",
		DraftSchemaVersion: required(stringValue(document, "draft_schema_version"), "draft_schema_version"),
		DraftID:            required(stringValue(document, "draft_id"), "draft_id"),
		Decision:           required(stringValue(document, "decision"), "decision"),
		DecisionReason:     stringValue(document, "decision_reason"),
		ConfirmedBy:        required(stringValue(document, "confirmed_by"), "confirmed_by"),
		ConfirmedAt:        confirmedAt.UTC(),
		PayloadHash:        "sha256:" + SHA256Hex(payload),
		Payload:            payload,
		SourceSystem:       defaultString(stringValue(metadata, "source_system"), defaultString(defaultSourceSystem, "compute-api")),
		RequestedBy:        defaultString(stringValue(metadata, "requested_by"), defaultString(defaultRequestedBy, "unknown")),
		TenantID:           stringValue(metadata, "tenant_id"),
		ProjectID:          stringValue(metadata, "project_id"),
		Metadata:           metadataBytes,
		CreatedAt:          svc.now(),
	}, nil
}

func snapshotFrom(job JobRecord, artifacts []ArtifactRecord, eventCount int) JobSnapshot {
	if artifacts == nil {
		artifacts = []ArtifactRecord{}
	}
	return JobSnapshot{Job: job, Artifacts: artifacts, EventCount: eventCount}
}

func rawMessagesOrEmpty(values []json.RawMessage) []any {
	result := make([]any, 0, len(values))
	for _, raw := range values {
		result = append(result, rawOrNull(raw))
	}
	return result
}

func evidenceInputRefs(input json.RawMessage) (map[string]any, string, map[string]any, map[string]any) {
	inputRef := map[string]any{}
	processGraphRef := map[string]any{}
	simulationInputRef := map[string]any{}
	inputHash := "sha256:" + SHA256Hex(input)
	var job map[string]any
	if err := json.Unmarshal(input, &job); err != nil {
		return inputRef, inputHash, processGraphRef, simulationInputRef
	}
	payload, _ := job["payload"].(map[string]any)
	if payloadBytes, err := json.Marshal(payload); err == nil && len(payloadBytes) > 0 {
		inputHash = "sha256:" + SHA256Hex(payloadBytes)
	}
	if processGraphID := stringValue(payload, "process_graph_id"); processGraphID != "" {
		processGraphRef["process_graph_id"] = processGraphID
	}
	if version, ok := payload["process_graph_version"]; ok {
		processGraphRef["version"] = version
	}
	if simulationInputID := stringValue(payload, "simulation_input_id"); simulationInputID != "" {
		simulationInputRef["simulation_input_id"] = simulationInputID
	}
	inputRef["job_id"] = stringValue(job, "job_id")
	inputRef["payload_schema_version"] = stringValue(payload, "schema_version")
	return inputRef, inputHash, processGraphRef, simulationInputRef
}

func parseEvidenceRef(evidenceRef string) (string, string) {
	evidenceRef = strings.TrimSpace(evidenceRef)
	refType, refID, ok := strings.Cut(evidenceRef, ":")
	if !ok {
		return "", evidenceRef
	}
	return strings.TrimSpace(refType), strings.TrimSpace(refID)
}

func (svc *Service) resolveModelRunEvidenceRef(ctx context.Context, jobID, evidenceRef, modelRunID string) (EvidenceReferenceResolution, bool) {
	raw, err := svc.store.FindModelRun(ctx, modelRunID)
	if err != nil {
		return EvidenceReferenceResolution{}, false
	}
	modelRunID, modelRunJobID, _, _, _, err := modelRunFieldsFromRaw(raw)
	if err != nil || modelRunJobID != jobID {
		return EvidenceReferenceResolution{}, false
	}
	return EvidenceReferenceResolution{
		JobID:       jobID,
		EvidenceRef: evidenceRef,
		RefType:     "model_run",
		RefID:       modelRunID,
		Resolved:    true,
		Payload:     rawOrNull(raw),
	}, true
}

func (svc *Service) resolveArtifactEvidenceRef(ctx context.Context, jobID, evidenceRef, artifactID string) (EvidenceReferenceResolution, bool) {
	artifact, err := svc.store.FindArtifact(ctx, artifactID)
	if err != nil || artifact.JobID != jobID {
		return EvidenceReferenceResolution{}, false
	}
	return EvidenceReferenceResolution{
		JobID:       jobID,
		EvidenceRef: evidenceRef,
		RefType:     "artifact",
		RefID:       artifact.ArtifactID,
		Resolved:    true,
		Payload:     artifact,
	}, true
}

func simulationInputPayloadForEvidence(input json.RawMessage, simulationInputID string) map[string]any {
	var job map[string]any
	if err := json.Unmarshal(input, &job); err != nil {
		return nil
	}
	payload := mapValue(job, "payload")
	if payload == nil || stringValue(payload, "schema_version") != "simulation_input.v1" {
		return nil
	}
	if stringValue(payload, "simulation_input_id") != simulationInputID {
		return nil
	}
	return payload
}

func evidenceTimeline(events []EventRecord) []map[string]any {
	timeline := make([]map[string]any, 0, len(events))
	for _, event := range events {
		timeline = append(timeline, map[string]any{
			"id":         event.ID,
			"event_type": event.EventType,
			"event":      rawOrNull(event.EventJSON),
			"created_at": event.CreatedAt.Format(time.RFC3339Nano),
		})
	}
	return timeline
}

func warningsFromModelRun(raw json.RawMessage) []string {
	var modelRun map[string]any
	if err := json.Unmarshal(raw, &modelRun); err != nil {
		return nil
	}
	return stringsFromAny(modelRun["warnings"])
}

func (svc *Service) evidenceGovernance(ctx context.Context, modelRuns []json.RawMessage) (map[string]any, error) {
	catalog, err := svc.ModelCatalog(ctx)
	if err != nil {
		return nil, err
	}
	modelVersionRefs := make([]any, 0, len(modelRuns))
	productionAllowed := len(modelRuns) > 0
	for _, raw := range modelRuns {
		var modelRun map[string]any
		if err := json.Unmarshal(raw, &modelRun); err != nil {
			productionAllowed = false
			continue
		}
		modelRunID, _, modelKey, modelVersion, parameterSetID, err := modelRunFieldsFromRaw(raw)
		if err != nil || modelRunID == "" {
			productionAllowed = false
			continue
		}
		parameterHash := stringValue(modelRun, "parameter_hash")
		modelStatus, catalogParameterSetID, parameterSetStatus, allowed := modelGovernance(catalog, modelKey, modelVersion, parameterHash)
		if parameterSetID == "" {
			parameterSetID = catalogParameterSetID
		}
		if !allowed {
			productionAllowed = false
		}
		modelVersionRefs = append(modelVersionRefs, map[string]any{
			"model_run_id":         modelRunID,
			"model_key":            modelKey,
			"model_version":        modelVersion,
			"parameter_set_id":     parameterSetID,
			"parameter_hash":       parameterHash,
			"model_status":         modelStatus,
			"parameter_set_status": parameterSetStatus,
			"production_allowed":   allowed,
		})
	}
	return map[string]any{
		"production_allowed": productionAllowed,
		"model_version_refs": modelVersionRefs,
	}, nil
}

func modelGovernance(catalog ModelCatalogResponse, modelKey, modelVersion, parameterHash string) (string, string, string, bool) {
	for _, model := range catalog.Models {
		if model.ModelKey != modelKey {
			continue
		}
		for _, version := range model.Versions {
			if version.ModelVersion != modelVersion {
				continue
			}
			modelStatus := version.Status
			parameterSetID := ""
			parameterSetStatus := "unknown"
			if version.DefaultParameterSet != nil && version.DefaultParameterSet.ParameterHash == parameterHash {
				parameterSetID = version.DefaultParameterSet.ParameterSetID
				parameterSetStatus = version.DefaultParameterSet.Status
			}
			return modelStatus, parameterSetID, parameterSetStatus, modelStatus == "active" && parameterSetStatus == "approved"
		}
	}
	return "unknown", "", "unknown", false
}

func findModelVersionIndex(catalog ModelCatalogResponse, modelKey, modelVersion string) (int, int) {
	for modelIndex, model := range catalog.Models {
		if model.ModelKey != modelKey {
			continue
		}
		for versionIndex, version := range model.Versions {
			if version.ModelVersion == modelVersion {
				return modelIndex, versionIndex
			}
		}
		return modelIndex, -1
	}
	return -1, -1
}

func validParameterSetStatus(status string) bool {
	switch status {
	case "draft", "candidate", "validated", "approved", "retired":
		return true
	default:
		return false
	}
}

func allowedParameterSetTransition(fromStatus, toStatus string) bool {
	if fromStatus == "retired" {
		return false
	}
	if toStatus == "retired" {
		return true
	}
	order := map[string]int{
		"draft":     0,
		"candidate": 1,
		"validated": 2,
		"approved":  3,
	}
	from, fromOK := order[fromStatus]
	to, toOK := order[toStatus]
	return fromOK && toOK && to == from+1
}

func copyStringAnyMap(value map[string]any) map[string]any {
	copy := map[string]any{}
	for key, raw := range value {
		copy[key] = raw
	}
	return copy
}

func modelCatalogResponseToMap(catalog ModelCatalogResponse) map[string]any {
	var value map[string]any
	bytes, _ := json.Marshal(catalog)
	_ = json.Unmarshal(bytes, &value)
	return value
}

func artifactRetention(metadata map[string]any) (string, *time.Time, error) {
	retentionPolicy := defaultString(stringValue(metadata, "retention_policy"), "retain_forever")
	switch retentionPolicy {
	case "retain_forever", "ttl", "archive_candidate":
	default:
		return "", nil, ValidationError("retention_policy is invalid")
	}
	rawRetainUntil := stringValue(metadata, "retain_until")
	if rawRetainUntil == "" {
		return retentionPolicy, nil, nil
	}
	retainUntil, err := time.Parse(time.RFC3339Nano, rawRetainUntil)
	if err != nil {
		return "", nil, ValidationError("retain_until must be RFC3339")
	}
	return retentionPolicy, &retainUntil, nil
}

func simulationCheckExecution(jobType string) map[string]any {
	requiredCapabilities := []any{"material_balance", "ode"}
	if jobType != "simulation.material_balance.v1" {
		requiredCapabilities = []any{}
	}
	return map[string]any{
		"time_limit_sec":        600,
		"priority":              "normal",
		"required_capabilities": requiredCapabilities,
	}
}

func (svc *Service) resolveSimulationInput(ctx context.Context, inputRef map[string]any, sourceSystem, requestedBy, jobType string) (map[string]any, error) {
	if simulationInput := mapValue(inputRef, "simulation_input"); simulationInput != nil {
		record, err := svc.simulationInputRecord(simulationInput, sourceSystem, requestedBy)
		if err != nil {
			return nil, err
		}
		if _, err := svc.store.UpsertSimulationInput(ctx, record); err != nil {
			return nil, err
		}
		return simulationInput, nil
	}
	if processGraphID := stringValue(inputRef, "process_graph_id"); processGraphID != "" {
		version := int(numberValue(inputRef, "process_graph_version"))
		if version <= 0 {
			version = 1
		}
		record, err := svc.store.FindProcessGraph(ctx, processGraphID, version)
		if err != nil {
			return nil, err
		}
		var processGraph map[string]any
		if err := json.Unmarshal(record.Payload, &processGraph); err != nil {
			return nil, NewAppError(500, CodeInternal, "stored process graph JSON is invalid", true, nil)
		}
		simulationInput, err := svc.processGraphToSimulationInput(
			processGraph,
			mapValue(inputRef, "parameters"),
			stringValue(inputRef, "simulation_input_id"),
			jobType,
		)
		if err != nil {
			return nil, err
		}
		inputRecord, err := svc.simulationInputRecord(simulationInput, sourceSystem, requestedBy)
		if err != nil {
			return nil, err
		}
		if _, err := svc.store.UpsertSimulationInput(ctx, inputRecord); err != nil {
			return nil, err
		}
		return simulationInput, nil
	}
	if modelRunID := stringValue(inputRef, "model_run_id"); modelRunID != "" {
		simulationInput, err := svc.simulationInputFromModelRun(ctx, modelRunID)
		if err != nil {
			return nil, err
		}
		record, err := svc.simulationInputRecord(simulationInput, sourceSystem, requestedBy)
		if err != nil {
			return nil, err
		}
		if _, err := svc.store.UpsertSimulationInput(ctx, record); err != nil {
			return nil, err
		}
		return simulationInput, nil
	}
	simulationInputID := stringValue(inputRef, "simulation_input_id")
	if simulationInputID == "" {
		return nil, ValidationError("simulation_request.input_ref.simulation_input, process_graph_id, model_run_id, or simulation_input_id is required")
	}
	record, err := svc.store.FindSimulationInput(ctx, simulationInputID)
	if err != nil {
		return nil, err
	}
	var simulationInput map[string]any
	if err := json.Unmarshal(record.Payload, &simulationInput); err != nil {
		return nil, NewAppError(500, CodeInternal, "stored simulation input JSON is invalid", true, nil)
	}
	return simulationInput, nil
}

func (svc *Service) simulationInputFromModelRun(ctx context.Context, modelRunID string) (map[string]any, error) {
	modelRun, err := svc.store.FindModelRun(ctx, required(modelRunID, "model_run_id"))
	if err != nil {
		return nil, err
	}
	_, jobID, _, _, _, err := modelRunFieldsFromRaw(modelRun)
	if err != nil {
		return nil, NewAppError(500, CodeInternal, "stored model_run JSON is invalid", true, nil)
	}
	if jobID == "" {
		return nil, ValidationError("model_run job_id is required for replay")
	}
	job, err := svc.store.FindJobByID(ctx, jobID)
	if err != nil {
		appErr := ToAppError(err)
		if appErr.ErrorCode == CodeJobNotFound {
			return nil, NotFound(CodeModelRunNotFound, "model run source job not found")
		}
		return nil, err
	}
	var sourceJob map[string]any
	if err := json.Unmarshal(job.InputJSON, &sourceJob); err != nil {
		return nil, NewAppError(500, CodeInternal, "model run source job JSON is invalid", true, nil)
	}
	payload := mapValue(sourceJob, "payload")
	if payload == nil || stringValue(payload, "schema_version") != "simulation_input.v1" {
		return nil, ValidationError("model_run replay requires a source job with simulation_input.v1 payload")
	}
	if svc.validator != nil {
		if err := svc.validator.Validate("simulation_input.v1.json", payload); err != nil {
			return nil, err
		}
	}
	return payload, nil
}

func (svc *Service) processGraphRecord(processGraph map[string]any, defaultSourceSystem, defaultRequestedBy string) (ProcessGraphRecord, error) {
	if svc.validator != nil {
		if err := svc.validator.Validate("process_graph.v1.json", processGraph); err != nil {
			return ProcessGraphRecord{}, err
		}
	}
	if err := validateProcessGraphForSimulationInput(processGraph); err != nil {
		return ProcessGraphRecord{}, err
	}
	version := int(numberValue(processGraph, "version"))
	if version <= 0 {
		return ProcessGraphRecord{}, ValidationError("process_graph.version must be a positive integer")
	}
	payloadHash, err := ResultHash(processGraph)
	if err != nil {
		return ProcessGraphRecord{}, err
	}
	metadata := mapValue(processGraph, "metadata")
	sourceSystem := defaultString(stringValue(metadata, "source_system"), defaultString(defaultSourceSystem, "compute-api"))
	requestedBy := defaultString(stringValue(metadata, "requested_by"), defaultString(defaultRequestedBy, "compute-api"))
	return ProcessGraphRecord{
		ProcessGraphID:      required(stringValue(processGraph, "process_graph_id"), "process_graph_id"),
		SchemaVersion:       required(stringValue(processGraph, "schema_version"), "schema_version"),
		Version:             version,
		SourceCanvasGraphID: required(stringValue(processGraph, "source_canvas_graph_id"), "source_canvas_graph_id"),
		PayloadHash:         payloadHash,
		Payload:             mustJSON(processGraph),
		SourceSystem:        sourceSystem,
		RequestedBy:         requestedBy,
		TenantID:            stringValue(metadata, "tenant_id"),
		ProjectID:           stringValue(metadata, "project_id"),
		Metadata:            mustJSON(metadata),
		CreatedAt:           svc.now(),
	}, nil
}

func (svc *Service) simulationInputRecord(input map[string]any, defaultSourceSystem, defaultRequestedBy string) (SimulationInputRecord, error) {
	if svc.validator != nil {
		if err := svc.validator.Validate("simulation_input.v1.json", input); err != nil {
			return SimulationInputRecord{}, err
		}
	}
	payloadHash, err := ResultHash(input)
	if err != nil {
		return SimulationInputRecord{}, err
	}
	metadata := mapValue(input, "metadata")
	sourceSystem := defaultString(stringValue(metadata, "source_system"), defaultString(defaultSourceSystem, "compute-api"))
	requestedBy := defaultString(stringValue(metadata, "requested_by"), defaultString(defaultRequestedBy, "compute-api"))
	return SimulationInputRecord{
		SimulationInputID:   required(stringValue(input, "simulation_input_id"), "simulation_input_id"),
		SchemaVersion:       required(stringValue(input, "schema_version"), "schema_version"),
		JobType:             required(stringValue(input, "job_type"), "job_type"),
		ProcessGraphID:      required(stringValue(input, "process_graph_id"), "process_graph_id"),
		ProcessGraphVersion: int(numberValue(input, "process_graph_version")),
		PayloadHash:         payloadHash,
		Payload:             mustJSON(input),
		SourceSystem:        sourceSystem,
		RequestedBy:         requestedBy,
		TenantID:            stringValue(metadata, "tenant_id"),
		ProjectID:           stringValue(metadata, "project_id"),
		Metadata:            mustJSON(metadata),
		CreatedAt:           svc.now(),
	}, nil
}

func (svc *Service) modelCatalogRecord(catalog map[string]any, defaultSourceSystem, defaultRequestedBy string) (ModelCatalogRecord, error) {
	if svc.validator != nil {
		if err := svc.validator.Validate("model_catalog.v1.json", catalog); err != nil {
			return ModelCatalogRecord{}, err
		}
	}
	schemaVersion := stringValue(catalog, "schema_version")
	if schemaVersion == "" {
		return ModelCatalogRecord{}, ValidationError("model_catalog.schema_version is required")
	}
	if schemaVersion != "model_catalog.v1" {
		return ModelCatalogRecord{}, ValidationError("model_catalog.schema_version must be model_catalog.v1")
	}
	generatedAt := stringValue(catalog, "generated_at")
	if generatedAt == "" {
		return ModelCatalogRecord{}, ValidationError("model_catalog.generated_at is required")
	}
	payloadHash, err := ResultHash(catalog)
	if err != nil {
		return ModelCatalogRecord{}, err
	}
	metadata := mapValue(catalog, "metadata")
	catalogID := defaultString(stringValue(metadata, "catalog_id"), "default")
	sourceSystem := defaultString(stringValue(metadata, "source_system"), defaultString(defaultSourceSystem, "compute-api"))
	requestedBy := defaultString(stringValue(metadata, "requested_by"), defaultString(defaultRequestedBy, "compute-api"))
	return ModelCatalogRecord{
		CatalogID:     catalogID,
		SchemaVersion: schemaVersion,
		GeneratedAt:   generatedAt,
		PayloadHash:   payloadHash,
		Payload:       mustJSON(catalog),
		SourceSystem:  sourceSystem,
		RequestedBy:   requestedBy,
		TenantID:      stringValue(metadata, "tenant_id"),
		ProjectID:     stringValue(metadata, "project_id"),
		Metadata:      mustJSON(metadata),
		CreatedAt:     svc.now(),
	}, nil
}

func (svc *Service) processGraphToSimulationInput(processGraph map[string]any, parameters map[string]any, simulationInputID, jobType string) (map[string]any, error) {
	if jobType != "simulation.material_balance.v1" {
		return nil, ValidationError("process_graph lookup only supports simulation.material_balance.v1")
	}
	if svc.validator != nil {
		if err := svc.validator.Validate("process_graph.v1.json", processGraph); err != nil {
			return nil, err
		}
	}
	if err := validateProcessGraphForSimulationInput(processGraph); err != nil {
		return nil, err
	}
	resolvedParameters := map[string]any{
		"hours":          4.0,
		"steps_per_hour": 60,
		"solver_method":  "scipy_solver",
		"tolerance":      0.000001,
		"max_iterations": 1000,
		"max_memory_mb":  1000,
	}
	metadata := mapValue(processGraph, "metadata")
	for key, value := range mapValue(metadata, "source_calculation_parameters") {
		resolvedParameters[key] = value
	}
	for key, value := range parameters {
		resolvedParameters[key] = value
	}
	processGraphID := required(stringValue(processGraph, "process_graph_id"), "process_graph_id")
	processGraphVersion := int(numberValue(processGraph, "version"))
	if processGraphVersion <= 0 {
		return nil, ValidationError("process_graph.version must be a positive integer")
	}
	if strings.TrimSpace(simulationInputID) == "" {
		simulationInputID = "si_" + processGraphID
	}
	return map[string]any{
		"schema_version":        "simulation_input.v1",
		"simulation_input_id":   simulationInputID,
		"process_graph_id":      processGraphID,
		"process_graph_version": processGraphVersion,
		"job_type":              jobType,
		"component_schema":      mapValue(processGraph, "component_schema"),
		"nodes":                 processGraphSimulationNodes(processGraph),
		"edges":                 processGraphSimulationEdges(processGraph),
		"time_segments":         collectProcessGraphTimeSegments(processGraph),
		"parameters":            resolvedParameters,
		"runtime_options":       map[string]any{"numerical_tolerance": map[string]any{"rtol": 0.000001, "atol": 0.000000001}},
		"metadata":              map[string]any{"source_canvas_graph_id": stringValue(processGraph, "source_canvas_graph_id"), "transform": "process_graph_to_simulation_input.v1"},
	}, nil
}

func validateProcessGraphForSimulationInput(processGraph map[string]any) error {
	components := stringsFromAny(mapValue(processGraph, "component_schema")["components"])
	if len(components) == 0 {
		return ValidationError("process_graph.component_schema.components is required")
	}
	nodeIDs := map[string]bool{}
	nodes := sliceFromAny(processGraph["nodes"])
	if len(nodes) < 2 {
		return ValidationError("process_graph.nodes must include at least two nodes")
	}
	for index, item := range nodes {
		node, ok := item.(map[string]any)
		if !ok {
			return ValidationError(fmt.Sprintf("process_graph.nodes[%d] must be an object", index))
		}
		nodeID := stringValue(node, "node_id")
		if nodeID == "" {
			return ValidationError(fmt.Sprintf("process_graph.nodes[%d].node_id is required", index))
		}
		if nodeIDs[nodeID] {
			return ValidationError("process_graph contains duplicate node_id: " + nodeID)
		}
		if mapValue(node, "initial_conditions") == nil {
			return ValidationError("process_graph node initial_conditions is required: " + nodeID)
		}
		nodeIDs[nodeID] = true
	}
	edges := sliceFromAny(processGraph["edges"])
	if len(edges) == 0 {
		return ValidationError("process_graph.edges must include at least one edge")
	}
	edgeIDs := map[string]bool{}
	for index, item := range edges {
		edge, ok := item.(map[string]any)
		if !ok {
			return ValidationError(fmt.Sprintf("process_graph.edges[%d] must be an object", index))
		}
		edgeID := stringValue(edge, "edge_id")
		if edgeID == "" {
			return ValidationError(fmt.Sprintf("process_graph.edges[%d].edge_id is required", index))
		}
		if edgeIDs[edgeID] {
			return ValidationError("process_graph contains duplicate edge_id: " + edgeID)
		}
		edgeIDs[edgeID] = true
		if !nodeIDs[stringValue(edge, "source_node_id")] {
			return ValidationError("process_graph edge references unknown source node: " + edgeID)
		}
		if !nodeIDs[stringValue(edge, "target_node_id")] {
			return ValidationError("process_graph edge references unknown target node: " + edgeID)
		}
		transform := mapValue(edge, "concentration_transform")
		for _, component := range components {
			factor := mapValue(transform, component)
			if factor == nil {
				return ValidationError("process_graph edge concentration_transform missing component: " + edgeID + "." + component)
			}
			if _, ok := factor["a"]; !ok {
				return ValidationError("process_graph edge concentration_transform missing a: " + edgeID + "." + component)
			}
			if _, ok := factor["b"]; !ok {
				return ValidationError("process_graph edge concentration_transform missing b: " + edgeID + "." + component)
			}
		}
	}
	return nil
}

func processGraphSimulationNodes(processGraph map[string]any) []any {
	nodes := make([]any, 0)
	for _, item := range sliceFromAny(processGraph["nodes"]) {
		node, ok := item.(map[string]any)
		if !ok {
			continue
		}
		nodeType := stringValue(node, "node_type")
		nodes = append(nodes, map[string]any{
			"node_id":                stringValue(node, "node_id"),
			"node_type":              nodeType,
			"initial_volume":         node["volume"],
			"initial_concentrations": mapValue(node, "initial_conditions"),
			"is_inlet":               nodeType == "input" || nodeType == "inlet",
			"is_outlet":              nodeType == "output" || nodeType == "outlet",
		})
	}
	return nodes
}

func processGraphSimulationEdges(processGraph map[string]any) []any {
	edges := make([]any, 0)
	for _, item := range sliceFromAny(processGraph["edges"]) {
		edge, ok := item.(map[string]any)
		if !ok {
			continue
		}
		edges = append(edges, map[string]any{
			"edge_id":                 stringValue(edge, "edge_id"),
			"source_node_id":          stringValue(edge, "source_node_id"),
			"target_node_id":          stringValue(edge, "target_node_id"),
			"flow_rate":               edge["flow_rate"],
			"concentration_transform": mapValue(edge, "concentration_transform"),
		})
	}
	return edges
}

func collectProcessGraphTimeSegments(processGraph map[string]any) []any {
	segments := map[string]map[string]any{}
	for _, item := range sliceFromAny(processGraph["edges"]) {
		edge, ok := item.(map[string]any)
		if !ok {
			continue
		}
		edgeID := stringValue(edge, "edge_id")
		for index, overrideItem := range sliceFromAny(edge["time_segment_overrides"]) {
			override, ok := overrideItem.(map[string]any)
			if !ok {
				continue
			}
			segmentID := stringValue(override, "segment_id")
			if segmentID == "" {
				segmentID = stringValue(override, "id")
			}
			if segmentID == "" {
				segmentID = fmt.Sprintf("seg_%d", index+1)
			}
			segment, ok := segments[segmentID]
			if !ok {
				segment = map[string]any{
					"id":             segmentID,
					"start_hour":     numberValueWithAliases(override, "start_hour", "startHour"),
					"end_hour":       numberValueWithAliases(override, "end_hour", "endHour"),
					"edge_overrides": map[string]any{},
				}
				segments[segmentID] = segment
			}
			edgeOverride := map[string]any{"factors": mapValue(override, "factors")}
			if rawFlow, ok := override["flow"]; ok && rawFlow != nil {
				edgeOverride["flow"] = rawFlow
			}
			segment["edge_overrides"].(map[string]any)[edgeID] = edgeOverride
		}
	}
	result := make([]any, 0, len(segments))
	for _, segment := range segments {
		result = append(result, segment)
	}
	sort.Slice(result, func(i, j int) bool {
		left := result[i].(map[string]any)
		right := result[j].(map[string]any)
		if left["start_hour"] == right["start_hour"] {
			if left["end_hour"] == right["end_hour"] {
				return stringValue(left, "id") < stringValue(right, "id")
			}
			return left["end_hour"].(float64) < right["end_hour"].(float64)
		}
		return left["start_hour"].(float64) < right["start_hour"].(float64)
	})
	return result
}

func sliceFromAny(value any) []any {
	items, ok := value.([]any)
	if !ok {
		return nil
	}
	return items
}

func numberValueWithAliases(value map[string]any, primary, fallback string) float64 {
	if raw, ok := value[primary].(float64); ok {
		return raw
	}
	if raw, ok := value[fallback].(float64); ok {
		return raw
	}
	return 0
}

func simulationCheckMetadata(requestID string, inputRef map[string]any, externalRefs map[string]any) map[string]any {
	metadata := map[string]any{
		"source":                "simulation_check_api",
		"simulation_request_id": requestID,
	}
	if externalRefs != nil {
		metadata["external_refs"] = externalRefs
	}
	inputRefMetadata := map[string]any{}
	for key, value := range inputRef {
		if key == "simulation_input" {
			continue
		}
		inputRefMetadata[key] = value
	}
	if len(inputRefMetadata) > 0 {
		metadata["input_ref"] = inputRefMetadata
	}
	return metadata
}

func safeIDPart(value string) string {
	var builder strings.Builder
	for _, char := range value {
		if (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || (char >= '0' && char <= '9') || char == '-' || char == '_' {
			builder.WriteRune(char)
		} else {
			builder.WriteByte('_')
		}
	}
	if builder.Len() == 0 {
		return "unknown"
	}
	return builder.String()
}

func (svc *Service) modelRunsFromResult(result map[string]any, jobID string) ([]json.RawMessage, error) {
	runtimeAudit, ok := result["runtime_audit"].(map[string]any)
	if !ok {
		return nil, nil
	}
	items, ok := runtimeAudit["model_runs"].([]any)
	if !ok || len(items) == 0 {
		return nil, nil
	}
	modelRuns := make([]json.RawMessage, 0, len(items))
	for _, item := range items {
		modelRun, ok := item.(map[string]any)
		if !ok {
			return nil, ValidationError("runtime_audit.model_runs items must be objects")
		}
		if stringValue(modelRun, "job_id") != "" && stringValue(modelRun, "job_id") != jobID {
			return nil, ValidationError("model_run job_id does not match completed job")
		}
		if svc.validator != nil {
			if err := svc.validator.Validate("model_run.v1.json", modelRun); err != nil {
				return nil, err
			}
		}
		modelRuns = append(modelRuns, mustJSON(modelRun))
	}
	return modelRuns, nil
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

func mapValue(value map[string]any, key string) map[string]any {
	raw, ok := value[key]
	if !ok || raw == nil {
		return nil
	}
	record, ok := raw.(map[string]any)
	if !ok {
		return nil
	}
	return record
}

func builtInModelCatalog(generatedAt string) ModelCatalogResponse {
	minZero := 0.0
	minOne := 1.0
	parameters := map[string]any{
		"hours":          4,
		"steps_per_hour": 60,
	}
	parameterHash, _ := ResultHash(parameters)
	return ModelCatalogResponse{
		SchemaVersion: "model_catalog.v1",
		GeneratedAt:   generatedAt,
		Models: []ModelCatalogModel{
			{
				ModelKey:          "material_balance",
				DisplayName:       "Material Balance",
				Description:       "Deterministic material-balance model for P0/P1 smoke jobs.",
				SupportedJobTypes: []string{"simulation.material_balance.v1"},
				Versions: []ModelCatalogVersion{
					{
						ModelVersion: "material_balance.v1",
						Status:       "active",
						Runtime:      "simulation-worker",
						ReleasedAt:   "2026-05-25T00:00:00Z",
						ParameterTemplates: []ModelParameterTemplate{
							{
								ParameterKey: "hours",
								DisplayName:  "Simulation horizon",
								Unit:         "h",
								ValueType:    "number",
								Required:     true,
								DefaultValue: 4,
								MinValue:     &minZero,
							},
							{
								ParameterKey: "steps_per_hour",
								DisplayName:  "Steps per hour",
								ValueType:    "integer",
								Required:     true,
								DefaultValue: 60,
								MinValue:     &minOne,
							},
						},
						BenchmarkCases: []ModelBenchmarkCase{
							{
								BenchmarkCaseID: "bc_material_balance_minimal_v1",
								DisplayName:     "Material balance minimal smoke",
								Description:     "Minimal three-node material-balance case used as a reproducible P0 benchmark.",
								JobType:         "simulation.material_balance.v1",
								InputRef: map[string]any{
									"simulation_input_id": "si_material_balance_minimal",
									"fixture":             "contracts/examples/valid/material_balance_minimal.simulation_input.v1.json",
								},
								ExpectedMetrics: map[string]any{
									"convergence_status": "completed",
									"warning_count":      0,
								},
								Tolerance: map[string]any{
									"relative": 0.000001,
									"absolute": 0.000001,
								},
								Status:       "validated",
								Source:       "built_in_smoke",
								EvidenceRefs: []string{"model_run:mr_material_balance_minimal"},
							},
						},
						DefaultParameterSet: &ModelParameterSet{
							ParameterSetID: "ps_material_balance_default_v1",
							Status:         "approved",
							ParameterHash:  parameterHash,
							Parameters:     parameters,
							Metadata: map[string]any{
								"scope": "p0_default",
							},
						},
					},
				},
			},
		},
		Metadata: map[string]any{
			"source": "built_in",
		},
	}
}

func defaultString(value, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return value
}
