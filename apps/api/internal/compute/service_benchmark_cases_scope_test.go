package compute

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestHTTPBenchmarkScheduleRunMutationTenantProjectSiteScope(t *testing.T) {
	path := "/api/v1/model-catalog/material_balance/versions/material_balance.v1/benchmark-cases/bc_material_balance_minimal_v1/schedule-run"
	ctx := context.Background()
	newScopedServer := func(inputTenantID, inputProjectID, inputSiteID string) (*Service, http.Handler) {
		t.Helper()
		svc := testValidatedService(t)
		auth, err := NewAuthenticator(`{"tokens":[
			{"name":"scope-a","token":"scope-a-token","scopes":["job:create"],"tenant_id":"tenant_a","project_id":"project_a","site_id":"site_a"},
			{"name":"global","token":"global-token","scopes":["job:create"]}
		]}`)
		if err != nil {
			t.Fatal(err)
		}
		server := NewServer(svc, auth, nil).Routes()
		req := httptest.NewRequest(http.MethodPost, "/api/v1/simulation-inputs", bytes.NewReader(scopedSimulationInputBytes(t, "si_material_balance_minimal", "pg_benchmark_scope_"+inputSiteID, inputTenantID, inputProjectID, inputSiteID)))
		req.Header.Set("Authorization", "Bearer global-token")
		rec := httptest.NewRecorder()
		server.ServeHTTP(rec, req)
		if rec.Code != http.StatusCreated {
			t.Fatalf("scoped benchmark simulation input register failed: %d %s", rec.Code, rec.Body.String())
		}
		return svc, server
	}
	schedule := func(server http.Handler, body string, expectedStatus int) *httptest.ResponseRecorder {
		t.Helper()
		req := httptest.NewRequest(http.MethodPost, path, strings.NewReader(body))
		req.Header.Set("Authorization", "Bearer scope-a-token")
		rec := httptest.NewRecorder()
		server.ServeHTTP(rec, req)
		if rec.Code != expectedStatus {
			t.Fatalf("benchmark schedule-run got %d want %d: %s", rec.Code, expectedStatus, rec.Body.String())
		}
		return rec
	}

	svc, server := newScopedServer("tenant_a", "project_a", "site_a")
	rec := schedule(server, `{"request_id":"bench_req_scope_alpha","metadata":{"tenant_id":"tenant_a","project_id":"project_a","site_id":"site_a"}}`, http.StatusAccepted)
	var snapshot JobSnapshot
	if err := json.Unmarshal(rec.Body.Bytes(), &snapshot); err != nil {
		t.Fatal(err)
	}
	if snapshot.Job.JobID != "job_benchmark_bench_req_scope_alpha" ||
		snapshot.Job.TenantID != "tenant_a" ||
		snapshot.Job.ProjectID != "project_a" ||
		snapshot.Job.SiteID != "site_a" {
		t.Fatalf("scoped benchmark schedule-run should create scoped job, got %#v", snapshot.Job)
	}
	schedule(server, `{"request_id":"bench_req_scope_cross_job","metadata":{"tenant_id":"tenant_a","project_id":"project_a","site_id":"site_b"}}`, http.StatusForbidden)
	if _, err := svc.GetJob(ctx, "job_benchmark_bench_req_scope_cross_job"); err == nil {
		t.Fatalf("cross-scope benchmark schedule-run job metadata must not write a job")
	}

	svcInput, serverInput := newScopedServer("tenant_b", "project_b", "site_b")
	schedule(serverInput, `{"request_id":"bench_req_scope_cross_input","metadata":{"tenant_id":"tenant_a","project_id":"project_a","site_id":"site_a"}}`, http.StatusForbidden)
	if _, err := svcInput.GetJob(ctx, "job_benchmark_bench_req_scope_cross_input"); err == nil {
		t.Fatalf("cross-scope benchmark schedule-run input_ref must not write a job")
	}
}
