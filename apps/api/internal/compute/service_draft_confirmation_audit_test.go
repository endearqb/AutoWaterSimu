package compute

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHTTPDraftConfirmationMutationAuditEvents(t *testing.T) {
	svc := testValidatedService(t)
	auth, err := NewAuthenticator(`{"tokens":[
		{"name":"draft-auditor","token":"draft-audit-token","scopes":["job:create","job:read"]}
	]}`)
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()
	confirmationBytes := scopedDraftConfirmationBytes(t, "material_balance_promotable.draft_confirmation.v1.json", "confirm_audit_alpha", "tenant_audit", "project_audit", "site_audit")

	post := func(expectedStatus int) ContractValidationResponse {
		t.Helper()
		req := httptest.NewRequest(http.MethodPost, "/api/v1/contracts/confirm-draft", bytes.NewReader(confirmationBytes))
		req.Header.Set("Authorization", "Bearer draft-audit-token")
		rec := httptest.NewRecorder()
		server.ServeHTTP(rec, req)
		if rec.Code != expectedStatus {
			t.Fatalf("confirm draft expected %d, got %d %s", expectedStatus, rec.Code, rec.Body.String())
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
	response := post(http.StatusOK)
	post(http.StatusOK)

	auditEvents, _, auditTotal, err := svc.store.ListMutationAuditEvents(context.Background(), MutationAuditFilter{Limit: 10})
	if err != nil {
		t.Fatal(err)
	}
	if auditTotal != 1 || len(auditEvents) != 1 {
		t.Fatalf("expected one draft confirmation audit event, total=%d events=%#v", auditTotal, auditEvents)
	}
	event := auditEvents[0]
	if event.EventType != draftConfirmationRecordedEvent ||
		event.TargetObject != "DraftConfirmation" ||
		event.TargetID != "confirm_audit_alpha" {
		t.Fatalf("unexpected draft confirmation audit record: %#v", event)
	}
	payload := mutationAuditPayloadMap(t, event)
	if _, ok := payload["payload"]; ok {
		t.Fatalf("draft confirmation audit must not include full payload: %#v", payload)
	}
	audit := mutationAuditMap(t, event)
	if audit["who"] != "draft-auditor" ||
		audit["where"] != "POST /api/v1/contracts/confirm-draft" ||
		audit["target_object"] != "DraftConfirmation" ||
		audit["target_id"] != "confirm_audit_alpha" ||
		audit["action"] != "draft_confirmation.record" ||
		audit["reason"] != "scope regression" ||
		audit["trace_id"] != "trace_confirm_audit_alpha" ||
		audit["approval_ref"] != "approval_confirm_audit_alpha" {
		t.Fatalf("unexpected draft confirmation audit envelope: %#v", audit)
	}
	after, ok := audit["after"].(map[string]any)
	if !ok ||
		after["confirmation_id"] != "confirm_audit_alpha" ||
		after["payload_hash"] != response.ConfirmationRecord.PayloadHash ||
		after["draft_schema_version"] != "agent_scenario_draft.v1" ||
		after["decision"] != "approved" ||
		after["decision_reason"] != "scope regression" ||
		after["tenant_id"] != "tenant_audit" ||
		after["project_id"] != "project_audit" ||
		after["site_id"] != "site_audit" {
		t.Fatalf("draft confirmation audit should include compact after state, got %#v", audit["after"])
	}
}
