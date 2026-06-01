package models

import (
	"encoding/json"
	"reflect"
	"testing"
)

func TestRunFieldsFromRaw(t *testing.T) {
	raw := json.RawMessage(`{
		"model_run_id": " mr_1 ",
		"job_id": " job_1 ",
		"model_key": " material_balance ",
		"model_version": " 1.0.0 ",
		"metadata": {"parameter_set_id": " ps_default "}
	}`)
	modelRunID, jobID, modelKey, modelVersion, parameterSetID, err := RunFieldsFromRaw(raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if modelRunID != "mr_1" || jobID != "job_1" || modelKey != "material_balance" || modelVersion != "1.0.0" || parameterSetID != "ps_default" {
		t.Fatalf("unexpected fields: %q %q %q %q %q", modelRunID, jobID, modelKey, modelVersion, parameterSetID)
	}
	identity, err := RunIdentityFromRaw(raw)
	if err != nil {
		t.Fatalf("unexpected identity error: %v", err)
	}
	if identity.ModelRunID != "mr_1" || identity.JobID != "job_1" || identity.ModelKey != "material_balance" || identity.ModelVersion != "1.0.0" || identity.ParameterSetID != "ps_default" {
		t.Fatalf("unexpected identity: %#v", identity)
	}
	if RunIDFromRaw(raw) != "mr_1" {
		t.Fatalf("unexpected model run id: %q", RunIDFromRaw(raw))
	}
}

func TestRunIdentityFromRawIncludesParameterHash(t *testing.T) {
	raw := json.RawMessage(`{
		"model_run_id": "mr_1",
		"job_id": "job_1",
		"model_key": "material_balance",
		"model_version": "material_balance.v1",
		"parameter_hash": " sha256:abc "
	}`)
	identity, err := RunIdentityFromRaw(raw)
	if err != nil {
		t.Fatalf("unexpected identity error: %v", err)
	}
	if identity.ParameterHash != "sha256:abc" {
		t.Fatalf("unexpected parameter hash: %q", identity.ParameterHash)
	}
}

func TestCheckRunIdentity(t *testing.T) {
	identity := RunIdentity{
		JobID:         "job_1",
		ModelKey:      "material_balance",
		ModelVersion:  "material_balance.v1",
		ParameterHash: "sha256:abc",
	}
	check := CheckRunIdentity(identity, RunIdentityExpectation{
		JobID:         " job_1 ",
		ModelKey:      " material_balance ",
		ModelVersion:  " material_balance.v1 ",
		ParameterHash: " sha256:abc ",
	})
	if !check.IdentityMatches || !check.ParameterHashMatches {
		t.Fatalf("expected identity and hash match: %#v", check)
	}
	if len(check.BlockingReasons) != 0 {
		t.Fatalf("expected no blocking reasons, got %#v", check.BlockingReasons)
	}

	check = CheckRunIdentity(identity, RunIdentityExpectation{
		JobID:         "job_other",
		ModelKey:      "material_balance",
		ModelVersion:  "material_balance.v1",
		ParameterHash: "sha256:abc",
	})
	if check.IdentityMatches || !check.ParameterHashMatches {
		t.Fatalf("expected only identity mismatch: %#v", check)
	}
	if got, want := check.BlockingReasons, []string{PromotionBlockModelRunIdentityMismatch}; !reflect.DeepEqual(got, want) {
		t.Fatalf("blocking reasons mismatch: got %#v want %#v", got, want)
	}

	check = CheckRunIdentity(identity, RunIdentityExpectation{
		JobID:         "job_1",
		ModelKey:      "material_balance",
		ModelVersion:  "material_balance.v1",
		ParameterHash: "sha256:other",
	})
	if !check.IdentityMatches || check.ParameterHashMatches {
		t.Fatalf("expected only parameter hash mismatch: %#v", check)
	}
	if got, want := check.BlockingReasons, []string{PromotionBlockModelRunParameterHashMismatch}; !reflect.DeepEqual(got, want) {
		t.Fatalf("blocking reasons mismatch: got %#v want %#v", got, want)
	}

	check = CheckRunIdentity(identity, RunIdentityExpectation{
		JobID:         "job_other",
		ModelKey:      "material_balance",
		ModelVersion:  "material_balance.v2",
		ParameterHash: "sha256:other",
	})
	want := []string{
		PromotionBlockModelRunIdentityMismatch,
		PromotionBlockModelRunParameterHashMismatch,
	}
	if check.IdentityMatches || check.ParameterHashMatches {
		t.Fatalf("expected identity and hash mismatch: %#v", check)
	}
	if !reflect.DeepEqual(check.BlockingReasons, want) {
		t.Fatalf("blocking reasons mismatch: got %#v want %#v", check.BlockingReasons, want)
	}
}

func TestRunRefsAndWarningsFromRaw(t *testing.T) {
	raw := json.RawMessage(`{
		"evidence_refs": ["artifact:a1", " model_run:m1 ", "", 42],
		"warnings": [" warn-1 ", "", "warn-2"]
	}`)
	if got, want := RunEvidenceRefsFromRaw(raw), []string{"artifact:a1", "model_run:m1"}; !reflect.DeepEqual(got, want) {
		t.Fatalf("evidence refs mismatch: got %#v want %#v", got, want)
	}
	if got, want := RunWarningsFromRaw(raw), []string{"warn-1", "warn-2"}; !reflect.DeepEqual(got, want) {
		t.Fatalf("warnings mismatch: got %#v want %#v", got, want)
	}
}

func TestBenchmarkRunEvidenceRefs(t *testing.T) {
	document := map[string]any{
		"evidence_refs": []any{" model_run:mr_1 ", "", 42, "artifact:a1"},
	}
	if got, want := BenchmarkRunEvidenceRefs(document), []string{"model_run:mr_1", "artifact:a1"}; !reflect.DeepEqual(got, want) {
		t.Fatalf("benchmark evidence refs mismatch: got %#v want %#v", got, want)
	}
	raw := json.RawMessage(`{"evidence_refs":[" job:j1 ","",false]}`)
	if got, want := BenchmarkRunEvidenceRefsFromRaw(raw), []string{"job:j1"}; !reflect.DeepEqual(got, want) {
		t.Fatalf("benchmark raw evidence refs mismatch: got %#v want %#v", got, want)
	}
	if refs := BenchmarkRunEvidenceRefsFromRaw(json.RawMessage(`{`)); refs != nil {
		t.Fatalf("expected nil refs for invalid benchmark raw, got %#v", refs)
	}
}

func TestParameterSetStatuses(t *testing.T) {
	valid := []string{
		ParameterSetStatusDraft,
		ParameterSetStatusCandidate,
		ParameterSetStatusValidated,
		ParameterSetStatusApproved,
		ParameterSetStatusRetired,
	}
	for _, status := range valid {
		if !IsParameterSetStatus(status) {
			t.Fatalf("expected %q to be valid", status)
		}
	}
	for _, status := range []string{"", "unknown", " draft "} {
		if IsParameterSetStatus(status) {
			t.Fatalf("expected %q to be invalid", status)
		}
	}
}

func TestCanTransitionParameterSetStatus(t *testing.T) {
	allowed := [][2]string{
		{ParameterSetStatusDraft, ParameterSetStatusCandidate},
		{ParameterSetStatusCandidate, ParameterSetStatusValidated},
		{ParameterSetStatusValidated, ParameterSetStatusApproved},
		{ParameterSetStatusDraft, ParameterSetStatusRetired},
		{ParameterSetStatusApproved, ParameterSetStatusRetired},
	}
	for _, transition := range allowed {
		if !CanTransitionParameterSetStatus(transition[0], transition[1]) {
			t.Fatalf("expected transition %q -> %q to be allowed", transition[0], transition[1])
		}
	}

	blocked := [][2]string{
		{ParameterSetStatusDraft, ParameterSetStatusValidated},
		{ParameterSetStatusApproved, ParameterSetStatusValidated},
		{ParameterSetStatusRetired, ParameterSetStatusApproved},
		{"unknown", ParameterSetStatusCandidate},
		{ParameterSetStatusCandidate, "unknown"},
	}
	for _, transition := range blocked {
		if CanTransitionParameterSetStatus(transition[0], transition[1]) {
			t.Fatalf("expected transition %q -> %q to be blocked", transition[0], transition[1])
		}
	}
}

func TestEvaluateBenchmarkCasePromotionReadinessReady(t *testing.T) {
	readiness := EvaluateBenchmarkCasePromotionReadiness(BenchmarkCasePromotionReadinessInput{
		BenchmarkRunStatus:   BenchmarkRunStatusPassed,
		ParameterHashMatches: true,
	})
	if !readiness.Ready {
		t.Fatalf("expected benchmark case to be ready: %#v", readiness)
	}
	if len(readiness.BlockingReasons) != 0 {
		t.Fatalf("expected no blocking reasons, got %#v", readiness.BlockingReasons)
	}
}

func TestEvaluateBenchmarkCasePromotionReadinessBlocksRunStatusAndHash(t *testing.T) {
	readiness := EvaluateBenchmarkCasePromotionReadiness(BenchmarkCasePromotionReadinessInput{
		BenchmarkRunStatus:   "failed",
		ParameterHashMatches: false,
		BlockingReasons: []string{
			" custom_blocker ",
			PromotionBlockLatestBenchmarkRunNotPassed,
			"",
		},
	})
	want := []string{
		"custom_blocker",
		PromotionBlockLatestBenchmarkRunNotPassed,
		PromotionBlockModelRunParameterHashMismatch,
	}
	if readiness.Ready {
		t.Fatalf("expected benchmark case to be blocked")
	}
	if !reflect.DeepEqual(readiness.BlockingReasons, want) {
		t.Fatalf("blocking reasons mismatch: got %#v want %#v", readiness.BlockingReasons, want)
	}
}

func TestEvaluateBenchmarkCasePromotionReadinessPreservesExistingBlockers(t *testing.T) {
	readiness := EvaluateBenchmarkCasePromotionReadiness(BenchmarkCasePromotionReadinessInput{
		BenchmarkRunStatus:   BenchmarkRunStatusPassed,
		ParameterHashMatches: true,
		BlockingReasons: []string{
			PromotionBlockModelRunNotFound,
			" " + PromotionBlockModelRunNotFound + " ",
		},
	})
	want := []string{PromotionBlockModelRunNotFound}
	if readiness.Ready {
		t.Fatalf("expected existing blocker to keep benchmark case blocked")
	}
	if !reflect.DeepEqual(readiness.BlockingReasons, want) {
		t.Fatalf("blocking reasons mismatch: got %#v want %#v", readiness.BlockingReasons, want)
	}
}

func TestEvaluateParameterSetPromotionGateReady(t *testing.T) {
	gate := EvaluateParameterSetPromotionGate(ParameterSetPromotionGateInput{
		ModelVersionStatus:    ModelVersionStatusActive,
		ParameterSetStatus:    ParameterSetStatusValidated,
		BenchmarkCasesChecked: 2,
		BenchmarkCasesPassed:  2,
	})
	if !gate.CanPromoteToApproved {
		t.Fatalf("expected promotion to be allowed: %#v", gate)
	}
	if len(gate.BlockingReasons) != 0 {
		t.Fatalf("expected no blocking reasons, got %#v", gate.BlockingReasons)
	}
}

func TestEvaluateParameterSetPromotionGateBlocksVersionStatusParameterStatusAndCases(t *testing.T) {
	gate := EvaluateParameterSetPromotionGate(ParameterSetPromotionGateInput{
		ModelVersionStatus:    "deprecated",
		ParameterSetStatus:    ParameterSetStatusApproved,
		BenchmarkCasesChecked: 0,
		BenchmarkCasesPassed:  0,
		BlockingReasons: []string{
			" latest_benchmark_run_not_passed ",
			PromotionBlockModelVersionNotActive,
			"",
		},
	})
	want := []string{
		"latest_benchmark_run_not_passed",
		PromotionBlockModelVersionNotActive,
		PromotionBlockNoValidatedBenchmarkCases,
		PromotionBlockParameterSetAlreadyApproved,
	}
	if gate.CanPromoteToApproved {
		t.Fatalf("expected promotion to be blocked")
	}
	if !reflect.DeepEqual(gate.BlockingReasons, want) {
		t.Fatalf("blocking reasons mismatch: got %#v want %#v", gate.BlockingReasons, want)
	}
}

func TestEvaluateParameterSetPromotionGateRequiresValidatedParameterSet(t *testing.T) {
	gate := EvaluateParameterSetPromotionGate(ParameterSetPromotionGateInput{
		ModelVersionStatus:    ModelVersionStatusActive,
		ParameterSetStatus:    ParameterSetStatusDraft,
		BenchmarkCasesChecked: 1,
		BenchmarkCasesPassed:  1,
	})
	want := []string{PromotionBlockParameterSetStatusMustBeValidated}
	if gate.CanPromoteToApproved {
		t.Fatalf("expected promotion to be blocked")
	}
	if !reflect.DeepEqual(gate.BlockingReasons, want) {
		t.Fatalf("blocking reasons mismatch: got %#v want %#v", gate.BlockingReasons, want)
	}
}

func TestEvaluateParameterSetPromotionGatePreservesCaseBlockingReasons(t *testing.T) {
	gate := EvaluateParameterSetPromotionGate(ParameterSetPromotionGateInput{
		ModelVersionStatus:    ModelVersionStatusActive,
		ParameterSetStatus:    ParameterSetStatusValidated,
		BenchmarkCasesChecked: 2,
		BenchmarkCasesPassed:  1,
		BlockingReasons: []string{
			"latest_benchmark_run_not_passed",
			" latest_benchmark_run_not_passed ",
		},
	})
	want := []string{"latest_benchmark_run_not_passed"}
	if gate.CanPromoteToApproved {
		t.Fatalf("expected promotion to be blocked")
	}
	if !reflect.DeepEqual(gate.BlockingReasons, want) {
		t.Fatalf("blocking reasons mismatch: got %#v want %#v", gate.BlockingReasons, want)
	}
}

func TestInvalidRawReturnsEmptyValues(t *testing.T) {
	raw := json.RawMessage(`{`)
	if id := RunIDFromRaw(raw); id != "" {
		t.Fatalf("expected empty id for invalid raw, got %q", id)
	}
	if refs := RunEvidenceRefsFromRaw(raw); refs != nil {
		t.Fatalf("expected nil refs for invalid raw, got %#v", refs)
	}
	if warnings := RunWarningsFromRaw(raw); warnings != nil {
		t.Fatalf("expected nil warnings for invalid raw, got %#v", warnings)
	}
	if _, _, _, _, _, err := RunFieldsFromRaw(raw); err == nil {
		t.Fatal("expected error for invalid raw")
	}
	if _, err := RunIdentityFromRaw(raw); err == nil {
		t.Fatal("expected identity error for invalid raw")
	}
}
