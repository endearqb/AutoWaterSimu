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

func expectedSHA256Hex(bytes []byte) string {
	sum := sha256.Sum256(bytes)
	return hex.EncodeToString(sum[:])
}
