package compute

import (
	"context"
	"io"
	"mime/multipart"
	"time"
)

type ArtifactLifecycleService struct {
	jobs             JobStore
	metadata         ArtifactMetadataStore
	archiveMetadata  ArchiveMetadataStore
	artifacts        ArtifactStore
	archiveArtifacts ArtifactStore
	validator        *ContractValidator
	now              func() time.Time
}

func NewArtifactLifecycleService(jobs JobStore, metadata ArtifactMetadataStore, archiveMetadata ArchiveMetadataStore, artifacts ArtifactStore, archiveArtifacts ArtifactStore, validator *ContractValidator, now func() time.Time) *ArtifactLifecycleService {
	if now == nil {
		now = func() time.Time { return time.Now().UTC() }
	}
	return &ArtifactLifecycleService{
		jobs:             jobs,
		metadata:         metadata,
		archiveMetadata:  archiveMetadata,
		artifacts:        artifacts,
		archiveArtifacts: archiveArtifacts,
		validator:        validator,
		now:              now,
	}
}

func (svc *ArtifactLifecycleService) UploadArtifact(ctx context.Context, workerID, jobID string, metadataText string, file multipart.File) (ArtifactRecord, error) {
	job, err := svc.jobs.FindJobByID(ctx, required(jobID, "job_id"))
	if err != nil {
		return ArtifactRecord{}, err
	}
	if job.Status != StatusRunning || job.WorkerID != required(workerID, "worker_id") {
		return ArtifactRecord{}, Conflict(CodeWorkerStale, "worker cannot write artifact for current job state")
	}
	metadata, err := DecodeArtifactMetadata(metadataText, svc.validator)
	if err != nil {
		return ArtifactRecord{}, err
	}
	artifactID := stringValue(metadata, "artifact_id")
	if artifactID == "" {
		return ArtifactRecord{}, ValidationError("artifact_id is required")
	}
	bytes, err := io.ReadAll(file)
	if err != nil {
		return ArtifactRecord{}, err
	}
	checksum := "sha256:" + SHA256Hex(bytes)
	if expected := stringValue(metadata, "checksum"); expected != checksum {
		return ArtifactRecord{}, ValidationError("artifact checksum mismatch")
	}
	retentionPolicy, retainUntil, err := artifactRetention(metadata)
	if err != nil {
		return ArtifactRecord{}, err
	}
	objectKey := "jobs/" + jobID + "/" + artifactID + ".json"
	if err := svc.artifacts.Write(ctx, objectKey, bytes); err != nil {
		return ArtifactRecord{}, err
	}
	now := svc.now()
	artifact := ArtifactRecord{
		ArtifactID:      artifactID,
		JobID:           jobID,
		SchemaVersion:   stringValue(metadata, "schema_version"),
		ArtifactType:    stringValue(metadata, "artifact_type"),
		StorageProvider: "local_fs",
		ObjectKey:       objectKey,
		ContentType:     defaultString(stringValue(metadata, "content_type"), "application/json"),
		SizeBytes:       int64(len(bytes)),
		Checksum:        checksum,
		RetentionPolicy: retentionPolicy,
		RetainUntil:     retainUntil,
		Metadata:        mustJSON(metadata["metadata"]),
		CreatedAt:       now,
	}
	event := EventRecord{JobID: jobID, EventType: "artifact.recorded", EventJSON: mustJSON(artifact), CreatedAt: now}
	if err := svc.metadata.InsertArtifact(ctx, artifact, event); err != nil {
		return ArtifactRecord{}, err
	}
	return artifact, nil
}

func (svc *ArtifactLifecycleService) ListJobArtifacts(ctx context.Context, jobID string) ([]ArtifactRecord, error) {
	return svc.metadata.Artifacts(ctx, jobID)
}

func (svc *ArtifactLifecycleService) ArtifactMetadata(ctx context.Context, artifactID string) (ArtifactRecord, error) {
	artifact, err := svc.metadata.FindArtifact(ctx, required(artifactID, "artifact_id"))
	if err != nil {
		return ArtifactRecord{}, err
	}
	return *artifact, nil
}

func (svc *ArtifactLifecycleService) DownloadArtifact(ctx context.Context, artifactID string) (ArtifactRecord, []byte, error) {
	artifact, err := svc.metadata.FindArtifact(ctx, required(artifactID, "artifact_id"))
	if err != nil {
		return ArtifactRecord{}, nil, err
	}
	bytes, err := svc.artifacts.Read(ctx, artifact.ObjectKey)
	if err != nil {
		appErr := ToAppError(err)
		if svc.archiveArtifacts == nil || svc.archiveMetadata == nil || appErr.ErrorCode != CodeArtifactNotFound {
			return ArtifactRecord{}, nil, err
		}
		archive, archiveErr := svc.archiveMetadata.FindArtifactArchive(ctx, artifact.ArtifactID)
		if archiveErr != nil || archive.Status != "archived" {
			return ArtifactRecord{}, nil, err
		}
		bytes, err = svc.archiveArtifacts.Read(ctx, archive.ArchiveObjectKey)
		if err != nil {
			return ArtifactRecord{}, nil, err
		}
		if archive.Checksum != artifact.Checksum {
			return ArtifactRecord{}, nil, NewAppError(500, CodeInternal, "artifact archive metadata checksum mismatch", true, nil)
		}
	}
	if "sha256:"+SHA256Hex(bytes) != artifact.Checksum {
		return ArtifactRecord{}, nil, NewAppError(500, CodeInternal, "artifact checksum verification failed", true, nil)
	}
	return *artifact, bytes, nil
}

func (svc *ArtifactLifecycleService) SweepArtifactRetention(ctx context.Context, options ArtifactRetentionSweepOptions) (ArtifactRetentionSweepReport, error) {
	now := options.Now
	if now.IsZero() {
		now = svc.now()
	}
	limit := normalizeRetentionLimit(options.Limit)
	candidates, err := svc.metadata.ListArtifactRetentionCandidates(ctx, now, limit)
	if err != nil {
		return ArtifactRetentionSweepReport{}, err
	}
	report := ArtifactRetentionSweepReport{
		SchemaVersion: "artifact_retention_sweep.v1",
		DryRun:        options.DryRun,
		Checked:       len(candidates),
		Items:         make([]ArtifactRetentionAction, 0, len(candidates)),
		GeneratedAt:   now,
	}
	for _, artifact := range candidates {
		action := ArtifactRetentionAction{
			ArtifactID:      artifact.ArtifactID,
			JobID:           artifact.JobID,
			RetentionPolicy: artifact.RetentionPolicy,
			RetainUntil:     artifact.RetainUntil,
		}
		blockingRefs, err := svc.metadata.ArtifactReferences(ctx, artifact.ArtifactID)
		if err != nil {
			return ArtifactRetentionSweepReport{}, err
		}
		if len(blockingRefs) > 0 {
			action.Action = "skipped"
			action.Reason = "referenced_by_model_run"
			action.BlockingRefs = blockingRefs
			report.Skipped++
			report.Items = append(report.Items, action)
			continue
		}
		if artifact.RetentionPolicy == "archive_candidate" {
			if svc.archiveArtifacts == nil {
				action.Action = "skipped"
				action.Reason = "archive_executor_not_configured"
				report.Skipped++
				report.Items = append(report.Items, action)
				continue
			}
			if options.DryRun {
				action.Action = "would_archive"
				report.Items = append(report.Items, action)
				continue
			}
			archive, err := svc.archiveArtifact(ctx, artifact, now)
			if err != nil {
				return ArtifactRetentionSweepReport{}, err
			}
			action.Action = "archived"
			action.ArchiveProvider = archive.ArchiveProvider
			action.ArchiveObjectKey = archive.ArchiveObjectKey
			report.Archived++
			report.Items = append(report.Items, action)
			continue
		}
		if artifact.RetentionPolicy != "ttl" {
			action.Action = "skipped"
			action.Reason = "unsupported_retention_policy"
			report.Skipped++
			report.Items = append(report.Items, action)
			continue
		}
		if options.DryRun {
			action.Action = "would_delete"
			report.Items = append(report.Items, action)
			continue
		}
		if err := svc.artifacts.Delete(ctx, artifact.ObjectKey); err != nil {
			return ArtifactRetentionSweepReport{}, err
		}
		event := EventRecord{
			JobID:     artifact.JobID,
			EventType: "artifact.retention_deleted",
			EventJSON: eventJSONWithAudit(
				map[string]any{
					"artifact_id":      artifact.ArtifactID,
					"retention_policy": artifact.RetentionPolicy,
					"retain_until":     artifact.RetainUntil,
				},
				mutationAuditEnvelope(
					ctx,
					now,
					"system",
					"service:artifact_retention_sweep",
					"Artifact",
					artifact.ArtifactID,
					"artifact.retention_delete",
					artifactAuditState(artifact),
					map[string]any{"deleted": true},
					"ttl retention expired",
					svc.auditTraceID(ctx, artifact.JobID),
					"",
				),
			),
			CreatedAt: now,
		}
		if err := svc.metadata.DeleteArtifact(ctx, artifact.ArtifactID, event); err != nil {
			return ArtifactRetentionSweepReport{}, err
		}
		action.Action = "deleted"
		report.Deleted++
		report.Items = append(report.Items, action)
	}
	return report, nil
}

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

func (svc *ArtifactLifecycleService) auditTraceID(ctx context.Context, jobID string) string {
	if svc.jobs == nil {
		return ""
	}
	job, err := svc.jobs.FindJobByID(ctx, jobID)
	if err != nil || job == nil {
		return ""
	}
	return job.TraceID
}

func artifactAuditState(artifact ArtifactRecord) map[string]any {
	return map[string]any{
		"artifact_id":      artifact.ArtifactID,
		"job_id":           artifact.JobID,
		"storage_provider": artifact.StorageProvider,
		"object_key":       artifact.ObjectKey,
		"checksum":         artifact.Checksum,
		"retention_policy": artifact.RetentionPolicy,
		"retain_until":     artifact.RetainUntil,
	}
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
