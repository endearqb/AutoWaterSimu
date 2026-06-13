package models

import (
	"encoding/json"
	"reflect"
	"testing"
)

func TestEvaluateBenchmarkCasePromotionEvidenceMissingBenchmarkRun(t *testing.T) {
	result := EvaluateBenchmarkCasePromotionEvidence(BenchmarkCasePromotionEvidenceInput{
		BenchmarkCaseID: "bc_1",
		CaseStatus:      BenchmarkCaseStatusValidated,
	})
	if result.Ready || result.ParameterHashMatches {
		t.Fatalf("missing benchmark run should not be ready: %#v", result)
	}
	if result.BenchmarkCaseID != "bc_1" || result.CaseStatus != BenchmarkCaseStatusValidated {
		t.Fatalf("case identity should be preserved: %#v", result)
	}
	if !reflect.DeepEqual(result.BlockingReasons, []string{PromotionBlockBenchmarkRunMissingForParameterSet}) {
		t.Fatalf("unexpected blockers: %#v", result.BlockingReasons)
	}
}

func TestEvaluateBenchmarkCasePromotionEvidenceMissingModelRun(t *testing.T) {
	result := EvaluateBenchmarkCasePromotionEvidence(BenchmarkCasePromotionEvidenceInput{
		BenchmarkCaseID: "bc_1",
		CaseStatus:      BenchmarkCaseStatusValidated,
		BenchmarkRun: BenchmarkCasePromotionBenchmarkRun{
			Found:          true,
			BenchmarkRunID: "br_1",
			Status:         "failed",
			ModelRunID:     "mr_1",
			JobID:          "job_1",
			ExecutedAt:     "2026-06-13T00:00:00Z",
			Payload:        json.RawMessage(`{"evidence_refs":["model_run:mr_1","artifact:a1"]}`),
		},
	})
	if result.Ready {
		t.Fatalf("missing model run should not be ready: %#v", result)
	}
	if result.LatestBenchmarkRunID != "br_1" || result.ModelRunID != "mr_1" || result.EvidenceRefCount != 2 {
		t.Fatalf("benchmark evidence fields should be projected: %#v", result)
	}
	expected := []string{PromotionBlockLatestBenchmarkRunNotPassed, PromotionBlockModelRunNotFound}
	if !reflect.DeepEqual(result.BlockingReasons, expected) {
		t.Fatalf("unexpected blockers: %#v", result.BlockingReasons)
	}
}

func TestEvaluateBenchmarkCasePromotionEvidenceInvalidModelRunPayload(t *testing.T) {
	result := EvaluateBenchmarkCasePromotionEvidence(BenchmarkCasePromotionEvidenceInput{
		BenchmarkCaseID: "bc_1",
		CaseStatus:      BenchmarkCaseStatusValidated,
		BenchmarkRun: BenchmarkCasePromotionBenchmarkRun{
			Found:          true,
			BenchmarkRunID: "br_1",
			Status:         BenchmarkRunStatusPassed,
			ModelRunID:     "mr_1",
			JobID:          "job_1",
			ExecutedAt:     "2026-06-13T00:00:00Z",
			Payload:        json.RawMessage(`{"evidence_refs":["model_run:mr_1"]}`),
		},
		ModelRunFound: true,
		ModelRun:      json.RawMessage(`{`),
	})
	if result.Ready {
		t.Fatalf("invalid model run payload should not be ready: %#v", result)
	}
	if !reflect.DeepEqual(result.BlockingReasons, []string{PromotionBlockModelRunPayloadInvalid}) {
		t.Fatalf("unexpected blockers: %#v", result.BlockingReasons)
	}
}

func TestEvaluateBenchmarkCasePromotionEvidenceIdentityAndHashMismatch(t *testing.T) {
	result := EvaluateBenchmarkCasePromotionEvidence(BenchmarkCasePromotionEvidenceInput{
		BenchmarkCaseID: "bc_1",
		CaseStatus:      BenchmarkCaseStatusValidated,
		BenchmarkRun: BenchmarkCasePromotionBenchmarkRun{
			Found:          true,
			BenchmarkRunID: "br_1",
			Status:         BenchmarkRunStatusPassed,
			ModelRunID:     "mr_1",
			JobID:          "job_1",
			ExecutedAt:     "2026-06-13T00:00:00Z",
		},
		ModelRunFound: true,
		ModelRun: json.RawMessage(`{
			"model_run_id":"mr_1",
			"job_id":"job_other",
			"model_key":"other",
			"model_version":"other.v1",
			"parameter_hash":"sha256:other"
		}`),
		ExpectedJobID:         "job_1",
		ExpectedModelKey:      "material_balance",
		ExpectedModelVersion:  "material_balance.v1",
		ExpectedParameterHash: "sha256:expected",
	})
	if result.Ready || result.ParameterHashMatches {
		t.Fatalf("identity/hash mismatch should not be ready: %#v", result)
	}
	if result.ParameterHash != "sha256:other" {
		t.Fatalf("expected model_run parameter hash to be exposed, got %#v", result.ParameterHash)
	}
	expected := []string{PromotionBlockModelRunIdentityMismatch, PromotionBlockModelRunParameterHashMismatch}
	if !reflect.DeepEqual(result.BlockingReasons, expected) {
		t.Fatalf("unexpected blockers: %#v", result.BlockingReasons)
	}
}

func TestEvaluateBenchmarkCasePromotionEvidenceReady(t *testing.T) {
	result := EvaluateBenchmarkCasePromotionEvidence(BenchmarkCasePromotionEvidenceInput{
		BenchmarkCaseID: "bc_1",
		CaseStatus:      BenchmarkCaseStatusValidated,
		BenchmarkRun: BenchmarkCasePromotionBenchmarkRun{
			Found:          true,
			BenchmarkRunID: "br_1",
			Status:         BenchmarkRunStatusPassed,
			ModelRunID:     "mr_1",
			JobID:          "job_1",
			ExecutedAt:     "2026-06-13T00:00:00Z",
			Payload:        json.RawMessage(`{"evidence_refs":["model_run:mr_1"]}`),
		},
		ModelRunFound: true,
		ModelRun: json.RawMessage(`{
			"model_run_id":"mr_1",
			"job_id":"job_1",
			"model_key":"material_balance",
			"model_version":"material_balance.v1",
			"parameter_hash":"sha256:expected"
		}`),
		ExpectedJobID:         "job_1",
		ExpectedModelKey:      "material_balance",
		ExpectedModelVersion:  "material_balance.v1",
		ExpectedParameterHash: "sha256:expected",
	})
	if !result.Ready || !result.ParameterHashMatches || result.ParameterHash != "sha256:expected" {
		t.Fatalf("expected ready evidence result, got %#v", result)
	}
	if result.EvidenceRefCount != 1 || len(result.BlockingReasons) != 0 {
		t.Fatalf("unexpected ready evidence fields: %#v", result)
	}
}
