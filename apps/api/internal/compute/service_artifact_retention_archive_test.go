package compute

import (
	"context"
	"testing"
	"time"
)

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
