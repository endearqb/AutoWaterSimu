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

func TestHTTPBenchmarkRunTenantProjectSiteScope(t *testing.T) {
	svc := testService(t)
	ctx := context.Background()
	if _, _, err := svc.CreateJob(ctx, scopedFixtureJobBytes(t, "job_benchmark_scope_alpha", "tenant_a", "project_a", "site_a"), ""); err != nil {
		t.Fatal(err)
	}
	if _, _, err := svc.CreateJob(ctx, scopedFixtureJobBytes(t, "job_benchmark_scope_beta", "tenant_b", "project_b", "site_b"), ""); err != nil {
		t.Fatal(err)
	}
	benchmarkRun := func(benchmarkRunID, jobID string, executedAt time.Time) BenchmarkRunRecord {
		return BenchmarkRunRecord{
			BenchmarkRunID:  benchmarkRunID,
			SchemaVersion:   "benchmark_run.v1",
			ModelKey:        "material_balance",
			ModelVersion:    "material_balance.v1",
			BenchmarkCaseID: "bc_material_balance_minimal",
			ParameterSetID:  "ps_material_balance_default_v1",
			ModelRunID:      "mr_" + benchmarkRunID,
			JobID:           jobID,
			Status:          "passed",
			PayloadHash:     "sha256:" + strings.Repeat("a", 64),
			Payload:         mustJSON(map[string]any{"benchmark_run_id": benchmarkRunID, "job_id": jobID}),
			SourceSystem:    "test",
			RequestedBy:     "tester",
			Metadata:        mustJSON(map[string]any{}),
			ExecutedAt:      executedAt,
			CreatedAt:       executedAt,
		}
	}
	now := time.Now().UTC()
	if _, _, err := svc.store.UpsertBenchmarkRun(ctx, benchmarkRun("br_scope_alpha", "job_benchmark_scope_alpha", now.Add(-time.Minute)), nil); err != nil {
		t.Fatal(err)
	}
	if _, _, err := svc.store.UpsertBenchmarkRun(ctx, benchmarkRun("br_scope_beta", "job_benchmark_scope_beta", now), nil); err != nil {
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
	listPath := "/api/v1/model-catalog/material_balance/versions/material_balance.v1/benchmark-runs"

	req := httptest.NewRequest(http.MethodGet, "/api/v1/benchmark-runs/br_scope_alpha", nil)
	req.Header.Set("Authorization", "Bearer tenant-a-token")
	rec := httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("tenant scoped benchmark_run get should pass: %d %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/benchmark-runs/br_scope_beta", nil)
	req.Header.Set("Authorization", "Bearer tenant-a-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("tenant scoped benchmark_run get should reject cross-scope job, got %d %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, listPath+"?job_id=job_benchmark_scope_alpha", nil)
	req.Header.Set("Authorization", "Bearer tenant-a-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("tenant scoped benchmark_run list by matching job should pass: %d %s", rec.Code, rec.Body.String())
	}
	var scopedList ListBenchmarkRunsResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &scopedList); err != nil {
		t.Fatal(err)
	}
	if scopedList.TotalEstimate != 1 || len(scopedList.Items) != 1 || scopedList.Items[0].BenchmarkRunID != "br_scope_alpha" {
		t.Fatalf("tenant scoped benchmark_run list should include only matching job, got %#v", scopedList)
	}

	req = httptest.NewRequest(http.MethodGet, listPath+"?job_id=job_benchmark_scope_beta", nil)
	req.Header.Set("Authorization", "Bearer tenant-a-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("tenant scoped benchmark_run list should reject cross-scope job, got %d %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, listPath, nil)
	req.Header.Set("Authorization", "Bearer tenant-a-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("tenant scoped benchmark_run list should require job_id to avoid cross-scope leakage, got %d %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, listPath, nil)
	req.Header.Set("Authorization", "Bearer global-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("global benchmark_run list should pass: %d %s", rec.Code, rec.Body.String())
	}
	var globalList ListBenchmarkRunsResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &globalList); err != nil {
		t.Fatal(err)
	}
	if globalList.TotalEstimate != 2 || len(globalList.Items) != 2 {
		t.Fatalf("global token should see all benchmark runs, got %#v", globalList)
	}
}
