package compute

import (
	"bytes"
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestHTTPResultExplanationAuditEvents(t *testing.T) {
	svc := testValidatedService(t)
	ctx := context.Background()
	if _, _, err := svc.CreateJob(ctx, fixtureJobBytes(t), ""); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.RegisterWorker(ctx, compatibleWorkerRegistration("worker_result_audit")); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Claim(ctx, "worker_result_audit"); err != nil {
		t.Fatal(err)
	}
	defaultParameterHash := builtInModelCatalog("2026-05-30T00:00:00Z").Models[0].Versions[0].DefaultParameterSet.ParameterHash
	modelRun := map[string]any{
		"schema_version":  "model_run.v1",
		"model_run_id":    "mr_material_balance_minimal",
		"job_id":          "job_material_balance_minimal",
		"model_key":       "material_balance",
		"model_version":   "material_balance.v1",
		"parameter_hash":  defaultParameterHash,
		"input_hash":      "sha256:" + strings.Repeat("b", 64),
		"quality_metrics": map[string]any{"convergence_status": "converged"},
		"warnings":        []any{},
		"evidence_refs":   []any{},
	}
	result := map[string]any{
		"schema_version": "compute_result.v1",
		"job_id":         "job_material_balance_minimal",
		"job_type":       "simulation.material_balance.v1",
		"status":         StatusSucceeded,
		"summary":        map[string]any{"converged": true},
		"data":           map[string]any{},
		"quality":        map[string]any{"data_quality": "ok", "warnings": []any{}},
		"artifacts":      []any{},
		"runtime_audit":  map[string]any{"model_runs": []any{modelRun}, "timings_ms": map[string]any{}, "fallback_used": false},
	}
	if _, err := svc.Complete(ctx, "worker_result_audit", "job_material_balance_minimal", 1, result); err != nil {
		t.Fatal(err)
	}

	auth, err := NewAuthenticator(`{"tokens":[
		{"name":"result-auditor","token":"result-audit-token","scopes":["job:read","explanation:write"]}
	]}`)
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()
	explanationBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance.result_explanation.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	explanationID := "explanation_material_balance_minimal"
	req := httptest.NewRequest(http.MethodPost, "/api/v1/compute/jobs/job_material_balance_minimal/result-explanations", bytes.NewReader(explanationBytes))
	req.Header.Set("Authorization", "Bearer result-audit-token")
	rec := httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("result explanation submit failed: %d %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/compute/jobs/job_material_balance_minimal/result-explanations", bytes.NewReader(explanationBytes))
	req.Header.Set("Authorization", "Bearer result-audit-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("duplicate submit should be idempotent: %d %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/compute/jobs/job_material_balance_minimal/result-explanations/"+explanationID+"/review", strings.NewReader(`{"decision":"approved","reason":"evidence refs verified"}`))
	req.Header.Set("Authorization", "Bearer result-audit-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("result explanation review failed: %d %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/compute/jobs/job_material_balance_minimal/result-explanations/"+explanationID+"/publish", nil)
	req.Header.Set("Authorization", "Bearer result-audit-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("result explanation publish failed: %d %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/compute/jobs/job_material_balance_minimal/result-explanations/"+explanationID+"/publish", nil)
	req.Header.Set("Authorization", "Bearer result-audit-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("duplicate publish should be idempotent: %d %s", rec.Code, rec.Body.String())
	}

	events, err := svc.Events(context.Background(), "job_material_balance_minimal")
	if err != nil {
		t.Fatal(err)
	}
	counts := map[string]int{}
	byType := map[string]EventRecord{}
	for _, event := range events {
		if strings.HasPrefix(event.EventType, "result_explanation.") {
			counts[event.EventType]++
			byType[event.EventType] = event
		}
	}
	if counts["result_explanation.submitted"] != 1 ||
		counts["result_explanation.reviewed"] != 1 ||
		counts["result_explanation.published"] != 1 {
		t.Fatalf("expected one audit event per result explanation mutation, got counts=%#v events=%#v", counts, events)
	}

	assertResultExplanationAudit := func(eventType, action, path, status string) map[string]any {
		t.Helper()
		event := byType[eventType]
		payload := eventPayloadMap(t, event)
		if payload["explanation_id"] != explanationID || payload["status"] != status {
			t.Fatalf("unexpected %s payload: %#v", eventType, payload)
		}
		if _, ok := payload["payload"]; ok {
			t.Fatalf("%s audit payload must not include full explanation payload: %#v", eventType, payload)
		}
		audit := eventAuditMap(t, event)
		if audit["who"] != "result-auditor" ||
			audit["where"] != path ||
			audit["target_object"] != "ResultExplanation" ||
			audit["target_id"] != explanationID ||
			audit["action"] != action ||
			audit["trace_id"] != "trace_material_balance_minimal" {
			t.Fatalf("unexpected audit envelope for %s: %#v", eventType, audit)
		}
		if audit["when"] == "" {
			t.Fatalf("%s audit envelope should include when: %#v", eventType, audit)
		}
		return audit
	}
	submittedAudit := assertResultExplanationAudit(
		"result_explanation.submitted",
		"result_explanation.submit",
		"POST /api/v1/compute/jobs/job_material_balance_minimal/result-explanations",
		"submitted",
	)
	if submittedAudit["before"] != nil {
		t.Fatalf("submit audit should not have before state: %#v", submittedAudit["before"])
	}
	submittedAfter, ok := submittedAudit["after"].(map[string]any)
	if !ok || submittedAfter["payload_hash"] == "" || submittedAfter["resolved_evidence_ref_count"].(float64) != 2 {
		t.Fatalf("submit audit should include compact after state: %#v", submittedAudit["after"])
	}

	reviewedAudit := assertResultExplanationAudit(
		"result_explanation.reviewed",
		"result_explanation.review",
		"POST /api/v1/compute/jobs/job_material_balance_minimal/result-explanations/"+explanationID+"/review",
		"approved",
	)
	reviewBefore, ok := reviewedAudit["before"].(map[string]any)
	if !ok || reviewBefore["status"] != "submitted" {
		t.Fatalf("review audit should include submitted before state: %#v", reviewedAudit["before"])
	}
	reviewAfter, ok := reviewedAudit["after"].(map[string]any)
	if !ok || reviewAfter["status"] != "approved" || reviewAfter["review_decision"] != "approved" {
		t.Fatalf("review audit should include approved after state: %#v", reviewedAudit["after"])
	}
	if reviewedAudit["reason"] != "evidence refs verified" {
		t.Fatalf("review audit should preserve reason, got %#v", reviewedAudit)
	}

	publishedAudit := assertResultExplanationAudit(
		"result_explanation.published",
		"result_explanation.publish",
		"POST /api/v1/compute/jobs/job_material_balance_minimal/result-explanations/"+explanationID+"/publish",
		"published",
	)
	publishBefore, ok := publishedAudit["before"].(map[string]any)
	if !ok || publishBefore["status"] != "approved" {
		t.Fatalf("publish audit should include approved before state: %#v", publishedAudit["before"])
	}
	publishAfter, ok := publishedAudit["after"].(map[string]any)
	if !ok || publishAfter["status"] != "published" || publishAfter["published_by"] != "result-auditor" {
		t.Fatalf("publish audit should include published after state: %#v", publishedAudit["after"])
	}
}
