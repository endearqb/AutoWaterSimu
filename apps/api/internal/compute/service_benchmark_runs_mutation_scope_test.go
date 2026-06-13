package compute

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestHTTPBenchmarkRunMutationTenantProjectSiteScope(t *testing.T) {
	svc := testValidatedService(t)
	ctx := context.Background()
	defaultParameterHash := builtInModelCatalog("2026-05-30T00:00:00Z").Models[0].Versions[0].DefaultParameterSet.ParameterHash
	completeJob := func(jobID, workerID, modelRunID, tenantID, projectID, siteID string) {
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
		modelRun := map[string]any{
			"schema_version":  "model_run.v1",
			"model_run_id":    modelRunID,
			"job_id":          jobID,
			"model_key":       "material_balance",
			"model_version":   "material_balance.v1",
			"parameter_hash":  defaultParameterHash,
			"input_hash":      "sha256:" + strings.Repeat("c", 64),
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
	completeJob("job_benchmark_mutation_alpha", "worker_benchmark_mutation_alpha", "mr_benchmark_mutation_alpha", "tenant_a", "project_a", "site_a")
	completeJob("job_benchmark_mutation_beta", "worker_benchmark_mutation_beta", "mr_benchmark_mutation_beta", "tenant_b", "project_b", "site_b")

	auth, err := NewAuthenticator(`{"tokens":[
		{"name":"scope-a","token":"scope-a-token","scopes":["model:write"],"tenant_id":"tenant_a","project_id":"project_a","site_id":"site_a"},
		{"name":"global","token":"global-token","scopes":["model:write"]}
	]}`)
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()
	benchmarkRunBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance.benchmark_run.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	benchmarkRunBody := func(benchmarkRunID, jobID, modelRunID string) []byte {
		t.Helper()
		benchmarkRun := decodeMap(t, benchmarkRunBytes)
		benchmarkRun["benchmark_run_id"] = benchmarkRunID
		benchmarkRun["job_id"] = jobID
		benchmarkRun["model_run_id"] = modelRunID
		benchmarkRun["evidence_refs"] = []any{"model_run:" + modelRunID}
		benchmarkRun["executed_at"] = "2026-06-07T00:00:00Z"
		return encodeMap(t, benchmarkRun)
	}
	postBenchmarkRun := func(body []byte, token string) *httptest.ResponseRecorder {
		t.Helper()
		req := httptest.NewRequest(http.MethodPost, "/api/v1/model-catalog/material_balance/versions/material_balance.v1/benchmark-runs", bytes.NewReader(body))
		req.Header.Set("Authorization", "Bearer "+token)
		rec := httptest.NewRecorder()
		server.ServeHTTP(rec, req)
		return rec
	}

	rec := postBenchmarkRun(benchmarkRunBody("br_benchmark_mutation_alpha", "job_benchmark_mutation_alpha", "mr_benchmark_mutation_alpha"), "scope-a-token")
	if rec.Code != http.StatusCreated {
		t.Fatalf("scope-matching benchmark_run registration should pass, got %d %s", rec.Code, rec.Body.String())
	}
	var record BenchmarkRunRecord
	if err := json.Unmarshal(rec.Body.Bytes(), &record); err != nil {
		t.Fatal(err)
	}
	if record.BenchmarkRunID != "br_benchmark_mutation_alpha" || record.JobID != "job_benchmark_mutation_alpha" {
		t.Fatalf("unexpected scoped benchmark_run record: %#v", record)
	}

	rec = postBenchmarkRun(benchmarkRunBody("br_benchmark_mutation_beta_denied", "job_benchmark_mutation_beta", "mr_benchmark_mutation_beta"), "scope-a-token")
	if rec.Code != http.StatusForbidden {
		t.Fatalf("cross-scope benchmark_run registration should be denied, got %d %s", rec.Code, rec.Body.String())
	}
	if _, err := svc.GetBenchmarkRun(ctx, "br_benchmark_mutation_beta_denied"); err == nil {
		t.Fatalf("cross-scope denied benchmark_run registration must not write a record")
	}
	auditEvents, _, auditTotal, err := svc.store.ListMutationAuditEvents(ctx, MutationAuditFilter{TargetObject: "BenchmarkRun", Limit: 10})
	if err != nil {
		t.Fatal(err)
	}
	if auditTotal != 1 || len(auditEvents) != 1 || auditEvents[0].TargetID != "br_benchmark_mutation_alpha" {
		t.Fatalf("cross-scope denied benchmark_run registration must not write audit events, total=%d events=%#v", auditTotal, auditEvents)
	}
}
