package models

import (
	"encoding/json"
	"strings"
)

const (
	ParameterSetStatusDraft     = "draft"
	ParameterSetStatusCandidate = "candidate"
	ParameterSetStatusValidated = "validated"
	ParameterSetStatusApproved  = "approved"
	ParameterSetStatusRetired   = "retired"
)

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
