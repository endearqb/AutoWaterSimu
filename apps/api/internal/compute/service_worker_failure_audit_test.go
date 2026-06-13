package compute

import (
	"context"
	"net/http"
	"testing"
)

func TestHTTPWorkerJobFailureMutationAuditEvents(t *testing.T) {
	svc := testService(t)
	ctx := context.Background()
	if _, _, err := svc.CreateJob(ctx, fixtureJobBytes(t), ""); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.RegisterWorker(ctx, compatibleWorkerRegistration("worker_failure_audit")); err != nil {
		t.Fatal(err)
	}
	auth, err := NewAuthenticator("")
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()

	rec := serveWithToken(t, server, http.MethodPost, "/api/v1/workers/worker_failure_audit/claim", "dev-worker-token", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("worker claim failed: %d %s", rec.Code, rec.Body.String())
	}
	rec = serveWithToken(t, server, http.MethodPost, "/api/v1/workers/worker_failure_audit/jobs/job_material_balance_minimal/fail", "dev-worker-token", encodeMap(t, map[string]any{
		"attempt":       1,
		"error_code":    "SOLVER_FAILED",
		"error_message": "solver diverged",
	}))
	if rec.Code != http.StatusOK {
		t.Fatalf("worker failure failed: %d %s", rec.Code, rec.Body.String())
	}

	snapshot, err := svc.GetJob(ctx, "job_material_balance_minimal")
	if err != nil {
		t.Fatal(err)
	}
	if snapshot.Job.Status != StatusFailed || snapshot.Job.ErrorCode != "SOLVER_FAILED" || snapshot.Job.ErrorMessage != "solver diverged" {
		t.Fatalf("expected failed job snapshot with worker error, got %#v", snapshot.Job)
	}
	events, err := svc.Events(ctx, "job_material_balance_minimal")
	if err != nil {
		t.Fatal(err)
	}
	var failureEvent EventRecord
	for _, event := range events {
		if event.EventType == "job.failed" {
			failureEvent = event
			break
		}
	}
	if failureEvent.EventType == "" {
		t.Fatalf("expected job.failed audit event, got %#v", events)
	}
	payload := eventPayloadMap(t, failureEvent)
	if payload["status"] != StatusFailed || payload["error_code"] != "SOLVER_FAILED" || payload["error_message"] != "solver diverged" {
		t.Fatalf("job.failed payload should include failed status and worker error, got %#v", payload)
	}
	audit := eventAuditMap(t, failureEvent)
	if audit["who"] != "dev-worker" ||
		audit["where"] != "POST /api/v1/workers/worker_failure_audit/jobs/job_material_balance_minimal/fail" ||
		audit["target_object"] != "ComputeJob" ||
		audit["target_id"] != "job_material_balance_minimal" ||
		audit["action"] != "job.complete" ||
		audit["trace_id"] != "trace_material_balance_minimal" {
		t.Fatalf("unexpected job.failed audit envelope: %#v", audit)
	}
	before, ok := audit["before"].(map[string]any)
	if !ok || before["status"] != StatusRunning || before["worker_id"] != "worker_failure_audit" {
		t.Fatalf("job.failed audit should include compact running before state, got %#v", audit["before"])
	}
	after, ok := audit["after"].(map[string]any)
	if !ok ||
		after["status"] != StatusFailed ||
		after["worker_id"] != "worker_failure_audit" ||
		after["error_code"] != "SOLVER_FAILED" ||
		after["error_message"] != "solver diverged" {
		t.Fatalf("job.failed audit should include compact failed after state, got %#v", audit["after"])
	}
}
