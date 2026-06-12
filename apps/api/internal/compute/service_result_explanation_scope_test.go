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

func TestHTTPResultExplanationMutationTenantProjectSiteScope(t *testing.T) {
	svc := testValidatedService(t)
	ctx := context.Background()
	completeScopedJob := func(jobID, workerID, modelRunID, tenantID, projectID, siteID string) {
		t.Helper()
		if _, _, err := svc.CreateJob(ctx, scopedFixtureJobBytes(t, jobID, tenantID, projectID, siteID), ""); err != nil {
			t.Fatal(err)
		}
		if _, err := svc.RegisterWorker(ctx, compatibleWorkerRegistration(workerID)); err != nil {
			t.Fatal(err)
		}
		if _, err := svc.Claim(ctx, workerID); err != nil {
			t.Fatal(err)
		}
		defaultParameterHash := builtInModelCatalog("2026-05-30T00:00:00Z").Models[0].Versions[0].DefaultParameterSet.ParameterHash
		modelRun := map[string]any{
			"schema_version":  "model_run.v1",
			"model_run_id":    modelRunID,
			"job_id":          jobID,
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
			"job_id":         jobID,
			"job_type":       "simulation.material_balance.v1",
			"status":         StatusSucceeded,
			"summary":        map[string]any{"converged": true},
			"data":           map[string]any{},
			"quality":        map[string]any{"data_quality": "ok", "warnings": []any{}},
			"artifacts":      []any{},
			"runtime_audit":  map[string]any{"model_runs": []any{modelRun}, "timings_ms": map[string]any{}, "fallback_used": false},
		}
		if _, err := svc.Complete(ctx, workerID, jobID, 1, result); err != nil {
			t.Fatal(err)
		}
	}
	explanationBytes := func(jobID, explanationID, modelRunID string) []byte {
		t.Helper()
		bytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance.result_explanation.v1.json"))
		if err != nil {
			t.Fatal(err)
		}
		explanation := decodeMap(t, bytes)
		explanation["job_id"] = jobID
		explanation["explanation_id"] = explanationID
		explanation["evidence_refs"] = []any{
			"evidence_package:evidence_" + safeIDPart(jobID),
			"model_run:" + modelRunID,
		}
		statements, ok := explanation["statements"].([]any)
		if !ok || len(statements) == 0 {
			t.Fatalf("fixture should include statements, got %#v", explanation["statements"])
		}
		statement, ok := statements[0].(map[string]any)
		if !ok {
			t.Fatalf("fixture statement should be an object, got %#v", statements[0])
		}
		statement["evidence_refs"] = []any{"model_run:" + modelRunID}
		return encodeMap(t, explanation)
	}

	alphaJobID := "job_result_explanation_scope_alpha"
	betaJobID := "job_result_explanation_scope_beta"
	alphaExplanationID := "explanation_scope_alpha"
	betaExplanationID := "explanation_scope_beta"
	completeScopedJob(alphaJobID, "worker_result_explanation_scope_alpha", "mr_result_explanation_scope_alpha", "tenant_a", "project_a", "site_a")
	completeScopedJob(betaJobID, "worker_result_explanation_scope_beta", "mr_result_explanation_scope_beta", "tenant_b", "project_b", "site_b")

	auth, err := NewAuthenticator(`{"tokens":[
		{"name":"scope-a-explainer","token":"scope-a-token","scopes":["job:read","explanation:write"],"tenant_id":"tenant_a","project_id":"project_a","site_id":"site_a"},
		{"name":"global-explainer","token":"global-token","scopes":["job:read","explanation:write"]}
	]}`)
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()
	submitPath := func(jobID string) string {
		return "/api/v1/compute/jobs/" + jobID + "/result-explanations"
	}
	reviewPath := func(jobID, explanationID string) string {
		return submitPath(jobID) + "/" + explanationID + "/review"
	}
	publishPath := func(jobID, explanationID string) string {
		return submitPath(jobID) + "/" + explanationID + "/publish"
	}
	post := func(path, token string, body []byte, expectedStatus int) {
		t.Helper()
		req := httptest.NewRequest(http.MethodPost, path, bytes.NewReader(body))
		req.Header.Set("Authorization", "Bearer "+token)
		rec := httptest.NewRecorder()
		server.ServeHTTP(rec, req)
		if rec.Code != expectedStatus {
			t.Fatalf("POST %s with %s got %d want %d: %s", path, token, rec.Code, expectedStatus, rec.Body.String())
		}
	}

	deniedBetaExplanationID := "explanation_scope_beta_denied"
	post(submitPath(betaJobID), "scope-a-token", explanationBytes(betaJobID, deniedBetaExplanationID, "mr_result_explanation_scope_beta"), http.StatusForbidden)
	if _, err := svc.GetResultExplanation(ctx, betaJobID, deniedBetaExplanationID); ToAppError(err).Status != http.StatusNotFound {
		t.Fatalf("cross-scope submit must not persist a result explanation, got err=%v", err)
	}

	post(submitPath(betaJobID), "global-token", explanationBytes(betaJobID, betaExplanationID, "mr_result_explanation_scope_beta"), http.StatusCreated)
	post(reviewPath(betaJobID, betaExplanationID), "scope-a-token", []byte(`{"decision":"approved","reason":"cross scope"}`), http.StatusForbidden)
	post(publishPath(betaJobID, betaExplanationID), "scope-a-token", nil, http.StatusForbidden)
	betaRecord, err := svc.GetResultExplanation(ctx, betaJobID, betaExplanationID)
	if err != nil {
		t.Fatal(err)
	}
	if betaRecord.Status != "submitted" || betaRecord.ReviewedBy != "" || betaRecord.PublishedBy != "" {
		t.Fatalf("cross-scope review/publish must not mutate explanation, got %#v", betaRecord)
	}
	betaEvents, err := svc.Events(ctx, betaJobID)
	if err != nil {
		t.Fatal(err)
	}
	for _, event := range betaEvents {
		if event.EventType == "result_explanation.reviewed" || event.EventType == "result_explanation.published" {
			t.Fatalf("cross-scope review/publish must not write audit events, got %#v", betaEvents)
		}
	}

	post(submitPath(alphaJobID), "scope-a-token", explanationBytes(alphaJobID, alphaExplanationID, "mr_result_explanation_scope_alpha"), http.StatusCreated)
	post(reviewPath(alphaJobID, alphaExplanationID), "scope-a-token", []byte(`{"decision":"approved","reason":"same scope"}`), http.StatusOK)
	post(publishPath(alphaJobID, alphaExplanationID), "scope-a-token", nil, http.StatusOK)
	alphaRecord, err := svc.GetResultExplanation(ctx, alphaJobID, alphaExplanationID)
	if err != nil {
		t.Fatal(err)
	}
	if alphaRecord.Status != "published" || alphaRecord.ReviewedBy != "scope-a-explainer" || alphaRecord.PublishedBy != "scope-a-explainer" {
		t.Fatalf("same-scope result explanation flow should pass, got %#v", alphaRecord)
	}
}
