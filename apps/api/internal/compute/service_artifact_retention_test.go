package compute

import (
	"context"
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
