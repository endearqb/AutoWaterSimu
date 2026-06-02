package jobs

import (
	"encoding/json"
	"reflect"
	"testing"
)

func TestIsTerminal(t *testing.T) {
	terminal := []string{StatusSucceeded, StatusFailed, StatusCancelled, StatusTimedOut}
	for _, status := range terminal {
		if !IsTerminal(status) {
			t.Fatalf("expected %q to be terminal", status)
		}
	}

	active := []string{StatusCreated, StatusQueued, StatusRunning, "", "unknown"}
	for _, status := range active {
		if IsTerminal(status) {
			t.Fatalf("expected %q to be non-terminal", status)
		}
	}
}

func TestIsWorkerResultStatus(t *testing.T) {
	accepted := []string{StatusSucceeded, StatusFailed, StatusTimedOut}
	for _, status := range accepted {
		if !IsWorkerResultStatus(status) {
			t.Fatalf("expected %q to be accepted from worker result", status)
		}
	}

	rejected := []string{StatusCreated, StatusQueued, StatusRunning, StatusCancelled, "", "unknown"}
	for _, status := range rejected {
		if IsWorkerResultStatus(status) {
			t.Fatalf("expected %q to be rejected from worker result", status)
		}
	}
}

func TestWorkerResultCompletionFromSucceededResult(t *testing.T) {
	completion, ok := WorkerResultCompletionFromResult(map[string]any{
		"status":  " succeeded ",
		"summary": map[string]any{"error_code": "SHOULD_NOT_LEAK"},
	})
	if !ok {
		t.Fatal("expected succeeded worker result to be accepted")
	}
	if completion.Status != StatusSucceeded || completion.ErrorCode != "" || completion.ErrorMessage != "" {
		t.Fatalf("unexpected completion: %#v", completion)
	}
}

func TestWorkerResultCompletionFromFailedResult(t *testing.T) {
	completion, ok := WorkerResultCompletionFromResult(map[string]any{
		"status": "failed",
		"summary": map[string]any{
			"error_code":    " SOLVER_FAILED ",
			"error_message": " solver diverged ",
		},
	})
	if !ok {
		t.Fatal("expected failed worker result to be accepted")
	}
	if completion.Status != StatusFailed || completion.ErrorCode != "SOLVER_FAILED" || completion.ErrorMessage != "solver diverged" {
		t.Fatalf("unexpected completion: %#v", completion)
	}
}

func TestWorkerResultCompletionDefaultsFailureCode(t *testing.T) {
	completion, ok := WorkerResultCompletionFromResult(map[string]any{
		"status":  StatusTimedOut,
		"summary": map[string]any{"error_message": "worker timed out"},
	})
	if !ok {
		t.Fatal("expected timed_out worker result to be accepted")
	}
	if completion.Status != StatusTimedOut || completion.ErrorCode != DefaultWorkerFailureCode || completion.ErrorMessage != "worker timed out" {
		t.Fatalf("unexpected completion: %#v", completion)
	}
}

func TestWorkerResultCompletionRejectsInvalidStatus(t *testing.T) {
	completion, ok := WorkerResultCompletionFromResult(map[string]any{"status": "cancelled"})
	if ok {
		t.Fatalf("expected invalid worker result to be rejected: %#v", completion)
	}
}

func TestFailedWorkerComputeResult(t *testing.T) {
	result := FailedWorkerComputeResult("job_1", "simulation.material_balance.v1", "SOLVER_FAILED", "solver diverged")
	if result["schema_version"] != "compute_result.v1" ||
		result["job_id"] != "job_1" ||
		result["job_type"] != "simulation.material_balance.v1" ||
		result["status"] != StatusFailed {
		t.Fatalf("unexpected failed worker result identity: %#v", result)
	}
	summary, ok := result["summary"].(map[string]any)
	if !ok {
		t.Fatalf("expected summary object, got %#v", result["summary"])
	}
	if summary["error_code"] != "SOLVER_FAILED" || summary["error_message"] != "solver diverged" {
		t.Fatalf("unexpected summary: %#v", summary)
	}
	quality, ok := result["quality"].(map[string]any)
	if !ok {
		t.Fatalf("expected quality object, got %#v", result["quality"])
	}
	warnings, ok := quality["warnings"].([]any)
	if !ok || len(warnings) != 1 || warnings[0] != "solver diverged" {
		t.Fatalf("unexpected quality warnings: %#v", quality["warnings"])
	}
	runtimeAudit, ok := result["runtime_audit"].(map[string]any)
	if !ok {
		t.Fatalf("expected runtime audit object, got %#v", result["runtime_audit"])
	}
	if runtimeAudit["fallback_used"] != false || runtimeAudit["fallback_reason"] != "worker reported failure" {
		t.Fatalf("unexpected runtime audit: %#v", runtimeAudit)
	}
}

func TestFailedWorkerComputeResultDefaults(t *testing.T) {
	result := FailedWorkerComputeResult("job_1", "simulation.material_balance.v1", " ", "")
	summary := result["summary"].(map[string]any)
	if summary["error_code"] != DefaultWorkerFailureCode || summary["error_message"] != "worker failed" {
		t.Fatalf("unexpected default summary: %#v", summary)
	}
	quality := result["quality"].(map[string]any)
	warnings := quality["warnings"].([]any)
	if len(warnings) != 1 || warnings[0] != "worker failed" {
		t.Fatalf("unexpected default warning: %#v", warnings)
	}
}

func TestFailedWorkerComputeResultPreservesRawNonBlankErrorText(t *testing.T) {
	result := FailedWorkerComputeResult("job_1", "simulation.material_balance.v1", " SOLVER_FAILED ", " solver diverged ")
	summary := result["summary"].(map[string]any)
	if summary["error_code"] != " SOLVER_FAILED " || summary["error_message"] != " solver diverged " {
		t.Fatalf("expected raw nonblank error text to be preserved before completion parsing, got %#v", summary)
	}
	completion, ok := WorkerResultCompletionFromResult(result)
	if !ok {
		t.Fatal("expected constructed result to be accepted by completion parser")
	}
	if completion.ErrorCode != "SOLVER_FAILED" || completion.ErrorMessage != "solver diverged" {
		t.Fatalf("expected completion parser to preserve existing trim semantics, got %#v", completion)
	}
}

func TestRequiredCapabilities(t *testing.T) {
	input := json.RawMessage(`{
		"execution": {
			"required_capabilities": ["material_balance", " simulation ", "", 42]
		}
	}`)
	got := RequiredCapabilities(input)
	want := []string{"material_balance", "simulation"}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("required capabilities mismatch: got %#v want %#v", got, want)
	}
}

func TestContractVersions(t *testing.T) {
	input := json.RawMessage(`{
		"payload": {
			"schema_version": " simulation_input.v1 "
		}
	}`)
	got := ContractVersions("compute_job.v1", input)
	want := []string{"compute_job.v1", "simulation_input.v1"}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("contract versions mismatch: got %#v want %#v", got, want)
	}
}

func TestMatchesWorker(t *testing.T) {
	candidate := ClaimCandidate{
		SchemaVersion: "compute_job.v1",
		InputJSON: json.RawMessage(`{
			"payload": {"schema_version": "simulation_input.v1"},
			"execution": {"required_capabilities": ["material_balance"]}
		}`),
	}
	worker := WorkerCapabilities{
		Capabilities:              json.RawMessage(`["material_balance", "other"]`),
		SupportedContractVersions: json.RawMessage(`["compute_job.v1", "simulation_input.v1"]`),
	}
	if !MatchesWorker(candidate, worker) {
		t.Fatal("expected worker to match candidate")
	}
}

func TestMatchesWorkerRejectsMissingCapabilityOrContract(t *testing.T) {
	candidate := ClaimCandidate{
		SchemaVersion: "compute_job.v1",
		InputJSON: json.RawMessage(`{
			"payload": {"schema_version": "simulation_input.v1"},
			"execution": {"required_capabilities": ["material_balance"]}
		}`),
	}

	missingCapability := WorkerCapabilities{
		Capabilities:              json.RawMessage(`["asm"]`),
		SupportedContractVersions: json.RawMessage(`["compute_job.v1", "simulation_input.v1"]`),
	}
	if MatchesWorker(candidate, missingCapability) {
		t.Fatal("expected missing capability to reject worker")
	}

	missingContract := WorkerCapabilities{
		Capabilities:              json.RawMessage(`["material_balance"]`),
		SupportedContractVersions: json.RawMessage(`["compute_job.v1"]`),
	}
	if MatchesWorker(candidate, missingContract) {
		t.Fatal("expected missing payload contract version to reject worker")
	}
}
