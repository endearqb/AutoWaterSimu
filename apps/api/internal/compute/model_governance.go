package compute

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	domainmodels "autowatersimu/apps/api/internal/domain/models"
	domainsimulation "autowatersimu/apps/api/internal/domain/simulation"
)

type SimulationInputResolver func(context.Context, map[string]any, string, string, string) (map[string]any, error)
type ComputeJobCreator func(context.Context, []byte, string) (JobSnapshot, int, error)

type ModelGovernanceService struct {
	catalogs                 ModelCatalogStore
	benchmarkRuns            BenchmarkRunStore
	modelRuns                ModelRunStore
	validator                *ContractValidator
	now                      func() time.Time
	resolveSimulationInput   SimulationInputResolver
	createJob                ComputeJobCreator
	resolveEvidenceReference EvidenceReferenceResolver
}

type ModelGovernanceStores interface {
	ModelCatalogStore
	BenchmarkRunStore
	ModelRunStore
}

func NewModelGovernanceService(stores ModelGovernanceStores, validator *ContractValidator, now func() time.Time, resolveSimulationInput SimulationInputResolver, createJob ComputeJobCreator, resolveEvidenceReference EvidenceReferenceResolver) *ModelGovernanceService {
	if now == nil {
		now = func() time.Time { return time.Now().UTC() }
	}
	return &ModelGovernanceService{
		catalogs:                 stores,
		benchmarkRuns:            stores,
		modelRuns:                stores,
		validator:                validator,
		now:                      now,
		resolveSimulationInput:   resolveSimulationInput,
		createJob:                createJob,
		resolveEvidenceReference: resolveEvidenceReference,
	}
}

func (svc *ModelGovernanceService) ScheduleBenchmarkCaseRun(ctx context.Context, modelKey, modelVersion, benchmarkCaseID string, request BenchmarkCaseRunRequest, defaultSourceSystem, defaultRequestedBy string) (JobSnapshot, int, error) {
	modelKey = required(modelKey, "model_key")
	modelVersion = required(modelVersion, "model_version")
	benchmarkCaseID = required(benchmarkCaseID, "benchmark_case_id")
	catalog, err := svc.ModelCatalog(ctx)
	if err != nil {
		return JobSnapshot{}, 0, err
	}
	modelIndex, versionIndex := findModelVersionIndex(catalog, modelKey, modelVersion)
	if modelIndex < 0 || versionIndex < 0 {
		return JobSnapshot{}, 0, NotFound("MODEL_NOT_FOUND", "model version not found")
	}
	version := catalog.Models[modelIndex].Versions[versionIndex]
	if version.Status != domainmodels.ModelVersionStatusActive {
		return JobSnapshot{}, 0, Conflict(CodeParameterSetTransitionFailed, "benchmark case run requires an active model version")
	}
	benchmarkCase, ok := findBenchmarkCase(version, benchmarkCaseID)
	if !ok {
		return JobSnapshot{}, 0, NotFound("BENCHMARK_CASE_NOT_FOUND", "benchmark case not found")
	}
	if benchmarkCase.Status != domainmodels.BenchmarkCaseStatusValidated {
		return JobSnapshot{}, 0, Conflict("BENCHMARK_CASE_NOT_VALIDATED", "benchmark case must be validated before scheduling runs")
	}
	parameterSet := version.DefaultParameterSet
	if parameterSet == nil {
		return JobSnapshot{}, 0, NotFound(CodeParameterSetNotFound, "default parameter set not found")
	}
	if parameterSet.Status == domainmodels.ParameterSetStatusRetired {
		return JobSnapshot{}, 0, Conflict(CodeParameterSetTransitionFailed, "retired parameter sets cannot be benchmarked")
	}
	execution := domainsimulation.ExecutionProfile(benchmarkCase.JobType)
	if len(sliceFromAny(execution["required_capabilities"])) == 0 {
		return JobSnapshot{}, 0, ValidationError("benchmark_case job_type is unsupported")
	}
	sourceSystem := defaultString(request.SourceSystem, defaultString(defaultSourceSystem, "compute-api"))
	requestedBy := defaultString(request.RequestedBy, defaultString(defaultRequestedBy, "unknown"))
	if svc.resolveSimulationInput == nil {
		return JobSnapshot{}, 0, NewAppError(500, CodeInternal, "simulation input resolver is not configured", true, nil)
	}
	simulationInput, err := svc.resolveSimulationInput(ctx, benchmarkCase.InputRef, sourceSystem, requestedBy, benchmarkCase.JobType)
	if err != nil {
		return JobSnapshot{}, 0, err
	}
	if stringValue(simulationInput, "job_type") != "" && stringValue(simulationInput, "job_type") != benchmarkCase.JobType {
		return JobSnapshot{}, 0, ValidationError("benchmark_case job_type must match simulation_input job_type")
	}
	requestID := defaultString(request.RequestID, "bench_req_"+safeIDPart(modelKey)+"_"+safeIDPart(modelVersion)+"_"+safeIDPart(benchmarkCaseID)+"_"+svc.now().Format("20060102150405"))
	jobID := defaultString(request.JobID, "job_benchmark_"+safeIDPart(requestID))
	idempotencyKey := defaultString(request.IdempotencyKey, "benchmark:"+requestID)
	traceID := defaultString(request.TraceID, "trace_benchmark_"+safeIDPart(requestID))
	metadata := copyStringAnyMap(request.Metadata)
	metadata["source"] = "model_catalog_benchmark_case"
	metadata["model_key"] = modelKey
	metadata["model_version"] = modelVersion
	metadata["benchmark_case_id"] = benchmarkCaseID
	metadata["parameter_set_id"] = parameterSet.ParameterSetID
	metadata["parameter_hash"] = parameterSet.ParameterHash
	metadata["parameter_set_status"] = parameterSet.Status
	metadata["expected_metrics"] = benchmarkCase.ExpectedMetrics
	metadata["tolerance"] = benchmarkCase.Tolerance
	metadata["input_ref"] = benchmarkCase.InputRef
	metadata["benchmark_run_required"] = true
	jobContext := map[string]any{
		"source_system": sourceSystem,
		"requested_by":  requestedBy,
		"trace_id":      traceID,
	}
	for _, key := range []string{"tenant_id", "project_id", "site_id"} {
		if value := stringValue(request.Metadata, key); value != "" {
			jobContext[key] = value
		}
	}
	job := map[string]any{
		"schema_version":  "compute_job.v1",
		"job_id":          jobID,
		"job_type":        benchmarkCase.JobType,
		"queue":           "simulation",
		"request_id":      requestID,
		"idempotency_key": idempotencyKey,
		"payload":         simulationInput,
		"context":         jobContext,
		"execution":       execution,
		"created_at":      svc.now().Format(time.RFC3339Nano),
		"metadata":        metadata,
	}
	jobBytes, err := json.Marshal(job)
	if err != nil {
		return JobSnapshot{}, 0, err
	}
	if svc.createJob == nil {
		return JobSnapshot{}, 0, NewAppError(500, CodeInternal, "compute job creator is not configured", true, nil)
	}
	return svc.createJob(ctx, jobBytes, idempotencyKey)
}

func (svc *ModelGovernanceService) RegisterModelCatalog(ctx context.Context, bytes []byte, defaultSourceSystem, defaultRequestedBy string) (ModelCatalogRecord, int, error) {
	var catalog map[string]any
	if err := json.Unmarshal(bytes, &catalog); err != nil {
		return ModelCatalogRecord{}, 0, ValidationError("model_catalog JSON is invalid")
	}
	record, err := svc.modelCatalogRecord(catalog, defaultSourceSystem, defaultRequestedBy)
	if err != nil {
		return ModelCatalogRecord{}, 0, err
	}
	stored, created, err := svc.catalogs.UpsertModelCatalog(ctx, record)
	if err != nil {
		return ModelCatalogRecord{}, 0, err
	}
	if !created {
		return stored, http.StatusOK, nil
	}
	return stored, http.StatusCreated, nil
}

func (svc *ModelGovernanceService) ModelCatalog(ctx context.Context) (ModelCatalogResponse, error) {
	record, err := svc.catalogs.LatestModelCatalog(ctx, "default")
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

func (svc *ModelGovernanceService) ModelCatalogModel(ctx context.Context, modelKey string) (ModelCatalogModel, error) {
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

func (svc *ModelGovernanceService) ListModelCatalogSnapshots(ctx context.Context, filter ModelCatalogSnapshotFilter) (ListModelCatalogSnapshotsResponse, error) {
	filter.CatalogID = defaultString(filter.CatalogID, "default")
	records, next, total, err := svc.catalogs.ListModelCatalogSnapshots(ctx, filter)
	if err != nil {
		return ListModelCatalogSnapshotsResponse{}, err
	}
	return ListModelCatalogSnapshotsResponse{
		Items:         records,
		NextCursor:    next,
		TotalEstimate: total,
	}, nil
}

func (svc *ModelGovernanceService) UpdateDefaultParameterSetStatus(ctx context.Context, modelKey, modelVersion string, request ParameterSetStatusUpdateRequest, defaultSourceSystem, defaultRequestedBy string) (ModelParameterSetTransitionResponse, int, error) {
	modelKey = required(modelKey, "model_key")
	modelVersion = required(modelVersion, "model_version")
	toStatus := strings.TrimSpace(request.ToStatus)
	if !domainmodels.IsParameterSetStatus(toStatus) {
		return ModelParameterSetTransitionResponse{}, 0, ValidationError("to_status must be one of draft, candidate, validated, approved, retired")
	}
	if request.FromStatus != "" && !domainmodels.IsParameterSetStatus(request.FromStatus) {
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
	if !domainmodels.CanTransitionParameterSetStatus(fromStatus, toStatus) {
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
	stored, created, err := svc.catalogs.UpsertModelCatalog(ctx, record)
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

func (svc *ModelGovernanceService) DefaultParameterSetPromotionPlan(ctx context.Context, modelKey, modelVersion string) (ModelParameterSetPromotionPlan, error) {
	modelKey = required(modelKey, "model_key")
	modelVersion = required(modelVersion, "model_version")
	catalog, err := svc.ModelCatalog(ctx)
	if err != nil {
		return ModelParameterSetPromotionPlan{}, err
	}
	modelIndex, versionIndex := findModelVersionIndex(catalog, modelKey, modelVersion)
	if modelIndex < 0 || versionIndex < 0 {
		return ModelParameterSetPromotionPlan{}, NotFound("MODEL_NOT_FOUND", "model version not found")
	}
	version := catalog.Models[modelIndex].Versions[versionIndex]
	parameterSet := version.DefaultParameterSet
	if parameterSet == nil {
		return ModelParameterSetPromotionPlan{}, NotFound(CodeParameterSetNotFound, "default parameter set not found")
	}
	plan := ModelParameterSetPromotionPlan{
		SchemaVersion:              "parameter_set_promotion_plan.v1",
		ModelKey:                   modelKey,
		ModelVersion:               modelVersion,
		ParameterSetID:             parameterSet.ParameterSetID,
		ParameterHash:              parameterSet.ParameterHash,
		CurrentStatus:              parameterSet.Status,
		TargetStatus:               domainmodels.ParameterSetStatusApproved,
		WouldModifyCatalog:         false,
		ProductionApprovalRequired: true,
		BlockingReasons:            []string{},
		CaseResults:                []BenchmarkCasePromotionResult{},
	}

	validatedCases := make([]ModelBenchmarkCase, 0, len(version.BenchmarkCases))
	for _, benchmarkCase := range version.BenchmarkCases {
		if benchmarkCase.Status == domainmodels.BenchmarkCaseStatusValidated {
			validatedCases = append(validatedCases, benchmarkCase)
		}
	}
	plan.BenchmarkCasesChecked = len(validatedCases)
	for _, benchmarkCase := range validatedCases {
		result, err := svc.benchmarkCasePromotionResult(ctx, benchmarkCase, modelKey, modelVersion, *parameterSet)
		if err != nil {
			return ModelParameterSetPromotionPlan{}, err
		}
		if result.Ready {
			plan.BenchmarkCasesPassed++
		}
		plan.CaseResults = append(plan.CaseResults, result)
		plan.BlockingReasons = append(plan.BlockingReasons, result.BlockingReasons...)
	}
	gate := domainmodels.EvaluateParameterSetPromotionGate(domainmodels.ParameterSetPromotionGateInput{
		ModelVersionStatus:    version.Status,
		ParameterSetStatus:    parameterSet.Status,
		BenchmarkCasesChecked: plan.BenchmarkCasesChecked,
		BenchmarkCasesPassed:  plan.BenchmarkCasesPassed,
		BlockingReasons:       plan.BlockingReasons,
	})
	plan.BlockingReasons = gate.BlockingReasons
	plan.CanPromoteToApproved = gate.CanPromoteToApproved
	return plan, nil
}

func (svc *ModelGovernanceService) PromoteDefaultParameterSetToApproved(ctx context.Context, modelKey, modelVersion string, request ParameterSetPromotionRequest, defaultSourceSystem, defaultRequestedBy string) (ModelParameterSetTransitionResponse, int, error) {
	plan, err := svc.DefaultParameterSetPromotionPlan(ctx, modelKey, modelVersion)
	if err != nil {
		return ModelParameterSetTransitionResponse{}, 0, err
	}
	if request.ParameterSetID != "" && strings.TrimSpace(request.ParameterSetID) != plan.ParameterSetID {
		return ModelParameterSetTransitionResponse{}, 0, NotFound(CodeParameterSetNotFound, "parameter set not found")
	}
	if !plan.CanPromoteToApproved {
		return ModelParameterSetTransitionResponse{}, 0, NewAppError(
			http.StatusConflict,
			CodeParameterSetTransitionFailed,
			"default parameter set is not ready for benchmark-backed promotion",
			false,
			map[string]any{
				"blocking_reasons": plan.BlockingReasons,
				"current_status":   plan.CurrentStatus,
				"parameter_set_id": plan.ParameterSetID,
			},
		)
	}
	metadata := copyStringAnyMap(request.Metadata)
	metadata["promotion_source"] = "default_parameter_set_promotion_plan"
	metadata["promotion_plan_verified_at"] = svc.now().Format(time.RFC3339Nano)
	metadata["benchmark_cases_checked"] = plan.BenchmarkCasesChecked
	metadata["benchmark_cases_passed"] = plan.BenchmarkCasesPassed
	metadata["case_results"] = plan.CaseResults
	return svc.UpdateDefaultParameterSetStatus(ctx, modelKey, modelVersion, ParameterSetStatusUpdateRequest{
		ParameterSetID: plan.ParameterSetID,
		FromStatus:     plan.CurrentStatus,
		ToStatus:       domainmodels.ParameterSetStatusApproved,
		Reason:         defaultString(request.Reason, "benchmark-backed promotion"),
		Metadata:       metadata,
	}, defaultSourceSystem, defaultRequestedBy)
}

func (svc *ModelGovernanceService) RegisterBenchmarkRun(ctx context.Context, bytes []byte, defaultSourceSystem, defaultRequestedBy string) (BenchmarkRunRecord, int, error) {
	var document map[string]any
	if err := json.Unmarshal(bytes, &document); err != nil {
		return BenchmarkRunRecord{}, 0, ValidationError("benchmark_run JSON is invalid")
	}
	record, err := svc.benchmarkRunRecord(ctx, document, defaultSourceSystem, defaultRequestedBy)
	if err != nil {
		return BenchmarkRunRecord{}, 0, err
	}
	stored, created, err := svc.benchmarkRuns.UpsertBenchmarkRun(ctx, record)
	if err != nil {
		return BenchmarkRunRecord{}, 0, err
	}
	if !created {
		return stored, http.StatusOK, nil
	}
	return stored, http.StatusCreated, nil
}

func (svc *ModelGovernanceService) GetBenchmarkRun(ctx context.Context, benchmarkRunID string) (BenchmarkRunRecord, error) {
	record, err := svc.benchmarkRuns.FindBenchmarkRun(ctx, required(benchmarkRunID, "benchmark_run_id"))
	if err != nil {
		return BenchmarkRunRecord{}, err
	}
	return *record, nil
}

func (svc *ModelGovernanceService) ListBenchmarkRuns(ctx context.Context, filter BenchmarkRunFilter) (ListBenchmarkRunsResponse, error) {
	items, next, total, err := svc.benchmarkRuns.ListBenchmarkRuns(ctx, filter)
	if err != nil {
		return ListBenchmarkRunsResponse{}, err
	}
	return ListBenchmarkRunsResponse{Items: items, NextCursor: next, TotalEstimate: total}, nil
}

func (svc *ModelGovernanceService) GetModelRun(ctx context.Context, modelRunID string) (json.RawMessage, error) {
	return svc.modelRuns.FindModelRun(ctx, required(modelRunID, "model_run_id"))
}

func (svc *ModelGovernanceService) ListModelRuns(ctx context.Context, filter ModelRunFilter) (ListModelRunsResponse, error) {
	modelRuns, next, total, err := svc.modelRuns.ListModelRuns(ctx, filter)
	if err != nil {
		return ListModelRunsResponse{}, err
	}
	return ListModelRunsResponse{
		Items:         rawMessagesOrEmpty(modelRuns),
		NextCursor:    next,
		TotalEstimate: total,
	}, nil
}

func (svc *ModelGovernanceService) benchmarkCasePromotionResult(ctx context.Context, benchmarkCase ModelBenchmarkCase, modelKey, modelVersion string, parameterSet ModelParameterSet) (BenchmarkCasePromotionResult, error) {
	result := BenchmarkCasePromotionResult{
		BenchmarkCaseID:      benchmarkCase.BenchmarkCaseID,
		CaseStatus:           benchmarkCase.Status,
		BlockingReasons:      []string{},
		ParameterHashMatches: false,
		Ready:                false,
	}
	records, _, _, err := svc.benchmarkRuns.ListBenchmarkRuns(ctx, BenchmarkRunFilter{
		Limit:           1,
		ModelKey:        modelKey,
		ModelVersion:    modelVersion,
		BenchmarkCaseID: benchmarkCase.BenchmarkCaseID,
		ParameterSetID:  parameterSet.ParameterSetID,
	})
	if err != nil {
		return BenchmarkCasePromotionResult{}, err
	}
	if len(records) == 0 {
		result.BlockingReasons = append(result.BlockingReasons, "benchmark_run_missing_for_parameter_set")
		return result, nil
	}
	record := records[0]
	result.LatestBenchmarkRunID = record.BenchmarkRunID
	result.LatestBenchmarkRunStatus = record.Status
	result.ModelRunID = record.ModelRunID
	result.JobID = record.JobID
	result.ExecutedAt = record.ExecutedAt.Format(time.RFC3339Nano)
	if record.Status != domainmodels.BenchmarkRunStatusPassed {
		result.BlockingReasons = append(result.BlockingReasons, "latest_benchmark_run_not_passed")
	}
	result.EvidenceRefCount = len(domainmodels.BenchmarkRunEvidenceRefsFromRaw(record.Payload))
	modelRun, err := svc.modelRuns.FindModelRun(ctx, record.ModelRunID)
	if err != nil {
		if appErr := ToAppError(err); appErr.ErrorCode == CodeModelRunNotFound {
			result.BlockingReasons = append(result.BlockingReasons, "model_run_not_found")
			return result, nil
		}
		return BenchmarkCasePromotionResult{}, err
	}
	runIdentity, err := domainmodels.RunIdentityFromRaw(modelRun)
	if err != nil {
		result.BlockingReasons = append(result.BlockingReasons, "model_run_payload_invalid")
		return result, nil
	}
	identityCheck := domainmodels.CheckRunIdentity(runIdentity, domainmodels.RunIdentityExpectation{
		JobID:         record.JobID,
		ModelKey:      modelKey,
		ModelVersion:  modelVersion,
		ParameterHash: parameterSet.ParameterHash,
	})
	result.ParameterHash = runIdentity.ParameterHash
	result.ParameterHashMatches = identityCheck.ParameterHashMatches
	result.BlockingReasons = append(result.BlockingReasons, identityCheck.BlockingReasons...)
	result.BlockingReasons = uniqueStrings(result.BlockingReasons)
	result.Ready = record.Status == domainmodels.BenchmarkRunStatusPassed && result.ParameterHashMatches && len(result.BlockingReasons) == 0
	return result, nil
}

func (svc *ModelGovernanceService) benchmarkRunRecord(ctx context.Context, document map[string]any, defaultSourceSystem, defaultRequestedBy string) (BenchmarkRunRecord, error) {
	if svc.validator != nil {
		if err := svc.validator.Validate("benchmark_run.v1.json", document); err != nil {
			return BenchmarkRunRecord{}, err
		}
	}
	modelKey := required(stringValue(document, "model_key"), "model_key")
	modelVersion := required(stringValue(document, "model_version"), "model_version")
	benchmarkCaseID := required(stringValue(document, "benchmark_case_id"), "benchmark_case_id")
	parameterSetID := required(stringValue(document, "parameter_set_id"), "parameter_set_id")
	modelRunID := required(stringValue(document, "model_run_id"), "model_run_id")
	jobID := required(stringValue(document, "job_id"), "job_id")

	catalog, err := svc.ModelCatalog(ctx)
	if err != nil {
		return BenchmarkRunRecord{}, err
	}
	modelIndex, versionIndex := findModelVersionIndex(catalog, modelKey, modelVersion)
	if modelIndex < 0 || versionIndex < 0 {
		return BenchmarkRunRecord{}, NotFound("MODEL_NOT_FOUND", "model version not found")
	}
	version := catalog.Models[modelIndex].Versions[versionIndex]
	benchmarkCase, ok := findBenchmarkCase(version, benchmarkCaseID)
	if !ok {
		return BenchmarkRunRecord{}, NotFound("BENCHMARK_CASE_NOT_FOUND", "benchmark case not found")
	}
	if benchmarkCase.Status != domainmodels.BenchmarkCaseStatusValidated {
		return BenchmarkRunRecord{}, Conflict("BENCHMARK_CASE_NOT_VALIDATED", "benchmark case must be validated before recording runs")
	}
	if version.DefaultParameterSet == nil || version.DefaultParameterSet.ParameterSetID != parameterSetID {
		return BenchmarkRunRecord{}, NotFound(CodeParameterSetNotFound, "parameter set not found")
	}

	modelRun, err := svc.modelRuns.FindModelRun(ctx, modelRunID)
	if err != nil {
		return BenchmarkRunRecord{}, err
	}
	runIdentity, err := domainmodels.RunIdentityFromRaw(modelRun)
	if err != nil {
		return BenchmarkRunRecord{}, NewAppError(http.StatusInternalServerError, CodeInternal, "stored model_run JSON is invalid", true, nil)
	}
	identityCheck := domainmodels.CheckRunIdentity(runIdentity, domainmodels.RunIdentityExpectation{
		JobID:         jobID,
		ModelKey:      modelKey,
		ModelVersion:  modelVersion,
		ParameterHash: version.DefaultParameterSet.ParameterHash,
	})
	if !identityCheck.IdentityMatches {
		return BenchmarkRunRecord{}, ValidationError("benchmark_run model_run does not match job/model/version")
	}
	if !identityCheck.ParameterHashMatches {
		return BenchmarkRunRecord{}, Conflict(CodeParameterSetTransitionFailed, "benchmark_run model_run parameter_hash does not match parameter_set")
	}
	for _, ref := range domainmodels.BenchmarkRunEvidenceRefs(document) {
		if svc.resolveEvidenceReference == nil {
			return BenchmarkRunRecord{}, NewAppError(500, CodeInternal, "evidence reference resolver is not configured", true, nil)
		}
		if _, err := svc.resolveEvidenceReference(ctx, jobID, ref); err != nil {
			return BenchmarkRunRecord{}, ValidationError("benchmark_run evidence_ref is not resolvable within job: " + ref)
		}
	}
	executedAt, err := time.Parse(time.RFC3339Nano, required(stringValue(document, "executed_at"), "executed_at"))
	if err != nil {
		return BenchmarkRunRecord{}, ValidationError("benchmark_run.executed_at must be RFC3339")
	}
	payload := mustJSON(document)
	metadata := mapValue(document, "metadata")
	now := svc.now()
	return BenchmarkRunRecord{
		BenchmarkRunID:  required(stringValue(document, "benchmark_run_id"), "benchmark_run_id"),
		SchemaVersion:   "benchmark_run.v1",
		ModelKey:        modelKey,
		ModelVersion:    modelVersion,
		BenchmarkCaseID: benchmarkCaseID,
		ParameterSetID:  parameterSetID,
		ModelRunID:      modelRunID,
		JobID:           jobID,
		Status:          required(stringValue(document, "status"), "status"),
		PayloadHash:     "sha256:" + SHA256Hex(payload),
		Payload:         payload,
		SourceSystem:    defaultString(stringValue(metadata, "source_system"), defaultString(defaultSourceSystem, "compute-api")),
		RequestedBy:     defaultString(stringValue(document, "executed_by"), defaultString(defaultRequestedBy, "unknown")),
		TenantID:        stringValue(metadata, "tenant_id"),
		ProjectID:       stringValue(metadata, "project_id"),
		Metadata:        mustJSON(metadata),
		ExecutedAt:      executedAt.UTC(),
		CreatedAt:       now,
	}, nil
}

func (svc *ModelGovernanceService) validateModelCatalog(catalog ModelCatalogResponse) error {
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

func (svc *ModelGovernanceService) modelCatalogRecord(catalog map[string]any, defaultSourceSystem, defaultRequestedBy string) (ModelCatalogRecord, error) {
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
