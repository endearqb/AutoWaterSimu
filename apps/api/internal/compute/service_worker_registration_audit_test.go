package compute

import (
	"bytes"
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHTTPWorkerRegistrationMutationAuditEvents(t *testing.T) {
	svc := testService(t)
	auth, err := NewAuthenticator("")
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()
	request := compatibleWorkerRegistration("worker_registration_audit")
	request["runtime_version"] = "worker-smoke-v1"

	req := httptest.NewRequest(http.MethodPost, "/api/v1/workers/register", bytes.NewReader(encodeMap(t, request)))
	req.Header.Set("Authorization", "Bearer dev-worker-token")
	rec := httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("worker register failed: %d %s", rec.Code, rec.Body.String())
	}

	auditEvents, _, auditTotal, err := svc.store.ListMutationAuditEvents(context.Background(), MutationAuditFilter{TargetObject: "Worker", TargetID: "worker_registration_audit", Limit: 10})
	if err != nil {
		t.Fatal(err)
	}
	if auditTotal != 1 || len(auditEvents) != 1 || auditEvents[0].EventType != workerRegisteredEvent {
		t.Fatalf("expected one worker registration audit event, got total=%d events=%#v", auditTotal, auditEvents)
	}
	payload := mutationAuditPayloadMap(t, auditEvents[0])
	if payload["worker_id"] != "worker_registration_audit" ||
		payload["runtime_version"] != "worker-smoke-v1" ||
		payload["capability_count"].(float64) != 2 ||
		payload["supported_contract_version_count"].(float64) != 2 {
		t.Fatalf("unexpected worker registration audit payload: %#v", payload)
	}
	if _, ok := payload["capabilities"]; ok {
		t.Fatalf("worker registration audit payload should stay compact, got %#v", payload)
	}
	audit := mutationAuditMap(t, auditEvents[0])
	if audit["who"] != "dev-worker" ||
		audit["where"] != "POST /api/v1/workers/register" ||
		audit["target_object"] != "Worker" ||
		audit["target_id"] != "worker_registration_audit" ||
		audit["action"] != "worker.register" {
		t.Fatalf("unexpected worker registration audit envelope: %#v", audit)
	}
	if audit["before"] != nil {
		t.Fatalf("first worker registration should not include before state: %#v", audit["before"])
	}
	after, ok := audit["after"].(map[string]any)
	if !ok || after["worker_id"] != "worker_registration_audit" || after["runtime_version"] != "worker-smoke-v1" {
		t.Fatalf("worker registration audit should include compact after state, got %#v", audit["after"])
	}
}
