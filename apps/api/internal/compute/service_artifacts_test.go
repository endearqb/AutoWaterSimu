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
	"strings"
	"testing"
	"time"
)

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
			audit := eventAuditMap(t, event)
			if audit["who"] != "system" ||
				audit["where"] != "service:artifact_retention_sweep" ||
				audit["target_object"] != "Artifact" ||
				audit["target_id"] != candidate.ArtifactID ||
				audit["action"] != "artifact.archive" ||
				audit["trace_id"] != "trace_material_balance_minimal" {
				t.Fatalf("unexpected archive audit envelope: %#v", audit)
			}
			before, ok := audit["before"].(map[string]any)
			if !ok || before["artifact_id"] != candidate.ArtifactID || before["retention_policy"] != "archive_candidate" {
				t.Fatalf("archive audit should include artifact before state, got %#v", audit["before"])
			}
			after, ok := audit["after"].(map[string]any)
			if !ok || after["artifact_id"] != candidate.ArtifactID || after["status"] != "archived" {
				t.Fatalf("archive audit should include archive after state, got %#v", audit["after"])
			}
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
	events, err := svc.Events(ctx, "job_material_balance_minimal")
	if err != nil {
		t.Fatal(err)
	}
	foundAudit := false
	for _, event := range events {
		if event.EventType != "artifact.retention_deleted" {
			continue
		}
		audit := eventAuditMap(t, event)
		if audit["who"] != "admin" ||
			audit["where"] != "POST /api/v1/admin/artifacts/retention-sweep" ||
			audit["target_object"] != "Artifact" ||
			audit["target_id"] != expired.ArtifactID ||
			audit["action"] != "artifact.retention_delete" ||
			audit["trace_id"] != "trace_material_balance_minimal" {
			t.Fatalf("unexpected retention audit envelope: %#v", audit)
		}
		before, ok := audit["before"].(map[string]any)
		if !ok || before["artifact_id"] != expired.ArtifactID || before["retention_policy"] != "ttl" {
			t.Fatalf("retention audit should include artifact before state, got %#v", audit["before"])
		}
		after, ok := audit["after"].(map[string]any)
		if !ok || after["deleted"] != true {
			t.Fatalf("retention audit should include delete after state, got %#v", audit["after"])
		}
		foundAudit = true
	}
	if !foundAudit {
		t.Fatalf("retention deletion should write an audit envelope")
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
