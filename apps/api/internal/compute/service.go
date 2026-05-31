package compute

import (
	"context"
	"encoding/json"
	"mime/multipart"
	"sort"
	"strings"
	"time"

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
	traceID := defaultString(stringValue(metadata, "trace_id"), "trace_simcheck_"+safeIDPart(requestID))
	jobID := defaultString(stringValue(metadata, "job_id"), "job_simcheck_"+safeIDPart(requestID))
	idempotencyKey := defaultString(stringValue(metadata, "idempotency_key"), "simcheck:"+requestID)
	jobContext := map[string]any{
		"source_system": sourceSystem,
		"requested_by":  requestedBy,
		"trace_id":      traceID,
	}
	for _, key := range []string{"tenant_id", "project_id", "site_id"} {
		if value := stringValue(metadata, key); value != "" {
			jobContext[key] = value
		} else if key == "site_id" {
			if value := stringValue(externalRefs, key); value != "" {
				jobContext[key] = value
			}
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
		"execution":       domainsimulation.ExecutionProfile(jobType),
		"created_at":      svc.now().Format(time.RFC3339Nano),
		"metadata":        simulationCheckMetadata(requestID, inputRef, externalRefs),
	}
	jobBytes, err := json.Marshal(job)
	if err != nil {
		return JobSnapshot{}, 0, err
	}
	return svc.CreateJob(ctx, jobBytes, idempotencyKey)
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

func sliceFromAny(value any) []any {
	items, ok := value.([]any)
	if !ok {
		return nil
	}
	return items
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
	minZero := 0.0
	minOne := 1.0
	runtimeTemplates := func(hours float64) []ModelParameterTemplate {
		return []ModelParameterTemplate{
			{
				ParameterKey: "hours",
				DisplayName:  "Simulation horizon",
				Unit:         "h",
				ValueType:    "number",
				Required:     true,
				DefaultValue: hours,
				MinValue:     &minZero,
			},
			{
				ParameterKey: "steps_per_hour",
				DisplayName:  "Steps per hour",
				ValueType:    "integer",
				Required:     true,
				DefaultValue: 20,
				MinValue:     &minOne,
			},
			{
				ParameterKey: "tolerance",
				DisplayName:  "Solver tolerance",
				ValueType:    "number",
				Required:     true,
				DefaultValue: 0.000001,
				MinValue:     &minZero,
			},
		}
	}
	workerSmokeBenchmark := func(modelKey, displayName, jobType, inputID, fixture, modelRunID string) ModelBenchmarkCase {
		return ModelBenchmarkCase{
			BenchmarkCaseID: "bc_" + modelKey + "_independent_v1",
			DisplayName:     displayName,
			Description:     displayName + " contract fixture covered by the worker CLI smoke matrix.",
			JobType:         jobType,
			InputRef: map[string]any{
				"simulation_input_id": inputID,
				"fixture":             fixture,
			},
			ExpectedMetrics: map[string]any{
				"convergence_status": "completed",
				"total_steps":        11,
			},
			Tolerance: map[string]any{
				"relative": 0.000001,
				"absolute": 0.000001,
			},
			Status:       "validated",
			Source:       "worker_cli_smoke",
			EvidenceRefs: []string{"model_run:" + modelRunID},
		}
	}
	workerModel := func(modelKey, displayName, description, jobType, inputID, fixture, modelRunID string, hours float64) ModelCatalogModel {
		return ModelCatalogModel{
			ModelKey:          modelKey,
			DisplayName:       displayName,
			Description:       description,
			SupportedJobTypes: []string{jobType},
			Versions: []ModelCatalogVersion{
				{
					ModelVersion:       modelKey + ".v1",
					Status:             "active",
					Runtime:            "simulation-worker",
					ReleasedAt:         "2026-05-30T00:00:00Z",
					ParameterTemplates: runtimeTemplates(hours),
					BenchmarkCases: []ModelBenchmarkCase{
						workerSmokeBenchmark(modelKey, displayName+" independent smoke", jobType, inputID, fixture, modelRunID),
					},
					Metadata: map[string]any{
						"default_parameter_set": "not_defined",
						"parameter_hash_source": "worker_model_parameter_payload",
					},
				},
			},
		}
	}
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
			workerModel(
				"asm1slim",
				"ASM1 Slim",
				"Independent ASM1Slim model job type covered by the simulation worker smoke matrix.",
				"simulation.asm1slim.v1",
				"si_asm1slim_independent",
				"contracts/examples/valid/asm1slim_independent.simulation_input.v1.json",
				"mr_job_asm1slim_independent_asm1slim",
				1.0,
			),
			workerModel(
				"asm1",
				"ASM1",
				"Independent ASM1 model job type covered by the simulation worker smoke matrix.",
				"simulation.asm1.v1",
				"si_asm1_independent",
				"contracts/examples/valid/asm1_independent.simulation_input.v1.json",
				"mr_job_asm1_independent_asm1",
				0.5,
			),
			workerModel(
				"asm3",
				"ASM3",
				"Independent ASM3 model job type covered by the simulation worker smoke matrix.",
				"simulation.asm3.v1",
				"si_asm3_independent",
				"contracts/examples/valid/asm3_independent.simulation_input.v1.json",
				"mr_job_asm3_independent_asm3",
				0.5,
			),
			workerModel(
				"udm",
				"UDM",
				"Independent UDM model job type covered by the simulation worker smoke matrix.",
				"simulation.udm.v1",
				"si_udm_independent",
				"contracts/examples/valid/udm_independent.simulation_input.v1.json",
				"mr_job_udm_independent_udm",
				0.5,
			),
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
