package compute

import (
	"context"
	"net/http"
	"strings"
	"time"

	domainmodels "autowatersimu/apps/api/internal/domain/models"
)

func (svc *ModelGovernanceService) UpdateDefaultParameterSetStatus(ctx context.Context, modelKey, modelVersion string, request ParameterSetStatusUpdateRequest, defaultSourceSystem, defaultRequestedBy string) (ModelParameterSetTransitionResponse, int, error) {
	return svc.updateDefaultParameterSetStatus(ctx, modelKey, modelVersion, request, defaultSourceSystem, defaultRequestedBy, modelParameterSetStatusChangedEvent, "model.parameter_set.status_update")
}

func (svc *ModelGovernanceService) updateDefaultParameterSetStatus(ctx context.Context, modelKey, modelVersion string, request ParameterSetStatusUpdateRequest, defaultSourceSystem, defaultRequestedBy, auditEventType, auditAction string) (ModelParameterSetTransitionResponse, int, error) {
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
	beforeCatalogHash, err := ResultHash(catalog)
	if err != nil {
		return ModelParameterSetTransitionResponse{}, 0, err
	}
	if fromStatus == toStatus {
		return ModelParameterSetTransitionResponse{
			ModelKey:           modelKey,
			ModelVersion:       modelVersion,
			ParameterSetID:     parameterSet.ParameterSetID,
			FromStatus:         fromStatus,
			ToStatus:           toStatus,
			CatalogPayloadHash: beforeCatalogHash,
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
	audit := svc.parameterSetTransitionAudit(ctx, auditEventType, auditAction, modelKey, modelVersion, parameterSet.ParameterSetID, fromStatus, toStatus, beforeCatalogHash, record.PayloadHash, strings.TrimSpace(request.Reason), defaultString(defaultRequestedBy, "compute-api"), record.CreatedAt, true)
	stored, created, err := svc.catalogs.UpsertModelCatalog(ctx, record, audit)
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
	return svc.updateDefaultParameterSetStatus(ctx, modelKey, modelVersion, ParameterSetStatusUpdateRequest{
		ParameterSetID: plan.ParameterSetID,
		FromStatus:     plan.CurrentStatus,
		ToStatus:       domainmodels.ParameterSetStatusApproved,
		Reason:         defaultString(request.Reason, "benchmark-backed promotion"),
		Metadata:       metadata,
	}, defaultSourceSystem, defaultRequestedBy, modelParameterSetPromotedApprovedEvent, "model.parameter_set.promote_approved")
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
		result.BlockingReasons = append(result.BlockingReasons, domainmodels.PromotionBlockBenchmarkRunMissingForParameterSet)
		return result, nil
	}
	record := records[0]
	result.LatestBenchmarkRunID = record.BenchmarkRunID
	result.LatestBenchmarkRunStatus = record.Status
	result.ModelRunID = record.ModelRunID
	result.JobID = record.JobID
	result.ExecutedAt = record.ExecutedAt.Format(time.RFC3339Nano)
	result.EvidenceRefCount = len(domainmodels.BenchmarkRunEvidenceRefsFromRaw(record.Payload))
	modelRun, err := svc.modelRuns.FindModelRun(ctx, record.ModelRunID)
	if err != nil {
		if appErr := ToAppError(err); appErr.ErrorCode == CodeModelRunNotFound {
			result.BlockingReasons = append(result.BlockingReasons, domainmodels.PromotionBlockModelRunNotFound)
			readiness := domainmodels.EvaluateBenchmarkCasePromotionReadiness(domainmodels.BenchmarkCasePromotionReadinessInput{
				BenchmarkRunStatus:   record.Status,
				ParameterHashMatches: true,
				BlockingReasons:      result.BlockingReasons,
			})
			result.BlockingReasons = readiness.BlockingReasons
			result.Ready = readiness.Ready
			return result, nil
		}
		return BenchmarkCasePromotionResult{}, err
	}
	runIdentity, err := domainmodels.RunIdentityFromRaw(modelRun)
	if err != nil {
		result.BlockingReasons = append(result.BlockingReasons, domainmodels.PromotionBlockModelRunPayloadInvalid)
		readiness := domainmodels.EvaluateBenchmarkCasePromotionReadiness(domainmodels.BenchmarkCasePromotionReadinessInput{
			BenchmarkRunStatus:   record.Status,
			ParameterHashMatches: true,
			BlockingReasons:      result.BlockingReasons,
		})
		result.BlockingReasons = readiness.BlockingReasons
		result.Ready = readiness.Ready
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
	readiness := domainmodels.EvaluateBenchmarkCasePromotionReadiness(domainmodels.BenchmarkCasePromotionReadinessInput{
		BenchmarkRunStatus:   record.Status,
		ParameterHashMatches: result.ParameterHashMatches,
		BlockingReasons:      append(result.BlockingReasons, identityCheck.BlockingReasons...),
	})
	result.BlockingReasons = readiness.BlockingReasons
	result.Ready = readiness.Ready
	return result, nil
}
