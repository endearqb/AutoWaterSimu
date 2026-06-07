package compute

import (
	domainjobs "autowatersimu/apps/api/internal/domain/jobs"
	"context"
	"encoding/json"
)

func jobStateMutationEventJSON(ctx context.Context, mutation domainjobs.StateMutation, before JobRecord, after JobRecord) json.RawMessage {
	payload := map[string]any{}
	_ = json.Unmarshal(mutation.EventJSON, &payload)
	if len(payload) == 0 {
		payload["status"] = after.Status
	}
	action := "job.state_change"
	reason := "job state changed"
	where := "service:job_lifecycle.state"
	switch mutation.EventType {
	case domainjobs.EventJobCancelled:
		action = "job.cancel"
		reason = "job cancelled"
		where = "service:job_lifecycle.cancel"
	case domainjobs.EventJobTimedOut:
		action = "job.timeout"
		reason = domainjobs.TimeoutErrorMessage
		where = "service:job_lifecycle.timeout_sweep"
	}
	return eventJSONWithAudit(
		payload,
		mutationAuditEnvelope(ctx, mutation.FinishedAt, before.RequestedBy, where, "ComputeJob", before.JobID, action, jobStateAuditState(before), jobStateAuditState(after), reason, before.TraceID, ""),
	)
}

func jobStateAuditState(job JobRecord) map[string]any {
	return map[string]any{
		"job_id":           job.JobID,
		"status":           job.Status,
		"worker_id":        job.WorkerID,
		"attempt":          job.Attempt,
		"cancel_requested": job.CancelRequested,
		"error_code":       job.ErrorCode,
		"error_message":    job.ErrorMessage,
	}
}
