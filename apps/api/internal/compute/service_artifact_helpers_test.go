package compute

import (
	"context"
	"io"
	"os"
	"testing"
	"time"
)

func uploadTestArtifact(t *testing.T, svc *Service, ctx context.Context, workerID, jobID, artifactID string, artifactBytes []byte, retainUntil string) ArtifactRecord {
	t.Helper()
	return uploadTestArtifactWithRetention(t, svc, ctx, workerID, jobID, artifactID, artifactBytes, "ttl", retainUntil)
}

func uploadTestArtifactWithRetention(t *testing.T, svc *Service, ctx context.Context, workerID, jobID, artifactID string, artifactBytes []byte, retentionPolicy, retainUntil string) ArtifactRecord {
	t.Helper()
	artifact := map[string]any{
		"schema_version":   "artifact.v1",
		"artifact_id":      artifactID,
		"job_id":           jobID,
		"artifact_type":    "time_series_json",
		"storage_provider": "local_fs",
		"object_key":       "worker/supplied/path.json",
		"content_type":     "application/json",
		"size_bytes":       len(artifactBytes),
		"checksum":         "sha256:" + SHA256Hex(artifactBytes),
		"created_at":       time.Now().UTC().Format(time.RFC3339),
		"retention_policy": retentionPolicy,
		"retain_until":     retainUntil,
	}
	tempFile, err := os.CreateTemp(t.TempDir(), "artifact-*.json")
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = tempFile.Close() }()
	if _, err := tempFile.Write(artifactBytes); err != nil {
		t.Fatal(err)
	}
	if _, err := tempFile.Seek(0, io.SeekStart); err != nil {
		t.Fatal(err)
	}
	record, err := svc.UploadArtifact(ctx, workerID, jobID, string(encodeMap(t, artifact)), tempFile)
	if err != nil {
		t.Fatal(err)
	}
	return record
}
