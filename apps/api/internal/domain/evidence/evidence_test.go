package evidence

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"reflect"
	"testing"
	"time"
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

func TestStoredResultSummaryCopiesRiskFindingsIntoObjectSummary(t *testing.T) {
	originalSummary := map[string]any{"converged": true}
	riskFindings := []any{
		map[string]any{"risk_code": "info_1", "severity": "info"},
	}
	stored, ok := StoredResultSummary(map[string]any{
		"summary":       originalSummary,
		"risk_findings": riskFindings,
	}).(map[string]any)
	if !ok {
		t.Fatalf("expected stored summary object, got %#v", stored)
	}
	if stored["converged"] != true || !reflect.DeepEqual(stored["risk_findings"], riskFindings) {
		t.Fatalf("unexpected stored summary: %#v", stored)
	}
	if _, exists := originalSummary["risk_findings"]; exists {
		t.Fatalf("expected original summary to remain unchanged: %#v", originalSummary)
	}
}

func TestStoredResultSummaryPreservesSummaryWithoutTopLevelRiskFindings(t *testing.T) {
	summary := map[string]any{"converged": true}
	stored := StoredResultSummary(map[string]any{"summary": summary})
	if !reflect.DeepEqual(stored, summary) {
		t.Fatalf("unexpected stored summary: got %#v want %#v", stored, summary)
	}
}

func TestStoredResultSummaryPreservesNonObjectSummary(t *testing.T) {
	stored := StoredResultSummary(map[string]any{
		"summary":       "worker failed",
		"risk_findings": []any{map[string]any{"risk_code": "ignored_for_non_object"}},
	})
	if stored != "worker failed" {
		t.Fatalf("expected non-object summary to be preserved, got %#v", stored)
	}
}

func TestStoredResultSummaryNilResult(t *testing.T) {
	if stored := StoredResultSummary(nil); stored != nil {
		t.Fatalf("expected nil summary for nil result, got %#v", stored)
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

func TestResultExplanationRecordDataFromDocument(t *testing.T) {
	now := time.Date(2026, 6, 3, 12, 34, 56, 0, time.UTC)
	document := map[string]any{
		"schema_version": "result_explanation.v1",
		"explanation_id": " explanation_1 ",
		"job_id":         " job_1 ",
		"created_by":     " agent:evidence ",
		"evidence_refs":  []any{"model_run:mr_1"},
		"metadata": map[string]any{
			"source_system": " NewSystem ",
			"requested_by":  " user_1 ",
			"tenant_id":     " tenant_override ",
			"project_id":    " project_override ",
		},
	}
	resolvedRefs := []string{"model_run:mr_1", "artifact:a1"}
	record, err := ResultExplanationRecordDataFromDocument(ResultExplanationRecordDataInput{
		Document:             document,
		Job:                  ResultExplanationJobContext{JobID: " job_1 ", TenantID: "tenant_job", ProjectID: "project_job"},
		ResolvedEvidenceRefs: resolvedRefs,
		DefaultSourceSystem:  "compute-api",
		DefaultRequestedBy:   "fallback-user",
		Now:                  now,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	resolvedRefs[0] = "model_run:changed"
	payload, _ := json.Marshal(document)
	if record.SchemaVersion != ResultExplanationRecordSchema ||
		record.ExplanationID != "explanation_1" ||
		record.ExplanationSchemaVersion != ResultExplanationSchema ||
		record.JobID != "job_1" ||
		record.Status != ResultExplanationStatusSubmitted ||
		record.CreatedBy != "agent:evidence" ||
		record.PayloadHash != "sha256:"+sha256Hex(payload) ||
		string(record.Payload) != string(payload) ||
		!reflect.DeepEqual(record.ResolvedEvidenceRefs, []string{"model_run:mr_1", "artifact:a1"}) ||
		record.SourceSystem != "NewSystem" ||
		record.RequestedBy != "user_1" ||
		record.TenantID != "tenant_override" ||
		record.ProjectID != "project_override" ||
		string(record.Metadata) == "null" ||
		!record.SubmittedAt.Equal(now) ||
		!record.CreatedAt.Equal(now) ||
		!record.UpdatedAt.Equal(now) {
		t.Fatalf("unexpected record data: %#v", record)
	}
}

func TestResultExplanationRecordDataFromDocumentDefaultsMetadata(t *testing.T) {
	now := time.Date(2026, 6, 3, 12, 0, 0, 0, time.UTC)
	record, err := ResultExplanationRecordDataFromDocument(ResultExplanationRecordDataInput{
		Document: map[string]any{
			"schema_version": "result_explanation.v1",
			"explanation_id": "explanation_1",
			"created_by":     "agent:evidence",
		},
		Job: ResultExplanationJobContext{
			JobID:     "job_1",
			TenantID:  "tenant_job",
			ProjectID: "project_job",
		},
		Now: now,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if record.SourceSystem != "compute-api" ||
		record.RequestedBy != "unknown" ||
		record.TenantID != "tenant_job" ||
		record.ProjectID != "project_job" ||
		string(record.Metadata) != "null" {
		t.Fatalf("unexpected defaults: %#v", record)
	}
}

func TestResultExplanationRecordDataFromDocumentRequiresIdentityFields(t *testing.T) {
	_, err := ResultExplanationRecordDataFromDocument(ResultExplanationRecordDataInput{
		Document: map[string]any{
			"schema_version": "result_explanation.v1",
			"created_by":     "agent:evidence",
		},
	})
	if err == nil || err.Error() != "explanation_id is required" {
		t.Fatalf("unexpected explanation_id error: %v", err)
	}
	_, err = ResultExplanationRecordDataFromDocument(ResultExplanationRecordDataInput{
		Document: map[string]any{
			"schema_version": "result_explanation.v1",
			"explanation_id": "explanation_1",
		},
	})
	if err == nil || err.Error() != "created_by is required" {
		t.Fatalf("unexpected created_by error: %v", err)
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
