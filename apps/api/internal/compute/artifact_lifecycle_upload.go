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
		RetentionPolicy: retention.Policy,
		RetainUntil:     retention.RetainUntil,
		Metadata:        mustJSON(metadata["metadata"]),
		CreatedAt:       now,
	}
	event := EventRecord{JobID: jobID, EventType: "artifact.recorded", EventJSON: artifactRecordedEventJSON(ctx, now, *job, artifact), CreatedAt: now}
	if err := svc.metadata.InsertArtifact(ctx, artifact, event); err != nil {
		return ArtifactRecord{}, err
	}
	return artifact, nil
}
