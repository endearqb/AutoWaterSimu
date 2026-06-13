package compute

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

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
