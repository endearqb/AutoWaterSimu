package compute

import (
	"context"
	"encoding/json"
	"time"

	domainmodels "autowatersimu/apps/api/internal/domain/models"
	domainsimulation "autowatersimu/apps/api/internal/domain/simulation"
)

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
	benchmarkCase, benchmarkCaseFound := findBenchmarkCase(version, benchmarkCaseID)
	parameterSet := version.DefaultParameterSet
	parameterSetStatus := ""
	if parameterSet != nil {
		parameterSetStatus = parameterSet.Status
	}
	gate := domainmodels.EvaluateBenchmarkCaseRunGate(domainmodels.BenchmarkCaseRunGateInput{
		ModelVersionStatus:     version.Status,
		BenchmarkCaseFound:     benchmarkCaseFound,
		BenchmarkCaseStatus:    benchmarkCase.Status,
		HasDefaultParameterSet: parameterSet != nil,
		ParameterSetStatus:     parameterSetStatus,
	})
	if !gate.ModelVersionActive {
		return JobSnapshot{}, 0, Conflict(CodeParameterSetTransitionFailed, "benchmark case run requires an active model version")
	}
	if !gate.BenchmarkCaseFound {
		return JobSnapshot{}, 0, NotFound("BENCHMARK_CASE_NOT_FOUND", "benchmark case not found")
	}
	if !gate.BenchmarkCaseValidated {
		return JobSnapshot{}, 0, Conflict("BENCHMARK_CASE_NOT_VALIDATED", "benchmark case must be validated before scheduling runs")
	}
	if !gate.HasDefaultParameterSet {
		return JobSnapshot{}, 0, NotFound(CodeParameterSetNotFound, "default parameter set not found")
	}
	if gate.ParameterSetRetired {
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
	jobDocument := domainmodels.BuildBenchmarkCaseRunJobDocument(domainmodels.BenchmarkCaseRunJobDocumentInput{
		ModelKey:           modelKey,
		ModelVersion:       modelVersion,
		BenchmarkCaseID:    benchmarkCaseID,
		JobType:            benchmarkCase.JobType,
		RequestID:          request.RequestID,
		JobID:              request.JobID,
		IdempotencyKey:     request.IdempotencyKey,
		TraceID:            request.TraceID,
		SourceSystem:       sourceSystem,
		RequestedBy:        requestedBy,
		TimestampID:        svc.now().Format("20060102150405"),
		CreatedAt:          svc.now().Format(time.RFC3339Nano),
		Metadata:           request.Metadata,
		SimulationInput:    simulationInput,
		Execution:          execution,
		ParameterSetID:     parameterSet.ParameterSetID,
		ParameterHash:      parameterSet.ParameterHash,
		ParameterSetStatus: parameterSet.Status,
		ExpectedMetrics:    benchmarkCase.ExpectedMetrics,
		Tolerance:          benchmarkCase.Tolerance,
		InputRef:           benchmarkCase.InputRef,
	})
	jobBytes, err := json.Marshal(jobDocument.Job)
	if err != nil {
		return JobSnapshot{}, 0, err
	}
	if svc.createJob == nil {
		return JobSnapshot{}, 0, NewAppError(500, CodeInternal, "compute job creator is not configured", true, nil)
	}
	return svc.createJob(ctx, jobBytes, jobDocument.IdempotencyKey)
}
