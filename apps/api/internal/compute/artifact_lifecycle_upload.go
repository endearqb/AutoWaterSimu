package compute

import (
	"context"
	"io"
	"mime/multipart"

	domainartifacts "autowatersimu/apps/api/internal/domain/artifacts"
)

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
	retention, err := domainartifacts.RetentionFromMetadata(metadata)
	if err != nil {
		return ArtifactRecord{}, ValidationError(err.Error())
	}
	objectKey := "jobs/" + jobID + "/" + artifactID + ".json"
	if err := svc.artifacts.Write(ctx, objectKey, bytes); err != nil {
		return ArtifactRecord{}, err
	}
	now := svc.now()
	artifact := artifactRecordFromDomain(domainartifacts.NewArtifactRecord(domainartifacts.ArtifactRecordInput{
		ArtifactID:      artifactID,
		JobID:           jobID,
		SchemaVersion:   stringValue(metadata, "schema_version"),
		ArtifactType:    stringValue(metadata, "artifact_type"),
		StorageProvider: "local_fs",
		ObjectKey:       objectKey,
		ContentType:     stringValue(metadata, "content_type"),
		SizeBytes:       int64(len(bytes)),
		Checksum:        checksum,
		Retention:       retention,
		Metadata:        metadata["metadata"],
		CreatedAt:       now,
	}))
	event := EventRecord{JobID: jobID, EventType: "artifact.recorded", EventJSON: artifactRecordedEventJSON(ctx, now, *job, artifact), CreatedAt: now}
	if err := svc.metadata.InsertArtifact(ctx, artifact, event); err != nil {
		return ArtifactRecord{}, err
	}
	return artifact, nil
}

func artifactRecordFromDomain(record domainartifacts.ArtifactRecord) ArtifactRecord {
	return ArtifactRecord{
		ArtifactID:      record.ArtifactID,
		JobID:           record.JobID,
		SchemaVersion:   record.SchemaVersion,
		ArtifactType:    record.ArtifactType,
		StorageProvider: record.StorageProvider,
		ObjectKey:       record.ObjectKey,
		ContentType:     record.ContentType,
		SizeBytes:       record.SizeBytes,
		Checksum:        record.Checksum,
		RetentionPolicy: record.RetentionPolicy,
		RetainUntil:     record.RetainUntil,
		Metadata:        mustJSON(record.Metadata),
		CreatedAt:       record.CreatedAt,
	}
}
