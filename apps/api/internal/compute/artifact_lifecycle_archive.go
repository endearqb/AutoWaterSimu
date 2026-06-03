package compute

import (
	"context"
	"time"
)

func (svc *ArtifactLifecycleService) archiveArtifact(ctx context.Context, artifact ArtifactRecord, now time.Time) (ArtifactArchiveRecord, error) {
	bytes, err := svc.artifacts.Read(ctx, artifact.ObjectKey)
	if err != nil {
		return ArtifactArchiveRecord{}, err
	}
	if "sha256:"+SHA256Hex(bytes) != artifact.Checksum {
		return ArtifactArchiveRecord{}, NewAppError(500, CodeInternal, "artifact checksum verification failed", true, nil)
	}
	archiveObjectKey := artifact.ObjectKey
	archiveProvider := "artifact_archive"
	if archiveStore, ok := svc.archiveArtifacts.(ArtifactArchiveStore); ok {
		archiveProvider = archiveStore.ArchiveProvider()
		archiveObjectKey, err = archiveStore.ArchiveObjectKey(artifact.ObjectKey)
		if err != nil {
			return ArtifactArchiveRecord{}, err
		}
	}
	if err := svc.archiveArtifacts.Write(ctx, archiveObjectKey, bytes); err != nil {
		return ArtifactArchiveRecord{}, err
	}
	archivedBytes, err := svc.archiveArtifacts.Read(ctx, archiveObjectKey)
	if err != nil {
		return ArtifactArchiveRecord{}, err
	}
	if "sha256:"+SHA256Hex(archivedBytes) != artifact.Checksum {
		return ArtifactArchiveRecord{}, NewAppError(500, CodeInternal, "artifact archive checksum verification failed", true, nil)
	}
	archive := ArtifactArchiveRecord{
		ArtifactID:              artifact.ArtifactID,
		JobID:                   artifact.JobID,
		OriginalStorageProvider: artifact.StorageProvider,
		OriginalObjectKey:       artifact.ObjectKey,
		ArchiveProvider:         archiveProvider,
		ArchiveObjectKey:        archiveObjectKey,
		Checksum:                artifact.Checksum,
		SizeBytes:               int64(len(archivedBytes)),
		Status:                  "archived",
		Metadata:                mustJSON(map[string]any{"retention_policy": artifact.RetentionPolicy}),
		ArchivedAt:              now,
	}
	event := EventRecord{
		JobID:     artifact.JobID,
		EventType: "artifact.archived",
		EventJSON: eventJSONWithAudit(
			map[string]any{
				"artifact_id":               artifact.ArtifactID,
				"original_storage_provider": artifact.StorageProvider,
				"original_object_key":       artifact.ObjectKey,
				"archive_provider":          archive.ArchiveProvider,
				"archive_object_key":        archive.ArchiveObjectKey,
				"checksum":                  archive.Checksum,
				"status":                    archive.Status,
				"archived_at":               archive.ArchivedAt,
			},
			mutationAuditEnvelope(
				ctx,
				now,
				"system",
				"service:artifact_retention_sweep",
				"Artifact",
				artifact.ArtifactID,
				"artifact.archive",
				artifactAuditState(artifact),
				artifactArchiveAuditState(archive),
				"archive candidate retention expired",
				svc.auditTraceID(ctx, artifact.JobID),
				"",
			),
		),
		CreatedAt: now,
	}
	if err := svc.archiveMetadata.UpsertArtifactArchive(ctx, archive, event); err != nil {
		return ArtifactArchiveRecord{}, err
	}
	if err := svc.artifacts.Delete(ctx, artifact.ObjectKey); err != nil {
		return ArtifactArchiveRecord{}, err
	}
	return archive, nil
}

func artifactArchiveAuditState(archive ArtifactArchiveRecord) map[string]any {
	return map[string]any{
		"artifact_id":        archive.ArtifactID,
		"job_id":             archive.JobID,
		"archive_provider":   archive.ArchiveProvider,
		"archive_object_key": archive.ArchiveObjectKey,
		"checksum":           archive.Checksum,
		"size_bytes":         archive.SizeBytes,
		"status":             archive.Status,
		"archived_at":        archive.ArchivedAt,
	}
}
