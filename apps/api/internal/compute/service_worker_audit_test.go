package compute

import (
	"bytes"
	"context"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
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

	req = httptest.NewRequest(http.MethodPost, "/api/v1/workers/worker_audit/heartbeat", bytes.NewReader(encodeMap(t, map[string]any{
		"job_id": "job_material_balance_minimal",
	})))
	req.Header.Set("Authorization", "Bearer dev-worker-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("worker heartbeat failed: %d %s", rec.Code, rec.Body.String())
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
	heartbeatAudit := assertWorkerAudit("job.heartbeat", "POST /api/v1/workers/worker_audit/heartbeat", "ComputeJob", "job_material_balance_minimal", "job.heartbeat")
	heartbeatBefore, ok := heartbeatAudit["before"].(map[string]any)
	if !ok || heartbeatBefore["status"] != StatusRunning || heartbeatBefore["lease_expires_at"] == "" {
		t.Fatalf("heartbeat audit should include compact before lease state, got %#v", heartbeatAudit["before"])
	}
	heartbeatAfter, ok := heartbeatAudit["after"].(map[string]any)
	if !ok || heartbeatAfter["status"] != StatusRunning || heartbeatAfter["worker_id"] != "worker_audit" || heartbeatAfter["lease_expires_at"] == "" {
		t.Fatalf("heartbeat audit should include compact after lease state, got %#v", heartbeatAudit["after"])
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
