package compute

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestS3ArtifactStoreRoundTrip(t *testing.T) {
	objects := map[string][]byte{}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		expectedPath := "/archive-bucket/releases/jobs/job1/artifact.json"
		if r.URL.Path != expectedPath {
			t.Fatalf("unexpected s3 path: got %s want %s", r.URL.Path, expectedPath)
		}
		auth := r.Header.Get("Authorization")
		if !strings.Contains(auth, "AWS4-HMAC-SHA256 Credential=test-access/20260531/us-test-1/s3/aws4_request") ||
			!strings.Contains(auth, "SignedHeaders=host;x-amz-content-sha256;x-amz-date") {
			t.Fatalf("unexpected authorization header: %s", auth)
		}
		switch r.Method {
		case http.MethodPut:
			body, err := io.ReadAll(r.Body)
			if err != nil {
				t.Fatalf("read put body: %v", err)
			}
			objects[r.URL.Path] = body
			w.WriteHeader(http.StatusOK)
		case http.MethodGet:
			body, ok := objects[r.URL.Path]
			if !ok {
				http.NotFound(w, r)
				return
			}
			_, _ = w.Write(body)
		case http.MethodDelete:
			delete(objects, r.URL.Path)
			w.WriteHeader(http.StatusNoContent)
		default:
			t.Fatalf("unexpected method: %s", r.Method)
		}
	}))
	defer server.Close()

	store, err := NewS3ArtifactStore(S3ArtifactStoreOptions{
		Endpoint:        server.URL,
		Bucket:          "archive-bucket",
		Region:          "us-test-1",
		AccessKeyID:     "test-access",
		SecretAccessKey: "test-secret",
		Prefix:          "releases",
		HTTPClient:      server.Client(),
	})
	if err != nil {
		t.Fatal(err)
	}
	store.now = func() time.Time { return time.Date(2026, 5, 31, 1, 2, 3, 0, time.UTC) }
	archiveKey, err := store.ArchiveObjectKey("jobs/job1/artifact.json")
	if err != nil {
		t.Fatal(err)
	}
	if archiveKey != "releases/jobs/job1/artifact.json" {
		t.Fatalf("unexpected archive key: %s", archiveKey)
	}
	payload := []byte(`{"ok":true}`)
	ctx := context.Background()
	if err := store.Write(ctx, archiveKey, payload); err != nil {
		t.Fatal(err)
	}
	downloaded, err := store.Read(ctx, archiveKey)
	if err != nil {
		t.Fatal(err)
	}
	if string(downloaded) != string(payload) {
		t.Fatalf("downloaded payload mismatch: %s", downloaded)
	}
	if err := store.Delete(ctx, archiveKey); err != nil {
		t.Fatal(err)
	}
	if _, err := store.Read(ctx, archiveKey); err == nil || ToAppError(err).ErrorCode != CodeArtifactNotFound {
		t.Fatalf("expected not found after delete, got %v", err)
	}
}

func TestS3ArtifactStoreRejectsUnsafePrefix(t *testing.T) {
	_, err := NewS3ArtifactStore(S3ArtifactStoreOptions{
		Endpoint:        "https://archive.example.test",
		Bucket:          "archive-bucket",
		Region:          "us-east-1",
		AccessKeyID:     "test-access",
		SecretAccessKey: "test-secret",
		Prefix:          "../escape",
	})
	if err == nil || ToAppError(err).ErrorCode != CodeValidationFailed {
		t.Fatalf("expected validation error for unsafe prefix, got %v", err)
	}
}

func TestArtifactRetentionSweepArchivesCandidateWithS3Backend(t *testing.T) {
	objects := map[string][]byte{}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasPrefix(r.Header.Get("Authorization"), "AWS4-HMAC-SHA256 ") {
			t.Fatalf("expected signed s3 archive request, got %s", r.Header.Get("Authorization"))
		}
		switch r.Method {
		case http.MethodPut:
			body, err := io.ReadAll(r.Body)
			if err != nil {
				t.Fatalf("read put body: %v", err)
			}
			objects[r.URL.Path] = body
			w.WriteHeader(http.StatusOK)
		case http.MethodGet:
			body, ok := objects[r.URL.Path]
			if !ok {
				http.NotFound(w, r)
				return
			}
			_, _ = w.Write(body)
		default:
			t.Fatalf("unexpected method: %s", r.Method)
		}
	}))
	defer server.Close()

	hotStore, err := NewLocalArtifactStore(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	archiveStore, err := NewS3ArtifactStore(S3ArtifactStoreOptions{
		Endpoint:        server.URL,
		Bucket:          "archive-bucket",
		Region:          "us-test-1",
		AccessKeyID:     "test-access",
		SecretAccessKey: "test-secret",
		Prefix:          "archives",
		HTTPClient:      server.Client(),
	})
	if err != nil {
		t.Fatal(err)
	}
	archiveStore.now = func() time.Time { return time.Date(2026, 5, 31, 1, 2, 3, 0, time.UTC) }
	svc := NewServiceWithArchive(NewMemoryStore(), hotStore, archiveStore, nil)
	ctx := context.Background()
	if _, _, err := svc.CreateJob(ctx, fixtureJobBytes(t), ""); err != nil {
		t.Fatal(err)
	}
	worker, err := svc.RegisterWorker(ctx, compatibleWorkerRegistration("worker_s3_archive"))
	if err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Claim(ctx, worker.WorkerID); err != nil {
		t.Fatal(err)
	}
	artifactBytes := []byte(`{"archive":"s3"}`)
	candidate := uploadTestArtifactWithRetention(
		t,
		svc,
		ctx,
		worker.WorkerID,
		"job_material_balance_minimal",
		"art_s3_archive_candidate",
		artifactBytes,
		"archive_candidate",
		"2026-06-01T00:00:00Z",
	)
	result := map[string]any{
		"schema_version": "compute_result.v1",
		"job_id":         "job_material_balance_minimal",
		"job_type":       "simulation.material_balance.v1",
		"status":         StatusSucceeded,
		"summary":        map[string]any{"converged": true},
		"data":           map[string]any{},
		"quality":        map[string]any{"data_quality": "ok", "warnings": []any{}},
		"artifacts":      []any{candidate},
		"runtime_audit":  map[string]any{"model_runs": []any{}, "timings_ms": map[string]any{}, "fallback_used": false},
	}
	if _, err := svc.Complete(ctx, worker.WorkerID, "job_material_balance_minimal", 1, result); err != nil {
		t.Fatal(err)
	}

	report, err := svc.SweepArtifactRetention(ctx, ArtifactRetentionSweepOptions{Now: time.Date(2026, 6, 2, 0, 0, 0, 0, time.UTC)})
	if err != nil {
		t.Fatal(err)
	}
	if report.Checked != 1 || report.Archived != 1 || len(report.Items) != 1 {
		t.Fatalf("unexpected s3 archive report: %#v", report)
	}
	action := report.Items[0]
	if action.ArchiveProvider != "s3_archive" || action.ArchiveObjectKey != "archives/jobs/job_material_balance_minimal/art_s3_archive_candidate.json" {
		t.Fatalf("unexpected s3 archive action: %#v", action)
	}
	if _, ok := objects["/archive-bucket/"+action.ArchiveObjectKey]; !ok {
		t.Fatalf("expected object in fake s3 archive: %#v", objects)
	}
	if _, err := hotStore.Read(ctx, candidate.ObjectKey); err == nil || ToAppError(err).ErrorCode != CodeArtifactNotFound {
		t.Fatalf("hot artifact should be removed after s3 archive, got %#v", err)
	}
	_, downloaded, err := svc.DownloadArtifact(ctx, candidate.ArtifactID)
	if err != nil {
		t.Fatal(err)
	}
	if string(downloaded) != string(artifactBytes) {
		t.Fatalf("downloaded s3 archive artifact mismatch")
	}
}
