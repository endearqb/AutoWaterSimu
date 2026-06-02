package compute

import (
	domainartifacts "autowatersimu/apps/api/internal/domain/artifacts"
	"context"
	"time"
)

func (store *MemoryStore) Metrics(_ context.Context, now time.Time) (MetricsSnapshot, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	jobsByStatus := map[string]int{}
	for _, job := range store.jobs {
		jobsByStatus[job.Status]++
	}
	retentionCandidates := 0
	artifactArchives := 0
	for _, archive := range store.archives {
		if archive.Status == "archived" {
			artifactArchives++
		}
	}
	for _, artifact := range store.artifacts {
		if domainartifacts.IsRetentionCandidate(artifact.RetentionPolicy) &&
			artifact.RetainUntil != nil &&
			!artifact.RetainUntil.After(now) {
			if artifact.RetentionPolicy == domainartifacts.PolicyArchiveCandidate {
				if archive, ok := store.archives[artifact.ArtifactID]; ok && archive.Status == "archived" {
					continue
				}
			}
			retentionCandidates++
		}
	}
	return MetricsSnapshot{
		GeneratedAt:         now,
		JobsByStatus:        jobsByStatus,
		WorkersRegistered:   len(store.workers),
		ArtifactsTotal:      len(store.artifacts),
		ArtifactArchives:    artifactArchives,
		RetentionCandidates: retentionCandidates,
	}, nil
}
