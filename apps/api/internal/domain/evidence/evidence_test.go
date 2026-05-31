package evidence

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"reflect"
	"testing"
)

func TestInputRefs(t *testing.T) {
	input := json.RawMessage(`{
		"job_id": " job_1 ",
		"payload": {
			"schema_version": "simulation_input.v1",
			"simulation_input_id": " si_1 ",
			"process_graph_id": " pg_1 ",
			"process_graph_version": 2
		}
	}`)
	refs := InputRefs(input)
	if refs.InputRef["job_id"] != "job_1" || refs.InputRef["payload_schema_version"] != "simulation_input.v1" {
		t.Fatalf("unexpected input ref: %#v", refs.InputRef)
	}
	if refs.ProcessGraphRef["process_graph_id"] != "pg_1" || refs.ProcessGraphRef["version"].(float64) != 2 {
		t.Fatalf("unexpected process graph ref: %#v", refs.ProcessGraphRef)
	}
	if refs.SimulationInputRef["simulation_input_id"] != "si_1" {
		t.Fatalf("unexpected simulation input ref: %#v", refs.SimulationInputRef)
	}
	payloadBytes, err := json.Marshal(map[string]any{
		"schema_version":        "simulation_input.v1",
		"simulation_input_id":   " si_1 ",
		"process_graph_id":      " pg_1 ",
		"process_graph_version": float64(2),
	})
	if err != nil {
		t.Fatalf("marshal expected payload: %v", err)
	}
	if got, want := refs.InputHash, "sha256:"+expectedSHA256Hex(payloadBytes); got != want {
		t.Fatalf("input hash mismatch: got %q want %q", got, want)
	}
}

func TestInputRefsInvalidJSONFallsBackToRawHash(t *testing.T) {
	input := json.RawMessage(`{`)
	refs := InputRefs(input)
	if got, want := refs.InputHash, "sha256:"+expectedSHA256Hex(input); got != want {
		t.Fatalf("input hash mismatch: got %q want %q", got, want)
	}
	if len(refs.InputRef) != 0 || len(refs.ProcessGraphRef) != 0 || len(refs.SimulationInputRef) != 0 {
		t.Fatalf("expected empty refs for invalid input: %#v", refs)
	}
}

func TestParseRef(t *testing.T) {
	refType, refID := ParseRef(" model_run : mr_1 ")
	if refType != "model_run" || refID != "mr_1" {
		t.Fatalf("unexpected typed ref: %q %q", refType, refID)
	}
	refType, refID = ParseRef("artifact_legacy")
	if refType != "" || refID != "artifact_legacy" {
		t.Fatalf("unexpected legacy ref: %q %q", refType, refID)
	}
}

func TestSimulationInputPayload(t *testing.T) {
	input := json.RawMessage(`{
		"payload": {
			"schema_version": "simulation_input.v1",
			"simulation_input_id": "si_1",
			"job_type": "material_balance"
		}
	}`)
	payload := SimulationInputPayload(input, "si_1")
	if payload == nil || payload["job_type"] != "material_balance" {
		t.Fatalf("unexpected simulation input payload: %#v", payload)
	}
	if payload := SimulationInputPayload(input, "missing"); payload != nil {
		t.Fatalf("expected nil payload for mismatched id: %#v", payload)
	}
}

func TestRiskFindingsAndSummary(t *testing.T) {
	summaryRaw := json.RawMessage(`{
		"risk_findings": [
			{"risk_code": "low_1", "severity": "low", "evidence_refs": ["artifact:a1", " model_run:m1 "]},
			{"risk_code": "critical_1", "severity": "critical", "evidence_refs": ["artifact:a1", 42]},
			{"risk_code": "high_1", "severity": "high"},
			{"risk_code": "medium_1", "severity": "medium"},
			42
		]
	}`)
	findings := RiskFindingsFromSummary(summaryRaw)
	if len(findings) != 4 {
		t.Fatalf("expected 4 map findings, got %d", len(findings))
	}
	if got, want := RiskFindingEvidenceRefs(summaryRaw), []string{"artifact:a1", "model_run:m1"}; !reflect.DeepEqual(got, want) {
		t.Fatalf("evidence refs mismatch: got %#v want %#v", got, want)
	}
	riskSummary := SummarizeRiskFindings(findings)
	if riskSummary.Total != 4 || riskSummary.BySeverity["critical"] != 1 || riskSummary.BySeverity["high"] != 1 || riskSummary.BySeverity["medium"] != 1 || riskSummary.BySeverity["low"] != 1 {
		t.Fatalf("unexpected risk summary counts: %#v", riskSummary)
	}
	if got, want := riskSummary.Blocking, []string{"critical_1", "high_1"}; !reflect.DeepEqual(got, want) {
		t.Fatalf("blocking risks mismatch: got %#v want %#v", got, want)
	}
}

func TestResultExplanationEvidenceRefs(t *testing.T) {
	document := map[string]any{
		"evidence_refs": []any{
			" evidence_package:evidence_job_1 ",
			"model_run:m1",
			42,
			"",
		},
		"statements": []any{
			map[string]any{
				"evidence_refs": []any{"artifact:a1", "model_run:m1"},
			},
			map[string]any{
				"evidence_refs": "artifact:not_an_array",
			},
			42,
		},
	}
	if got, want := ResultExplanationEvidenceRefs(document), []string{"artifact:a1", "evidence_package:evidence_job_1", "model_run:m1"}; !reflect.DeepEqual(got, want) {
		t.Fatalf("result explanation evidence refs mismatch: got %#v want %#v", got, want)
	}
}

func TestEvaluateProductionReadinessReady(t *testing.T) {
	evaluation := EvaluateProductionReadiness(ReadinessInput{
		JobID:                       "job_1",
		JobSucceeded:                true,
		EvidenceRef:                 "evidence_package:evidence_job_1",
		GovernanceProductionAllowed: true,
		RiskFindings:                nil,
	})
	if !evaluation.ProductionReady || evaluation.ReadinessStatus != "ready_for_external_approval" {
		t.Fatalf("expected ready evaluation, got %#v", evaluation)
	}
	if len(evaluation.BlockingReasons) != 0 || len(evaluation.Warnings) != 0 {
		t.Fatalf("expected no blocking reasons or warnings, got %#v", evaluation)
	}
	if got, want := readinessStatuses(evaluation.Checks), []string{"job_succeeded:passed", "evidence_package_available:passed", "governance_production_allowed:passed", "risk_findings_no_high_or_critical:passed"}; !reflect.DeepEqual(got, want) {
		t.Fatalf("checks mismatch: got %#v want %#v", got, want)
	}
}

func TestEvaluateProductionReadinessBlocksFailures(t *testing.T) {
	evaluation := EvaluateProductionReadiness(ReadinessInput{
		JobID:                       "job_1",
		JobSucceeded:                false,
		EvidenceRef:                 "evidence_package:evidence_job_1",
		GovernanceProductionAllowed: false,
		RiskFindings: []map[string]any{
			{"risk_code": "critical_1", "severity": "critical"},
			{"risk_code": "high_1", "severity": "high"},
		},
		RiskEvidenceRefs: []string{"model_run:m1", "artifact:a1"},
	})
	if evaluation.ProductionReady || evaluation.ReadinessStatus != "blocked" {
		t.Fatalf("expected blocked evaluation, got %#v", evaluation)
	}
	if got, want := evaluation.BlockingReasons, []string{"governance_not_production_allowed", "job_not_succeeded", "risk_findings_blocking_severity"}; !reflect.DeepEqual(got, want) {
		t.Fatalf("blocking reasons mismatch: got %#v want %#v", got, want)
	}
	if got, want := evaluation.RiskSummary.Blocking, []string{"critical_1", "high_1"}; !reflect.DeepEqual(got, want) {
		t.Fatalf("risk blocking mismatch: got %#v want %#v", got, want)
	}
	last := evaluation.Checks[len(evaluation.Checks)-1]
	if last.CheckID != "risk_findings_no_high_or_critical" || last.Status != "failed" {
		t.Fatalf("expected failed risk check, got %#v", last)
	}
	if got, want := last.EvidenceRefs, []string{"artifact:a1", "model_run:m1"}; !reflect.DeepEqual(got, want) {
		t.Fatalf("risk evidence refs mismatch: got %#v want %#v", got, want)
	}
}

func TestEvaluateProductionReadinessMediumRiskWarns(t *testing.T) {
	evaluation := EvaluateProductionReadiness(ReadinessInput{
		JobID:                       "job_1",
		JobSucceeded:                true,
		EvidenceRef:                 "evidence_package:evidence_job_1",
		GovernanceProductionAllowed: true,
		RiskFindings: []map[string]any{
			{"risk_code": "medium_1", "severity": "medium"},
		},
	})
	if !evaluation.ProductionReady || evaluation.ReadinessStatus != "ready_for_external_approval" {
		t.Fatalf("expected warning-only ready evaluation, got %#v", evaluation)
	}
	if got, want := evaluation.Warnings, []string{"medium_risk_findings_present"}; !reflect.DeepEqual(got, want) {
		t.Fatalf("warnings mismatch: got %#v want %#v", got, want)
	}
	last := evaluation.Checks[len(evaluation.Checks)-1]
	if last.CheckID != "risk_findings_no_high_or_critical" || last.Status != "warning" {
		t.Fatalf("expected warning risk check, got %#v", last)
	}
}

func readinessStatuses(checks []ReadinessCheck) []string {
	result := make([]string, 0, len(checks))
	for _, check := range checks {
		result = append(result, check.CheckID+":"+check.Status)
	}
	return result
}

func expectedSHA256Hex(bytes []byte) string {
	sum := sha256.Sum256(bytes)
	return hex.EncodeToString(sum[:])
}
