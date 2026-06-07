package compute

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
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

func TestHTTPJobCancelMutationTenantProjectSiteScope(t *testing.T) {
	svc := testService(t)
	ctx := context.Background()
	if _, _, err := svc.CreateJob(ctx, scopedFixtureJobBytes(t, "job_cancel_scope_alpha", "tenant_a", "project_a", "site_a"), ""); err != nil {
		t.Fatal(err)
	}
	if _, _, err := svc.CreateJob(ctx, scopedFixtureJobBytes(t, "job_cancel_scope_beta", "tenant_b", "project_b", "site_b"), ""); err != nil {
		t.Fatal(err)
	}
	auth, err := NewAuthenticator(`{"tokens":[
		{"name":"scope-a","token":"scope-a-token","scopes":["job:read","job:create"],"tenant_id":"tenant_a","project_id":"project_a","site_id":"site_a"},
		{"name":"global","token":"global-token","scopes":["job:read","job:create"]}
	]}`)
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()
	cancelJob := func(jobID string, token string, expectedStatus int) {
		t.Helper()
		req := httptest.NewRequest(http.MethodPost, "/api/v1/compute/jobs/"+jobID+"/cancel", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		rec := httptest.NewRecorder()
		server.ServeHTTP(rec, req)
		if rec.Code != expectedStatus {
			t.Fatalf("cancel %s with %s got %d want %d: %s", jobID, token, rec.Code, expectedStatus, rec.Body.String())
		}
	}

	cancelJob("job_cancel_scope_beta", "scope-a-token", http.StatusForbidden)
	beta, err := svc.GetJob(ctx, "job_cancel_scope_beta")
	if err != nil {
		t.Fatal(err)
	}
	if beta.Job.Status != StatusQueued || beta.Job.CancelRequested {
		t.Fatalf("cross-scope cancel must not mutate target job, got %#v", beta.Job)
	}
	betaEvents, err := svc.Events(ctx, "job_cancel_scope_beta")
	if err != nil {
		t.Fatal(err)
	}
	for _, event := range betaEvents {
		if event.EventType == "job.cancelled" {
			t.Fatalf("cross-scope cancel must not write job.cancelled event: %#v", betaEvents)
		}
	}

	cancelJob("job_cancel_scope_alpha", "scope-a-token", http.StatusOK)
	alpha, err := svc.GetJob(ctx, "job_cancel_scope_alpha")
	if err != nil {
		t.Fatal(err)
	}
	if alpha.Job.Status != StatusCancelled || !alpha.Job.CancelRequested {
		t.Fatalf("same-scope cancel should mutate target job, got %#v", alpha.Job)
	}
	alphaEvents, err := svc.Events(ctx, "job_cancel_scope_alpha")
	if err != nil {
		t.Fatal(err)
	}
	var alphaCancelEvent *EventRecord
	for _, event := range alphaEvents {
		if event.EventType == "job.cancelled" {
			copy := event
			alphaCancelEvent = &copy
			break
		}
	}
	if alphaCancelEvent == nil {
		t.Fatalf("same-scope cancel should write job.cancelled event: %#v", alphaEvents)
	}
	audit := eventAuditMap(t, *alphaCancelEvent)
	if audit["who"] != "scope-a" ||
		audit["where"] != "POST /api/v1/compute/jobs/job_cancel_scope_alpha/cancel" ||
		audit["target_id"] != "job_cancel_scope_alpha" ||
		audit["action"] != "job.cancel" {
		t.Fatalf("unexpected scoped cancel audit envelope: %#v", audit)
	}

	cancelJob("job_cancel_scope_beta", "global-token", http.StatusOK)
	beta, err = svc.GetJob(ctx, "job_cancel_scope_beta")
	if err != nil {
		t.Fatal(err)
	}
	if beta.Job.Status != StatusCancelled || !beta.Job.CancelRequested {
		t.Fatalf("global cancel should mutate target job, got %#v", beta.Job)
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

func TestHTTPJobReadTenantProjectSiteScope(t *testing.T) {
	svc := testService(t)
	ctx := context.Background()
	if _, _, err := svc.CreateJob(ctx, scopedFixtureJobBytes(t, "job_scope_alpha", "tenant_a", "project_a", "site_a"), ""); err != nil {
		t.Fatal(err)
	}
	if _, _, err := svc.CreateJob(ctx, scopedFixtureJobBytes(t, "job_scope_beta", "tenant_b", "project_b", "site_b"), ""); err != nil {
		t.Fatal(err)
	}
	if _, _, err := svc.CreateJob(ctx, scopedFixtureJobBytes(t, "job_scope_gamma", "tenant_a", "project_a", "site_b"), ""); err != nil {
		t.Fatal(err)
	}
	auth, err := NewAuthenticator(`{"tokens":[
		{"name":"tenant-a-reader","token":"tenant-a-token","scopes":["job:read"],"tenant_id":"tenant_a","project_id":"project_a","site_id":"site_a"},
		{"name":"global-reader","token":"global-token","scopes":["job:read"]}
	]}`)
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()

	req := httptest.NewRequest(http.MethodGet, "/api/v1/compute/jobs", nil)
	req.Header.Set("Authorization", "Bearer tenant-a-token")
	rec := httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("tenant scoped list failed: %d %s", rec.Code, rec.Body.String())
	}
	var list ListJobsResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &list); err != nil {
		t.Fatal(err)
	}
	if list.TotalEstimate != 1 || len(list.Items) != 1 || list.Items[0].Job.JobID != "job_scope_alpha" {
		t.Fatalf("tenant/project/site scoped list should include only matching job, got %#v", list)
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/compute/jobs/job_scope_alpha", nil)
	req.Header.Set("Authorization", "Bearer tenant-a-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("tenant scoped job get should pass: %d %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/compute/jobs/job_scope_beta", nil)
	req.Header.Set("Authorization", "Bearer tenant-a-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("cross-tenant job get should be denied, got %d %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/compute/jobs/job_scope_gamma", nil)
	req.Header.Set("Authorization", "Bearer tenant-a-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("cross-site job get should be denied, got %d %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/compute/jobs", nil)
	req.Header.Set("Authorization", "Bearer global-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("global list failed: %d %s", rec.Code, rec.Body.String())
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &list); err != nil {
		t.Fatal(err)
	}
	if list.TotalEstimate != 3 {
		t.Fatalf("global token should see all jobs, got %#v", list)
	}
}

func TestHTTPJobCreateMutationTenantProjectSiteScope(t *testing.T) {
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
	postJob := func(body []byte, token string, expectedStatus int) *httptest.ResponseRecorder {
		t.Helper()
		req := httptest.NewRequest(http.MethodPost, "/api/v1/compute/jobs", bytes.NewReader(body))
		req.Header.Set("Authorization", "Bearer "+token)
		rec := httptest.NewRecorder()
		server.ServeHTTP(rec, req)
		if rec.Code != expectedStatus {
			t.Fatalf("job create with %s got %d want %d: %s", token, rec.Code, expectedStatus, rec.Body.String())
		}
		return rec
	}

	rec := postJob(scopedFixtureJobBytes(t, "job_create_mutation_alpha", "tenant_a", "project_a", "site_a"), "scope-a-token", http.StatusAccepted)
	var snapshot JobSnapshot
	if err := json.Unmarshal(rec.Body.Bytes(), &snapshot); err != nil {
		t.Fatal(err)
	}
	if snapshot.Job.JobID != "job_create_mutation_alpha" || snapshot.Job.SiteID != "site_a" {
		t.Fatalf("unexpected scoped job create snapshot: %#v", snapshot.Job)
	}

	postJob(scopedFixtureJobBytes(t, "job_create_mutation_cross_site", "tenant_a", "project_a", "site_b"), "scope-a-token", http.StatusForbidden)
	if _, err := svc.GetJob(ctx, "job_create_mutation_cross_site"); err == nil {
		t.Fatalf("cross-scope denied job create must not write a job")
	}
	jobs, err := svc.ListJobs(ctx, ListFilter{Limit: 10})
	if err != nil {
		t.Fatal(err)
	}
	if jobs.TotalEstimate != 1 || len(jobs.Items) != 1 || jobs.Items[0].Job.JobID != "job_create_mutation_alpha" {
		t.Fatalf("cross-scope denied job create must not write job/events, got %#v", jobs)
	}
}

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
