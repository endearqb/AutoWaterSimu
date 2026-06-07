package compute

import (
	"context"
	"encoding/json"
	"time"
)

func workerClaimEventJSON(ctx context.Context, now time.Time, job JobRecord, workerID string, attempt int) json.RawMessage {
	payload := map[string]any{
		"worker_id": workerID,
		"attempt":   attempt,
	}
	before := map[string]any{
		"status": StatusQueued,
	}
	after := map[string]any{
		"status":    StatusRunning,
		"worker_id": workerID,
		"attempt":   attempt,
	}
	return eventJSONWithAudit(
		payload,
		mutationAuditEnvelope(ctx, now, workerID, "service:worker_lifecycle.claim", "ComputeJob", job.JobID, "job.claim", before, after, "worker claimed job", job.TraceID, ""),
	)
}

func artifactRecordedEventJSON(ctx context.Context, now time.Time, job JobRecord, artifact ArtifactRecord) json.RawMessage {
	return eventJSONWithAudit(
		artifactRecordPayload(artifact),
		mutationAuditEnvelope(ctx, now, job.WorkerID, "service:artifact_lifecycle.upload", "Artifact", artifact.ArtifactID, "artifact.record", nil, artifactAuditState(artifact), "worker artifact uploaded", job.TraceID, ""),
	)
}

func jobCompletionEventJSON(ctx context.Context, now time.Time, job JobRecord, workerID string, attempt int, status, errorCode, errorMessage string) json.RawMessage {
	payload := map[string]any{
		"status":        status,
		"error_code":    errorCode,
		"error_message": errorMessage,
	}
	before := map[string]any{
		"status":    StatusRunning,
		"worker_id": workerID,
		"attempt":   attempt,
	}
	after := map[string]any{
		"status":        status,
		"worker_id":     workerID,
		"attempt":       attempt,
		"error_code":    errorCode,
		"error_message": errorMessage,
	}
	return eventJSONWithAudit(
		payload,
		mutationAuditEnvelope(ctx, now, workerID, "service:job_lifecycle.complete", "ComputeJob", job.JobID, "job.complete", before, after, "worker completion accepted", job.TraceID, ""),
	)
}

func artifactRecordPayload(artifact ArtifactRecord) map[string]any {
	var payload map[string]any
	_ = json.Unmarshal(mustJSON(artifact), &payload)
	return payload
}
