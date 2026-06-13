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

type workerAuditScenario struct {
	svc      *Service
	ctx      context.Context
	server   http.Handler
	workerID string
	jobID    string
}

func newWorkerAuditScenario(t *testing.T, workerID string) workerAuditScenario {
	t.Helper()
	svc := testService(t)
	ctx := context.Background()
	if _, _, err := svc.CreateJob(ctx, fixtureJobBytes(t), ""); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.RegisterWorker(ctx, compatibleWorkerRegistration(workerID)); err != nil {
		t.Fatal(err)
	}
	auth, err := NewAuthenticator("")
	if err != nil {
		t.Fatal(err)
	}
	return workerAuditScenario{
		svc:      svc,
		ctx:      ctx,
		server:   NewServer(svc, auth, nil).Routes(),
		workerID: workerID,
		jobID:    "job_material_balance_minimal",
	}
}

func serveWorkerAuditArtifact(t *testing.T, scenario workerAuditScenario, artifactID string, artifactBytes []byte) *httptest.ResponseRecorder {
	t.Helper()
	artifactBody := &bytes.Buffer{}
	writer := multipart.NewWriter(artifactBody)
	metadata := map[string]any{
		"schema_version":   "artifact.v1",
		"artifact_id":      artifactID,
		"job_id":           scenario.jobID,
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

	req := httptest.NewRequest(http.MethodPost, "/api/v1/workers/"+scenario.workerID+"/jobs/"+scenario.jobID+"/artifact", artifactBody)
	req.Header.Set("Authorization", "Bearer dev-worker-token")
	req.Header.Set("Content-Type", writer.FormDataContentType())
	rec := httptest.NewRecorder()
	scenario.server.ServeHTTP(rec, req)
	return rec
}

func workerAuditSuccessResult() map[string]any {
	return map[string]any{
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
}

func workerAuditEventsByType(t *testing.T, scenario workerAuditScenario) map[string]EventRecord {
	t.Helper()
	events, err := scenario.svc.Events(scenario.ctx, scenario.jobID)
	if err != nil {
		t.Fatal(err)
	}
	byType := map[string]EventRecord{}
	for _, event := range events {
		byType[event.EventType] = event
	}
	return byType
}

func assertWorkerJobAudit(t *testing.T, events map[string]EventRecord, eventType, where, targetObject, targetID, action string) map[string]any {
	t.Helper()
	event, ok := events[eventType]
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
