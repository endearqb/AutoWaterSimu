package compute

import (
	"context"
	"encoding/json"
	"mime/multipart"
	"sort"
	"strings"
	"time"

	domainmodels "autowatersimu/apps/api/internal/domain/models"
	domainsimulation "autowatersimu/apps/api/internal/domain/simulation"
	domainworkers "autowatersimu/apps/api/internal/domain/workers"
)

type Service struct {
	store              Store
	artifacts          ArtifactStore
	archiveArtifacts   ArtifactStore
	artifactLifecycle  *ArtifactLifecycleService
	jobLifecycle       *JobLifecycleService
	workerLifecycle    *domainworkers.WorkerLifecycleService
	simulationInputs   *SimulationInputService
	draftWorkflows     *DraftWorkflowService
	resultExplanations *ResultExplanationService
	modelGovernance    *ModelGovernanceService
	evidenceGovernance *EvidenceGovernanceService
	metricsSnapshot    *MetricsService
	validator          *ContractValidator
	now                func() time.Time
}

func NewService(store Store, artifacts ArtifactStore, validator *ContractValidator) *Service {
	return NewServiceWithArchive(store, artifacts, nil, validator)
}

func NewServiceWithArchive(store Store, artifacts ArtifactStore, archiveArtifacts ArtifactStore, validator *ContractValidator) *Service {
	svc := &Service{
		store:            store,
		artifacts:        artifacts,
		archiveArtifacts: archiveArtifacts,
		validator:        validator,
		now:              func() time.Time { return time.Now().UTC() },
	}
	svc.artifactLifecycle = NewArtifactLifecycleService(store, ArtifactObjectStores{Hot: artifacts, Archive: archiveArtifacts}, validator, func() time.Time { return svc.now() })
	svc.jobLifecycle = NewJobLifecycleService(store, store, validator, func() time.Time { return svc.now() }, func(ctx context.Context, jobID string) ([]ArtifactRecord, error) {
		return svc.artifactLifecycle.ListJobArtifacts(ctx, jobID)
	})
	svc.workerLifecycle = domainworkers.NewWorkerLifecycleService(workerStoreAdapter{store: store}, func() time.Time { return svc.now() }, DefaultLeaseSeconds*time.Second)
	svc.simulationInputs = NewSimulationInputService(store, store, store, validator, func() time.Time { return svc.now() })
	svc.draftWorkflows = NewDraftWorkflowService(store, validator, func() time.Time { return svc.now() }, func(ctx context.Context, bytes []byte) (JobSnapshot, int, error) {
		return svc.CreateSimulationCheck(ctx, bytes)
	})
	svc.resultExplanations = NewResultExplanationService(store, store, validator, func() time.Time { return svc.now() }, func(ctx context.Context, jobID, evidenceRef string) (EvidenceReferenceResolution, error) {
		return svc.ResolveEvidenceReference(ctx, jobID, evidenceRef)
	})
	svc.modelGovernance = NewModelGovernanceService(store, validator, func() time.Time { return svc.now() }, func(ctx context.Context, inputRef map[string]any, sourceSystem, requestedBy, jobType string) (map[string]any, error) {
		return svc.simulationInputs.ResolveSimulationInput(ctx, inputRef, sourceSystem, requestedBy, jobType)
	}, func(ctx context.Context, bytes []byte, idempotencyKey string) (JobSnapshot, int, error) {
		return svc.CreateJob(ctx, bytes, idempotencyKey)
	}, func(ctx context.Context, jobID, evidenceRef string) (EvidenceReferenceResolution, error) {
		return svc.ResolveEvidenceReference(ctx, jobID, evidenceRef)
	})
	svc.evidenceGovernance = NewEvidenceGovernanceService(store, validator, func() time.Time { return svc.now() }, func(ctx context.Context) (ModelCatalogResponse, error) {
		return svc.modelGovernance.ModelCatalog(ctx)
	}, func(ctx context.Context, jobID string) ([]ArtifactRecord, error) {
		return svc.artifactLifecycle.ListJobArtifacts(ctx, jobID)
	}, func(ctx context.Context, artifactID string) (ArtifactRecord, error) {
		return svc.artifactLifecycle.ArtifactMetadata(ctx, artifactID)
	})
	svc.metricsSnapshot = NewMetricsService(store, func() time.Time { return svc.now() })
	return svc
}

func (svc *Service) CreateJob(ctx context.Context, bytes []byte, headerIdempotencyKey string) (JobSnapshot, int, error) {
	return svc.jobLifecycle.CreateJob(ctx, bytes, headerIdempotencyKey)
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
	simulationInput, err := svc.simulationInputs.ResolveSimulationInput(ctx, inputRef, sourceSystem, requestedBy, jobType)
	if err != nil {
		return JobSnapshot{}, 0, err
	}
	if stringValue(simulationInput, "job_type") != "" && stringValue(simulationInput, "job_type") != jobType {
		return JobSnapshot{}, 0, ValidationError("simulation_request job_type must match simulation_input job_type")
	}

	metadata := mapValue(request, "metadata")
	externalRefs := mapValue(request, "external_refs")
	jobDocument := domainsimulation.BuildSimulationCheckJobDocument(domainsimulation.SimulationCheckJobInput{
		RequestID:       requestID,
		JobType:         jobType,
		SourceSystem:    sourceSystem,
		RequestedBy:     requestedBy,
		InputRef:        inputRef,
		SimulationInput: simulationInput,
		Metadata:        metadata,
		ExternalRefs:    externalRefs,
		CreatedAt:       svc.now().Format(time.RFC3339Nano),
	})
	jobBytes, err := json.Marshal(jobDocument.Job)
	if err != nil {
		return JobSnapshot{}, 0, err
	}
	return svc.CreateJob(ctx, jobBytes, jobDocument.IdempotencyKey)
}

func (svc *Service) ScheduleBenchmarkCaseRun(ctx context.Context, modelKey, modelVersion, benchmarkCaseID string, request BenchmarkCaseRunRequest, defaultSourceSystem, defaultRequestedBy string) (JobSnapshot, int, error) {
	return svc.modelGovernance.ScheduleBenchmarkCaseRun(ctx, modelKey, modelVersion, benchmarkCaseID, request, defaultSourceSystem, defaultRequestedBy)
}

func (svc *Service) RegisterSimulationInput(ctx context.Context, bytes []byte, defaultSourceSystem, defaultRequestedBy string) (SimulationInputRecord, int, error) {
	return svc.simulationInputs.RegisterSimulationInput(ctx, bytes, defaultSourceSystem, defaultRequestedBy)
}

func (svc *Service) GetSimulationInput(ctx context.Context, simulationInputID string) (SimulationInputRecord, error) {
	return svc.simulationInputs.GetSimulationInput(ctx, simulationInputID)
}

func (svc *Service) RegisterProcessGraph(ctx context.Context, bytes []byte, defaultSourceSystem, defaultRequestedBy string) (ProcessGraphRecord, int, error) {
	return svc.simulationInputs.RegisterProcessGraph(ctx, bytes, defaultSourceSystem, defaultRequestedBy)
}

func (svc *Service) GetProcessGraph(ctx context.Context, processGraphID string, version int) (ProcessGraphRecord, error) {
	return svc.simulationInputs.GetProcessGraph(ctx, processGraphID, version)
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

func (svc *Service) Result(ctx context.Context, jobID string) (map[string]any, error) {
	return svc.evidenceGovernance.Result(ctx, jobID)
}

func (svc *Service) EvidencePackage(ctx context.Context, jobID string) (map[string]any, string, error) {
	return svc.evidenceGovernance.EvidencePackage(ctx, jobID)
}

func (svc *Service) ProductionReadiness(ctx context.Context, jobID string) (ProductionReadinessReport, error) {
	return svc.evidenceGovernance.ProductionReadiness(ctx, jobID)
}

func (svc *Service) ResolveEvidenceReference(ctx context.Context, jobID, evidenceRef string) (EvidenceReferenceResolution, error) {
	return svc.evidenceGovernance.ResolveEvidenceReference(ctx, jobID, evidenceRef)
}

func (svc *Service) CancelJob(ctx context.Context, jobID string) (JobSnapshot, error) {
	return svc.jobLifecycle.CancelJob(ctx, jobID)
}

func (svc *Service) RegisterWorker(ctx context.Context, request map[string]any) (WorkerRecord, error) {
	return svc.workerLifecycle.RegisterWorker(ctx, request)
}

func (svc *Service) Claim(ctx context.Context, workerID string) (map[string]any, error) {
	return svc.workerLifecycle.Claim(ctx, workerID)
}

func (svc *Service) Heartbeat(ctx context.Context, workerID, jobID string) (map[string]any, error) {
	return svc.workerLifecycle.Heartbeat(ctx, workerID, jobID)
}

func (svc *Service) UploadArtifact(ctx context.Context, workerID, jobID string, metadataText string, file multipart.File) (ArtifactRecord, error) {
	return svc.artifactLifecycle.UploadArtifact(ctx, workerID, jobID, metadataText, file)
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

func (svc *Service) RegisterModelCatalog(ctx context.Context, bytes []byte, defaultSourceSystem, defaultRequestedBy string) (ModelCatalogRecord, int, error) {
	return svc.modelGovernance.RegisterModelCatalog(ctx, bytes, defaultSourceSystem, defaultRequestedBy)
}

func (svc *Service) ModelCatalog(ctx context.Context) (ModelCatalogResponse, error) {
	return svc.modelGovernance.ModelCatalog(ctx)
}

func (svc *Service) ModelCatalogModel(ctx context.Context, modelKey string) (ModelCatalogModel, error) {
	return svc.modelGovernance.ModelCatalogModel(ctx, modelKey)
}

func (svc *Service) ListModelCatalogSnapshots(ctx context.Context, filter ModelCatalogSnapshotFilter) (ListModelCatalogSnapshotsResponse, error) {
	return svc.modelGovernance.ListModelCatalogSnapshots(ctx, filter)
}

func (svc *Service) UpdateDefaultParameterSetStatus(ctx context.Context, modelKey, modelVersion string, request ParameterSetStatusUpdateRequest, defaultSourceSystem, defaultRequestedBy string) (ModelParameterSetTransitionResponse, int, error) {
	return svc.modelGovernance.UpdateDefaultParameterSetStatus(ctx, modelKey, modelVersion, request, defaultSourceSystem, defaultRequestedBy)
}

func (svc *Service) DefaultParameterSetPromotionPlan(ctx context.Context, modelKey, modelVersion string) (ModelParameterSetPromotionPlan, error) {
	return svc.modelGovernance.DefaultParameterSetPromotionPlan(ctx, modelKey, modelVersion)
}

func (svc *Service) PromoteDefaultParameterSetToApproved(ctx context.Context, modelKey, modelVersion string, request ParameterSetPromotionRequest, defaultSourceSystem, defaultRequestedBy string) (ModelParameterSetTransitionResponse, int, error) {
	return svc.modelGovernance.PromoteDefaultParameterSetToApproved(ctx, modelKey, modelVersion, request, defaultSourceSystem, defaultRequestedBy)
}

func (svc *Service) RegisterBenchmarkRun(ctx context.Context, bytes []byte, defaultSourceSystem, defaultRequestedBy string) (BenchmarkRunRecord, int, error) {
	return svc.modelGovernance.RegisterBenchmarkRun(ctx, bytes, defaultSourceSystem, defaultRequestedBy)
}

func (svc *Service) GetBenchmarkRun(ctx context.Context, benchmarkRunID string) (BenchmarkRunRecord, error) {
	return svc.modelGovernance.GetBenchmarkRun(ctx, benchmarkRunID)
}

func (svc *Service) ListBenchmarkRuns(ctx context.Context, filter BenchmarkRunFilter) (ListBenchmarkRunsResponse, error) {
	return svc.modelGovernance.ListBenchmarkRuns(ctx, filter)
}

func (svc *Service) GetModelRun(ctx context.Context, modelRunID string) (json.RawMessage, error) {
	return svc.modelGovernance.GetModelRun(ctx, modelRunID)
}

func (svc *Service) ListModelRuns(ctx context.Context, filter ModelRunFilter) (ListModelRunsResponse, error) {
	return svc.modelGovernance.ListModelRuns(ctx, filter)
}

func (svc *Service) ValidateContractDocument(bytes []byte) (ContractValidationResponse, error) {
	return validateContractDocument(bytes, svc.validator)
}

func (svc *Service) ConfirmDraftDocument(ctx context.Context, bytes []byte, defaultSourceSystem, defaultRequestedBy string) (ContractValidationResponse, error) {
	return svc.draftWorkflows.ConfirmDraftDocument(ctx, bytes, defaultSourceSystem, defaultRequestedBy)
}

func (svc *Service) GetDraftConfirmation(ctx context.Context, confirmationID string) (DraftConfirmationRecord, error) {
	return svc.draftWorkflows.GetDraftConfirmation(ctx, confirmationID)
}

func (svc *Service) ConstraintApplicationPlan(ctx context.Context, confirmationID string) (ConstraintApplicationPlan, error) {
	return svc.draftWorkflows.ConstraintApplicationPlan(ctx, confirmationID)
}

func (svc *Service) SubmitResultExplanation(ctx context.Context, jobID string, bytes []byte, defaultSourceSystem, defaultRequestedBy string) (ResultExplanationRecord, int, error) {
	return svc.resultExplanations.SubmitResultExplanation(ctx, jobID, bytes, defaultSourceSystem, defaultRequestedBy)
}

func (svc *Service) GetResultExplanation(ctx context.Context, jobID, explanationID string) (ResultExplanationRecord, error) {
	return svc.resultExplanations.GetResultExplanation(ctx, jobID, explanationID)
}

func (svc *Service) ReviewResultExplanation(ctx context.Context, jobID, explanationID string, request ResultExplanationReviewRequest, reviewer string) (ResultExplanationRecord, error) {
	return svc.resultExplanations.ReviewResultExplanation(ctx, jobID, explanationID, request, reviewer)
}

func (svc *Service) PublishResultExplanation(ctx context.Context, jobID, explanationID, publisher string) (ResultExplanationRecord, error) {
	return svc.resultExplanations.PublishResultExplanation(ctx, jobID, explanationID, publisher)
}

func (svc *Service) PromoteDraftConfirmationToSimulationCheck(ctx context.Context, confirmationID string) (JobSnapshot, int, error) {
	return svc.draftWorkflows.PromoteDraftConfirmationToSimulationCheck(ctx, confirmationID)
}

func (svc *Service) ArtifactMetadata(ctx context.Context, artifactID string) (ArtifactRecord, error) {
	return svc.artifactLifecycle.ArtifactMetadata(ctx, artifactID)
}

func (svc *Service) DownloadArtifact(ctx context.Context, artifactID string) (ArtifactRecord, []byte, error) {
	return svc.artifactLifecycle.DownloadArtifact(ctx, artifactID)
}

func (svc *Service) SweepArtifactRetention(ctx context.Context, options ArtifactRetentionSweepOptions) (ArtifactRetentionSweepReport, error) {
	return svc.artifactLifecycle.SweepArtifactRetention(ctx, options)
}

func (svc *Service) Metrics(ctx context.Context) (MetricsSnapshot, error) {
	return svc.metricsSnapshot.Metrics(ctx)
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

func findBenchmarkCase(version ModelCatalogVersion, benchmarkCaseID string) (ModelBenchmarkCase, bool) {
	for _, benchmarkCase := range version.BenchmarkCases {
		if benchmarkCase.BenchmarkCaseID == benchmarkCaseID {
			return benchmarkCase, true
		}
	}
	return ModelBenchmarkCase{}, false
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

func sliceFromAny(value any) []any {
	items, ok := value.([]any)
	if !ok {
		return nil
	}
	return items
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

func boolValue(value map[string]any, key string) bool {
	raw, ok := value[key]
	if !ok || raw == nil {
		return false
	}
	boolean, ok := raw.(bool)
	return ok && boolean
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
	parameters := map[string]any{
		"hours":          4,
		"steps_per_hour": 60,
	}
	parameterHash, _ := ResultHash(parameters)
	document := domainmodels.BuiltInModelCatalogDocument(generatedAt, parameterHash)
	bytes, _ := json.Marshal(document)
	var catalog ModelCatalogResponse
	_ = json.Unmarshal(bytes, &catalog)
	return catalog
}

func defaultString(value, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return value
}

func uniqueStrings(values []string) []string {
	seen := map[string]bool{}
	result := make([]string, 0, len(values))
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" || seen[value] {
			continue
		}
		seen[value] = true
		result = append(result, value)
	}
	sort.Strings(result)
	return result
}
