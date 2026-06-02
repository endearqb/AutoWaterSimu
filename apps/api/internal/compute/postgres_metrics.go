package compute

import (
	"context"
	"time"
)

func (store *PostgresStore) Metrics(ctx context.Context, now time.Time) (MetricsSnapshot, error) {
	snapshot := MetricsSnapshot{
		GeneratedAt:  now,
		JobsByStatus: map[string]int{},
	}
	rows, err := store.pool.Query(ctx, "SELECT status, COUNT(*) FROM compute_jobs GROUP BY status")
	if err != nil {
		return MetricsSnapshot{}, err
	}
	defer rows.Close()
	for rows.Next() {
		var status string
		var count int64
		if err := rows.Scan(&status, &count); err != nil {
			return MetricsSnapshot{}, err
		}
		snapshot.JobsByStatus[status] = int(count)
	}
	if err := rows.Err(); err != nil {
		return MetricsSnapshot{}, err
	}
	var workers, artifacts, artifactArchives, retentionCandidates int64
	if err := store.pool.QueryRow(ctx, "SELECT COUNT(*) FROM workers").Scan(&workers); err != nil {
		return MetricsSnapshot{}, err
	}
	if err := store.pool.QueryRow(ctx, "SELECT COUNT(*) FROM artifacts").Scan(&artifacts); err != nil {
		return MetricsSnapshot{}, err
	}
	if err := store.pool.QueryRow(ctx, "SELECT COUNT(*) FROM artifact_archives WHERE status = 'archived'").Scan(&artifactArchives); err != nil {
		return MetricsSnapshot{}, err
	}
	if err := store.pool.QueryRow(
		ctx,
		`SELECT COUNT(*) FROM artifacts
			WHERE retention_policy IN ('ttl','archive_candidate')
				AND retain_until IS NOT NULL
				AND retain_until <= $1
				AND NOT EXISTS (
					SELECT 1 FROM artifact_archives aa
					WHERE aa.artifact_id = artifacts.id AND aa.status = 'archived'
				)`,
		now,
	).Scan(&retentionCandidates); err != nil {
		return MetricsSnapshot{}, err
	}
	snapshot.WorkersRegistered = int(workers)
	snapshot.ArtifactsTotal = int(artifacts)
	snapshot.ArtifactArchives = int(artifactArchives)
	snapshot.RetentionCandidates = int(retentionCandidates)
	return snapshot, nil
}
