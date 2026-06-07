package compute

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"
)

func TestWorkerLifecycleArtifactSucceedAndDownload(t *testing.T) {
	svc := testService(t)
	ctx := context.Background()
	if _, _, err := svc.CreateJob(ctx, fixtureJobBytes(t), ""); err != nil {
		t.Fatal(err)
	}
	worker, err := svc.RegisterWorker(ctx, compatibleWorkerRegistration("worker_1"))
	if err != nil {
		t.Fatal(err)
	}
	claim, err := svc.Claim(ctx, worker.WorkerID)
	if err != nil {
		t.Fatal(err)
	}
	if claim["job"] == nil || int(claim["attempt"].(int)) != 1 {
		t.Fatalf("expected claimed job, got %#v", claim)
	}
	heartbeat, err := svc.Heartbeat(ctx, worker.WorkerID, "job_material_balance_minimal")
	if err != nil {
		t.Fatal(err)
	}
	if heartbeat["job_terminal"].(bool) {
		t.Fatalf("running job should not be terminal")
	}

	artifactBytes := []byte(`{"timestamps":[0,1],"values":[1,2]}`)
	artifact := map[string]any{
		"schema_version":   "artifact.v1",
		"artifact_id":      "art_time_series",
		"job_id":           "job_material_balance_minimal",
		"artifact_type":    "time_series_json",
		"storage_provider": "local_fs",
		"object_key":       "worker/supplied/path.json",
		"content_type":     "application/json",
		"size_bytes":       len(artifactBytes),
		"checksum":         "sha256:" + SHA256Hex(artifactBytes),
		"created_at":       time.Now().UTC().Format(time.RFC3339),
		"retention_policy": "ttl",
		"retain_until":     "2026-06-01T00:00:00Z",
	}
	tempFile, err := os.CreateTemp(t.TempDir(), "artifact-*.json")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := tempFile.Write(artifactBytes); err != nil {
		t.Fatal(err)
	}
	if _, err := tempFile.Seek(0, io.SeekStart); err != nil {
		t.Fatal(err)
	}
	record, err := svc.UploadArtifact(ctx, worker.WorkerID, "job_material_balance_minimal", string(encodeMap(t, artifact)), tempFile)
	if err != nil {
		t.Fatal(err)
	}
	_ = tempFile.Close()
	if record.ObjectKey != "jobs/job_material_balance_minimal/art_time_series.json" {
		t.Fatalf("server must generate object_key, got %s", record.ObjectKey)
	}
	if record.RetentionPolicy != "ttl" || record.RetainUntil == nil {
		t.Fatalf("expected artifact retention metadata, got %#v", record)
	}
	result := map[string]any{
		"schema_version": "compute_result.v1",
		"job_id":         "job_material_balance_minimal",
		"job_type":       "simulation.material_balance.v1",
		"status":         StatusSucceeded,
		"summary":        map[string]any{"converged": true},
		"data":           map[string]any{},
		"quality":        map[string]any{"data_quality": "ok", "warnings": []any{}},
		"artifacts":      []any{record},
		"runtime_audit":  map[string]any{"model_runs": []any{}, "timings_ms": map[string]any{}, "fallback_used": false},
	}
	completed, err := svc.Complete(ctx, worker.WorkerID, "job_material_balance_minimal", 1, result)
	if err != nil {
		t.Fatal(err)
	}
	if completed.Job.Status != StatusSucceeded || len(completed.Artifacts) != 1 {
		t.Fatalf("expected succeeded job with artifact, got %#v", completed)
	}
	_, downloaded, err := svc.DownloadArtifact(ctx, "art_time_series")
	if err != nil {
		t.Fatal(err)
	}
	if string(downloaded) != string(artifactBytes) {
		t.Fatalf("downloaded artifact mismatch")
	}
}

func TestWorkerClaimSkipsCapabilityMismatch(t *testing.T) {
	svc := testService(t)
	ctx := context.Background()
	if _, _, err := svc.CreateJob(ctx, fixtureJobBytes(t), ""); err != nil {
		t.Fatal(err)
	}
	worker, err := svc.RegisterWorker(ctx, map[string]any{
		"worker_id":                   "worker_weak",
		"capabilities":                []any{"material_balance"},
		"supported_contract_versions": []any{"compute_job.v1", "simulation_input.v1"},
	})
	if err != nil {
		t.Fatal(err)
	}
	claim, err := svc.Claim(ctx, worker.WorkerID)
	if err != nil {
		t.Fatal(err)
	}
	if claim["job"] != nil {
		t.Fatalf("capability-mismatched worker should not claim job: %#v", claim)
	}
	job, err := svc.GetJob(ctx, "job_material_balance_minimal")
	if err != nil {
		t.Fatal(err)
	}
	if job.Job.Status != StatusQueued {
		t.Fatalf("incompatible claim should leave job queued, got %s", job.Job.Status)
	}
}

func TestWorkerClaimSkipsContractVersionMismatch(t *testing.T) {
	svc := testService(t)
	ctx := context.Background()
	if _, _, err := svc.CreateJob(ctx, fixtureJobBytes(t), ""); err != nil {
		t.Fatal(err)
	}
	worker, err := svc.RegisterWorker(ctx, map[string]any{
		"worker_id":                   "worker_old",
		"capabilities":                []any{"material_balance", "ode"},
		"supported_contract_versions": []any{"compute_job.v1"},
	})
	if err != nil {
		t.Fatal(err)
	}
	claim, err := svc.Claim(ctx, worker.WorkerID)
	if err != nil {
		t.Fatal(err)
	}
	if claim["job"] != nil {
		t.Fatalf("contract-version-mismatched worker should not claim job: %#v", claim)
	}
}

func TestValidatedWorkerFailPersistsTerminalResult(t *testing.T) {
	svc := testValidatedService(t)
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
	failed, err := svc.Fail(ctx, "worker_1", "job_material_balance_minimal", 1, "WORKER_FAILED", "solver failed")
	if err != nil {
		t.Fatal(err)
	}
	if failed.Job.Status != StatusFailed || failed.Job.ErrorCode != "WORKER_FAILED" || failed.Job.ErrorMessage != "solver failed" {
		t.Fatalf("expected persisted worker failure, got %#v", failed.Job)
	}
}

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

func TestHTTPWorkerJobMutationAuditEvents(t *testing.T) {
	svc := testService(t)
	ctx := context.Background()
	if _, _, err := svc.CreateJob(ctx, fixtureJobBytes(t), ""); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.RegisterWorker(ctx, compatibleWorkerRegistration("worker_audit")); err != nil {
		t.Fatal(err)
	}
	auth, err := NewAuthenticator("")
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()

	req := httptest.NewRequest(http.MethodPost, "/api/v1/workers/worker_audit/claim", nil)
	req.Header.Set("Authorization", "Bearer dev-worker-token")
	rec := httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("worker claim failed: %d %s", rec.Code, rec.Body.String())
	}

	artifactBody := &bytes.Buffer{}
	writer := multipart.NewWriter(artifactBody)
	artifactBytes := []byte(`{"audit":true}`)
	metadata := map[string]any{
		"schema_version":   "artifact.v1",
		"artifact_id":      "art_worker_audit",
		"job_id":           "job_material_balance_minimal",
		"artifact_type":    "time_series_json",
		"storage_provider": "local_fs",
		"object_key":       "ignored.json",
		"content_type":     "application/json",
		"size_bytes":       len(artifactBytes),
		"checksum":         "sha256:" + SHA256Hex(artifactBytes),
		"created_at":       time.Now().UTC().Format(time.RFC3339),
	}
	_ = writer.WriteField("metadata", string(encodeMap(t, metadata)))
	part, _ := writer.CreateFormFile("file", "artifact.json")
	_, _ = part.Write(artifactBytes)
	_ = writer.Close()
	req = httptest.NewRequest(http.MethodPost, "/api/v1/workers/worker_audit/jobs/job_material_balance_minimal/artifact", artifactBody)
	req.Header.Set("Authorization", "Bearer dev-worker-token")
	req.Header.Set("Content-Type", writer.FormDataContentType())
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("artifact upload failed: %d %s", rec.Code, rec.Body.String())
	}

	result := map[string]any{
		"schema_version": "compute_result.v1",
		"job_id":         "job_material_balance_minimal",
		"job_type":       "simulation.material_balance.v1",
		"status":         StatusSucceeded,
		"summary":        map[string]any{"converged": true},
		"data":           map[string]any{},
		"quality":        map[string]any{"data_quality": "ok", "warnings": []any{}},
		"artifacts":      []any{},
		"runtime_audit":  map[string]any{"model_runs": []any{}, "timings_ms": map[string]any{}, "fallback_used": false},
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/workers/worker_audit/jobs/job_material_balance_minimal/succeed", bytes.NewReader(encodeMap(t, map[string]any{
		"attempt":        1,
		"compute_result": result,
	})))
	req.Header.Set("Authorization", "Bearer dev-worker-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("worker completion failed: %d %s", rec.Code, rec.Body.String())
	}

	events, err := svc.Events(ctx, "job_material_balance_minimal")
	if err != nil {
		t.Fatal(err)
	}
	byType := map[string]EventRecord{}
	for _, event := range events {
		byType[event.EventType] = event
	}
	assertWorkerAudit := func(eventType, where, targetObject, targetID, action string) map[string]any {
		t.Helper()
		event, ok := byType[eventType]
		if !ok {
			t.Fatalf("expected %s audit event, got %#v", eventType, events)
		}
		audit := eventAuditMap(t, event)
		if audit["who"] != "dev-worker" ||
			audit["where"] != where ||
			audit["target_object"] != targetObject ||
			audit["target_id"] != targetID ||
			audit["action"] != action ||
			audit["trace_id"] != "trace_material_balance_minimal" {
			t.Fatalf("unexpected %s audit envelope: %#v", eventType, audit)
		}
		if audit["when"] == "" {
			t.Fatalf("%s audit envelope should include when: %#v", eventType, audit)
		}
		return audit
	}
	claimAudit := assertWorkerAudit("job.running", "POST /api/v1/workers/worker_audit/claim", "ComputeJob", "job_material_balance_minimal", "job.claim")
	if after, ok := claimAudit["after"].(map[string]any); !ok || after["status"] != StatusRunning || after["worker_id"] != "worker_audit" {
		t.Fatalf("claim audit should include compact running state, got %#v", claimAudit["after"])
	}
	artifactAudit := assertWorkerAudit("artifact.recorded", "POST /api/v1/workers/worker_audit/jobs/job_material_balance_minimal/artifact", "Artifact", "art_worker_audit", "artifact.record")
	if after, ok := artifactAudit["after"].(map[string]any); !ok || after["artifact_id"] != "art_worker_audit" || after["job_id"] != "job_material_balance_minimal" {
		t.Fatalf("artifact audit should include compact artifact state, got %#v", artifactAudit["after"])
	}
	completionAudit := assertWorkerAudit("job.succeeded", "POST /api/v1/workers/worker_audit/jobs/job_material_balance_minimal/succeed", "ComputeJob", "job_material_balance_minimal", "job.complete")
	if after, ok := completionAudit["after"].(map[string]any); !ok || after["status"] != StatusSucceeded || after["worker_id"] != "worker_audit" {
		t.Fatalf("completion audit should include compact terminal state, got %#v", completionAudit["after"])
	}
}

func TestHTTPWorkerJobMutationTenantProjectSiteScope(t *testing.T) {
	svc := testService(t)
	ctx := context.Background()
	betaJobID := "job_worker_scope_0_beta"
	alphaJobID := "job_worker_scope_1_alpha"
	if _, _, err := svc.CreateJob(ctx, scopedFixtureJobBytes(t, betaJobID, "tenant_b", "project_b", "site_b"), ""); err != nil {
		t.Fatal(err)
	}
	if _, _, err := svc.CreateJob(ctx, scopedFixtureJobBytes(t, alphaJobID, "tenant_a", "project_a", "site_a"), ""); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.RegisterWorker(ctx, compatibleWorkerRegistration("worker_scope_alpha")); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.RegisterWorker(ctx, compatibleWorkerRegistration("worker_scope_beta")); err != nil {
		t.Fatal(err)
	}
	auth, err := NewAuthenticator(`{"tokens":[
		{"name":"scope-a-worker","token":"scope-a-worker-token","scopes":["worker:claim","worker:heartbeat","artifact:write","job:write"],"tenant_id":"tenant_a","project_id":"project_a","site_id":"site_a"},
		{"name":"global-worker","token":"global-worker-token","scopes":["worker:claim","worker:heartbeat","artifact:write","job:write"]}
	]}`)
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()
	postJSON := func(path string, body map[string]any, token string, expectedStatus int) *httptest.ResponseRecorder {
		t.Helper()
		req := httptest.NewRequest(http.MethodPost, path, bytes.NewReader(encodeMap(t, body)))
		req.Header.Set("Authorization", "Bearer "+token)
		rec := httptest.NewRecorder()
		server.ServeHTTP(rec, req)
		if rec.Code != expectedStatus {
			t.Fatalf("POST %s got %d want %d: %s", path, rec.Code, expectedStatus, rec.Body.String())
		}
		return rec
	}
	claim := func(workerID, token, expectedJobID string) {
		t.Helper()
		req := httptest.NewRequest(http.MethodPost, "/api/v1/workers/"+workerID+"/claim", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		rec := httptest.NewRecorder()
		server.ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatalf("claim %s failed: %d %s", workerID, rec.Code, rec.Body.String())
		}
		var payload map[string]any
		if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
			t.Fatal(err)
		}
		job, ok := payload["job"].(map[string]any)
		if !ok || job["job_id"] != expectedJobID {
			t.Fatalf("claim %s should return %s, got %#v", workerID, expectedJobID, payload)
		}
	}
	artifactBody := func(jobID, artifactID string, artifactBytes []byte) (*bytes.Buffer, string) {
		t.Helper()
		body := &bytes.Buffer{}
		writer := multipart.NewWriter(body)
		metadata := map[string]any{
			"schema_version":   "artifact.v1",
			"artifact_id":      artifactID,
			"job_id":           jobID,
			"artifact_type":    "time_series_json",
			"storage_provider": "local_fs",
			"object_key":       artifactID + ".json",
			"content_type":     "application/json",
			"size_bytes":       len(artifactBytes),
			"checksum":         "sha256:" + SHA256Hex(artifactBytes),
			"created_at":       time.Now().UTC().Format(time.RFC3339),
		}
		_ = writer.WriteField("metadata", string(encodeMap(t, metadata)))
		part, _ := writer.CreateFormFile("file", artifactID+".json")
		_, _ = part.Write(artifactBytes)
		_ = writer.Close()
		return body, writer.FormDataContentType()
	}
	postArtifact := func(workerID, jobID, artifactID, token string, expectedStatus int) {
		t.Helper()
		body, contentType := artifactBody(jobID, artifactID, []byte(`{"scope":true}`))
		req := httptest.NewRequest(http.MethodPost, "/api/v1/workers/"+workerID+"/jobs/"+jobID+"/artifact", body)
		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("Content-Type", contentType)
		rec := httptest.NewRecorder()
		server.ServeHTTP(rec, req)
		if rec.Code != expectedStatus {
			t.Fatalf("artifact %s got %d want %d: %s", artifactID, rec.Code, expectedStatus, rec.Body.String())
		}
	}
	computeResult := func(jobID string) map[string]any {
		return map[string]any{
			"schema_version": "compute_result.v1",
			"job_id":         jobID,
			"job_type":       "simulation.material_balance.v1",
			"status":         StatusSucceeded,
			"summary":        map[string]any{"converged": true},
			"data":           map[string]any{},
			"quality":        map[string]any{"data_quality": "ok", "warnings": []any{}},
			"artifacts":      []any{},
			"runtime_audit":  map[string]any{"model_runs": []any{}, "timings_ms": map[string]any{}, "fallback_used": false},
		}
	}

	claim("worker_scope_alpha", "scope-a-worker-token", alphaJobID)
	beta, err := svc.GetJob(ctx, betaJobID)
	if err != nil {
		t.Fatal(err)
	}
	if beta.Job.Status != StatusQueued || beta.Job.WorkerID != "" {
		t.Fatalf("scoped claim should skip cross-scope queued job, got %#v", beta.Job)
	}
	claim("worker_scope_beta", "global-worker-token", betaJobID)

	postJSON("/api/v1/workers/worker_scope_beta/heartbeat", map[string]any{"job_id": betaJobID}, "scope-a-worker-token", http.StatusForbidden)
	postArtifact("worker_scope_beta", betaJobID, "art_worker_scope_beta_denied", "scope-a-worker-token", http.StatusForbidden)
	postJSON("/api/v1/workers/worker_scope_beta/jobs/"+betaJobID+"/succeed", map[string]any{
		"attempt":        1,
		"compute_result": computeResult(betaJobID),
	}, "scope-a-worker-token", http.StatusForbidden)
	beta, err = svc.GetJob(ctx, betaJobID)
	if err != nil {
		t.Fatal(err)
	}
	if beta.Job.Status != StatusRunning || beta.Job.FinishedAt != nil {
		t.Fatalf("cross-scope worker mutations must not mutate target job, got %#v", beta.Job)
	}
	if _, err := svc.ArtifactMetadata(ctx, "art_worker_scope_beta_denied"); ToAppError(err).Status != http.StatusNotFound {
		t.Fatalf("cross-scope artifact upload should not persist artifact, got err=%v", err)
	}

	postJSON("/api/v1/workers/worker_scope_alpha/heartbeat", map[string]any{"job_id": alphaJobID}, "scope-a-worker-token", http.StatusOK)
	postArtifact("worker_scope_alpha", alphaJobID, "art_worker_scope_alpha", "scope-a-worker-token", http.StatusOK)
	postJSON("/api/v1/workers/worker_scope_alpha/jobs/"+alphaJobID+"/succeed", map[string]any{
		"attempt":        1,
		"compute_result": computeResult(alphaJobID),
	}, "scope-a-worker-token", http.StatusOK)
	alpha, err := svc.GetJob(ctx, alphaJobID)
	if err != nil {
		t.Fatal(err)
	}
	if alpha.Job.Status != StatusSucceeded {
		t.Fatalf("same-scope worker completion should pass, got %#v", alpha.Job)
	}
}
