package metrics

import (
	"strings"
	"testing"
)

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
