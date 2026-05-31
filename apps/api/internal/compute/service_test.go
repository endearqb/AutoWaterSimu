package compute

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func testService(t *testing.T) *Service {
	t.Helper()
	artifactStore, err := NewLocalArtifactStore(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	return NewService(NewMemoryStore(), artifactStore, nil)
}

func testServiceWithArchive(t *testing.T) *Service {
	t.Helper()
	artifactStore, err := NewLocalArtifactStore(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	archiveStore, err := NewLocalArtifactStore(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	return NewServiceWithArchive(NewMemoryStore(), artifactStore, archiveStore, nil)
}

func testValidatedService(t *testing.T) *Service {
	t.Helper()
	artifactStore, err := NewLocalArtifactStore(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	validator, err := NewContractValidator(repoRootForTest(t))
	if err != nil {
		t.Fatal(err)
	}
	return NewService(NewMemoryStore(), artifactStore, validator)
}

func compatibleWorkerRegistration(workerID string) map[string]any {
	return map[string]any{
		"worker_id":                   workerID,
		"capabilities":                []any{"material_balance", "ode"},
		"supported_contract_versions": []any{"compute_job.v1", "simulation_input.v1"},
	}
}

func fixtureJobBytes(t *testing.T) []byte {
	t.Helper()
	path := filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance_minimal.compute_job.v1.json")
	bytes, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	return bytes
}

func decodeMap(t *testing.T, bytes []byte) map[string]any {
	t.Helper()
	var value map[string]any
	if err := json.Unmarshal(bytes, &value); err != nil {
		t.Fatal(err)
	}
	return value
}

func assertRequiredCapabilities(t *testing.T, jobPayload map[string]any, expected []string) {
	t.Helper()
	execution := mapValue(jobPayload, "execution")
	if execution == nil {
		t.Fatalf("expected job execution payload, got %#v", jobPayload)
	}
	capabilities, ok := execution["required_capabilities"].([]any)
	if !ok {
		t.Fatalf("expected required_capabilities array, got %#v", execution["required_capabilities"])
	}
	if len(capabilities) != len(expected) {
		t.Fatalf("unexpected required_capabilities length: got %#v want %#v", capabilities, expected)
	}
	for index, capability := range expected {
		if capabilities[index] != capability {
			t.Fatalf("unexpected required_capabilities: got %#v want %#v", capabilities, expected)
		}
	}
}

func encodeMap(t *testing.T, value map[string]any) []byte {
	t.Helper()
	bytes, err := json.Marshal(value)
	if err != nil {
		t.Fatal(err)
	}
	return bytes
}

func containsString(values []string, expected string) bool {
	for _, value := range values {
		if value == expected {
			return true
		}
	}
	return false
}

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

func TestArtifactRetentionSweepDeletesOnlyUnreferencedExpiredTTL(t *testing.T) {
	svc := testService(t)
	ctx := context.Background()
	if _, _, err := svc.CreateJob(ctx, fixtureJobBytes(t), ""); err != nil {
		t.Fatal(err)
	}
	worker, err := svc.RegisterWorker(ctx, compatibleWorkerRegistration("worker_retention"))
	if err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Claim(ctx, worker.WorkerID); err != nil {
		t.Fatal(err)
	}
	retainUntil := "2026-06-01T00:00:00Z"
	referenced := uploadTestArtifact(t, svc, ctx, worker.WorkerID, "job_material_balance_minimal", "art_referenced", []byte(`{"referenced":true}`), retainUntil)
	unreferenced := uploadTestArtifact(t, svc, ctx, worker.WorkerID, "job_material_balance_minimal", "art_unreferenced", []byte(`{"referenced":false}`), retainUntil)

	modelRun := map[string]any{
		"schema_version":  "model_run.v1",
		"model_run_id":    "mr_retention_guard",
		"job_id":          "job_material_balance_minimal",
		"model_key":       "material_balance",
		"model_version":   "material_balance.v1",
		"parameter_hash":  "sha256:" + strings.Repeat("a", 64),
		"input_hash":      "sha256:" + strings.Repeat("b", 64),
		"quality_metrics": map[string]any{},
		"warnings":        []any{},
		"evidence_refs":   []any{referenced.ArtifactID},
		"metadata":        map[string]any{},
	}
	result := map[string]any{
		"schema_version": "compute_result.v1",
		"job_id":         "job_material_balance_minimal",
		"job_type":       "simulation.material_balance.v1",
		"status":         StatusSucceeded,
		"summary":        map[string]any{"converged": true},
		"data":           map[string]any{},
		"quality":        map[string]any{"data_quality": "ok", "warnings": []any{}},
		"artifacts":      []any{referenced, unreferenced},
		"runtime_audit":  map[string]any{"model_runs": []any{modelRun}, "timings_ms": map[string]any{}, "fallback_used": false},
	}
	if _, err := svc.Complete(ctx, worker.WorkerID, "job_material_balance_minimal", 1, result); err != nil {
		t.Fatal(err)
	}

	now := time.Date(2026, 6, 2, 0, 0, 0, 0, time.UTC)
	dryRun, err := svc.SweepArtifactRetention(ctx, ArtifactRetentionSweepOptions{DryRun: true, Now: now})
	if err != nil {
		t.Fatal(err)
	}
	if dryRun.Checked != 2 || dryRun.Deleted != 0 || dryRun.Skipped != 1 {
		t.Fatalf("unexpected dry-run retention report: %#v", dryRun)
	}
	if _, _, err := svc.DownloadArtifact(ctx, unreferenced.ArtifactID); err != nil {
		t.Fatalf("dry-run must not delete artifact: %v", err)
	}

	report, err := svc.SweepArtifactRetention(ctx, ArtifactRetentionSweepOptions{Now: now})
	if err != nil {
		t.Fatal(err)
	}
	if report.Checked != 2 || report.Deleted != 1 || report.Skipped != 1 {
		t.Fatalf("unexpected retention report: %#v", report)
	}
	actions := map[string]ArtifactRetentionAction{}
	for _, item := range report.Items {
		actions[item.ArtifactID] = item
	}
	if actions[referenced.ArtifactID].Action != "skipped" || actions[referenced.ArtifactID].Reason != "referenced_by_model_run" {
		t.Fatalf("referenced artifact should be protected, got %#v", actions[referenced.ArtifactID])
	}
	if actions[unreferenced.ArtifactID].Action != "deleted" {
		t.Fatalf("unreferenced expired TTL artifact should be deleted, got %#v", actions[unreferenced.ArtifactID])
	}
	if _, _, err := svc.DownloadArtifact(ctx, referenced.ArtifactID); err != nil {
		t.Fatalf("referenced artifact should remain downloadable: %v", err)
	}
	if _, _, err := svc.DownloadArtifact(ctx, unreferenced.ArtifactID); err == nil || ToAppError(err).ErrorCode != CodeArtifactNotFound {
		t.Fatalf("deleted artifact should no longer resolve, got %#v", err)
	}
	events, err := svc.store.Events(ctx, "job_material_balance_minimal")
	if err != nil {
		t.Fatal(err)
	}
	foundRetentionEvent := false
	for _, event := range events {
		if event.EventType == "artifact.retention_deleted" {
			foundRetentionEvent = true
			break
		}
	}
	if !foundRetentionEvent {
		t.Fatalf("retention deletion should write an audit event")
	}
}

func TestArtifactRetentionSweepSkipsArchiveCandidateWithoutBackend(t *testing.T) {
	svc := testService(t)
	ctx := context.Background()
	if _, _, err := svc.CreateJob(ctx, fixtureJobBytes(t), ""); err != nil {
		t.Fatal(err)
	}
	worker, err := svc.RegisterWorker(ctx, compatibleWorkerRegistration("worker_archive_skip"))
	if err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Claim(ctx, worker.WorkerID); err != nil {
		t.Fatal(err)
	}
	candidate := uploadTestArtifactWithRetention(
		t,
		svc,
		ctx,
		worker.WorkerID,
		"job_material_balance_minimal",
		"art_archive_skip",
		[]byte(`{"archive":false}`),
		"archive_candidate",
		"2026-06-01T00:00:00Z",
	)

	report, err := svc.SweepArtifactRetention(ctx, ArtifactRetentionSweepOptions{
		DryRun: true,
		Now:    time.Date(2026, 6, 2, 0, 0, 0, 0, time.UTC),
	})
	if err != nil {
		t.Fatal(err)
	}
	if report.Checked != 1 || report.Skipped != 1 || report.Items[0].Action != "skipped" || report.Items[0].Reason != "archive_executor_not_configured" {
		t.Fatalf("archive candidate should be blocked when archive backend is not configured: %#v", report)
	}
	if _, _, err := svc.DownloadArtifact(ctx, candidate.ArtifactID); err != nil {
		t.Fatalf("skipped archive candidate should remain hot-downloadable: %v", err)
	}
}

func TestArtifactRetentionSweepArchivesCandidateWithConfiguredBackend(t *testing.T) {
	svc := testServiceWithArchive(t)
	ctx := context.Background()
	if _, _, err := svc.CreateJob(ctx, fixtureJobBytes(t), ""); err != nil {
		t.Fatal(err)
	}
	worker, err := svc.RegisterWorker(ctx, compatibleWorkerRegistration("worker_archive"))
	if err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Claim(ctx, worker.WorkerID); err != nil {
		t.Fatal(err)
	}
	retainUntil := "2026-06-01T00:00:00Z"
	artifactBytes := []byte(`{"archive":true}`)
	candidate := uploadTestArtifactWithRetention(t, svc, ctx, worker.WorkerID, "job_material_balance_minimal", "art_archive_candidate", artifactBytes, "archive_candidate", retainUntil)
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

	now := time.Date(2026, 6, 2, 0, 0, 0, 0, time.UTC)
	dryRun, err := svc.SweepArtifactRetention(ctx, ArtifactRetentionSweepOptions{DryRun: true, Now: now})
	if err != nil {
		t.Fatal(err)
	}
	if dryRun.Checked != 1 || dryRun.Archived != 0 || dryRun.Skipped != 0 || dryRun.Items[0].Action != "would_archive" {
		t.Fatalf("unexpected archive dry-run report: %#v", dryRun)
	}

	report, err := svc.SweepArtifactRetention(ctx, ArtifactRetentionSweepOptions{Now: now})
	if err != nil {
		t.Fatal(err)
	}
	if report.Checked != 1 || report.Archived != 1 || report.Deleted != 0 || report.Skipped != 0 {
		t.Fatalf("unexpected archive report: %#v", report)
	}
	action := report.Items[0]
	if action.Action != "archived" || action.ArchiveProvider != "local_fs_archive" || action.ArchiveObjectKey == "" {
		t.Fatalf("archive action should include archive metadata, got %#v", action)
	}
	if _, err := svc.artifacts.Read(ctx, candidate.ObjectKey); err == nil || ToAppError(err).ErrorCode != CodeArtifactNotFound {
		t.Fatalf("hot artifact should be removed after archive metadata is recorded, got %#v", err)
	}
	_, downloaded, err := svc.DownloadArtifact(ctx, candidate.ArtifactID)
	if err != nil {
		t.Fatal(err)
	}
	if string(downloaded) != string(artifactBytes) {
		t.Fatalf("downloaded archive artifact mismatch")
	}
	metrics, err := svc.Metrics(ctx)
	if err != nil {
		t.Fatalf("archive metrics failed: %v", err)
	}
	if metrics.ArtifactArchives != 1 || metrics.RetentionCandidates != 0 {
		t.Fatalf("archive metrics should count archived artifacts and clear candidates, got %#v", metrics)
	}
	second, err := svc.SweepArtifactRetention(ctx, ArtifactRetentionSweepOptions{Now: now})
	if err != nil {
		t.Fatal(err)
	}
	if second.Checked != 0 {
		t.Fatalf("archived artifact should no longer be a retention candidate: %#v", second)
	}
	events, err := svc.store.Events(ctx, "job_material_balance_minimal")
	if err != nil {
		t.Fatal(err)
	}
	foundArchiveEvent := false
	for _, event := range events {
		if event.EventType == "artifact.archived" {
			foundArchiveEvent = true
			break
		}
	}
	if !foundArchiveEvent {
		t.Fatalf("archive should write an audit event")
	}
}

func TestHTTPArtifactRetentionSweepRequiresAdminScope(t *testing.T) {
	svc := testService(t)
	ctx := context.Background()
	if _, _, err := svc.CreateJob(ctx, fixtureJobBytes(t), ""); err != nil {
		t.Fatal(err)
	}
	worker, err := svc.RegisterWorker(ctx, compatibleWorkerRegistration("worker_retention_http"))
	if err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Claim(ctx, worker.WorkerID); err != nil {
		t.Fatal(err)
	}
	expired := uploadTestArtifact(
		t,
		svc,
		ctx,
		worker.WorkerID,
		"job_material_balance_minimal",
		"artifact_http_retention_expired",
		[]byte(`{"expired":true}`),
		"2020-01-01T00:00:00Z",
	)
	auth, err := NewAuthenticator(`{"tokens":[
		{"name":"reader","token":"reader-token","scopes":["job:read","artifact:read"]},
		{"name":"admin","token":"admin-token","scopes":["artifact:admin"]}
	]}`)
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()

	req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/artifacts/retention-sweep", strings.NewReader(`{"dry_run":true}`))
	req.Header.Set("Authorization", "Bearer reader-token")
	rec := httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("reader token should not run retention sweep, got %d %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/admin/artifacts/retention-sweep", nil)
	req.Header.Set("Authorization", "Bearer admin-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("default dry-run sweep failed: %d %s", rec.Code, rec.Body.String())
	}
	var dryRun ArtifactRetentionSweepReport
	if err := json.NewDecoder(rec.Body).Decode(&dryRun); err != nil {
		t.Fatal(err)
	}
	if !dryRun.DryRun || dryRun.Deleted != 0 || len(dryRun.Items) != 1 || dryRun.Items[0].Action != "would_delete" {
		t.Fatalf("expected safe default dry-run report, got %#v", dryRun)
	}
	if _, _, err := svc.DownloadArtifact(ctx, expired.ArtifactID); err != nil {
		t.Fatalf("dry-run must not delete artifact: %v", err)
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/admin/artifacts/retention-sweep", strings.NewReader(`{"dry_run":false,"limit":5}`))
	req.Header.Set("Authorization", "Bearer admin-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("actual retention sweep failed: %d %s", rec.Code, rec.Body.String())
	}
	var report ArtifactRetentionSweepReport
	if err := json.NewDecoder(rec.Body).Decode(&report); err != nil {
		t.Fatal(err)
	}
	if report.DryRun || report.Deleted != 1 || report.Items[0].Action != "deleted" {
		t.Fatalf("expected deletion report, got %#v", report)
	}
	if _, _, err := svc.DownloadArtifact(ctx, expired.ArtifactID); ToAppError(err).Status != http.StatusNotFound {
		t.Fatalf("deleted artifact should no longer resolve, got %#v", err)
	}
}

func TestArtifactRetentionSchedulerDeletesExpiredTTLWhenEnabled(t *testing.T) {
	svc := testService(t)
	ctx := context.Background()
	if _, _, err := svc.CreateJob(ctx, fixtureJobBytes(t), ""); err != nil {
		t.Fatal(err)
	}
	worker, err := svc.RegisterWorker(ctx, compatibleWorkerRegistration("worker_retention_scheduler"))
	if err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Claim(ctx, worker.WorkerID); err != nil {
		t.Fatal(err)
	}
	expired := uploadTestArtifact(
		t,
		svc,
		ctx,
		worker.WorkerID,
		"job_material_balance_minimal",
		"artifact_scheduler_retention_expired",
		[]byte(`{"expired":true}`),
		"2020-01-01T00:00:00Z",
	)
	schedulerCtx, cancel := context.WithCancel(ctx)
	defer cancel()
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	if err := StartArtifactRetentionScheduler(
		schedulerCtx,
		svc,
		ArtifactRetentionSchedulerOptions{Interval: time.Millisecond, DryRun: false, Limit: 10},
		logger,
	); err != nil {
		t.Fatal(err)
	}
	deadline := time.Now().Add(time.Second)
	for time.Now().Before(deadline) {
		_, _, err := svc.DownloadArtifact(ctx, expired.ArtifactID)
		if err != nil && ToAppError(err).Status == http.StatusNotFound {
			return
		}
		time.Sleep(10 * time.Millisecond)
	}
	t.Fatalf("scheduler did not delete expired TTL artifact")
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

func TestValidatedCompletePersistsModelRun(t *testing.T) {
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
	defaultParameterHash := builtInModelCatalog("2026-05-30T00:00:00Z").Models[0].Versions[0].DefaultParameterSet.ParameterHash
	modelRun := map[string]any{
		"schema_version":  "model_run.v1",
		"model_run_id":    "mr_material_balance_test",
		"job_id":          "job_material_balance_minimal",
		"model_key":       "material_balance",
		"model_version":   "material_balance.v1",
		"parameter_hash":  defaultParameterHash,
		"input_hash":      "sha256:" + strings.Repeat("b", 64),
		"quality_metrics": map[string]any{"convergence_status": "converged"},
		"warnings":        []any{},
		"evidence_refs":   []any{},
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
		"risk_findings": []any{
			map[string]any{
				"risk_code":     "material_balance_smoke_ok",
				"severity":      "info",
				"title":         "Material balance smoke run completed",
				"description":   "The minimal material balance smoke run completed without warnings.",
				"evidence_refs": []any{"model_run:mr_material_balance_test"},
			},
		},
		"runtime_audit": map[string]any{"model_runs": []any{modelRun}, "timings_ms": map[string]any{}, "fallback_used": false},
	}
	completed, err := svc.Complete(ctx, "worker_1", "job_material_balance_minimal", 1, result)
	if err != nil {
		t.Fatal(err)
	}
	if completed.Job.Status != StatusSucceeded {
		t.Fatalf("expected succeeded job, got %s", completed.Job.Status)
	}
	stored, err := svc.GetModelRun(ctx, "mr_material_balance_test")
	if err != nil {
		t.Fatal(err)
	}
	var decoded map[string]any
	if err := json.Unmarshal(stored, &decoded); err != nil {
		t.Fatal(err)
	}
	if decoded["model_run_id"] != "mr_material_balance_test" || decoded["model_key"] != "material_balance" {
		t.Fatalf("unexpected persisted model run: %#v", decoded)
	}
	listed, err := svc.ListModelRuns(ctx, ModelRunFilter{ModelKey: "material_balance", ModelVersion: "material_balance.v1"})
	if err != nil {
		t.Fatal(err)
	}
	if listed.TotalEstimate != 1 || len(listed.Items) != 1 {
		t.Fatalf("expected one listed model run, got %#v", listed)
	}
	filtered, err := svc.ListModelRuns(ctx, ModelRunFilter{ModelKey: "asm1"})
	if err != nil {
		t.Fatal(err)
	}
	if filtered.TotalEstimate != 0 || len(filtered.Items) != 0 {
		t.Fatalf("unexpected model run filter result: %#v", filtered)
	}
	resultView, err := svc.Result(ctx, "job_material_balance_minimal")
	if err != nil {
		t.Fatal(err)
	}
	modelRuns, ok := resultView["model_runs"].([]any)
	if !ok || len(modelRuns) != 1 {
		t.Fatalf("expected result view to include model_runs, got %#v", resultView["model_runs"])
	}
	summaryView, ok := resultView["summary"].(map[string]any)
	if !ok {
		t.Fatalf("expected result summary object, got %#v", resultView["summary"])
	}
	riskFindings, ok := summaryView["risk_findings"].([]any)
	if !ok || len(riskFindings) != 1 {
		t.Fatalf("expected result summary to include risk_findings, got %#v", summaryView["risk_findings"])
	}
	evidence, checksum, err := svc.EvidencePackage(ctx, "job_material_balance_minimal")
	if err != nil {
		t.Fatal(err)
	}
	if evidence["schema_version"] != "evidence_package.v1" || evidence["job_id"] != "job_material_balance_minimal" {
		t.Fatalf("unexpected evidence package: %#v", evidence)
	}
	if checksum == "" || !strings.HasPrefix(checksum, "sha256:") {
		t.Fatalf("expected evidence checksum, got %q", checksum)
	}
	refs, ok := evidence["model_run_refs"].([]any)
	if !ok || len(refs) != 1 || refs[0] != "mr_material_balance_test" {
		t.Fatalf("unexpected model_run_refs: %#v", evidence["model_run_refs"])
	}
	governance, ok := evidence["governance"].(map[string]any)
	if !ok || governance["production_allowed"] != true {
		t.Fatalf("expected production-allowed governance summary, got %#v", evidence["governance"])
	}
	versionRefs, ok := governance["model_version_refs"].([]any)
	if !ok || len(versionRefs) != 1 {
		t.Fatalf("expected one governance model version ref, got %#v", governance["model_version_refs"])
	}

	auth, _ := NewAuthenticator("")
	server := NewServer(svc, auth, nil).Routes()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/model-runs/mr_material_balance_test", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec := httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("model run endpoint failed: %d %s", rec.Code, rec.Body.String())
	}
	req = httptest.NewRequest(http.MethodGet, "/api/v1/model-runs?model_key=material_balance&model_version=material_balance.v1", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("model run list endpoint failed: %d %s", rec.Code, rec.Body.String())
	}
	var listedResponse map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &listedResponse); err != nil {
		t.Fatal(err)
	}
	if int(listedResponse["total_estimate"].(float64)) != 1 {
		t.Fatalf("unexpected model run list response: %#v", listedResponse)
	}
	req = httptest.NewRequest(http.MethodGet, "/api/v1/compute/jobs/job_material_balance_minimal/evidence", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK || rec.Header().Get("X-Evidence-Checksum") == "" {
		t.Fatalf("evidence endpoint failed: %d checksum=%q body=%s", rec.Code, rec.Header().Get("X-Evidence-Checksum"), rec.Body.String())
	}
	req = httptest.NewRequest(http.MethodGet, "/api/v1/compute/jobs/job_material_balance_minimal/evidence-ref?ref=model_run:mr_material_balance_test", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("evidence ref endpoint failed: %d %s", rec.Code, rec.Body.String())
	}
	var resolution EvidenceReferenceResolution
	if err := json.Unmarshal(rec.Body.Bytes(), &resolution); err != nil {
		t.Fatal(err)
	}
	payload, ok := resolution.Payload.(map[string]any)
	if !ok || resolution.RefType != "model_run" || payload["model_run_id"] != "mr_material_balance_test" {
		t.Fatalf("unexpected evidence ref resolution: %#v", resolution)
	}
	req = httptest.NewRequest(http.MethodGet, "/api/v1/compute/jobs/job_material_balance_minimal/evidence-ref?ref=evidence_package:evidence_job_material_balance_minimal", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("evidence package ref endpoint failed: %d %s", rec.Code, rec.Body.String())
	}

	benchmarkRunBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance.benchmark_run.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	benchmarkRun := decodeMap(t, benchmarkRunBytes)
	benchmarkRun["benchmark_run_id"] = "br_material_balance_test"
	benchmarkRun["model_run_id"] = "mr_material_balance_test"
	benchmarkRun["job_id"] = "job_material_balance_minimal"
	benchmarkRun["evidence_refs"] = []any{
		"model_run:mr_material_balance_test",
		"evidence_package:evidence_job_material_balance_minimal",
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/model-catalog/material_balance/versions/material_balance.v1/benchmark-runs", bytes.NewReader(encodeMap(t, benchmarkRun)))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("benchmark run record failed: %d %s", rec.Code, rec.Body.String())
	}
	var benchmarkRecord BenchmarkRunRecord
	if err := json.Unmarshal(rec.Body.Bytes(), &benchmarkRecord); err != nil {
		t.Fatal(err)
	}
	if benchmarkRecord.BenchmarkRunID != "br_material_balance_test" ||
		benchmarkRecord.Status != "passed" ||
		benchmarkRecord.PayloadHash == "" {
		t.Fatalf("unexpected benchmark run record: %#v", benchmarkRecord)
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/model-catalog/material_balance/versions/material_balance.v1/benchmark-runs", bytes.NewReader(encodeMap(t, benchmarkRun)))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("duplicate benchmark run should be idempotent, got %d %s", rec.Code, rec.Body.String())
	}
	req = httptest.NewRequest(http.MethodGet, "/api/v1/model-catalog/material_balance/versions/material_balance.v1/benchmark-runs?benchmark_case_id=bc_material_balance_minimal_v1", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("benchmark run list failed: %d %s", rec.Code, rec.Body.String())
	}
	var benchmarkList ListBenchmarkRunsResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &benchmarkList); err != nil {
		t.Fatal(err)
	}
	if benchmarkList.TotalEstimate != 1 || len(benchmarkList.Items) != 1 {
		t.Fatalf("unexpected benchmark run list: %#v", benchmarkList)
	}
	req = httptest.NewRequest(http.MethodGet, "/api/v1/benchmark-runs/br_material_balance_test", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("benchmark run get failed: %d %s", rec.Code, rec.Body.String())
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/model-catalog/material_balance/versions/material_balance.v1/benchmark-runs", bytes.NewReader(encodeMap(t, benchmarkRun)))
	req.Header.Set("Authorization", "Bearer dev-worker-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("worker token should not record benchmark runs, got %d %s", rec.Code, rec.Body.String())
	}

	explanationBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance.result_explanation.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	explanation := decodeMap(t, explanationBytes)
	explanation["evidence_refs"] = []any{"evidence_package:evidence_job_material_balance_minimal", "model_run:mr_material_balance_test"}
	statements := explanation["statements"].([]any)
	statements[0].(map[string]any)["evidence_refs"] = []any{"model_run:mr_material_balance_test"}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/compute/jobs/job_material_balance_minimal/result-explanations", bytes.NewReader(encodeMap(t, explanation)))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("result explanation submit failed: %d %s", rec.Code, rec.Body.String())
	}
	var explanationRecord ResultExplanationRecord
	if err := json.Unmarshal(rec.Body.Bytes(), &explanationRecord); err != nil {
		t.Fatal(err)
	}
	if explanationRecord.Status != "submitted" ||
		explanationRecord.ExplanationID != "explanation_material_balance_minimal" ||
		len(explanationRecord.ResolvedEvidenceRefs) != 2 {
		t.Fatalf("unexpected submitted result explanation: %#v", explanationRecord)
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/compute/jobs/job_material_balance_minimal/result-explanations", bytes.NewReader(encodeMap(t, explanation)))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("duplicate result explanation should be idempotent, got %d %s", rec.Code, rec.Body.String())
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/compute/jobs/job_material_balance_minimal/result-explanations/explanation_material_balance_minimal/publish", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusConflict {
		t.Fatalf("unreviewed result explanation should not publish, got %d %s", rec.Code, rec.Body.String())
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/compute/jobs/job_material_balance_minimal/result-explanations/explanation_material_balance_minimal/review", strings.NewReader(`{"decision":"approved","reason":"evidence refs verified"}`))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("result explanation review failed: %d %s", rec.Code, rec.Body.String())
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &explanationRecord); err != nil {
		t.Fatal(err)
	}
	if explanationRecord.Status != "approved" || explanationRecord.ReviewedBy != "dev-public" {
		t.Fatalf("unexpected reviewed result explanation: %#v", explanationRecord)
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/compute/jobs/job_material_balance_minimal/result-explanations/explanation_material_balance_minimal/publish", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("result explanation publish failed: %d %s", rec.Code, rec.Body.String())
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &explanationRecord); err != nil {
		t.Fatal(err)
	}
	if explanationRecord.Status != "published" || explanationRecord.PublishedBy != "dev-public" {
		t.Fatalf("unexpected published result explanation: %#v", explanationRecord)
	}
	req = httptest.NewRequest(http.MethodGet, "/api/v1/compute/jobs/job_material_balance_minimal/result-explanations/explanation_material_balance_minimal", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("result explanation read failed: %d %s", rec.Code, rec.Body.String())
	}
	badExplanation := decodeMap(t, encodeMap(t, explanation))
	badExplanation["explanation_id"] = "explanation_unresolved_ref"
	badExplanation["evidence_refs"] = []any{"model_run:missing"}
	badStatements := badExplanation["statements"].([]any)
	badStatements[0].(map[string]any)["evidence_refs"] = []any{"model_run:missing"}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/compute/jobs/job_material_balance_minimal/result-explanations", bytes.NewReader(encodeMap(t, badExplanation)))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("unresolved evidence ref should reject explanation, got %d %s", rec.Code, rec.Body.String())
	}
	req = httptest.NewRequest(http.MethodGet, "/api/v1/compute/jobs/job_material_balance_minimal/evidence-ref?ref=model_run:missing", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("missing evidence ref should return 404, got %d %s", rec.Code, rec.Body.String())
	}
	req = httptest.NewRequest(http.MethodGet, "/api/v1/compute/jobs/job_material_balance_minimal/evidence", nil)
	req.Header.Set("Authorization", "Bearer dev-worker-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("worker token should not read evidence, got %d %s", rec.Code, rec.Body.String())
	}
	req = httptest.NewRequest(http.MethodGet, "/api/v1/compute/jobs/job_material_balance_minimal/evidence-ref?ref=model_run:mr_material_balance_test", nil)
	req.Header.Set("Authorization", "Bearer dev-worker-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("worker token should not dereference evidence, got %d %s", rec.Code, rec.Body.String())
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

func TestHTTPAuthScopeAndMetrics(t *testing.T) {
	svc := testService(t)
	ctx := context.Background()
	if _, _, err := svc.CreateJob(ctx, fixtureJobBytes(t), ""); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.RegisterWorker(ctx, compatibleWorkerRegistration("worker_metrics")); err != nil {
		t.Fatal(err)
	}
	auth, err := NewAuthenticator("")
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/metrics", nil)
	server.ServeHTTP(rec, req)
	metrics := rec.Body.String()
	if rec.Code != http.StatusOK || !strings.Contains(metrics, "autowatersimu_compute_api_up") {
		t.Fatalf("metrics should be public, got %d %s", rec.Code, metrics)
	}
	if !strings.Contains(metrics, `autowatersimu_compute_jobs_total{status="queued"} 1`) {
		t.Fatalf("metrics should expose job status counts, got %s", metrics)
	}
	if !strings.Contains(metrics, "autowatersimu_compute_workers_registered_total 1") {
		t.Fatalf("metrics should expose registered worker count, got %s", metrics)
	}
	if !strings.Contains(metrics, "autowatersimu_compute_artifact_archives_total 0") {
		t.Fatalf("metrics should expose archived artifact count, got %s", metrics)
	}

	rec = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/api/v1/workers/register", strings.NewReader(`{}`))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected scope denial, got %d %s", rec.Code, rec.Body.String())
	}
}

func TestStaticTokenRevocation(t *testing.T) {
	auth, err := NewAuthenticator(`{"tokens":[
		{"name":"active","token":"active-token","scopes":["job:create"]},
		{"name":"old","token":"old-token","scopes":["job:create"],"revoked":true}
	]}`)
	if err != nil {
		t.Fatal(err)
	}
	req := httptest.NewRequest(http.MethodPost, "/api/v1/compute/jobs", nil)
	req.Header.Set("Authorization", "Bearer active-token")
	if principal, err := auth.Principal(req, "job:create"); err != nil || principal.Name != "active" {
		t.Fatalf("active token should authenticate, principal=%#v err=%v", principal, err)
	}
	req.Header.Set("Authorization", "Bearer old-token")
	if _, err := auth.Principal(req, "job:create"); ToAppError(err).Status != http.StatusUnauthorized {
		t.Fatalf("revoked token should be rejected as unauthorized, got %#v", err)
	}
	if _, err := NewAuthenticator(`{"tokens":[
		{"name":"one","token":"same-token","scopes":["job:create"]},
		{"name":"two","token":"same-token","scopes":["job:read"]}
	]}`); err == nil {
		t.Fatalf("duplicate token values should be rejected")
	}
}

func TestModelCatalogEndpoint(t *testing.T) {
	svc := testValidatedService(t)
	auth, err := NewAuthenticator("")
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()

	catalog, err := svc.ModelCatalog(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if catalog.SchemaVersion != "model_catalog.v1" || len(catalog.Models) != 5 {
		t.Fatalf("unexpected model catalog: %#v", catalog)
	}
	modelsByKey := map[string]ModelCatalogModel{}
	for _, model := range catalog.Models {
		modelsByKey[model.ModelKey] = model
	}
	materialModel, ok := modelsByKey["material_balance"]
	if !ok {
		t.Fatalf("expected material_balance catalog entry, got %#v", catalog.Models)
	}
	if materialModel.Versions[0].DefaultParameterSet == nil ||
		materialModel.Versions[0].DefaultParameterSet.Status != "approved" {
		t.Fatalf("expected approved default parameter set: %#v", materialModel.Versions[0])
	}
	if len(materialModel.Versions[0].BenchmarkCases) != 1 ||
		materialModel.Versions[0].BenchmarkCases[0].Status != "validated" {
		t.Fatalf("expected validated benchmark case: %#v", materialModel.Versions[0].BenchmarkCases)
	}
	for _, modelKey := range []string{"asm1slim", "asm1", "asm3", "udm"} {
		model, ok := modelsByKey[modelKey]
		if !ok {
			t.Fatalf("expected %s catalog entry, got %#v", modelKey, catalog.Models)
		}
		if len(model.Versions) != 1 || model.Versions[0].Status != "active" {
			t.Fatalf("expected active %s model version, got %#v", modelKey, model.Versions)
		}
		if model.Versions[0].DefaultParameterSet != nil {
			t.Fatalf("ASM/UDM built-in catalog entries should not define default parameter sets yet: %#v", model.Versions[0])
		}
		if len(model.Versions[0].BenchmarkCases) != 1 || model.Versions[0].BenchmarkCases[0].Status != "validated" {
			t.Fatalf("expected validated %s benchmark case, got %#v", modelKey, model.Versions[0].BenchmarkCases)
		}
	}

	req := httptest.NewRequest(http.MethodGet, "/api/v1/model-catalog", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec := httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("model catalog endpoint failed: %d %s", rec.Code, rec.Body.String())
	}
	var response ModelCatalogResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatal(err)
	}
	if response.SchemaVersion != "model_catalog.v1" || len(response.Models) != 5 {
		t.Fatalf("unexpected model catalog response: %#v", response)
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/model-catalog/asm1", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("built-in asm1 model catalog by key failed: %d %s", rec.Code, rec.Body.String())
	}
	var builtinModel ModelCatalogModel
	if err := json.Unmarshal(rec.Body.Bytes(), &builtinModel); err != nil {
		t.Fatal(err)
	}
	if builtinModel.ModelKey != "asm1" || len(builtinModel.Versions) != 1 {
		t.Fatalf("unexpected built-in asm1 model response: %#v", builtinModel)
	}

	catalogBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance.model_catalog.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/model-catalog", bytes.NewReader(catalogBytes))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("model catalog registration failed: %d %s", rec.Code, rec.Body.String())
	}
	var record ModelCatalogRecord
	if err := json.Unmarshal(rec.Body.Bytes(), &record); err != nil {
		t.Fatal(err)
	}
	if record.CatalogID != "default" || record.SchemaVersion != "model_catalog.v1" || record.PayloadHash == "" {
		t.Fatalf("unexpected model catalog record: %#v", record)
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/model-catalog", bytes.NewReader(catalogBytes))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("duplicate model catalog registration should be idempotent, got %d %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/model-catalog", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("persisted model catalog endpoint failed: %d %s", rec.Code, rec.Body.String())
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatal(err)
	}
	if response.GeneratedAt != "2026-05-30T00:00:00Z" ||
		response.Models[0].Versions[0].DefaultParameterSet == nil ||
		response.Models[0].Versions[0].DefaultParameterSet.ParameterHash != "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" {
		t.Fatalf("expected persisted model catalog response, got %#v", response)
	}

	transitionBody := `{"parameter_set_id":"ps_material_balance_default_v1","from_status":"approved","to_status":"retired","reason":"regression test"}`
	req = httptest.NewRequest(http.MethodPost, "/api/v1/model-catalog/material_balance/versions/material_balance.v1/default-parameter-set/status", strings.NewReader(transitionBody))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("parameter set status transition failed: %d %s", rec.Code, rec.Body.String())
	}
	var transition ModelParameterSetTransitionResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &transition); err != nil {
		t.Fatal(err)
	}
	if !transition.CreatedSnapshot || transition.FromStatus != "approved" || transition.ToStatus != "retired" ||
		transition.Catalog.Models[0].Versions[0].DefaultParameterSet.Status != "retired" {
		t.Fatalf("unexpected parameter set transition response: %#v", transition)
	}
	req = httptest.NewRequest(http.MethodGet, "/api/v1/model-catalog/snapshots?limit=1", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("model catalog snapshot list failed: %d %s", rec.Code, rec.Body.String())
	}
	var snapshotList ListModelCatalogSnapshotsResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &snapshotList); err != nil {
		t.Fatal(err)
	}
	if snapshotList.TotalEstimate != 2 || len(snapshotList.Items) != 1 || snapshotList.NextCursor == "" {
		t.Fatalf("expected first page of two catalog snapshots, got %#v", snapshotList)
	}
	if snapshotList.Items[0].PayloadHash != transition.CatalogPayloadHash {
		t.Fatalf("newest snapshot should be the transition snapshot, got %#v", snapshotList.Items[0])
	}
	req = httptest.NewRequest(http.MethodGet, "/api/v1/model-catalog/snapshots?cursor="+url.QueryEscape(snapshotList.NextCursor), nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("model catalog snapshot second page failed: %d %s", rec.Code, rec.Body.String())
	}
	snapshotList = ListModelCatalogSnapshotsResponse{}
	if err := json.Unmarshal(rec.Body.Bytes(), &snapshotList); err != nil {
		t.Fatal(err)
	}
	if snapshotList.TotalEstimate != 2 || len(snapshotList.Items) != 1 || snapshotList.NextCursor != "" {
		t.Fatalf("expected second page of catalog snapshots, got %#v", snapshotList)
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/model-catalog/material_balance/versions/material_balance.v1/default-parameter-set/status", strings.NewReader(`{"from_status":"retired","to_status":"approved"}`))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusConflict {
		t.Fatalf("invalid parameter set transition should conflict, got %d %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/model-catalog/material_balance/versions/material_balance.v1/default-parameter-set/status", strings.NewReader(`{"to_status":"retired"}`))
	req.Header.Set("Authorization", "Bearer dev-worker-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("worker token should not update parameter set status, got %d %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/model-catalog/material_balance", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("model catalog by key failed: %d %s", rec.Code, rec.Body.String())
	}
	var model ModelCatalogModel
	if err := json.Unmarshal(rec.Body.Bytes(), &model); err != nil {
		t.Fatal(err)
	}
	if model.ModelKey != "material_balance" {
		t.Fatalf("unexpected model response: %#v", model)
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/model-catalog/asm1", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("missing model should return 404, got %d %s", rec.Code, rec.Body.String())
	}
	req = httptest.NewRequest(http.MethodGet, "/api/v1/model-catalog", nil)
	req.Header.Set("Authorization", "Bearer dev-worker-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("worker token should not read model catalog, got %d %s", rec.Code, rec.Body.String())
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/model-catalog", bytes.NewReader(catalogBytes))
	req.Header.Set("Authorization", "Bearer dev-worker-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("worker token should not write model catalog, got %d %s", rec.Code, rec.Body.String())
	}
}

func TestDefaultParameterSetPromotionPlanEndpoint(t *testing.T) {
	svc := testValidatedService(t)
	auth, err := NewAuthenticator("")
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()
	catalogBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance.model_catalog.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	catalog := decodeMap(t, catalogBytes)
	models := catalog["models"].([]any)
	version := models[0].(map[string]any)["versions"].([]any)[0].(map[string]any)
	parameterSet := version["default_parameter_set"].(map[string]any)
	parameterSet["status"] = "validated"
	parameterHash := parameterSet["parameter_hash"].(string)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/model-catalog", bytes.NewReader(encodeMap(t, catalog)))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec := httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("model catalog registration failed: %d %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/model-catalog/material_balance/versions/material_balance.v1/default-parameter-set/promotion-plan", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("promotion plan before benchmark failed: %d %s", rec.Code, rec.Body.String())
	}
	var plan ModelParameterSetPromotionPlan
	if err := json.Unmarshal(rec.Body.Bytes(), &plan); err != nil {
		t.Fatal(err)
	}
	if plan.CanPromoteToApproved || plan.CurrentStatus != "validated" || plan.BenchmarkCasesChecked != 1 ||
		!containsString(plan.BlockingReasons, "benchmark_run_missing_for_parameter_set") {
		t.Fatalf("expected missing benchmark blocker, got %#v", plan)
	}

	ctx := context.Background()
	promotionPath := "/api/v1/model-catalog/material_balance/versions/material_balance.v1/default-parameter-set/promote-approved"
	promotionBody := `{"parameter_set_id":"ps_material_balance_default_v1","reason":"regression evidence gate","metadata":{"release_ticket":"PROMO-1"}}`
	req = httptest.NewRequest(http.MethodPost, promotionPath, strings.NewReader(promotionBody))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusConflict {
		t.Fatalf("promotion without benchmark evidence should conflict, got %d %s", rec.Code, rec.Body.String())
	}
	var appErr AppError
	if err := json.Unmarshal(rec.Body.Bytes(), &appErr); err != nil {
		t.Fatal(err)
	}
	blockingReasons, ok := appErr.Details["blocking_reasons"].([]any)
	if appErr.ErrorCode != CodeParameterSetTransitionFailed || !ok || len(blockingReasons) != 1 ||
		blockingReasons[0] != "benchmark_run_missing_for_parameter_set" {
		t.Fatalf("expected benchmark promotion blocker, got %#v", appErr)
	}
	blockedCatalog, err := svc.ModelCatalog(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if blockedCatalog.Models[0].Versions[0].DefaultParameterSet.Status != "validated" {
		t.Fatalf("blocked promotion should not mutate catalog: %#v", blockedCatalog.Models[0].Versions[0].DefaultParameterSet)
	}
	req = httptest.NewRequest(http.MethodPost, promotionPath, strings.NewReader(promotionBody))
	req.Header.Set("Authorization", "Bearer dev-worker-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("worker token should not promote parameter set, got %d %s", rec.Code, rec.Body.String())
	}

	if _, _, err := svc.CreateJob(ctx, fixtureJobBytes(t), ""); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.RegisterWorker(ctx, compatibleWorkerRegistration("worker_promotion")); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Claim(ctx, "worker_promotion"); err != nil {
		t.Fatal(err)
	}
	modelRun := map[string]any{
		"schema_version":  "model_run.v1",
		"model_run_id":    "mr_material_balance_promotion",
		"job_id":          "job_material_balance_minimal",
		"model_key":       "material_balance",
		"model_version":   "material_balance.v1",
		"parameter_hash":  parameterHash,
		"input_hash":      "sha256:" + strings.Repeat("c", 64),
		"quality_metrics": map[string]any{"convergence_status": "converged"},
		"warnings":        []any{},
		"evidence_refs":   []any{},
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
		"runtime_audit":  map[string]any{"model_runs": []any{modelRun}, "timings_ms": map[string]any{}, "fallback_used": false},
	}
	if _, err := svc.Complete(ctx, "worker_promotion", "job_material_balance_minimal", 1, result); err != nil {
		t.Fatal(err)
	}

	benchmarkRunBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance.benchmark_run.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	benchmarkRun := decodeMap(t, benchmarkRunBytes)
	benchmarkRun["benchmark_run_id"] = "br_material_balance_promotion"
	benchmarkRun["model_run_id"] = "mr_material_balance_promotion"
	benchmarkRun["job_id"] = "job_material_balance_minimal"
	benchmarkRun["evidence_refs"] = []any{"model_run:mr_material_balance_promotion"}
	benchmarkRun["executed_at"] = "2026-05-31T00:00:00Z"
	req = httptest.NewRequest(http.MethodPost, "/api/v1/model-catalog/material_balance/versions/material_balance.v1/benchmark-runs", bytes.NewReader(encodeMap(t, benchmarkRun)))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("benchmark run record failed: %d %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/model-catalog/material_balance/versions/material_balance.v1/default-parameter-set/promotion-plan", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("promotion plan after benchmark failed: %d %s", rec.Code, rec.Body.String())
	}
	plan = ModelParameterSetPromotionPlan{}
	if err := json.Unmarshal(rec.Body.Bytes(), &plan); err != nil {
		t.Fatal(err)
	}
	if !plan.CanPromoteToApproved || plan.WouldModifyCatalog || plan.BenchmarkCasesPassed != 1 ||
		len(plan.BlockingReasons) != 0 || len(plan.CaseResults) != 1 || !plan.CaseResults[0].Ready {
		t.Fatalf("expected promotable advisory plan without mutation, got %#v", plan)
	}

	req = httptest.NewRequest(http.MethodPost, promotionPath, strings.NewReader(promotionBody))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("benchmark-backed promotion failed: %d %s", rec.Code, rec.Body.String())
	}
	var transition ModelParameterSetTransitionResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &transition); err != nil {
		t.Fatal(err)
	}
	promotedParameterSet := transition.Catalog.Models[0].Versions[0].DefaultParameterSet
	if !transition.CreatedSnapshot || transition.FromStatus != "validated" || transition.ToStatus != "approved" ||
		transition.ParameterSetID != "ps_material_balance_default_v1" || promotedParameterSet == nil ||
		promotedParameterSet.Status != "approved" {
		t.Fatalf("unexpected benchmark-backed transition response: %#v", transition)
	}
	lastTransition, ok := promotedParameterSet.Metadata["last_status_transition"].(map[string]any)
	if !ok {
		t.Fatalf("expected last_status_transition metadata, got %#v", promotedParameterSet.Metadata)
	}
	transitionMetadata, ok := lastTransition["metadata"].(map[string]any)
	if !ok || transitionMetadata["release_ticket"] != "PROMO-1" ||
		transitionMetadata["promotion_source"] != "default_parameter_set_promotion_plan" ||
		transitionMetadata["benchmark_cases_checked"] != float64(1) ||
		transitionMetadata["benchmark_cases_passed"] != float64(1) {
		t.Fatalf("unexpected promotion transition metadata: %#v", lastTransition)
	}
	promotedCatalog, err := svc.ModelCatalog(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if promotedCatalog.Models[0].Versions[0].DefaultParameterSet.Status != "approved" {
		t.Fatalf("promotion should persist approved status: %#v", promotedCatalog.Models[0].Versions[0].DefaultParameterSet)
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/model-catalog/material_balance/versions/material_balance.v1/default-parameter-set/promotion-plan", nil)
	req.Header.Set("Authorization", "Bearer dev-worker-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("worker token should not read promotion plan, got %d %s", rec.Code, rec.Body.String())
	}
}

func TestBenchmarkCaseScheduleRunEndpoint(t *testing.T) {
	svc := testValidatedService(t)
	auth, err := NewAuthenticator("")
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()

	inputBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance_minimal.simulation_input.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	req := httptest.NewRequest(http.MethodPost, "/api/v1/simulation-inputs", bytes.NewReader(inputBytes))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec := httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("simulation input register failed: %d %s", rec.Code, rec.Body.String())
	}

	requestBody := `{"request_id":"bench_req_material_balance_minimal","metadata":{"project_id":"project_benchmark"}}`
	path := "/api/v1/model-catalog/material_balance/versions/material_balance.v1/benchmark-cases/bc_material_balance_minimal_v1/schedule-run"
	req = httptest.NewRequest(http.MethodPost, path, strings.NewReader(requestBody))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusAccepted {
		t.Fatalf("benchmark case schedule-run failed: %d %s", rec.Code, rec.Body.String())
	}
	var snapshot JobSnapshot
	if err := json.Unmarshal(rec.Body.Bytes(), &snapshot); err != nil {
		t.Fatal(err)
	}
	if snapshot.Job.Status != StatusQueued ||
		snapshot.Job.JobID != "job_benchmark_bench_req_material_balance_minimal" ||
		snapshot.Job.JobType != "simulation.material_balance.v1" ||
		snapshot.Job.RequestID != "bench_req_material_balance_minimal" ||
		snapshot.Job.ProjectID != "project_benchmark" {
		t.Fatalf("unexpected scheduled benchmark job: %#v", snapshot.Job)
	}
	var jobPayload map[string]any
	if err := json.Unmarshal(snapshot.Job.InputJSON, &jobPayload); err != nil {
		t.Fatal(err)
	}
	if payload := mapValue(jobPayload, "payload"); stringValue(payload, "simulation_input_id") != "si_material_balance_minimal" {
		t.Fatalf("scheduled benchmark should use registered simulation input payload, got %#v", jobPayload["payload"])
	}
	assertRequiredCapabilities(t, jobPayload, []string{"material_balance", "ode"})
	metadata := mapValue(jobPayload, "metadata")
	if metadata["source"] != "model_catalog_benchmark_case" ||
		metadata["benchmark_case_id"] != "bc_material_balance_minimal_v1" ||
		metadata["parameter_set_id"] != "ps_material_balance_default_v1" ||
		metadata["benchmark_run_required"] != true {
		t.Fatalf("unexpected benchmark job metadata: %#v", metadata)
	}

	benchmarkRuns, err := svc.ListBenchmarkRuns(context.Background(), BenchmarkRunFilter{
		ModelKey:     "material_balance",
		ModelVersion: "material_balance.v1",
		Limit:        10,
	})
	if err != nil {
		t.Fatal(err)
	}
	if benchmarkRuns.TotalEstimate != 0 || len(benchmarkRuns.Items) != 0 {
		t.Fatalf("schedule-run must not record benchmark_run history, got %#v", benchmarkRuns)
	}

	req = httptest.NewRequest(http.MethodPost, path, strings.NewReader(requestBody))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("duplicate benchmark schedule-run should be idempotent, got %d %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodPost, path, strings.NewReader(requestBody))
	req.Header.Set("Authorization", "Bearer dev-worker-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("worker token should not schedule benchmark runs, got %d %s", rec.Code, rec.Body.String())
	}

	asmPath := "/api/v1/model-catalog/asm1/versions/asm1.v1/benchmark-cases/bc_asm1_independent_v1/schedule-run"
	req = httptest.NewRequest(http.MethodPost, asmPath, strings.NewReader(`{"request_id":"bench_req_asm1"}`))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("ASM benchmark without default parameter set should not schedule, got %d %s", rec.Code, rec.Body.String())
	}
}

func TestContractValidationEndpoint(t *testing.T) {
	svc := testValidatedService(t)
	auth, err := NewAuthenticator("")
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()
	validBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance.simulation_request.v1.json"))
	if err != nil {
		t.Fatal(err)
	}

	req := httptest.NewRequest(http.MethodPost, "/api/v1/contracts/validate", bytes.NewReader(validBytes))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec := httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("validation endpoint failed: %d %s", rec.Code, rec.Body.String())
	}
	var validResponse ContractValidationResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &validResponse); err != nil {
		t.Fatal(err)
	}
	if !validResponse.Valid || validResponse.ContractSchema != "simulation_request.v1.json" || len(validResponse.Errors) != 0 {
		t.Fatalf("unexpected valid contract response: %#v", validResponse)
	}

	constraintBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance.constraint_draft.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/contracts/validate", bytes.NewReader(constraintBytes))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("constraint draft validation endpoint failed: %d %s", rec.Code, rec.Body.String())
	}
	var constraintResponse ContractValidationResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &constraintResponse); err != nil {
		t.Fatal(err)
	}
	if !constraintResponse.Valid || constraintResponse.ContractSchema != "constraint_draft.v1.json" || len(constraintResponse.Errors) != 0 {
		t.Fatalf("unexpected constraint draft validation response: %#v", constraintResponse)
	}

	explanationBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance.result_explanation.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/contracts/validate", bytes.NewReader(explanationBytes))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("result explanation validation endpoint failed: %d %s", rec.Code, rec.Body.String())
	}
	var explanationResponse ContractValidationResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &explanationResponse); err != nil {
		t.Fatal(err)
	}
	if !explanationResponse.Valid || explanationResponse.ContractSchema != "result_explanation.v1.json" || len(explanationResponse.Errors) != 0 {
		t.Fatalf("unexpected result explanation validation response: %#v", explanationResponse)
	}

	confirmationBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance.draft_confirmation.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/contracts/confirm-draft", bytes.NewReader(confirmationBytes))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("draft confirmation endpoint failed: %d %s", rec.Code, rec.Body.String())
	}
	var confirmationResponse ContractValidationResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &confirmationResponse); err != nil {
		t.Fatal(err)
	}
	if !confirmationResponse.Valid || confirmationResponse.ContractSchema != "draft_confirmation.v1.json" || len(confirmationResponse.Errors) != 0 || len(confirmationResponse.Warnings) == 0 {
		t.Fatalf("unexpected draft confirmation response: %#v", confirmationResponse)
	}
	if confirmationResponse.ConfirmationRecord == nil ||
		confirmationResponse.ConfirmationRecord.ConfirmationID != "confirm_draft_material_balance_minimal" ||
		confirmationResponse.ConfirmationRecord.PayloadHash == "" {
		t.Fatalf("draft confirmation should persist an audit record: %#v", confirmationResponse.ConfirmationRecord)
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/contracts/confirmations/confirm_draft_material_balance_minimal", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("draft confirmation read endpoint failed: %d %s", rec.Code, rec.Body.String())
	}
	var storedConfirmation DraftConfirmationRecord
	if err := json.Unmarshal(rec.Body.Bytes(), &storedConfirmation); err != nil {
		t.Fatal(err)
	}
	if storedConfirmation.ConfirmationID != "confirm_draft_material_balance_minimal" ||
		storedConfirmation.DraftID != "draft_material_balance_minimal" ||
		storedConfirmation.PayloadHash != confirmationResponse.ConfirmationRecord.PayloadHash {
		t.Fatalf("unexpected stored draft confirmation: %#v", storedConfirmation)
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/contracts/confirm-draft", bytes.NewReader(confirmationBytes))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("duplicate draft confirmation should be idempotent, got %d %s", rec.Code, rec.Body.String())
	}
	var duplicateConfirmation ContractValidationResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &duplicateConfirmation); err != nil {
		t.Fatal(err)
	}
	if !duplicateConfirmation.Valid || duplicateConfirmation.ConfirmationRecord == nil ||
		duplicateConfirmation.ConfirmationRecord.PayloadHash != confirmationResponse.ConfirmationRecord.PayloadHash {
		t.Fatalf("unexpected duplicate draft confirmation response: %#v", duplicateConfirmation)
	}

	constraintConfirmationBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance_constraint.draft_confirmation.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/contracts/confirm-draft", bytes.NewReader(constraintConfirmationBytes))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("constraint draft confirmation endpoint failed: %d %s", rec.Code, rec.Body.String())
	}
	var constraintConfirmationResponse ContractValidationResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &constraintConfirmationResponse); err != nil {
		t.Fatal(err)
	}
	if !constraintConfirmationResponse.Valid || constraintConfirmationResponse.ContractSchema != "draft_confirmation.v1.json" ||
		constraintConfirmationResponse.ConfirmationRecord == nil ||
		constraintConfirmationResponse.ConfirmationRecord.DraftSchemaVersion != "constraint_draft.v1" {
		t.Fatalf("unexpected constraint confirmation response: %#v", constraintConfirmationResponse)
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/contracts/confirmations/confirm_constraint_material_balance_cod_limit/constraint-application-plan", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("constraint application plan endpoint failed: %d %s", rec.Code, rec.Body.String())
	}
	var constraintPlan ConstraintApplicationPlan
	if err := json.Unmarshal(rec.Body.Bytes(), &constraintPlan); err != nil {
		t.Fatal(err)
	}
	if constraintPlan.SchemaVersion != "constraint_application_plan.v1" ||
		constraintPlan.ConstraintID != "constraint_material_balance_cod_limit" ||
		constraintPlan.ApplicationMode != "advisory_only" ||
		constraintPlan.WouldCreateJob ||
		constraintPlan.WouldModifyTarget ||
		!constraintPlan.ProductionApprovalRequired ||
		len(constraintPlan.Constraints) != 1 {
		t.Fatalf("unexpected constraint application plan: %#v", constraintPlan)
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/contracts/confirmations/confirm_draft_material_balance_minimal/constraint-application-plan", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("agent draft confirmation should not produce a constraint plan, got %d %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/contracts/confirmations/confirm_constraint_material_balance_cod_limit/constraint-application-plan", nil)
	req.Header.Set("Authorization", "Bearer dev-worker-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("worker token should not read constraint application plan, got %d %s", rec.Code, rec.Body.String())
	}

	promotableConfirmationBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance_promotable.draft_confirmation.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/contracts/confirm-draft", bytes.NewReader(promotableConfirmationBytes))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("promotable draft confirmation endpoint failed: %d %s", rec.Code, rec.Body.String())
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/contracts/confirmations/confirm_promote_material_balance_minimal/promote-simulation-check", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusAccepted {
		t.Fatalf("promote confirmed draft failed: %d %s", rec.Code, rec.Body.String())
	}
	var promoted JobSnapshot
	if err := json.Unmarshal(rec.Body.Bytes(), &promoted); err != nil {
		t.Fatal(err)
	}
	if promoted.Job.JobID != "job_simcheck_sim_req_promoted_material_balance_minimal" ||
		promoted.Job.RequestID != "sim_req_promoted_material_balance_minimal" ||
		promoted.Job.Status != StatusQueued {
		t.Fatalf("unexpected promoted job: %#v", promoted.Job)
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/contracts/confirmations/confirm_promote_material_balance_minimal/promote-simulation-check", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("duplicate promotion should be idempotent, got %d %s", rec.Code, rec.Body.String())
	}

	mismatchedConfirmation := strings.Replace(string(confirmationBytes), `"draft_schema_version": "agent_scenario_draft.v1"`, `"draft_schema_version": "constraint_draft.v1"`, 1)
	req = httptest.NewRequest(http.MethodPost, "/api/v1/contracts/confirm-draft", strings.NewReader(mismatchedConfirmation))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("mismatched confirmation should return validation response, got %d %s", rec.Code, rec.Body.String())
	}
	var mismatchResponse ContractValidationResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &mismatchResponse); err != nil {
		t.Fatal(err)
	}
	if mismatchResponse.Valid || len(mismatchResponse.Errors) == 0 {
		t.Fatalf("mismatched draft confirmation should be invalid: %#v", mismatchResponse)
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/contracts/validate", strings.NewReader(`{"schema_version":"simulation_request.v1","request_id":""}`))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("invalid contract should return validation response, got %d %s", rec.Code, rec.Body.String())
	}
	var invalidResponse ContractValidationResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &invalidResponse); err != nil {
		t.Fatal(err)
	}
	if invalidResponse.Valid || invalidResponse.ContractSchema != "simulation_request.v1.json" || len(invalidResponse.Errors) == 0 {
		t.Fatalf("unexpected invalid contract response: %#v", invalidResponse)
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/contracts/validate", strings.NewReader(`{"schema_version":"future_draft.v1"}`))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("unknown contract should return validation response, got %d %s", rec.Code, rec.Body.String())
	}
	var unknownResponse ContractValidationResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &unknownResponse); err != nil {
		t.Fatal(err)
	}
	if unknownResponse.Valid || len(unknownResponse.Errors) == 0 {
		t.Fatalf("unsupported schema should be invalid: %#v", unknownResponse)
	}

	modelCatalogBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance.model_catalog.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/contracts/validate", bytes.NewReader(modelCatalogBytes))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("model catalog validation endpoint failed: %d %s", rec.Code, rec.Body.String())
	}
	var catalogResponse ContractValidationResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &catalogResponse); err != nil {
		t.Fatal(err)
	}
	if !catalogResponse.Valid || catalogResponse.ContractSchema != "model_catalog.v1.json" {
		t.Fatalf("unexpected model catalog validation response: %#v", catalogResponse)
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/contracts/validate", bytes.NewReader(validBytes))
	req.Header.Set("Authorization", "Bearer dev-worker-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("worker token should not validate contracts, got %d %s", rec.Code, rec.Body.String())
	}
}

func TestSimulationCheckEndpointCreatesComputeJob(t *testing.T) {
	svc := testValidatedService(t)
	auth, err := NewAuthenticator("")
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()
	assertRequiredCapabilities := func(jobPayload map[string]any, expected []string) {
		t.Helper()
		execution := mapValue(jobPayload, "execution")
		if execution == nil {
			t.Fatalf("expected job execution payload, got %#v", jobPayload)
		}
		capabilities, ok := execution["required_capabilities"].([]any)
		if !ok {
			t.Fatalf("expected required_capabilities array, got %#v", execution["required_capabilities"])
		}
		if len(capabilities) != len(expected) {
			t.Fatalf("unexpected required_capabilities length: got %#v want %#v", capabilities, expected)
		}
		for index, capability := range expected {
			if capabilities[index] != capability {
				t.Fatalf("unexpected required_capabilities: got %#v want %#v", capabilities, expected)
			}
		}
	}
	validBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "milp_material_balance.simulation_request.v1.json"))
	if err != nil {
		t.Fatal(err)
	}

	req := httptest.NewRequest(http.MethodPost, "/api/v1/simulation-checks", bytes.NewReader(validBytes))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec := httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusAccepted {
		t.Fatalf("simulation check create failed: %d %s", rec.Code, rec.Body.String())
	}
	var created JobSnapshot
	if err := json.Unmarshal(rec.Body.Bytes(), &created); err != nil {
		t.Fatal(err)
	}
	if created.Job.JobID != "job_simcheck_sim_req_milp_material_balance_minimal" ||
		created.Job.RequestID != "sim_req_milp_material_balance_minimal" ||
		created.Job.SourceSystem != "milp" ||
		created.Job.ProjectID != "project_demo" ||
		created.Job.Status != StatusQueued {
		t.Fatalf("unexpected simulation check job: %#v", created.Job)
	}
	var jobPayload map[string]any
	if err := json.Unmarshal(created.Job.InputJSON, &jobPayload); err != nil {
		t.Fatal(err)
	}
	if asRecord := mapValue(jobPayload, "payload"); stringValue(asRecord, "schema_version") != "simulation_input.v1" {
		t.Fatalf("simulation check job should embed simulation_input payload, got %#v", jobPayload["payload"])
	}
	contextValue := mapValue(jobPayload, "context")
	externalRefs := mapValue(contextValue, "external_refs")
	if stringValue(externalRefs, "plan_id") != "plan_milp_minimal" {
		t.Fatalf("expected plan id in job context external_refs, got %#v", externalRefs)
	}
	assertRequiredCapabilities(jobPayload, []string{"material_balance", "ode"})

	req = httptest.NewRequest(http.MethodPost, "/api/v1/simulation-checks", bytes.NewReader(validBytes))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("duplicate simulation check should be idempotent, got %d %s", rec.Code, rec.Body.String())
	}
	var duplicate JobSnapshot
	if err := json.Unmarshal(rec.Body.Bytes(), &duplicate); err != nil {
		t.Fatal(err)
	}
	if duplicate.Job.JobID != created.Job.JobID {
		t.Fatalf("duplicate simulation check returned a different job: %#v", duplicate.Job)
	}

	referenceOnlyBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance.simulation_request.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/simulation-checks", bytes.NewReader(referenceOnlyBytes))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusNotFound || !strings.Contains(rec.Body.String(), "simulation input not found") {
		t.Fatalf("unregistered reference-only simulation check should be rejected, got %d %s", rec.Code, rec.Body.String())
	}

	processGraphRequestBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance_process_graph.simulation_request.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/simulation-checks", bytes.NewReader(processGraphRequestBytes))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusNotFound || !strings.Contains(rec.Body.String(), "process graph not found") {
		t.Fatalf("unregistered process_graph simulation check should be rejected, got %d %s", rec.Code, rec.Body.String())
	}

	processGraphBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance_3_node.process_graph.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/process-graphs", bytes.NewReader(processGraphBytes))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("process graph register failed: %d %s", rec.Code, rec.Body.String())
	}
	var processGraphRecord ProcessGraphRecord
	if err := json.Unmarshal(rec.Body.Bytes(), &processGraphRecord); err != nil {
		t.Fatal(err)
	}
	if processGraphRecord.ProcessGraphID != "pg_material_balance_minimal" ||
		processGraphRecord.Version != 1 ||
		processGraphRecord.PayloadHash == "" ||
		processGraphRecord.RequestedBy != "dev-public" {
		t.Fatalf("unexpected process graph record: %#v", processGraphRecord)
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/process-graphs", bytes.NewReader(processGraphBytes))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("duplicate process graph register should be idempotent, got %d %s", rec.Code, rec.Body.String())
	}
	req = httptest.NewRequest(http.MethodGet, "/api/v1/process-graphs/pg_material_balance_minimal?version=1", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("process graph get failed: %d %s", rec.Code, rec.Body.String())
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/simulation-checks", bytes.NewReader(processGraphRequestBytes))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusAccepted {
		t.Fatalf("registered process_graph simulation check should create a job, got %d %s", rec.Code, rec.Body.String())
	}
	var processGraphJob JobSnapshot
	if err := json.Unmarshal(rec.Body.Bytes(), &processGraphJob); err != nil {
		t.Fatal(err)
	}
	if processGraphJob.Job.JobID != "job_simcheck_sim_req_process_graph_material_balance_minimal" ||
		processGraphJob.Job.RequestID != "sim_req_process_graph_material_balance_minimal" {
		t.Fatalf("unexpected process graph simulation check job: %#v", processGraphJob.Job)
	}
	var processGraphPayload map[string]any
	if err := json.Unmarshal(processGraphJob.Job.InputJSON, &processGraphPayload); err != nil {
		t.Fatal(err)
	}
	generatedPayload := mapValue(processGraphPayload, "payload")
	if stringValue(generatedPayload, "simulation_input_id") != "si_pg_material_balance_minimal" ||
		stringValue(generatedPayload, "process_graph_id") != "pg_material_balance_minimal" {
		t.Fatalf("process graph simulation check should generate simulation_input payload, got %#v", processGraphPayload["payload"])
	}
	asmProcessGraphRequest := decodeMap(t, processGraphRequestBytes)
	asmProcessGraphRequest["request_id"] = "sim_req_process_graph_asm1_unsupported"
	asmProcessGraphRequest["job_type"] = "simulation.asm1.v1"
	req = httptest.NewRequest(http.MethodPost, "/api/v1/simulation-checks", bytes.NewReader(encodeMap(t, asmProcessGraphRequest)))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusBadRequest || !strings.Contains(rec.Body.String(), "process_graph lookup only supports simulation.material_balance.v1") {
		t.Fatalf("ASM/UDM process_graph simulation check should stay unsupported, got %d %s", rec.Code, rec.Body.String())
	}

	modelRunRequestBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance_model_run.simulation_request.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/simulation-checks", bytes.NewReader(modelRunRequestBytes))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusNotFound || !strings.Contains(rec.Body.String(), "model run not found") {
		t.Fatalf("unregistered model_run simulation check should be rejected, got %d %s", rec.Code, rec.Body.String())
	}
	replayModelRun := map[string]any{
		"schema_version":  "model_run.v1",
		"model_run_id":    "mr_replay_source_material_balance",
		"job_id":          created.Job.JobID,
		"model_key":       "material_balance",
		"model_version":   "material_balance.v1",
		"parameter_hash":  "sha256:" + strings.Repeat("a", 64),
		"input_hash":      "sha256:" + strings.Repeat("b", 64),
		"quality_metrics": map[string]any{"convergence_status": "completed"},
		"warnings":        []any{},
		"evidence_refs":   []any{"job:" + created.Job.JobID},
	}
	if err := svc.store.InsertModelRuns(context.Background(), created.Job.JobID, []json.RawMessage{mustJSON(replayModelRun)}, time.Now().UTC()); err != nil {
		t.Fatal(err)
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/simulation-checks", bytes.NewReader(modelRunRequestBytes))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusAccepted {
		t.Fatalf("registered model_run simulation check should create a job, got %d %s", rec.Code, rec.Body.String())
	}
	var modelRunReplayJob JobSnapshot
	if err := json.Unmarshal(rec.Body.Bytes(), &modelRunReplayJob); err != nil {
		t.Fatal(err)
	}
	if modelRunReplayJob.Job.JobID != "job_simcheck_sim_req_model_run_material_balance_minimal" ||
		modelRunReplayJob.Job.RequestID != "sim_req_model_run_material_balance_minimal" {
		t.Fatalf("unexpected model_run replay simulation check job: %#v", modelRunReplayJob.Job)
	}
	var modelRunReplayPayload map[string]any
	if err := json.Unmarshal(modelRunReplayJob.Job.InputJSON, &modelRunReplayPayload); err != nil {
		t.Fatal(err)
	}
	if payload := mapValue(modelRunReplayPayload, "payload"); stringValue(payload, "simulation_input_id") != "si_milp_material_balance_minimal" {
		t.Fatalf("model_run replay should reuse source job simulation_input payload, got %#v", modelRunReplayPayload["payload"])
	}

	inputBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance_minimal.simulation_input.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/simulation-inputs", bytes.NewReader(inputBytes))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("simulation input register failed: %d %s", rec.Code, rec.Body.String())
	}
	var inputRecord SimulationInputRecord
	if err := json.Unmarshal(rec.Body.Bytes(), &inputRecord); err != nil {
		t.Fatal(err)
	}
	if inputRecord.SimulationInputID != "si_material_balance_minimal" ||
		inputRecord.PayloadHash == "" ||
		inputRecord.SourceSystem != "compute-api" ||
		inputRecord.RequestedBy != "dev-public" {
		t.Fatalf("unexpected simulation input record: %#v", inputRecord)
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/simulation-inputs", bytes.NewReader(inputBytes))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("duplicate simulation input register should be idempotent, got %d %s", rec.Code, rec.Body.String())
	}
	req = httptest.NewRequest(http.MethodGet, "/api/v1/simulation-inputs/si_material_balance_minimal", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("simulation input get failed: %d %s", rec.Code, rec.Body.String())
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/simulation-checks", bytes.NewReader(referenceOnlyBytes))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusAccepted {
		t.Fatalf("registered reference-only simulation check should create a job, got %d %s", rec.Code, rec.Body.String())
	}
	var referenceJob JobSnapshot
	if err := json.Unmarshal(rec.Body.Bytes(), &referenceJob); err != nil {
		t.Fatal(err)
	}
	if referenceJob.Job.JobID != "job_simcheck_sim_req_material_balance_minimal" ||
		referenceJob.Job.RequestID != "sim_req_material_balance_minimal" {
		t.Fatalf("unexpected reference simulation check job: %#v", referenceJob.Job)
	}
	var referencePayload map[string]any
	if err := json.Unmarshal(referenceJob.Job.InputJSON, &referencePayload); err != nil {
		t.Fatal(err)
	}
	if payload := mapValue(referencePayload, "payload"); stringValue(payload, "simulation_input_id") != "si_material_balance_minimal" {
		t.Fatalf("reference simulation check should use registered payload, got %#v", referencePayload["payload"])
	}
	assertRequiredCapabilities(referencePayload, []string{"material_balance", "ode"})

	for _, tc := range []struct {
		name           string
		inputFixture   string
		requestFixture string
		jobID          string
		requestID      string
		inputID        string
		jobType        string
		capabilities   []string
	}{
		{
			name:           "asm1slim",
			inputFixture:   "asm1slim_independent.simulation_input.v1.json",
			requestFixture: "asm1slim_independent.simulation_request.v1.json",
			jobID:          "job_simcheck_sim_req_asm1slim_independent",
			requestID:      "sim_req_asm1slim_independent",
			inputID:        "si_asm1slim_independent",
			jobType:        "simulation.asm1slim.v1",
			capabilities:   []string{"asm1slim", "ode"},
		},
		{
			name:           "asm1",
			inputFixture:   "asm1_independent.simulation_input.v1.json",
			requestFixture: "asm1_independent.simulation_request.v1.json",
			jobID:          "job_simcheck_sim_req_asm1_independent",
			requestID:      "sim_req_asm1_independent",
			inputID:        "si_asm1_independent",
			jobType:        "simulation.asm1.v1",
			capabilities:   []string{"asm1", "ode"},
		},
		{
			name:           "asm3",
			inputFixture:   "asm3_independent.simulation_input.v1.json",
			requestFixture: "asm3_independent.simulation_request.v1.json",
			jobID:          "job_simcheck_sim_req_asm3_independent",
			requestID:      "sim_req_asm3_independent",
			inputID:        "si_asm3_independent",
			jobType:        "simulation.asm3.v1",
			capabilities:   []string{"asm3", "ode"},
		},
		{
			name:           "udm",
			inputFixture:   "udm_independent.simulation_input.v1.json",
			requestFixture: "udm_independent.simulation_request.v1.json",
			jobID:          "job_simcheck_sim_req_udm_independent",
			requestID:      "sim_req_udm_independent",
			inputID:        "si_udm_independent",
			jobType:        "simulation.udm.v1",
			capabilities:   []string{"udm", "ode"},
		},
	} {
		t.Run("reference-only "+tc.name, func(t *testing.T) {
			caseInputBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", tc.inputFixture))
			if err != nil {
				t.Fatal(err)
			}
			req := httptest.NewRequest(http.MethodPost, "/api/v1/simulation-inputs", bytes.NewReader(caseInputBytes))
			req.Header.Set("Authorization", "Bearer dev-public-token")
			rec := httptest.NewRecorder()
			server.ServeHTTP(rec, req)
			if rec.Code != http.StatusCreated {
				t.Fatalf("simulation input register failed: %d %s", rec.Code, rec.Body.String())
			}

			requestBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", tc.requestFixture))
			if err != nil {
				t.Fatal(err)
			}
			req = httptest.NewRequest(http.MethodPost, "/api/v1/simulation-checks", bytes.NewReader(requestBytes))
			req.Header.Set("Authorization", "Bearer dev-public-token")
			rec = httptest.NewRecorder()
			server.ServeHTTP(rec, req)
			if rec.Code != http.StatusAccepted {
				t.Fatalf("registered %s simulation check should create a job, got %d %s", tc.name, rec.Code, rec.Body.String())
			}
			var modelJob JobSnapshot
			if err := json.Unmarshal(rec.Body.Bytes(), &modelJob); err != nil {
				t.Fatal(err)
			}
			if modelJob.Job.JobID != tc.jobID ||
				modelJob.Job.RequestID != tc.requestID ||
				modelJob.Job.JobType != tc.jobType {
				t.Fatalf("unexpected %s simulation check job: %#v", tc.name, modelJob.Job)
			}
			var modelPayload map[string]any
			if err := json.Unmarshal(modelJob.Job.InputJSON, &modelPayload); err != nil {
				t.Fatal(err)
			}
			payload := mapValue(modelPayload, "payload")
			if stringValue(payload, "simulation_input_id") != tc.inputID ||
				stringValue(payload, "job_type") != tc.jobType {
				t.Fatalf("%s simulation check should use registered payload, got %#v", tc.name, modelPayload["payload"])
			}
			assertRequiredCapabilities(modelPayload, tc.capabilities)
		})
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/simulation-checks", bytes.NewReader(validBytes))
	req.Header.Set("Authorization", "Bearer dev-worker-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("worker token should not create simulation checks, got %d %s", rec.Code, rec.Body.String())
	}
}

func TestNewSystemEvidenceReferenceE2E(t *testing.T) {
	svc := testValidatedService(t)
	auth, err := NewAuthenticator("")
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()
	ctx := context.Background()

	processGraphBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance_3_node.process_graph.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	req := httptest.NewRequest(http.MethodPost, "/api/v1/process-graphs", bytes.NewReader(processGraphBytes))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec := httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("process graph registration failed: %d %s", rec.Code, rec.Body.String())
	}

	processGraphRequestBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance_process_graph.simulation_request.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	processGraphRequest := decodeMap(t, processGraphRequestBytes)
	processGraphRequest["request_id"] = "sim_req_newsystem_evidence_e2e"
	processGraphRequest["source_system"] = "NewSystem"
	processGraphRequest["requested_by"] = "new-system:approval"
	processGraphRequest["external_refs"] = map[string]any{
		"approval_id": "approval_newsystem_evidence_e2e",
		"site_id":     "site_demo",
	}
	metadata := mapValue(processGraphRequest, "metadata")
	metadata["trace_id"] = "trace_newsystem_evidence_e2e"
	metadata["project_id"] = "project_demo"

	req = httptest.NewRequest(http.MethodPost, "/api/v1/simulation-checks", bytes.NewReader(encodeMap(t, processGraphRequest)))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusAccepted {
		t.Fatalf("NewSystem simulation check create failed: %d %s", rec.Code, rec.Body.String())
	}
	var created JobSnapshot
	if err := json.Unmarshal(rec.Body.Bytes(), &created); err != nil {
		t.Fatal(err)
	}
	if created.Job.SourceSystem != "NewSystem" || created.Job.ProjectID != "project_demo" {
		t.Fatalf("unexpected NewSystem simulation check job metadata: %#v", created.Job)
	}

	if _, err := svc.RegisterWorker(ctx, compatibleWorkerRegistration("worker_newsystem")); err != nil {
		t.Fatal(err)
	}
	claimed, err := svc.Claim(ctx, "worker_newsystem")
	if err != nil {
		t.Fatal(err)
	}
	claimedJob := mapValue(claimed, "job")
	if stringValue(claimedJob, "job_id") != created.Job.JobID {
		t.Fatalf("expected to claim NewSystem job %s, got %#v", created.Job.JobID, claimed["job"])
	}

	processGraphID := "pg_material_balance_minimal"
	simulationInputID := "si_pg_material_balance_minimal"
	modelRunID := "mr_newsystem_evidence_e2e"
	defaultParameterHash := builtInModelCatalog("2026-05-30T00:00:00Z").Models[0].Versions[0].DefaultParameterSet.ParameterHash
	modelRun := map[string]any{
		"schema_version":  "model_run.v1",
		"model_run_id":    modelRunID,
		"job_id":          created.Job.JobID,
		"model_key":       "material_balance",
		"model_version":   "material_balance.v1",
		"parameter_hash":  defaultParameterHash,
		"input_hash":      "sha256:" + strings.Repeat("c", 64),
		"quality_metrics": map[string]any{"convergence_status": "converged"},
		"warnings":        []any{},
		"evidence_refs": []any{
			"simulation_input:" + simulationInputID,
			"process_graph:" + processGraphID,
		},
	}
	evidenceRefs := []any{
		"simulation_input:" + simulationInputID,
		"process_graph:" + processGraphID,
		"model_run:" + modelRunID,
	}
	result := map[string]any{
		"schema_version": "compute_result.v1",
		"job_id":         created.Job.JobID,
		"job_type":       "simulation.material_balance.v1",
		"status":         StatusSucceeded,
		"summary":        map[string]any{"approval_ready": true},
		"data":           map[string]any{},
		"quality":        map[string]any{"data_quality": "ok", "warnings": []any{}},
		"artifacts":      []any{},
		"risk_findings": []any{
			map[string]any{
				"risk_code":     "new_system_material_balance_checked",
				"severity":      "info",
				"title":         "NewSystem simulation check completed",
				"description":   "The NewSystem approval read path can inspect input, graph, and model run evidence.",
				"evidence_refs": evidenceRefs,
			},
		},
		"runtime_audit": map[string]any{"model_runs": []any{modelRun}, "timings_ms": map[string]any{}, "fallback_used": false},
	}
	if _, err := svc.Complete(ctx, "worker_newsystem", created.Job.JobID, 1, result); err != nil {
		t.Fatal(err)
	}
	resultView, err := svc.Result(ctx, created.Job.JobID)
	if err != nil {
		t.Fatal(err)
	}
	summaryView := mapValue(resultView, "summary")
	riskFindings, ok := summaryView["risk_findings"].([]any)
	if !ok || len(riskFindings) != 1 {
		t.Fatalf("expected NewSystem risk finding in result summary, got %#v", summaryView["risk_findings"])
	}

	resolveRef := func(ref string) EvidenceReferenceResolution {
		t.Helper()
		req := httptest.NewRequest(http.MethodGet, "/api/v1/compute/jobs/"+created.Job.JobID+"/evidence-ref?ref="+ref, nil)
		req.Header.Set("Authorization", "Bearer dev-public-token")
		rec := httptest.NewRecorder()
		server.ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatalf("evidence ref %s failed: %d %s", ref, rec.Code, rec.Body.String())
		}
		var resolution EvidenceReferenceResolution
		if err := json.Unmarshal(rec.Body.Bytes(), &resolution); err != nil {
			t.Fatal(err)
		}
		return resolution
	}

	simulationInputResolution := resolveRef("simulation_input:" + simulationInputID)
	if simulationInputResolution.RefType != "simulation_input" || stringValue(simulationInputResolution.Payload.(map[string]any), "simulation_input_id") != simulationInputID {
		t.Fatalf("unexpected simulation_input resolution: %#v", simulationInputResolution)
	}
	processGraphResolution := resolveRef("process_graph:" + processGraphID)
	if processGraphResolution.RefType != "process_graph" || stringValue(processGraphResolution.Payload.(map[string]any), "process_graph_id") != processGraphID {
		t.Fatalf("unexpected process_graph resolution: %#v", processGraphResolution)
	}
	modelRunResolution := resolveRef("model_run:" + modelRunID)
	if modelRunResolution.RefType != "model_run" || stringValue(modelRunResolution.Payload.(map[string]any), "model_run_id") != modelRunID {
		t.Fatalf("unexpected model_run resolution: %#v", modelRunResolution)
	}
	evidencePackageRef := "evidence_package:evidence_" + safeIDPart(created.Job.JobID)
	evidencePackageResolution := resolveRef(evidencePackageRef)
	if evidencePackageResolution.RefType != "evidence_package" || stringValue(evidencePackageResolution.Payload.(map[string]any), "job_id") != created.Job.JobID {
		t.Fatalf("unexpected evidence_package resolution: %#v", evidencePackageResolution)
	}

	explanationBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance.result_explanation.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	explanation := decodeMap(t, explanationBytes)
	explanation["explanation_id"] = "explanation_newsystem_evidence_e2e"
	explanation["job_id"] = created.Job.JobID
	explanation["created_by"] = "agent:new-system-e2e"
	explanation["evidence_refs"] = append(evidenceRefs, evidencePackageRef)
	statements := explanation["statements"].([]any)
	statements[0].(map[string]any)["evidence_refs"] = evidenceRefs
	req = httptest.NewRequest(http.MethodPost, "/api/v1/compute/jobs/"+created.Job.JobID+"/result-explanations", bytes.NewReader(encodeMap(t, explanation)))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("NewSystem result explanation submit failed: %d %s", rec.Code, rec.Body.String())
	}
	var explanationRecord ResultExplanationRecord
	if err := json.Unmarshal(rec.Body.Bytes(), &explanationRecord); err != nil {
		t.Fatal(err)
	}
	if explanationRecord.Status != "submitted" || len(explanationRecord.ResolvedEvidenceRefs) != 4 {
		t.Fatalf("unexpected NewSystem result explanation record: %#v", explanationRecord)
	}
}

func TestProcessGraphEvidenceReference(t *testing.T) {
	svc := testValidatedService(t)
	auth, err := NewAuthenticator("")
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()
	processGraphBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance_3_node.process_graph.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	req := httptest.NewRequest(http.MethodPost, "/api/v1/process-graphs", bytes.NewReader(processGraphBytes))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec := httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("process graph registration failed: %d %s", rec.Code, rec.Body.String())
	}

	processGraphRequestBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance_process_graph.simulation_request.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/simulation-checks", bytes.NewReader(processGraphRequestBytes))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusAccepted {
		t.Fatalf("process graph simulation check create failed: %d %s", rec.Code, rec.Body.String())
	}
	var created JobSnapshot
	if err := json.Unmarshal(rec.Body.Bytes(), &created); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.RegisterWorker(context.Background(), compatibleWorkerRegistration("worker_pg")); err != nil {
		t.Fatal(err)
	}
	claimed, err := svc.Claim(context.Background(), "worker_pg")
	if err != nil {
		t.Fatal(err)
	}
	claimedJob := mapValue(claimed, "job")
	if stringValue(claimedJob, "job_id") != created.Job.JobID {
		t.Fatalf("expected to claim process graph job %s, got %#v", created.Job.JobID, claimed["job"])
	}
	result := map[string]any{
		"schema_version": "compute_result.v1",
		"job_id":         created.Job.JobID,
		"job_type":       "simulation.material_balance.v1",
		"status":         StatusSucceeded,
		"summary":        map[string]any{"converged": true},
		"data":           map[string]any{},
		"quality":        map[string]any{"data_quality": "ok", "warnings": []any{}},
		"artifacts":      []any{},
		"runtime_audit":  map[string]any{"model_runs": []any{}, "timings_ms": map[string]any{}, "fallback_used": false},
	}
	if _, err := svc.Complete(context.Background(), "worker_pg", created.Job.JobID, 1, result); err != nil {
		t.Fatal(err)
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/compute/jobs/"+created.Job.JobID+"/evidence-ref?ref=process_graph:pg_material_balance_minimal", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("process graph evidence ref failed: %d %s", rec.Code, rec.Body.String())
	}
	var resolution EvidenceReferenceResolution
	if err := json.Unmarshal(rec.Body.Bytes(), &resolution); err != nil {
		t.Fatal(err)
	}
	payload, ok := resolution.Payload.(map[string]any)
	if !ok || resolution.RefType != "process_graph" || payload["process_graph_id"] != "pg_material_balance_minimal" {
		t.Fatalf("unexpected process graph evidence ref resolution: %#v", resolution)
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/compute/jobs/"+created.Job.JobID+"/evidence-ref?ref=process_graph:missing", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("missing process graph evidence ref should 404, got %d %s", rec.Code, rec.Body.String())
	}
}

func TestHTTPLocalCORSPreflight(t *testing.T) {
	svc := testService(t)
	auth, err := NewAuthenticator("")
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()

	req := httptest.NewRequest(http.MethodOptions, "/api/v1/compute/jobs", nil)
	req.Header.Set("Origin", "http://127.0.0.1:5173")
	req.Header.Set("Access-Control-Request-Headers", "Authorization, Content-Type, Idempotency-Key")
	rec := httptest.NewRecorder()
	server.ServeHTTP(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Fatalf("expected local CORS preflight to pass, got %d %s", rec.Code, rec.Body.String())
	}
	if rec.Header().Get("Access-Control-Allow-Origin") != "http://127.0.0.1:5173" {
		t.Fatalf("unexpected allow origin: %q", rec.Header().Get("Access-Control-Allow-Origin"))
	}
	if !strings.Contains(rec.Header().Get("Access-Control-Allow-Methods"), http.MethodPost) {
		t.Fatalf("expected POST in allowed methods, got %q", rec.Header().Get("Access-Control-Allow-Methods"))
	}
	if !strings.Contains(rec.Header().Get("Access-Control-Allow-Headers"), "Idempotency-Key") {
		t.Fatalf("expected Idempotency-Key in allowed headers, got %q", rec.Header().Get("Access-Control-Allow-Headers"))
	}
	if !strings.Contains(rec.Header().Get("Access-Control-Expose-Headers"), "X-Evidence-Checksum") {
		t.Fatalf("expected evidence checksum to be exposed, got %q", rec.Header().Get("Access-Control-Expose-Headers"))
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

func repoRootForTest(t *testing.T) string {
	t.Helper()
	wd, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	for {
		if _, err := os.Stat(filepath.Join(wd, "contracts", "compute_job.v1.json")); err == nil {
			return wd
		}
		next := filepath.Dir(wd)
		if next == wd {
			t.Fatal("repo root not found")
		}
		wd = next
	}
}
