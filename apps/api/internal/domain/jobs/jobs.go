package jobs

import (
	"encoding/json"
	"strings"
)

const (
	StatusCreated   = "created"
	StatusQueued    = "queued"
	StatusRunning   = "running"
	StatusSucceeded = "succeeded"
	StatusFailed    = "failed"
	StatusCancelled = "cancelled"
	StatusTimedOut  = "timed_out"
)

const DefaultWorkerFailureCode = "WORKER_FAILED"

type ClaimCandidate struct {
	SchemaVersion string
	InputJSON     json.RawMessage
}

type WorkerCapabilities struct {
	Capabilities              json.RawMessage
	SupportedContractVersions json.RawMessage
}

type WorkerResultCompletion struct {
	Status       string
	ErrorCode    string
	ErrorMessage string
}

func IsTerminal(status string) bool {
	return status == StatusSucceeded || status == StatusFailed || status == StatusCancelled || status == StatusTimedOut
}

func IsWorkerResultStatus(status string) bool {
	return IsTerminal(status) && status != StatusCancelled
}

func WorkerResultCompletionFromResult(result map[string]any) (WorkerResultCompletion, bool) {
	status := stringValue(result, "status")
	if !IsWorkerResultStatus(status) {
		return WorkerResultCompletion{Status: status}, false
	}
	completion := WorkerResultCompletion{Status: status}
	if status == StatusSucceeded {
		return completion, true
	}
	summary, _ := result["summary"].(map[string]any)
	completion.ErrorCode = stringValue(summary, "error_code")
	completion.ErrorMessage = stringValue(summary, "error_message")
	if completion.ErrorCode == "" {
		completion.ErrorCode = DefaultWorkerFailureCode
	}
	return completion, true
}

func MatchesWorker(candidate ClaimCandidate, worker WorkerCapabilities) bool {
	capabilities := stringSetFromJSON(worker.Capabilities)
	for _, capability := range RequiredCapabilities(candidate.InputJSON) {
		if !capabilities[capability] {
			return false
		}
	}
	versions := stringSetFromJSON(worker.SupportedContractVersions)
	for _, version := range ContractVersions(candidate.SchemaVersion, candidate.InputJSON) {
		if !versions[version] {
			return false
		}
	}
	return true
}

func RequiredCapabilities(inputJSON json.RawMessage) []string {
	var raw map[string]any
	if err := json.Unmarshal(inputJSON, &raw); err != nil {
		return nil
	}
	execution, ok := raw["execution"].(map[string]any)
	if !ok {
		return nil
	}
	return stringsFromAny(execution["required_capabilities"])
}

func ContractVersions(schemaVersion string, inputJSON json.RawMessage) []string {
	versions := []string{schemaVersion}
	var raw map[string]any
	if err := json.Unmarshal(inputJSON, &raw); err != nil {
		return versions
	}
	if payload, ok := raw["payload"].(map[string]any); ok {
		if payloadSchemaVersion, ok := payload["schema_version"].(string); ok && strings.TrimSpace(payloadSchemaVersion) != "" {
			versions = append(versions, strings.TrimSpace(payloadSchemaVersion))
		}
	}
	return versions
}

func stringSetFromJSON(raw json.RawMessage) map[string]bool {
	values := map[string]bool{}
	var items []string
	if err := json.Unmarshal(raw, &items); err == nil {
		for _, item := range items {
			if text := strings.TrimSpace(item); text != "" {
				values[text] = true
			}
		}
	}
	return values
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

func stringValue(value map[string]any, key string) string {
	if value == nil {
		return ""
	}
	if text, ok := value[key].(string); ok {
		return strings.TrimSpace(text)
	}
	return ""
}
