package compute

import (
	"context"
	"net/http"
	"testing"
	"time"
)

func TestPayloadHashIgnoresRequestSpecificFields(t *testing.T) {
	baseJob, err := DecodeComputeJob(fixtureJobBytes(t), nil)
	if err != nil {
		t.Fatal(err)
	}
	baseHash, err := PayloadHash(baseJob)
	if err != nil {
		t.Fatal(err)
	}
	modified := baseJob
	modified.JobID = "job_other"
	modified.RequestID = "req_other"
	modified.Context.TraceID = "trace_other"
	modified.CreatedAt = time.Now().UTC().Format(time.RFC3339)
	sameHash, err := PayloadHash(modified)
	if err != nil {
		t.Fatal(err)
	}
	if sameHash != baseHash {
		t.Fatalf("payload hash should ignore request-specific fields")
	}
	modified.Execution = map[string]any{"time_limit_sec": float64(1), "priority": "normal", "required_capabilities": []any{"material_balance"}}
	differentHash, err := PayloadHash(modified)
	if err != nil {
		t.Fatal(err)
	}
	if differentHash == baseHash {
		t.Fatalf("payload hash should include execution")
	}
}

func TestCreateJobIdempotencyDuplicateAndConflict(t *testing.T) {
	svc := testService(t)
	ctx := context.Background()
	created, status, err := svc.CreateJob(ctx, fixtureJobBytes(t), "")
	if err != nil {
		t.Fatal(err)
	}
	if status != http.StatusAccepted || created.Job.Status != StatusQueued {
		t.Fatalf("unexpected create result: %d %#v", status, created.Job)
	}
	if created.Artifacts == nil {
		t.Fatalf("empty artifact list must be encoded as an array, not null")
	}

	duplicate := decodeMap(t, fixtureJobBytes(t))
	duplicate["job_id"] = "job_duplicate_request"
	duplicate["request_id"] = "req_duplicate"
	reused, status, err := svc.CreateJob(ctx, encodeMap(t, duplicate), "")
	if err != nil {
		t.Fatal(err)
	}
	if status != http.StatusOK || reused.Job.JobID != created.Job.JobID {
		t.Fatalf("duplicate idempotency should return existing job")
	}

	conflict := decodeMap(t, fixtureJobBytes(t))
	conflict["execution"].(map[string]any)["time_limit_sec"] = float64(60)
	_, _, err = svc.CreateJob(ctx, encodeMap(t, conflict), "")
	if appErr := ToAppError(err); appErr.ErrorCode != CodeIdempotencyConflict || appErr.Status != http.StatusConflict {
		t.Fatalf("expected idempotency conflict, got %#v", err)
	}
}

func TestCancelRejectsLateResult(t *testing.T) {
	svc := testService(t)
	ctx := context.Background()
	if _, _, err := svc.CreateJob(ctx, fixtureJobBytes(t), ""); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.RegisterWorker(ctx, compatibleWorkerRegistration("worker_1")); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Claim(ctx, "worker_1"); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.CancelJob(ctx, "job_material_balance_minimal"); err != nil {
		t.Fatal(err)
	}
	_, err := svc.Fail(ctx, "worker_1", "job_material_balance_minimal", 1, "WORKER_FAILED", "late")
	if appErr := ToAppError(err); appErr.ErrorCode != CodeWorkerStale {
		t.Fatalf("expected late worker result rejection, got %#v", err)
	}
	events, err := svc.Events(ctx, "job_material_balance_minimal")
	if err != nil {
		t.Fatal(err)
	}
	if events[len(events)-1].EventType != "late_result_rejected" {
		t.Fatalf("expected late_result_rejected event, got %s", events[len(events)-1].EventType)
	}
}

func TestTimeoutSweepAndPagination(t *testing.T) {
	svc := testService(t)
	ctx := context.Background()
	if _, _, err := svc.CreateJob(ctx, fixtureJobBytes(t), ""); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.RegisterWorker(ctx, compatibleWorkerRegistration("worker_1")); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Claim(ctx, "worker_1"); err != nil {
		t.Fatal(err)
	}
	svc.now = func() time.Time { return time.Now().UTC().Add(DefaultLeaseSeconds*time.Second + time.Second) }
	timedOut, err := svc.TimeoutSweep(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if len(timedOut) != 1 || timedOut[0].Status != StatusTimedOut {
		t.Fatalf("expected one timed out job, got %#v", timedOut)
	}
	events, err := svc.Events(ctx, "job_material_balance_minimal")
	if err != nil {
		t.Fatal(err)
	}
	var timeoutEvent *EventRecord
	for _, event := range events {
		if event.EventType == "job.timed_out" {
			copy := event
			timeoutEvent = &copy
			break
		}
	}
	if timeoutEvent == nil {
		t.Fatalf("timeout sweep should write job.timed_out event: %#v", events)
	}
	audit := eventAuditMap(t, *timeoutEvent)
	if audit["who"] != "user:test" ||
		audit["where"] != "service:job_lifecycle.timeout_sweep" ||
		audit["target_object"] != "ComputeJob" ||
		audit["target_id"] != "job_material_balance_minimal" ||
		audit["action"] != "job.timeout" ||
		audit["trace_id"] != "trace_material_balance_minimal" {
		t.Fatalf("unexpected timeout audit envelope: %#v", audit)
	}
	before, ok := audit["before"].(map[string]any)
	if !ok || before["status"] != StatusRunning || before["worker_id"] != "worker_1" {
		t.Fatalf("timeout audit should include running before state, got %#v", audit["before"])
	}
	after, ok := audit["after"].(map[string]any)
	if !ok || after["status"] != StatusTimedOut || after["error_code"] != "TIMEOUT" {
		t.Fatalf("timeout audit should include timed-out after state, got %#v", audit["after"])
	}
	listed, err := svc.ListJobs(ctx, ListFilter{Limit: 1})
	if err != nil {
		t.Fatal(err)
	}
	if listed.TotalEstimate != 1 || len(listed.Items) != 1 {
		t.Fatalf("unexpected list response: %#v", listed)
	}
	if listed.Items[0].Artifacts == nil {
		t.Fatalf("listed jobs should expose an empty artifact array")
	}
}
