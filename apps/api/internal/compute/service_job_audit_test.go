package compute

import (
	"bytes"
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHTTPJobCancelMutationAuditEvents(t *testing.T) {
	svc := testService(t)
	ctx := context.Background()
	if _, _, err := svc.CreateJob(ctx, fixtureJobBytes(t), ""); err != nil {
		t.Fatal(err)
	}
	auth, err := NewAuthenticator("")
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/compute/jobs/job_material_balance_minimal/cancel", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec := httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("cancel failed: %d %s", rec.Code, rec.Body.String())
	}
	events, err := svc.Events(ctx, "job_material_balance_minimal")
	if err != nil {
		t.Fatal(err)
	}
	var cancelEvent *EventRecord
	for _, event := range events {
		if event.EventType == "job.cancelled" {
			copy := event
			cancelEvent = &copy
			break
		}
	}
	if cancelEvent == nil {
		t.Fatalf("cancel should write job.cancelled event: %#v", events)
	}
	audit := eventAuditMap(t, *cancelEvent)
	if audit["who"] != "dev-public" ||
		audit["where"] != "POST /api/v1/compute/jobs/job_material_balance_minimal/cancel" ||
		audit["target_object"] != "ComputeJob" ||
		audit["target_id"] != "job_material_balance_minimal" ||
		audit["action"] != "job.cancel" ||
		audit["trace_id"] != "trace_material_balance_minimal" {
		t.Fatalf("unexpected cancel audit envelope: %#v", audit)
	}
	before, ok := audit["before"].(map[string]any)
	if !ok || before["status"] != StatusQueued || before["cancel_requested"] != false {
		t.Fatalf("cancel audit should include queued before state, got %#v", audit["before"])
	}
	after, ok := audit["after"].(map[string]any)
	if !ok || after["status"] != StatusCancelled || after["cancel_requested"] != true {
		t.Fatalf("cancel audit should include cancelled after state, got %#v", audit["after"])
	}
}

func TestHTTPMutationAuditEventEnvelopeForJobCreate(t *testing.T) {
	svc := testService(t)
	auth, err := NewAuthenticator(`{"tokens":[
		{"name":"audit-user","token":"audit-token","scopes":["job:create","job:read"]}
	]}`)
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()

	req := httptest.NewRequest(http.MethodPost, "/api/v1/compute/jobs", bytes.NewReader(fixtureJobBytes(t)))
	req.Header.Set("Authorization", "Bearer audit-token")
	rec := httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusAccepted {
		t.Fatalf("job create failed: %d %s", rec.Code, rec.Body.String())
	}

	events, err := svc.Events(context.Background(), "job_material_balance_minimal")
	if err != nil {
		t.Fatal(err)
	}
	seen := map[string]bool{}
	assertAudit := func(event EventRecord, action, status string) {
		t.Helper()
		payload := eventPayloadMap(t, event)
		if payload["status"] != status {
			t.Fatalf("%s event should keep status payload, got %#v", event.EventType, payload)
		}
		audit := eventAuditMap(t, event)
		if audit["who"] != "audit-user" ||
			audit["where"] != "POST /api/v1/compute/jobs" ||
			audit["target_object"] != "ComputeJob" ||
			audit["target_id"] != "job_material_balance_minimal" ||
			audit["action"] != action ||
			audit["trace_id"] != "trace_material_balance_minimal" {
			t.Fatalf("unexpected audit envelope for %s: %#v", event.EventType, audit)
		}
		if audit["when"] == "" {
			t.Fatalf("audit envelope should include when: %#v", audit)
		}
		after, ok := audit["after"].(map[string]any)
		if !ok || after["status"] != status {
			t.Fatalf("audit envelope should include after status %s, got %#v", status, audit["after"])
		}
	}
	for _, event := range events {
		switch event.EventType {
		case "job.created":
			assertAudit(event, "job.create", StatusCreated)
			seen[event.EventType] = true
		case "job.queued":
			assertAudit(event, "job.queue", StatusQueued)
			seen[event.EventType] = true
		}
	}
	if !seen["job.created"] || !seen["job.queued"] {
		t.Fatalf("expected job create and queue audit events, got %#v", events)
	}
}
