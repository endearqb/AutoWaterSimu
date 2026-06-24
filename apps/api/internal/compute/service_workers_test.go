package compute

import (
	"context"
	"io"
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

func TestWorkerClaimReusesActiveRunningJobForSameWorker(t *testing.T) {
	svc := testService(t)
	ctx := context.Background()
	if _, _, err := svc.CreateJob(ctx, fixtureJobBytes(t), ""); err != nil {
		t.Fatal(err)
	}
	worker, err := svc.RegisterWorker(ctx, compatibleWorkerRegistration("worker_reclaim"))
	if err != nil {
		t.Fatal(err)
	}
	first, err := svc.Claim(ctx, worker.WorkerID)
	if err != nil {
		t.Fatal(err)
	}
	second, err := svc.Claim(ctx, worker.WorkerID)
	if err != nil {
		t.Fatal(err)
	}
	firstJob := mapValue(first, "job")
	secondJob := mapValue(second, "job")
	if stringValue(firstJob, "job_id") != "job_material_balance_minimal" || stringValue(secondJob, "job_id") != "job_material_balance_minimal" {
		t.Fatalf("same worker should reclaim the active running job, got first=%#v second=%#v", firstJob, secondJob)
	}
	if first["attempt"] != 1 || second["attempt"] != 1 {
		t.Fatalf("reclaim must not increment attempt, got first=%#v second=%#v", first["attempt"], second["attempt"])
	}
	snapshot, err := svc.GetJob(ctx, "job_material_balance_minimal")
	if err != nil {
		t.Fatal(err)
	}
	if snapshot.Job.Status != StatusRunning || snapshot.Job.WorkerID != worker.WorkerID || snapshot.Job.Attempt != 1 {
		t.Fatalf("unexpected running job after reclaim: %#v", snapshot.Job)
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
