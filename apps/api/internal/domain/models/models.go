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
