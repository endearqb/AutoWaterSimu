package models

import (
	"encoding/json"
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
	PromotionBlockModelVersionNotActive             = "model_version_not_active"
	PromotionBlockNoValidatedBenchmarkCases         = "no_validated_benchmark_cases"
	PromotionBlockParameterSetAlreadyApproved       = "parameter_set_already_approved"
	PromotionBlockParameterSetStatusMustBeValidated = "parameter_set_status_must_be_validated"
)

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
