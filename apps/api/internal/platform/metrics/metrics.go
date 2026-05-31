package metrics

import (
	"context"
	"fmt"
	"sort"
	"strings"
	"time"
)

type Snapshot struct {
	GeneratedAt         time.Time      `json:"generated_at"`
	JobsByStatus        map[string]int `json:"jobs_by_status"`
	WorkersRegistered   int            `json:"workers_registered"`
	ArtifactsTotal      int            `json:"artifacts_total"`
	ArtifactArchives    int            `json:"artifact_archives"`
	RetentionCandidates int            `json:"retention_candidates"`
}

type SnapshotStore interface {
	Metrics(ctx context.Context, now time.Time) (Snapshot, error)
}

type MetricsService struct {
	metrics SnapshotStore
	now     func() time.Time
}

func NewMetricsService(metrics SnapshotStore, now func() time.Time) *MetricsService {
	if now == nil {
		now = func() time.Time { return time.Now().UTC() }
	}
	return &MetricsService{
		metrics: metrics,
		now:     now,
	}
}

func (svc *MetricsService) Metrics(ctx context.Context) (Snapshot, error) {
	return svc.metrics.Metrics(ctx, svc.now())
}

func RenderPrometheus(snapshot Snapshot) string {
	var builder strings.Builder
	builder.WriteString("# HELP autowatersimu_compute_api_up Compute API health\n")
	builder.WriteString("# TYPE autowatersimu_compute_api_up gauge\n")
	builder.WriteString("autowatersimu_compute_api_up 1\n")
	builder.WriteString("# HELP autowatersimu_compute_jobs_total Compute jobs by status\n")
	builder.WriteString("# TYPE autowatersimu_compute_jobs_total gauge\n")
	statuses := make([]string, 0, len(snapshot.JobsByStatus))
	for status := range snapshot.JobsByStatus {
		statuses = append(statuses, status)
	}
	sort.Strings(statuses)
	for _, status := range statuses {
		_, _ = fmt.Fprintf(
			&builder,
			"autowatersimu_compute_jobs_total{status=\"%s\"} %d\n",
			labelValue(status),
			snapshot.JobsByStatus[status],
		)
	}
	builder.WriteString("# HELP autowatersimu_compute_workers_registered_total Registered workers\n")
	builder.WriteString("# TYPE autowatersimu_compute_workers_registered_total gauge\n")
	_, _ = fmt.Fprintf(&builder, "autowatersimu_compute_workers_registered_total %d\n", snapshot.WorkersRegistered)
	builder.WriteString("# HELP autowatersimu_compute_artifacts_total Stored artifact metadata records\n")
	builder.WriteString("# TYPE autowatersimu_compute_artifacts_total gauge\n")
	_, _ = fmt.Fprintf(&builder, "autowatersimu_compute_artifacts_total %d\n", snapshot.ArtifactsTotal)
	builder.WriteString("# HELP autowatersimu_compute_artifact_archives_total Archived artifact metadata records\n")
	builder.WriteString("# TYPE autowatersimu_compute_artifact_archives_total gauge\n")
	_, _ = fmt.Fprintf(&builder, "autowatersimu_compute_artifact_archives_total %d\n", snapshot.ArtifactArchives)
	builder.WriteString("# HELP autowatersimu_compute_artifact_retention_candidates_total Artifacts currently eligible for retention processing\n")
	builder.WriteString("# TYPE autowatersimu_compute_artifact_retention_candidates_total gauge\n")
	_, _ = fmt.Fprintf(&builder, "autowatersimu_compute_artifact_retention_candidates_total %d\n", snapshot.RetentionCandidates)
	return builder.String()
}

func labelValue(value string) string {
	value = strings.ReplaceAll(value, "\\", "\\\\")
	value = strings.ReplaceAll(value, "\n", "\\n")
	value = strings.ReplaceAll(value, "\"", "\\\"")
	return value
}
