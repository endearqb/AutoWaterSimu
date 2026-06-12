package compute

import (
	"bytes"
	"context"
	"encoding/json"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

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
