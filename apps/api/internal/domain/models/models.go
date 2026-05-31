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
	modelRunID, _, _, _, _, _ := RunFieldsFromRaw(raw)
	return modelRunID
}

func RunFieldsFromRaw(raw json.RawMessage) (modelRunID, jobID, modelKey, modelVersion, parameterSetID string, err error) {
	var value map[string]any
	if err = json.Unmarshal(raw, &value); err != nil {
		return "", "", "", "", "", err
	}
	metadata, _ := value["metadata"].(map[string]any)
	return stringValue(value, "model_run_id"),
		stringValue(value, "job_id"),
		stringValue(value, "model_key"),
		stringValue(value, "model_version"),
		stringValue(metadata, "parameter_set_id"),
		nil
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
