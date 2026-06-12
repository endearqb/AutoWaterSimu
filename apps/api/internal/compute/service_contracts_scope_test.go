package compute

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHTTPDraftConfirmationTenantProjectSiteScope(t *testing.T) {
	svc := testValidatedService(t)
	auth, err := NewAuthenticator(`{"tokens":[
		{"name":"scope-a","token":"scope-a-token","scopes":["job:create","job:read"],"tenant_id":"tenant_a","project_id":"project_a","site_id":"site_a"},
		{"name":"global","token":"global-token","scopes":["job:create","job:read"]}
	]}`)
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()
	ctx := context.Background()

	postConfirmation := func(body []byte, token string) ContractValidationResponse {
		t.Helper()
		req := httptest.NewRequest(http.MethodPost, "/api/v1/contracts/confirm-draft", bytes.NewReader(body))
		req.Header.Set("Authorization", "Bearer "+token)
		rec := httptest.NewRecorder()
		server.ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatalf("confirm draft failed: %d %s", rec.Code, rec.Body.String())
		}
		var response ContractValidationResponse
		if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
			t.Fatal(err)
		}
		if !response.Valid || response.ConfirmationRecord == nil {
			t.Fatalf("unexpected confirmation response: %#v", response)
		}
		return response
	}
	request := func(method, path, token string) *httptest.ResponseRecorder {
		t.Helper()
		req := httptest.NewRequest(method, path, nil)
		req.Header.Set("Authorization", "Bearer "+token)
		rec := httptest.NewRecorder()
		server.ServeHTTP(rec, req)
		return rec
	}

	agentAlpha := postConfirmation(scopedDraftConfirmationBytes(t, "material_balance_promotable.draft_confirmation.v1.json", "confirm_scope_alpha", "tenant_a", "project_a", "site_a"), "global-token")
	if agentAlpha.ConfirmationRecord.TenantID != "tenant_a" ||
		agentAlpha.ConfirmationRecord.ProjectID != "project_a" ||
		agentAlpha.ConfirmationRecord.SiteID != "site_a" {
		t.Fatalf("draft confirmation should persist tenant/project/site metadata, got %#v", agentAlpha.ConfirmationRecord)
	}
	postConfirmation(scopedDraftConfirmationBytes(t, "material_balance_promotable.draft_confirmation.v1.json", "confirm_scope_cross_site", "tenant_a", "project_a", "site_b"), "global-token")
	postConfirmation(scopedDraftConfirmationBytesWithProposedScope(t, "material_balance_promotable.draft_confirmation.v1.json", "confirm_scope_proposed_cross", "tenant_a", "project_a", "site_a", "tenant_a", "project_a", "site_b"), "global-token")
	postConfirmation(scopedDraftConfirmationBytes(t, "material_balance_constraint.draft_confirmation.v1.json", "confirm_scope_constraint_alpha", "tenant_a", "project_a", "site_a"), "global-token")
	postConfirmation(scopedDraftConfirmationBytes(t, "material_balance_constraint.draft_confirmation.v1.json", "confirm_scope_constraint_cross_project", "tenant_a", "project_b", "site_a"), "global-token")

	rec := request(http.MethodGet, "/api/v1/contracts/confirmations/confirm_scope_alpha", "scope-a-token")
	if rec.Code != http.StatusOK {
		t.Fatalf("scope-matching draft confirmation read should pass: %d %s", rec.Code, rec.Body.String())
	}
	rec = request(http.MethodGet, "/api/v1/contracts/confirmations/confirm_scope_cross_site", "scope-a-token")
	if rec.Code != http.StatusForbidden {
		t.Fatalf("cross-site draft confirmation read should be denied, got %d %s", rec.Code, rec.Body.String())
	}
	rec = request(http.MethodGet, "/api/v1/contracts/confirmations/confirm_scope_cross_site", "global-token")
	if rec.Code != http.StatusOK {
		t.Fatalf("global draft confirmation read should pass: %d %s", rec.Code, rec.Body.String())
	}

	rec = request(http.MethodGet, "/api/v1/contracts/confirmations/confirm_scope_constraint_alpha/constraint-application-plan", "scope-a-token")
	if rec.Code != http.StatusOK {
		t.Fatalf("scope-matching constraint plan should pass: %d %s", rec.Code, rec.Body.String())
	}
	rec = request(http.MethodGet, "/api/v1/contracts/confirmations/confirm_scope_constraint_cross_project/constraint-application-plan", "scope-a-token")
	if rec.Code != http.StatusForbidden {
		t.Fatalf("cross-project constraint plan should be denied, got %d %s", rec.Code, rec.Body.String())
	}

	rec = request(http.MethodPost, "/api/v1/contracts/confirmations/confirm_scope_alpha/promote-simulation-check", "scope-a-token")
	if rec.Code != http.StatusAccepted {
		t.Fatalf("scope-matching draft promotion should pass: %d %s", rec.Code, rec.Body.String())
	}
	var promoted JobSnapshot
	if err := json.Unmarshal(rec.Body.Bytes(), &promoted); err != nil {
		t.Fatal(err)
	}
	if promoted.Job.TenantID != "tenant_a" || promoted.Job.ProjectID != "project_a" || promoted.Job.SiteID != "site_a" {
		t.Fatalf("promoted job should keep scoped metadata, got %#v", promoted.Job)
	}
	rec = request(http.MethodPost, "/api/v1/contracts/confirmations/confirm_scope_cross_site/promote-simulation-check", "scope-a-token")
	if rec.Code != http.StatusForbidden {
		t.Fatalf("cross-site draft promotion should be denied, got %d %s", rec.Code, rec.Body.String())
	}
	rec = request(http.MethodPost, "/api/v1/contracts/confirmations/confirm_scope_proposed_cross/promote-simulation-check", "scope-a-token")
	if rec.Code != http.StatusForbidden {
		t.Fatalf("draft promotion with cross-scope proposed request should be denied, got %d %s", rec.Code, rec.Body.String())
	}
	if _, err := svc.GetJob(ctx, "job_simcheck_sim_req_confirm_scope_proposed_cross"); err == nil {
		t.Fatalf("cross-scope proposed request promotion must not write a job")
	}
}

func TestHTTPDraftConfirmationMutationTenantProjectSiteScope(t *testing.T) {
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

	postConfirmation := func(body []byte, token string, expectedStatus int) *httptest.ResponseRecorder {
		t.Helper()
		req := httptest.NewRequest(http.MethodPost, "/api/v1/contracts/confirm-draft", bytes.NewReader(body))
		req.Header.Set("Authorization", "Bearer "+token)
		rec := httptest.NewRecorder()
		server.ServeHTTP(rec, req)
		if rec.Code != expectedStatus {
			t.Fatalf("confirm draft with %s got %d want %d: %s", token, rec.Code, expectedStatus, rec.Body.String())
		}
		return rec
	}

	deniedID := "confirm_mutation_scope_beta_denied"
	postConfirmation(
		scopedDraftConfirmationBytes(t, "material_balance_promotable.draft_confirmation.v1.json", deniedID, "tenant_b", "project_b", "site_b"),
		"scope-a-token",
		http.StatusForbidden,
	)
	if _, err := svc.GetDraftConfirmation(ctx, deniedID); err == nil || ToAppError(err).Status != http.StatusNotFound {
		t.Fatalf("cross-scope confirm-draft must not persist a confirmation, got err=%v", err)
	}
	auditEvents, _, auditTotal, err := svc.store.ListMutationAuditEvents(ctx, MutationAuditFilter{Limit: 10})
	if err != nil {
		t.Fatal(err)
	}
	if auditTotal != 0 || len(auditEvents) != 0 {
		t.Fatalf("cross-scope confirm-draft must not write audit events, total=%d events=%#v", auditTotal, auditEvents)
	}

	allowedID := "confirm_mutation_scope_alpha"
	rec := postConfirmation(
		scopedDraftConfirmationBytes(t, "material_balance_promotable.draft_confirmation.v1.json", allowedID, "tenant_a", "project_a", "site_a"),
		"scope-a-token",
		http.StatusOK,
	)
	var response ContractValidationResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatal(err)
	}
	if !response.Valid || response.ConfirmationRecord == nil ||
		response.ConfirmationRecord.ConfirmationID != allowedID ||
		response.ConfirmationRecord.TenantID != "tenant_a" ||
		response.ConfirmationRecord.ProjectID != "project_a" ||
		response.ConfirmationRecord.SiteID != "site_a" {
		t.Fatalf("same-scope confirm-draft should persist scoped confirmation, got %#v", response)
	}
}
