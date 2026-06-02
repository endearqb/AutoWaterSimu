package compute

import (
	domainartifacts "autowatersimu/apps/api/internal/domain/artifacts"
	domainmodels "autowatersimu/apps/api/internal/domain/models"
	"context"
	"sort"
	"time"
)

func (store *MemoryStore) Artifacts(_ context.Context, jobID string) ([]ArtifactRecord, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	if _, ok := store.jobs[jobID]; !ok {
		return nil, NotFound(CodeJobNotFound, "job not found")
	}
	var artifacts []ArtifactRecord
	for _, artifact := range store.artifacts {
		if artifact.JobID == jobID {
			artifacts = append(artifacts, artifact)
		}
	}
	sort.Slice(artifacts, func(i, j int) bool {
		if artifacts[i].CreatedAt.Equal(artifacts[j].CreatedAt) {
			return artifacts[i].ArtifactID < artifacts[j].ArtifactID
		}
		return artifacts[i].CreatedAt.Before(artifacts[j].CreatedAt)
	})
	return artifacts, nil
}

func (store *MemoryStore) FindArtifact(_ context.Context, artifactID string) (*ArtifactRecord, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	artifact, ok := store.artifacts[artifactID]
	if !ok {
		return nil, NotFound(CodeArtifactNotFound, "artifact not found")
	}
	return &artifact, nil
}

func (store *MemoryStore) InsertArtifact(_ context.Context, artifact ArtifactRecord, event EventRecord) error {
	store.mu.Lock()
	defer store.mu.Unlock()
	job, ok := store.jobs[artifact.JobID]
	if !ok {
		return NotFound(CodeJobNotFound, "job not found")
	}
	if job.Status != StatusRunning {
		store.appendEventLocked(EventRecord{
			JobID: artifact.JobID, EventType: "late_result_rejected",
			EventJSON: mustJSON(map[string]any{"artifact_id": artifact.ArtifactID, "status": job.Status}),
			CreatedAt: time.Now().UTC(),
		})
		return Conflict(CodeWorkerStale, "job is terminal or not running")
	}
	store.artifacts[artifact.ArtifactID] = artifact
	store.appendEventLocked(event)
	return nil
}

func (store *MemoryStore) ListArtifactRetentionCandidates(_ context.Context, now time.Time, limit int) ([]ArtifactRecord, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	var artifacts []ArtifactRecord
	for _, artifact := range store.artifacts {
		if !domainartifacts.IsRetentionCandidate(artifact.RetentionPolicy) {
			continue
		}
		if artifact.RetentionPolicy == domainartifacts.PolicyArchiveCandidate {
			if archive, ok := store.archives[artifact.ArtifactID]; ok && archive.Status == "archived" {
				continue
			}
		}
		if artifact.RetainUntil == nil || artifact.RetainUntil.After(now) {
			continue
		}
		artifacts = append(artifacts, artifact)
	}
	sort.Slice(artifacts, func(i, j int) bool {
		left := artifacts[i]
		right := artifacts[j]
		if left.RetainUntil != nil && right.RetainUntil != nil && !left.RetainUntil.Equal(*right.RetainUntil) {
			return left.RetainUntil.Before(*right.RetainUntil)
		}
		if !left.CreatedAt.Equal(right.CreatedAt) {
			return left.CreatedAt.Before(right.CreatedAt)
		}
		return left.ArtifactID < right.ArtifactID
	})
	limit = normalizeRetentionLimit(limit)
	if len(artifacts) > limit {
		artifacts = artifacts[:limit]
	}
	return append([]ArtifactRecord(nil), artifacts...), nil
}

func (store *MemoryStore) ArtifactReferences(_ context.Context, artifactID string) ([]string, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	var refs []string
	for _, modelRun := range store.modelRuns {
		modelRunID := domainmodels.RunIDFromRaw(modelRun)
		if modelRunID == "" {
			continue
		}
		for _, evidenceRef := range domainmodels.RunEvidenceRefsFromRaw(modelRun) {
			if evidenceRef == artifactID || evidenceRef == "artifact:"+artifactID {
				refs = append(refs, "model_run:"+modelRunID)
				break
			}
		}
	}
	sort.Strings(refs)
	return refs, nil
}

func (store *MemoryStore) DeleteArtifact(_ context.Context, artifactID string, event EventRecord) error {
	store.mu.Lock()
	defer store.mu.Unlock()
	artifact, ok := store.artifacts[artifactID]
	if !ok {
		return NotFound(CodeArtifactNotFound, "artifact not found")
	}
	delete(store.artifacts, artifactID)
	delete(store.archives, artifactID)
	if _, ok := store.jobs[artifact.JobID]; ok {
		event.JobID = artifact.JobID
		store.appendEventLocked(event)
	}
	return nil
}

func (store *MemoryStore) UpsertArtifactArchive(_ context.Context, archive ArtifactArchiveRecord, event EventRecord) error {
	store.mu.Lock()
	defer store.mu.Unlock()
	artifact, ok := store.artifacts[archive.ArtifactID]
	if !ok {
		return NotFound(CodeArtifactNotFound, "artifact not found")
	}
	archive.JobID = artifact.JobID
	store.archives[archive.ArtifactID] = archive
	if _, ok := store.jobs[artifact.JobID]; ok {
		event.JobID = artifact.JobID
		store.appendEventLocked(event)
	}
	return nil
}

func (store *MemoryStore) FindArtifactArchive(_ context.Context, artifactID string) (*ArtifactArchiveRecord, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	archive, ok := store.archives[artifactID]
	if !ok {
		return nil, NotFound(CodeArtifactNotFound, "artifact archive not found")
	}
	return &archive, nil
}

func normalizeRetentionLimit(limit int) int {
	if limit <= 0 {
		return 100
	}
	if limit > 1000 {
		return 1000
	}
	return limit
}
