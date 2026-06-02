package models

import (
	"encoding/json"
	"errors"
	"sort"
	"strings"
)

const (
	ModelVersionStatusActive     = "active"
	BenchmarkCaseStatusValidated = "validated"
	BenchmarkRunStatusPassed     = "passed"
)

const (
	ParameterSetStatusDraft     = "draft"
	ParameterSetStatusCandidate = "candidate"
	ParameterSetStatusValidated = "validated"
	ParameterSetStatusApproved  = "approved"
	ParameterSetStatusRetired   = "retired"
)

const (
	PromotionBlockModelVersionNotActive              = "model_version_not_active"
	PromotionBlockBenchmarkRunMissingForParameterSet = "benchmark_run_missing_for_parameter_set"
	PromotionBlockLatestBenchmarkRunNotPassed        = "latest_benchmark_run_not_passed"
	PromotionBlockModelRunNotFound                   = "model_run_not_found"
	PromotionBlockModelRunIdentityMismatch           = "model_run_identity_mismatch"
	PromotionBlockModelRunParameterHashMismatch      = "model_run_parameter_hash_mismatch"
	PromotionBlockModelRunPayloadInvalid             = "model_run_payload_invalid"
	PromotionBlockNoValidatedBenchmarkCases          = "no_validated_benchmark_cases"
	PromotionBlockParameterSetAlreadyApproved        = "parameter_set_already_approved"
	PromotionBlockParameterSetStatusMustBeValidated  = "parameter_set_status_must_be_validated"
)

const (
	BenchmarkWorkflowBlockModelVersionNotActive   = "model_version_not_active"
	BenchmarkWorkflowBlockBenchmarkCaseNotFound   = "benchmark_case_not_found"
	BenchmarkWorkflowBlockBenchmarkCaseNotValid   = "benchmark_case_not_validated"
	BenchmarkWorkflowBlockDefaultParameterSetMiss = "default_parameter_set_missing"
	BenchmarkWorkflowBlockParameterSetMismatch    = "parameter_set_mismatch"
	BenchmarkWorkflowBlockParameterSetRetired     = "parameter_set_retired"
)

const BuiltInModelCatalogSource = "built_in"

func BuiltInModelCatalogDocument(generatedAt, materialBalanceParameterHash string) map[string]any {
	minZero := 0.0
	minOne := 1.0
	materialBalanceParameters := map[string]any{
		"hours":          4,
		"steps_per_hour": 60,
	}
	return map[string]any{
		"schema_version": "model_catalog.v1",
		"generated_at":   generatedAt,
		"models": []any{
			map[string]any{
				"model_key":           "material_balance",
				"display_name":        "Material Balance",
				"description":         "Deterministic material-balance model for P0/P1 smoke jobs.",
				"supported_job_types": []any{"simulation.material_balance.v1"},
				"versions": []any{
					map[string]any{
						"model_version": "material_balance.v1",
						"status":        ModelVersionStatusActive,
						"runtime":       "simulation-worker",
						"released_at":   "2026-05-25T00:00:00Z",
						"parameter_templates": []any{
							map[string]any{
								"parameter_key": "hours",
								"display_name":  "Simulation horizon",
								"unit":          "h",
								"value_type":    "number",
								"required":      true,
								"default_value": 4,
								"min_value":     minZero,
							},
							map[string]any{
								"parameter_key": "steps_per_hour",
								"display_name":  "Steps per hour",
								"value_type":    "integer",
								"required":      true,
								"default_value": 60,
								"min_value":     minOne,
							},
						},
						"benchmark_cases": []any{
							map[string]any{
								"benchmark_case_id": "bc_material_balance_minimal_v1",
								"display_name":      "Material balance minimal smoke",
								"description":       "Minimal three-node material-balance case used as a reproducible P0 benchmark.",
								"job_type":          "simulation.material_balance.v1",
								"input_ref": map[string]any{
									"simulation_input_id": "si_material_balance_minimal",
									"fixture":             "contracts/examples/valid/material_balance_minimal.simulation_input.v1.json",
								},
								"expected_metrics": map[string]any{
									"convergence_status": "completed",
									"warning_count":      0,
								},
								"tolerance": map[string]any{
									"relative": 0.000001,
									"absolute": 0.000001,
								},
								"status":        BenchmarkCaseStatusValidated,
								"source":        "built_in_smoke",
								"evidence_refs": []any{"model_run:mr_material_balance_minimal"},
							},
						},
						"default_parameter_set": map[string]any{
							"parameter_set_id": "ps_material_balance_default_v1",
							"status":           ParameterSetStatusApproved,
							"parameter_hash":   materialBalanceParameterHash,
							"parameters":       materialBalanceParameters,
							"metadata": map[string]any{
								"scope": "p0_default",
							},
						},
					},
				},
			},
			builtInWorkerModelDocument(
				"asm1slim",
				"ASM1 Slim",
				"Independent ASM1Slim model job type covered by the simulation worker smoke matrix.",
				"simulation.asm1slim.v1",
				"si_asm1slim_independent",
				"contracts/examples/valid/asm1slim_independent.simulation_input.v1.json",
				"mr_job_asm1slim_independent_asm1slim",
				1.0,
			),
			builtInWorkerModelDocument(
				"asm1",
				"ASM1",
				"Independent ASM1 model job type covered by the simulation worker smoke matrix.",
				"simulation.asm1.v1",
				"si_asm1_independent",
				"contracts/examples/valid/asm1_independent.simulation_input.v1.json",
				"mr_job_asm1_independent_asm1",
				0.5,
			),
			builtInWorkerModelDocument(
				"asm3",
				"ASM3",
				"Independent ASM3 model job type covered by the simulation worker smoke matrix.",
				"simulation.asm3.v1",
				"si_asm3_independent",
				"contracts/examples/valid/asm3_independent.simulation_input.v1.json",
				"mr_job_asm3_independent_asm3",
				0.5,
			),
			builtInWorkerModelDocument(
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
		"metadata": map[string]any{
			"source": BuiltInModelCatalogSource,
		},
	}
}

func builtInWorkerModelDocument(modelKey, displayName, description, jobType, inputID, fixture, modelRunID string, hours float64) map[string]any {
	return map[string]any{
		"model_key":           modelKey,
		"display_name":        displayName,
		"description":         description,
		"supported_job_types": []any{jobType},
		"versions": []any{
			map[string]any{
				"model_version":       modelKey + ".v1",
				"status":              ModelVersionStatusActive,
				"runtime":             "simulation-worker",
				"released_at":         "2026-05-30T00:00:00Z",
				"parameter_templates": builtInRuntimeTemplates(hours),
				"benchmark_cases": []any{
					builtInWorkerSmokeBenchmarkDocument(modelKey, displayName+" independent smoke", jobType, inputID, fixture, modelRunID),
				},
				"metadata": map[string]any{
					"default_parameter_set": "not_defined",
					"parameter_hash_source": "worker_model_parameter_payload",
				},
			},
		},
	}
}

func builtInRuntimeTemplates(hours float64) []any {
	return []any{
		map[string]any{
			"parameter_key": "hours",
			"display_name":  "Simulation horizon",
			"unit":          "h",
			"value_type":    "number",
			"required":      true,
			"default_value": hours,
			"min_value":     0.0,
		},
		map[string]any{
			"parameter_key": "steps_per_hour",
			"display_name":  "Steps per hour",
			"value_type":    "integer",
			"required":      true,
			"default_value": 20,
			"min_value":     1.0,
		},
		map[string]any{
			"parameter_key": "tolerance",
			"display_name":  "Solver tolerance",
			"value_type":    "number",
			"required":      true,
			"default_value": 0.000001,
			"min_value":     0.0,
		},
	}
}

func builtInWorkerSmokeBenchmarkDocument(modelKey, displayName, jobType, inputID, fixture, modelRunID string) map[string]any {
	return map[string]any{
		"benchmark_case_id": "bc_" + modelKey + "_independent_v1",
		"display_name":      displayName,
		"description":       displayName + " contract fixture covered by the worker CLI smoke matrix.",
		"job_type":          jobType,
		"input_ref": map[string]any{
			"simulation_input_id": inputID,
			"fixture":             fixture,
		},
		"expected_metrics": map[string]any{
			"convergence_status": "completed",
			"total_steps":        11,
		},
		"tolerance": map[string]any{
			"relative": 0.000001,
			"absolute": 0.000001,
		},
		"status":        BenchmarkCaseStatusValidated,
		"source":        "worker_cli_smoke",
		"evidence_refs": []any{"model_run:" + modelRunID},
	}
}

type BenchmarkCaseRunGateInput struct {
	ModelVersionStatus     string
	BenchmarkCaseFound     bool
	BenchmarkCaseStatus    string
	HasDefaultParameterSet bool
	ParameterSetStatus     string
}

type BenchmarkCaseRunGate struct {
	ModelVersionActive     bool
	BenchmarkCaseFound     bool
	BenchmarkCaseValidated bool
	HasDefaultParameterSet bool
	ParameterSetRetired    bool
	BlockingReasons        []string
	CanSchedule            bool
}

type BenchmarkCaseRunJobDocumentInput struct {
	ModelKey           string
	ModelVersion       string
	BenchmarkCaseID    string
	JobType            string
	RequestID          string
	JobID              string
	IdempotencyKey     string
	TraceID            string
	SourceSystem       string
	RequestedBy        string
	TimestampID        string
	CreatedAt          string
	Metadata           map[string]any
	SimulationInput    map[string]any
	Execution          map[string]any
	ParameterSetID     string
	ParameterHash      string
	ParameterSetStatus string
	ExpectedMetrics    map[string]any
	Tolerance          map[string]any
	InputRef           map[string]any
}

type BenchmarkCaseRunJobDocument struct {
	Job            map[string]any
	IdempotencyKey string
}

type BenchmarkRunAdmissionInput struct {
	BenchmarkCaseFound    bool
	BenchmarkCaseStatus   string
	DefaultParameterSetID string
	RequestedParameterSet string
}

type BenchmarkRunAdmission struct {
	BenchmarkCaseFound     bool
	BenchmarkCaseValidated bool
	ParameterSetMatches    bool
	BlockingReasons        []string
	CanRecord              bool
}

type ParameterSetPromotionGateInput struct {
	ModelVersionStatus    string
	ParameterSetStatus    string
	BenchmarkCasesChecked int
	BenchmarkCasesPassed  int
	BlockingReasons       []string
}

type ParameterSetPromotionGate struct {
	BlockingReasons      []string
	CanPromoteToApproved bool
}

type ModelRunProductionGateInput struct {
	ModelVersionStatus string
	ParameterSetStatus string
}

type ModelRunProductionGate struct {
	ModelVersionActive   bool
	ParameterSetApproved bool
	ProductionAllowed    bool
}

type BenchmarkCasePromotionReadinessInput struct {
	BenchmarkRunStatus   string
	ParameterHashMatches bool
	BlockingReasons      []string
}

type BenchmarkCasePromotionReadiness struct {
	BlockingReasons []string
	Ready           bool
}

func RunIDFromRaw(raw json.RawMessage) string {
	identity, err := RunIdentityFromRaw(raw)
	if err != nil {
		return ""
	}
	return identity.ModelRunID
}

type RunIdentity struct {
	ModelRunID     string
	JobID          string
	ModelKey       string
	ModelVersion   string
	ParameterSetID string
	ParameterHash  string
}

type RunIdentityExpectation struct {
	JobID         string
	ModelKey      string
	ModelVersion  string
	ParameterHash string
}

type RunIdentityCheck struct {
	IdentityMatches      bool
	ParameterHashMatches bool
	BlockingReasons      []string
}

func RunFieldsFromRaw(raw json.RawMessage) (modelRunID, jobID, modelKey, modelVersion, parameterSetID string, err error) {
	identity, err := RunIdentityFromRaw(raw)
	if err != nil {
		return "", "", "", "", "", err
	}
	return identity.ModelRunID, identity.JobID, identity.ModelKey, identity.ModelVersion, identity.ParameterSetID, nil
}

func RunIdentityFromRaw(raw json.RawMessage) (RunIdentity, error) {
	var value map[string]any
	if err := json.Unmarshal(raw, &value); err != nil {
		return RunIdentity{}, err
	}
	metadata, _ := value["metadata"].(map[string]any)
	return RunIdentity{
		ModelRunID:     stringValue(value, "model_run_id"),
		JobID:          stringValue(value, "job_id"),
		ModelKey:       stringValue(value, "model_key"),
		ModelVersion:   stringValue(value, "model_version"),
		ParameterSetID: stringValue(metadata, "parameter_set_id"),
		ParameterHash:  stringValue(value, "parameter_hash"),
	}, nil
}

func CheckRunIdentity(identity RunIdentity, expected RunIdentityExpectation) RunIdentityCheck {
	blockingReasons := []string{}
	identityMatches := identity.JobID == strings.TrimSpace(expected.JobID) &&
		identity.ModelKey == strings.TrimSpace(expected.ModelKey) &&
		identity.ModelVersion == strings.TrimSpace(expected.ModelVersion)
	if !identityMatches {
		blockingReasons = append(blockingReasons, PromotionBlockModelRunIdentityMismatch)
	}
	parameterHashMatches := identity.ParameterHash == strings.TrimSpace(expected.ParameterHash)
	if !parameterHashMatches {
		blockingReasons = append(blockingReasons, PromotionBlockModelRunParameterHashMismatch)
	}
	return RunIdentityCheck{
		IdentityMatches:      identityMatches,
		ParameterHashMatches: parameterHashMatches,
		BlockingReasons:      uniqueStrings(blockingReasons),
	}
}

func RunEvidenceRefsFromRaw(raw json.RawMessage) []string {
	var value map[string]any
	if err := json.Unmarshal(raw, &value); err != nil {
		return nil
	}
	return stringsFromAny(value["evidence_refs"])
}

func RunWarningsFromRaw(raw json.RawMessage) []string {
	var value map[string]any
	if err := json.Unmarshal(raw, &value); err != nil {
		return nil
	}
	return stringsFromAny(value["warnings"])
}

func ModelRunDocumentsFromComputeResult(result map[string]any, jobID string) ([]map[string]any, error) {
	runtimeAudit, ok := result["runtime_audit"].(map[string]any)
	if !ok {
		return nil, nil
	}
	items, ok := runtimeAudit["model_runs"].([]any)
	if !ok || len(items) == 0 {
		return nil, nil
	}
	modelRuns := make([]map[string]any, 0, len(items))
	expectedJobID := strings.TrimSpace(jobID)
	for _, item := range items {
		modelRun, ok := item.(map[string]any)
		if !ok {
			return nil, errors.New("runtime_audit.model_runs items must be objects")
		}
		modelRunJobID := stringValue(modelRun, "job_id")
		if modelRunJobID != "" && modelRunJobID != expectedJobID {
			return nil, errors.New("model_run job_id does not match completed job")
		}
		modelRuns = append(modelRuns, modelRun)
	}
	return modelRuns, nil
}

func BenchmarkRunEvidenceRefs(document map[string]any) []string {
	return stringsFromAny(document["evidence_refs"])
}

func BenchmarkRunEvidenceRefsFromRaw(raw json.RawMessage) []string {
	var value map[string]any
	if err := json.Unmarshal(raw, &value); err != nil {
		return nil
	}
	return BenchmarkRunEvidenceRefs(value)
}

func IsParameterSetStatus(status string) bool {
	switch status {
	case ParameterSetStatusDraft, ParameterSetStatusCandidate, ParameterSetStatusValidated, ParameterSetStatusApproved, ParameterSetStatusRetired:
		return true
	default:
		return false
	}
}

func CanTransitionParameterSetStatus(fromStatus, toStatus string) bool {
	if fromStatus == ParameterSetStatusRetired {
		return false
	}
	if toStatus == ParameterSetStatusRetired {
		return true
	}
	order := map[string]int{
		ParameterSetStatusDraft:     0,
		ParameterSetStatusCandidate: 1,
		ParameterSetStatusValidated: 2,
		ParameterSetStatusApproved:  3,
	}
	from, fromOK := order[fromStatus]
	to, toOK := order[toStatus]
	return fromOK && toOK && to == from+1
}

func BuildBenchmarkCaseRunJobDocument(input BenchmarkCaseRunJobDocumentInput) BenchmarkCaseRunJobDocument {
	requestID := defaultString(input.RequestID, "bench_req_"+safeIDPart(input.ModelKey)+"_"+safeIDPart(input.ModelVersion)+"_"+safeIDPart(input.BenchmarkCaseID)+"_"+input.TimestampID)
	jobID := defaultString(input.JobID, "job_benchmark_"+safeIDPart(requestID))
	idempotencyKey := defaultString(input.IdempotencyKey, "benchmark:"+requestID)
	traceID := defaultString(input.TraceID, "trace_benchmark_"+safeIDPart(requestID))
	metadata := copyStringAnyMap(input.Metadata)
	metadata["source"] = "model_catalog_benchmark_case"
	metadata["model_key"] = input.ModelKey
	metadata["model_version"] = input.ModelVersion
	metadata["benchmark_case_id"] = input.BenchmarkCaseID
	metadata["parameter_set_id"] = input.ParameterSetID
	metadata["parameter_hash"] = input.ParameterHash
	metadata["parameter_set_status"] = input.ParameterSetStatus
	metadata["expected_metrics"] = input.ExpectedMetrics
	metadata["tolerance"] = input.Tolerance
	metadata["input_ref"] = input.InputRef
	metadata["benchmark_run_required"] = true
	jobContext := map[string]any{
		"source_system": input.SourceSystem,
		"requested_by":  input.RequestedBy,
		"trace_id":      traceID,
	}
	for _, key := range []string{"tenant_id", "project_id", "site_id"} {
		if value := stringValue(input.Metadata, key); value != "" {
			jobContext[key] = value
		}
	}
	job := map[string]any{
		"schema_version":  "compute_job.v1",
		"job_id":          jobID,
		"job_type":        input.JobType,
		"queue":           "simulation",
		"request_id":      requestID,
		"idempotency_key": idempotencyKey,
		"payload":         input.SimulationInput,
		"context":         jobContext,
		"execution":       input.Execution,
		"created_at":      input.CreatedAt,
		"metadata":        metadata,
	}
	return BenchmarkCaseRunJobDocument{
		Job:            job,
		IdempotencyKey: idempotencyKey,
	}
}

func EvaluateBenchmarkCaseRunGate(input BenchmarkCaseRunGateInput) BenchmarkCaseRunGate {
	modelVersionActive := input.ModelVersionStatus == ModelVersionStatusActive
	benchmarkCaseValidated := input.BenchmarkCaseFound && input.BenchmarkCaseStatus == BenchmarkCaseStatusValidated
	parameterSetRetired := input.HasDefaultParameterSet && input.ParameterSetStatus == ParameterSetStatusRetired
	blockingReasons := []string{}
	if !modelVersionActive {
		blockingReasons = append(blockingReasons, BenchmarkWorkflowBlockModelVersionNotActive)
	}
	if !input.BenchmarkCaseFound {
		blockingReasons = append(blockingReasons, BenchmarkWorkflowBlockBenchmarkCaseNotFound)
	} else if !benchmarkCaseValidated {
		blockingReasons = append(blockingReasons, BenchmarkWorkflowBlockBenchmarkCaseNotValid)
	}
	if !input.HasDefaultParameterSet {
		blockingReasons = append(blockingReasons, BenchmarkWorkflowBlockDefaultParameterSetMiss)
	} else if parameterSetRetired {
		blockingReasons = append(blockingReasons, BenchmarkWorkflowBlockParameterSetRetired)
	}
	blockingReasons = uniqueStrings(blockingReasons)
	return BenchmarkCaseRunGate{
		ModelVersionActive:     modelVersionActive,
		BenchmarkCaseFound:     input.BenchmarkCaseFound,
		BenchmarkCaseValidated: benchmarkCaseValidated,
		HasDefaultParameterSet: input.HasDefaultParameterSet,
		ParameterSetRetired:    parameterSetRetired,
		BlockingReasons:        blockingReasons,
		CanSchedule:            len(blockingReasons) == 0,
	}
}

func EvaluateBenchmarkRunAdmission(input BenchmarkRunAdmissionInput) BenchmarkRunAdmission {
	benchmarkCaseValidated := input.BenchmarkCaseFound && input.BenchmarkCaseStatus == BenchmarkCaseStatusValidated
	parameterSetMatches := strings.TrimSpace(input.DefaultParameterSetID) != "" &&
		strings.TrimSpace(input.DefaultParameterSetID) == strings.TrimSpace(input.RequestedParameterSet)
	blockingReasons := []string{}
	if !input.BenchmarkCaseFound {
		blockingReasons = append(blockingReasons, BenchmarkWorkflowBlockBenchmarkCaseNotFound)
	} else if !benchmarkCaseValidated {
		blockingReasons = append(blockingReasons, BenchmarkWorkflowBlockBenchmarkCaseNotValid)
	}
	if !parameterSetMatches {
		blockingReasons = append(blockingReasons, BenchmarkWorkflowBlockParameterSetMismatch)
	}
	blockingReasons = uniqueStrings(blockingReasons)
	return BenchmarkRunAdmission{
		BenchmarkCaseFound:     input.BenchmarkCaseFound,
		BenchmarkCaseValidated: benchmarkCaseValidated,
		ParameterSetMatches:    parameterSetMatches,
		BlockingReasons:        blockingReasons,
		CanRecord:              len(blockingReasons) == 0,
	}
}

func EvaluateBenchmarkCasePromotionReadiness(input BenchmarkCasePromotionReadinessInput) BenchmarkCasePromotionReadiness {
	blockingReasons := make([]string, 0, len(input.BlockingReasons)+2)
	blockingReasons = append(blockingReasons, input.BlockingReasons...)
	if input.BenchmarkRunStatus != BenchmarkRunStatusPassed {
		blockingReasons = append(blockingReasons, PromotionBlockLatestBenchmarkRunNotPassed)
	}
	if !input.ParameterHashMatches {
		blockingReasons = append(blockingReasons, PromotionBlockModelRunParameterHashMismatch)
	}
	blockingReasons = uniqueStrings(blockingReasons)
	return BenchmarkCasePromotionReadiness{
		BlockingReasons: blockingReasons,
		Ready: input.BenchmarkRunStatus == BenchmarkRunStatusPassed &&
			input.ParameterHashMatches &&
			len(blockingReasons) == 0,
	}
}

func EvaluateParameterSetPromotionGate(input ParameterSetPromotionGateInput) ParameterSetPromotionGate {
	blockingReasons := make([]string, 0, len(input.BlockingReasons)+3)
	if input.ModelVersionStatus != ModelVersionStatusActive {
		blockingReasons = append(blockingReasons, PromotionBlockModelVersionNotActive)
	}
	switch input.ParameterSetStatus {
	case ParameterSetStatusValidated:
	case ParameterSetStatusApproved:
		blockingReasons = append(blockingReasons, PromotionBlockParameterSetAlreadyApproved)
	default:
		blockingReasons = append(blockingReasons, PromotionBlockParameterSetStatusMustBeValidated)
	}
	if input.BenchmarkCasesChecked == 0 {
		blockingReasons = append(blockingReasons, PromotionBlockNoValidatedBenchmarkCases)
	}
	blockingReasons = append(blockingReasons, input.BlockingReasons...)
	blockingReasons = uniqueStrings(blockingReasons)
	return ParameterSetPromotionGate{
		BlockingReasons: blockingReasons,
		CanPromoteToApproved: input.ParameterSetStatus == ParameterSetStatusValidated &&
			input.ModelVersionStatus == ModelVersionStatusActive &&
			input.BenchmarkCasesChecked > 0 &&
			input.BenchmarkCasesPassed == input.BenchmarkCasesChecked &&
			len(blockingReasons) == 0,
	}
}

func EvaluateModelRunProductionGate(input ModelRunProductionGateInput) ModelRunProductionGate {
	modelVersionActive := strings.TrimSpace(input.ModelVersionStatus) == ModelVersionStatusActive
	parameterSetApproved := strings.TrimSpace(input.ParameterSetStatus) == ParameterSetStatusApproved
	return ModelRunProductionGate{
		ModelVersionActive:   modelVersionActive,
		ParameterSetApproved: parameterSetApproved,
		ProductionAllowed:    modelVersionActive && parameterSetApproved,
	}
}

func stringValue(value map[string]any, key string) string {
	if value == nil {
		return ""
	}
	if text, ok := value[key].(string); ok {
		return strings.TrimSpace(text)
	}
	return ""
}

func copyStringAnyMap(value map[string]any) map[string]any {
	copied := make(map[string]any, len(value))
	for key, item := range value {
		copied[key] = item
	}
	return copied
}

func defaultString(value, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return value
}

func safeIDPart(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return "unknown"
	}
	var builder strings.Builder
	builder.Grow(len(value))
	for _, char := range value {
		switch {
		case char >= 'a' && char <= 'z':
			builder.WriteRune(char)
		case char >= 'A' && char <= 'Z':
			builder.WriteRune(char)
		case char >= '0' && char <= '9':
			builder.WriteRune(char)
		case char == '_' || char == '-':
			builder.WriteRune(char)
		default:
			builder.WriteRune('_')
		}
	}
	result := strings.Trim(builder.String(), "_-")
	if result == "" {
		return "unknown"
	}
	return result
}

func stringsFromAny(value any) []string {
	items, ok := value.([]any)
	if !ok {
		return nil
	}
	var result []string
	for _, item := range items {
		if text, ok := item.(string); ok && strings.TrimSpace(text) != "" {
			result = append(result, strings.TrimSpace(text))
		}
	}
	return result
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
