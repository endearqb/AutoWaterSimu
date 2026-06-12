package compute

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestHTTPModelRunTenantProjectSiteScope(t *testing.T) {
	svc := testService(t)
	ctx := context.Background()
	if _, _, err := svc.CreateJob(ctx, scopedFixtureJobBytes(t, "job_scope_alpha", "tenant_a", "project_a", "site_a"), ""); err != nil {
		t.Fatal(err)
	}
	if _, _, err := svc.CreateJob(ctx, scopedFixtureJobBytes(t, "job_scope_beta", "tenant_b", "project_b", "site_b"), ""); err != nil {
		t.Fatal(err)
	}
	modelRun := func(modelRunID, jobID string) json.RawMessage {
		return mustJSON(map[string]any{
			"schema_version":   "model_run.v1",
			"model_run_id":     modelRunID,
			"job_id":           jobID,
			"model_key":        "material_balance",
			"model_version":    "material_balance.v1",
			"parameter_hash":   "sha256:" + strings.Repeat("a", 64),
			"input_hash":       "sha256:" + strings.Repeat("b", 64),
			"quality_metrics":  map[string]any{"convergence_status": "converged"},
			"warnings":         []any{},
			"evidence_refs":    []any{},
			"parameter_set_id": "default",
		})
	}
	if err := svc.store.InsertModelRuns(ctx, "job_scope_alpha", []json.RawMessage{modelRun("mr_scope_alpha", "job_scope_alpha")}, time.Now().UTC()); err != nil {
		t.Fatal(err)
	}
	if err := svc.store.InsertModelRuns(ctx, "job_scope_beta", []json.RawMessage{modelRun("mr_scope_beta", "job_scope_beta")}, time.Now().UTC()); err != nil {
		t.Fatal(err)
	}
	auth, err := NewAuthenticator(`{"tokens":[
		{"name":"tenant-a-reader","token":"tenant-a-token","scopes":["job:read"],"tenant_id":"tenant_a","project_id":"project_a","site_id":"site_a"},
		{"name":"global-reader","token":"global-token","scopes":["job:read"]}
	]}`)
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()

	req := httptest.NewRequest(http.MethodGet, "/api/v1/model-runs/mr_scope_alpha", nil)
	req.Header.Set("Authorization", "Bearer tenant-a-token")
	rec := httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("tenant scoped model run get should pass: %d %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/model-runs/mr_scope_beta", nil)
	req.Header.Set("Authorization", "Bearer tenant-a-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("tenant scoped model run get should reject cross-scope job, got %d %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/model-runs?job_id=job_scope_alpha", nil)
	req.Header.Set("Authorization", "Bearer tenant-a-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("tenant scoped model run list by matching job should pass: %d %s", rec.Code, rec.Body.String())
	}
	var scopedList ListModelRunsResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &scopedList); err != nil {
		t.Fatal(err)
	}
	if scopedList.TotalEstimate != 1 || len(scopedList.Items) != 1 {
		t.Fatalf("tenant scoped model run list should include only matching job, got %#v", scopedList)
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/model-runs?job_id=job_scope_beta", nil)
	req.Header.Set("Authorization", "Bearer tenant-a-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("tenant scoped model run list should reject cross-scope job, got %d %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/model-runs", nil)
	req.Header.Set("Authorization", "Bearer tenant-a-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("tenant scoped model run list should require job_id to avoid cross-scope leakage, got %d %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/model-runs", nil)
	req.Header.Set("Authorization", "Bearer global-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("global model run list should pass: %d %s", rec.Code, rec.Body.String())
	}
	var globalList ListModelRunsResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &globalList); err != nil {
		t.Fatal(err)
	}
	if globalList.TotalEstimate != 2 || len(globalList.Items) != 2 {
		t.Fatalf("global token should see all model runs, got %#v", globalList)
	}
}
