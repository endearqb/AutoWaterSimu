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

func TestHTTPArtifactDownloadTenantProjectSiteScope(t *testing.T) {
	svc := testService(t)
	ctx := context.Background()
	if _, _, err := svc.CreateJob(ctx, scopedFixtureJobBytes(t, "job_artifact_scope_beta", "tenant_b", "project_b", "site_b"), ""); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.RegisterWorker(ctx, compatibleWorkerRegistration("worker_artifact_scope")); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Claim(ctx, "worker_artifact_scope"); err != nil {
		t.Fatal(err)
	}
	artifactBytes := []byte(`{"scope":"tenant_b"}`)
	artifact := uploadTestArtifact(t, svc, ctx, "worker_artifact_scope", "job_artifact_scope_beta", "art_scope_beta", artifactBytes, "")
	auth, err := NewAuthenticator(`{"tokens":[
		{"name":"tenant-b-wrong-site-artifact-reader","token":"wrong-site-artifact-token","scopes":["artifact:read"],"tenant_id":"tenant_b","project_id":"project_b","site_id":"site_a"},
		{"name":"tenant-b-artifact-reader","token":"tenant-b-artifact-token","scopes":["artifact:read"],"tenant_id":"tenant_b","project_id":"project_b","site_id":"site_b"}
	]}`)
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()

	req := httptest.NewRequest(http.MethodGet, "/api/v1/artifacts/"+artifact.ArtifactID, nil)
	req.Header.Set("Authorization", "Bearer wrong-site-artifact-token")
	rec := httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("cross-site artifact download should be denied, got %d %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/artifacts/"+artifact.ArtifactID, nil)
	req.Header.Set("Authorization", "Bearer tenant-b-artifact-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK || rec.Body.String() != string(artifactBytes) {
		t.Fatalf("matching artifact download should pass, got %d %s", rec.Code, rec.Body.String())
	}
}

func TestHTTPArtifactUploadMultipart(t *testing.T) {
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
	auth, _ := NewAuthenticator("")
	server := NewServer(svc, auth, nil).Routes()

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	content := []byte(`{"ok":true}`)
	metadata := map[string]any{
		"schema_version":   "artifact.v1",
		"artifact_id":      "art_http",
		"job_id":           "job_material_balance_minimal",
		"artifact_type":    "time_series_json",
		"storage_provider": "local_fs",
		"object_key":       "ignored.json",
		"content_type":     "application/json",
		"size_bytes":       len(content),
		"checksum":         "sha256:" + SHA256Hex(content),
		"created_at":       time.Now().UTC().Format(time.RFC3339),
	}
	_ = writer.WriteField("metadata", string(encodeMap(t, metadata)))
	part, _ := writer.CreateFormFile("file", "artifact.json")
	_, _ = part.Write(content)
	_ = writer.Close()

	req := httptest.NewRequest(http.MethodPost, "/api/v1/workers/worker_1/jobs/job_material_balance_minimal/artifact", body)
	req.Header.Set("Authorization", "Bearer dev-worker-token")
	req.Header.Set("Content-Type", writer.FormDataContentType())
	rec := httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("artifact upload failed: %d %s", rec.Code, rec.Body.String())
	}
}
