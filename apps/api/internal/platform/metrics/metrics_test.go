package metrics

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"
)

type fakeSnapshotStore struct {
	now      time.Time
	snapshot Snapshot
	err      error
}

func (store *fakeSnapshotStore) Metrics(_ context.Context, now time.Time) (Snapshot, error) {
	store.now = now
	return store.snapshot, store.err
}

func TestMetricsServiceUsesInjectedClockAndStore(t *testing.T) {
	expectedNow := time.Date(2026, 6, 1, 3, 30, 0, 0, time.UTC)
	store := &fakeSnapshotStore{
		snapshot: Snapshot{
			GeneratedAt:         expectedNow,
			JobsByStatus:        map[string]int{"queued": 1},
			WorkersRegistered:   2,
			ArtifactsTotal:      3,
			ArtifactArchives:    4,
			RetentionCandidates: 5,
		},
	}
	service := NewMetricsService(store, func() time.Time { return expectedNow })

	snapshot, err := service.Metrics(context.Background())
	if err != nil {
		t.Fatalf("Metrics returned error: %v", err)
	}
	if !store.now.Equal(expectedNow) {
		t.Fatalf("expected store to receive injected time %s, got %s", expectedNow, store.now)
	}
	if snapshot.WorkersRegistered != 2 || snapshot.ArtifactsTotal != 3 {
		t.Fatalf("unexpected snapshot: %+v", snapshot)
	}
}

func TestMetricsServiceReturnsStoreError(t *testing.T) {
	expectedErr := errors.New("metrics store failed")
	service := NewMetricsService(&fakeSnapshotStore{err: expectedErr}, nil)

	_, err := service.Metrics(context.Background())
	if !errors.Is(err, expectedErr) {
		t.Fatalf("expected store error, got %v", err)
	}
}

func TestRenderPrometheusSortsAndEscapesJobStatuses(t *testing.T) {
	output := RenderPrometheus(Snapshot{
		JobsByStatus: map[string]int{
			"queued":       2,
			"bad\\status":  3,
			"created\n\"x": 1,
		},
		WorkersRegistered:   4,
		ArtifactsTotal:      5,
		ArtifactArchives:    6,
		RetentionCandidates: 7,
	})

	expectedParts := []string{
		"autowatersimu_compute_api_up 1\n",
		"autowatersimu_compute_jobs_total{status=\"bad\\\\status\"} 3\n",
		"autowatersimu_compute_jobs_total{status=\"created\\n\\\"x\"} 1\n",
		"autowatersimu_compute_jobs_total{status=\"queued\"} 2\n",
		"autowatersimu_compute_workers_registered_total 4\n",
		"autowatersimu_compute_artifacts_total 5\n",
		"autowatersimu_compute_artifact_archives_total 6\n",
		"autowatersimu_compute_artifact_retention_candidates_total 7\n",
	}
	for _, expected := range expectedParts {
		if !strings.Contains(output, expected) {
			t.Fatalf("expected output to contain %q, got:\n%s", expected, output)
		}
	}
	if strings.Index(output, `status="bad\\status"`) > strings.Index(output, `status="queued"`) {
		t.Fatalf("expected status labels to be sorted, got:\n%s", output)
	}
}
