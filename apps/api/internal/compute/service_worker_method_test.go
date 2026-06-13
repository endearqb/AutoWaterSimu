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

func TestHTTPWorkerMutationRoutesRequirePost(t *testing.T) {
	svc := testService(t)
	ctx := context.Background()
	if _, _, err := svc.CreateJob(ctx, fixtureJobBytes(t), ""); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.RegisterWorker(ctx, compatibleWorkerRegistration("worker_method_guard")); err != nil {
		t.Fatal(err)
	}
	auth, err := NewAuthenticator("")
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()

	rec := serveWithToken(t, server, http.MethodGet, "/api/v1/workers/worker_method_guard/claim", "dev-worker-token", nil)
	if rec.Code != http.StatusMethodNotAllowed {
		t.Fatalf("GET worker claim got %d want %d: %s", rec.Code, http.StatusMethodNotAllowed, rec.Body.String())
	}
	snapshot, err := svc.GetJob(ctx, "job_material_balance_minimal")
	if err != nil {
		t.Fatal(err)
	}
	if snapshot.Job.Status != StatusQueued || snapshot.Job.WorkerID != "" {
		t.Fatalf("non-POST claim route must not mutate queued job state, got %#v", snapshot.Job)
	}

	if _, err := svc.Claim(ctx, "worker_method_guard"); err != nil {
		t.Fatal(err)
	}
	eventsBefore, err := svc.Events(ctx, "job_material_balance_minimal")
	if err != nil {
		t.Fatal(err)
	}

	artifactBody := &bytes.Buffer{}
	writer := multipart.NewWriter(artifactBody)
	artifactBytes := []byte(`{"method_guard":true}`)
	metadata := map[string]any{
		"schema_version":   "artifact.v1",
		"artifact_id":      "art_method_guard",
		"job_id":           "job_material_balance_minimal",
		"artifact_type":    "time_series_json",
		"storage_provider": "local_fs",
		"object_key":       "art_method_guard.json",
		"content_type":     "application/json",
		"size_bytes":       len(artifactBytes),
		"checksum":         "sha256:" + SHA256Hex(artifactBytes),
		"created_at":       time.Now().UTC().Format(time.RFC3339),
	}
	_ = writer.WriteField("metadata", string(encodeMap(t, metadata)))
	part, _ := writer.CreateFormFile("file", "artifact.json")
	_, _ = part.Write(artifactBytes)
	_ = writer.Close()

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
	cases := []struct {
		method      string
		path        string
		body        []byte
		contentType string
	}{
		{method: http.MethodPut, path: "/api/v1/workers/worker_method_guard/heartbeat", body: []byte(`{"job_id":"job_material_balance_minimal"}`)},
		{method: http.MethodPut, path: "/api/v1/workers/worker_method_guard/jobs/job_material_balance_minimal/artifact", body: artifactBody.Bytes(), contentType: writer.FormDataContentType()},
		{method: http.MethodPut, path: "/api/v1/workers/worker_method_guard/jobs/job_material_balance_minimal/succeed", body: encodeMap(t, map[string]any{"attempt": 1, "compute_result": result})},
		{method: http.MethodPut, path: "/api/v1/workers/worker_method_guard/jobs/job_material_balance_minimal/fail", body: []byte(`{"attempt":1,"error_code":"METHOD_GUARD","error_message":"should not mutate"}`)},
	}
	for _, tc := range cases {
		req := httptest.NewRequest(tc.method, tc.path, bytes.NewReader(tc.body))
		req.Header.Set("Authorization", "Bearer dev-worker-token")
		if tc.contentType != "" {
			req.Header.Set("Content-Type", tc.contentType)
		}
		rec := httptest.NewRecorder()
		server.ServeHTTP(rec, req)
		if rec.Code != http.StatusMethodNotAllowed {
			t.Fatalf("%s %s got %d want %d: %s", tc.method, tc.path, rec.Code, http.StatusMethodNotAllowed, rec.Body.String())
		}
	}

	snapshot, err = svc.GetJob(ctx, "job_material_balance_minimal")
	if err != nil {
		t.Fatal(err)
	}
	if snapshot.Job.Status != StatusRunning || snapshot.Job.FinishedAt != nil {
		t.Fatalf("non-POST worker routes must not mutate running job state, got %#v", snapshot.Job)
	}

	if _, err := svc.ArtifactMetadata(ctx, "art_method_guard"); ToAppError(err).Status != http.StatusNotFound {
		t.Fatalf("non-POST artifact route must not persist artifact metadata, got err=%v", err)
	}
	events, err := svc.Events(ctx, "job_material_balance_minimal")
	if err != nil {
		t.Fatal(err)
	}
	if len(events) != len(eventsBefore) {
		t.Fatalf("non-POST worker routes must not append events, before=%#v after=%#v", eventsBefore, events)
	}
}
