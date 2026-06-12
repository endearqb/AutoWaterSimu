package compute

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHTTPSimulationCheckMutationTenantProjectSiteScope(t *testing.T) {
	svc := testValidatedService(t)
	auth, err := NewAuthenticator(`{"tokens":[
		{"name":"scope-a","token":"scope-a-token","scopes":["job:create"],"tenant_id":"tenant_a","project_id":"project_a","site_id":"site_a"},
		{"name":"global","token":"global-token","scopes":["job:create"]}
	]}`)
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()
	ctx := context.Background()
	postSimulationCheck := func(body []byte, token string, expectedStatus int) *httptest.ResponseRecorder {
		t.Helper()
		req := httptest.NewRequest(http.MethodPost, "/api/v1/simulation-checks", bytes.NewReader(body))
		req.Header.Set("Authorization", "Bearer "+token)
		rec := httptest.NewRecorder()
		server.ServeHTTP(rec, req)
		if rec.Code != expectedStatus {
			t.Fatalf("simulation check with %s got %d want %d: %s", token, rec.Code, expectedStatus, rec.Body.String())
		}
		return rec
	}

	rec := postSimulationCheck(scopedSimulationCheckBytes(t, "sim_req_check_scope_alpha", "si_check_scope_alpha", "tenant_a", "project_a", "site_a", "", "", ""), "scope-a-token", http.StatusAccepted)
	var snapshot JobSnapshot
	if err := json.Unmarshal(rec.Body.Bytes(), &snapshot); err != nil {
		t.Fatal(err)
	}
	if snapshot.Job.JobID != "job_simcheck_sim_req_check_scope_alpha" ||
		snapshot.Job.TenantID != "tenant_a" ||
		snapshot.Job.ProjectID != "project_a" ||
		snapshot.Job.SiteID != "site_a" {
		t.Fatalf("scope-matching simulation check should create scoped job, got %#v", snapshot.Job)
	}
	record, err := svc.GetSimulationInput(ctx, "si_check_scope_alpha")
	if err != nil {
		t.Fatal(err)
	}
	if record.TenantID != "tenant_a" || record.ProjectID != "project_a" || record.SiteID != "site_a" {
		t.Fatalf("embedded simulation_input should inherit simulation request scope before registry write, got %#v", record)
	}

	postSimulationCheck(scopedSimulationCheckBytes(t, "sim_req_check_scope_cross_site", "si_check_scope_cross_site", "tenant_a", "project_a", "site_b", "", "", ""), "scope-a-token", http.StatusForbidden)
	if _, err := svc.GetJob(ctx, "job_simcheck_sim_req_check_scope_cross_site"); err == nil {
		t.Fatalf("cross-scope denied simulation check must not write a job")
	}
	if _, err := svc.GetSimulationInput(ctx, "si_check_scope_cross_site"); err == nil {
		t.Fatalf("cross-scope denied simulation check must not auto-write simulation input")
	}

	postSimulationCheck(scopedSimulationCheckBytes(t, "sim_req_check_scope_input_cross", "si_check_scope_input_cross", "tenant_a", "project_a", "site_a", "tenant_a", "project_b", "site_a"), "scope-a-token", http.StatusForbidden)
	if _, err := svc.GetJob(ctx, "job_simcheck_sim_req_check_scope_input_cross"); err == nil {
		t.Fatalf("cross-scope embedded input must not write a job")
	}
	if _, err := svc.GetSimulationInput(ctx, "si_check_scope_input_cross"); err == nil {
		t.Fatalf("cross-scope embedded input must not write a simulation input")
	}

	auditEvents, _, auditTotal, err := svc.store.ListMutationAuditEvents(ctx, MutationAuditFilter{TargetObject: "SimulationInput", Limit: 10})
	if err != nil {
		t.Fatal(err)
	}
	if auditTotal != 1 || len(auditEvents) != 1 || auditEvents[0].TargetID != "si_check_scope_alpha" {
		t.Fatalf("denied simulation checks must not write simulation input audit events, total=%d events=%#v", auditTotal, auditEvents)
	}
}
