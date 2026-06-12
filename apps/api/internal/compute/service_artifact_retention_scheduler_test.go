package compute

import (
	"context"
	"io"
	"log/slog"
	"net/http"
	"testing"
	"time"
)

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
