package compute

import (
	"context"
	"encoding/json"
	"net/http"

	domainmodels "autowatersimu/apps/api/internal/domain/models"
)

func (svc *ModelGovernanceService) RegisterBenchmarkRun(ctx context.Context, bytes []byte, defaultSourceSystem, defaultRequestedBy string) (BenchmarkRunRecord, int, error) {
	var document map[string]any
	if err := json.Unmarshal(bytes, &document); err != nil {
		return BenchmarkRunRecord{}, 0, ValidationError("benchmark_run JSON is invalid")
	}
	record, err := svc.benchmarkRunRecord(ctx, document, defaultSourceSystem, defaultRequestedBy)
	if err != nil {
		return BenchmarkRunRecord{}, 0, err
	}
	audit := svc.benchmarkRunRegisteredAudit(ctx, record, len(domainmodels.BenchmarkRunEvidenceRefs(document)))
	stored, created, err := svc.benchmarkRuns.UpsertBenchmarkRun(ctx, record, audit)
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
	benchmarkCase, benchmarkCaseFound := findBenchmarkCase(version, benchmarkCaseID)
	defaultParameterSetID := ""
	if version.DefaultParameterSet != nil {
		defaultParameterSetID = version.DefaultParameterSet.ParameterSetID
	}
	admission := domainmodels.EvaluateBenchmarkRunAdmission(domainmodels.BenchmarkRunAdmissionInput{
		BenchmarkCaseFound:    benchmarkCaseFound,
		BenchmarkCaseStatus:   benchmarkCase.Status,
		DefaultParameterSetID: defaultParameterSetID,
		RequestedParameterSet: parameterSetID,
	})
	if !admission.BenchmarkCaseFound {
		return BenchmarkRunRecord{}, NotFound("BENCHMARK_CASE_NOT_FOUND", "benchmark case not found")
	}
	if !admission.BenchmarkCaseValidated {
		return BenchmarkRunRecord{}, Conflict("BENCHMARK_CASE_NOT_VALIDATED", "benchmark case must be validated before recording runs")
	}
	if !admission.ParameterSetMatches {
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
	recordData, err := domainmodels.BenchmarkRunRecordDataFromDocument(domainmodels.BenchmarkRunRecordDataInput{
		Document:            document,
		DefaultSourceSystem: defaultSourceSystem,
		DefaultRequestedBy:  defaultRequestedBy,
		CreatedAt:           svc.now(),
	})
	if err != nil {
		return BenchmarkRunRecord{}, ValidationError(err.Error())
	}
	return benchmarkRunRecordFromDomainData(recordData), nil
}

func benchmarkRunRecordFromDomainData(recordData domainmodels.BenchmarkRunRecordData) BenchmarkRunRecord {
	return BenchmarkRunRecord{
		BenchmarkRunID:  recordData.BenchmarkRunID,
		SchemaVersion:   recordData.SchemaVersion,
		ModelKey:        recordData.ModelKey,
		ModelVersion:    recordData.ModelVersion,
		BenchmarkCaseID: recordData.BenchmarkCaseID,
		ParameterSetID:  recordData.ParameterSetID,
		ModelRunID:      recordData.ModelRunID,
		JobID:           recordData.JobID,
		Status:          recordData.Status,
		PayloadHash:     recordData.PayloadHash,
		Payload:         recordData.Payload,
		SourceSystem:    recordData.SourceSystem,
		RequestedBy:     recordData.RequestedBy,
		TenantID:        recordData.TenantID,
		ProjectID:       recordData.ProjectID,
		Metadata:        recordData.Metadata,
		ExecutedAt:      recordData.ExecutedAt,
		CreatedAt:       recordData.CreatedAt,
	}
}
