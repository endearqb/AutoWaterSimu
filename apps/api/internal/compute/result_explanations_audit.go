package compute

import (
	"context"
	"time"
)

func (svc *ResultExplanationService) resultExplanationSubmittedAuditEvent(ctx context.Context, record ResultExplanationRecord) *EventRecord {
	now := record.SubmittedAt
	if now.IsZero() {
		now = svc.now()
	}
	return &EventRecord{
		JobID:     record.JobID,
		EventType: "result_explanation.submitted",
		EventJSON: resultExplanationEventJSON(
			ctx,
			now,
			record,
			"result_explanation.submit",
			defaultString(record.RequestedBy, record.CreatedBy),
			"service:result_explanation.submit",
			nil,
			resultExplanationAuditState(record),
			"result explanation submitted",
			svc.resultExplanationAuditTraceID(ctx, record.JobID),
			map[string]any{
				"explanation_id":              record.ExplanationID,
				"status":                      record.Status,
				"payload_hash":                record.PayloadHash,
				"resolved_evidence_ref_count": len(record.ResolvedEvidenceRefs),
			},
		),
		CreatedAt: now,
	}
}

func (svc *ResultExplanationService) resultExplanationReviewedAuditEvent(ctx context.Context, before ResultExplanationRecord, reviewer, decision, reason string, now time.Time) *EventRecord {
	after := cloneResultExplanationRecord(before)
	if decision == "approved" {
		after.Status = "approved"
	} else {
		after.Status = "rejected"
	}
	after.ReviewedBy = reviewer
	after.ReviewedAt = &now
	after.ReviewDecision = decision
	after.ReviewReason = reason
	after.UpdatedAt = now
	return &EventRecord{
		JobID:     before.JobID,
		EventType: "result_explanation.reviewed",
		EventJSON: resultExplanationEventJSON(
			ctx,
			now,
			before,
			"result_explanation.review",
			reviewer,
			"service:result_explanation.review",
			resultExplanationAuditState(before),
			resultExplanationAuditState(after),
			reason,
			svc.resultExplanationAuditTraceID(ctx, before.JobID),
			map[string]any{
				"explanation_id": before.ExplanationID,
				"status":         after.Status,
				"decision":       decision,
			},
		),
		CreatedAt: now,
	}
}

func (svc *ResultExplanationService) resultExplanationPublishedAuditEvent(ctx context.Context, before ResultExplanationRecord, publisher string, now time.Time) *EventRecord {
	after := cloneResultExplanationRecord(before)
	after.Status = "published"
	after.PublishedBy = publisher
	after.PublishedAt = &now
	after.UpdatedAt = now
	return &EventRecord{
		JobID:     before.JobID,
		EventType: "result_explanation.published",
		EventJSON: resultExplanationEventJSON(
			ctx,
			now,
			before,
			"result_explanation.publish",
			publisher,
			"service:result_explanation.publish",
			resultExplanationAuditState(before),
			resultExplanationAuditState(after),
			"result explanation published",
			svc.resultExplanationAuditTraceID(ctx, before.JobID),
			map[string]any{
				"explanation_id": before.ExplanationID,
				"status":         after.Status,
			},
		),
		CreatedAt: now,
	}
}

func resultExplanationEventJSON(ctx context.Context, now time.Time, record ResultExplanationRecord, action, fallbackWho, fallbackWhere string, before, after any, reason, traceID string, payload map[string]any) []byte {
	return eventJSONWithAudit(
		payload,
		mutationAuditEnvelope(
			ctx,
			now,
			fallbackWho,
			fallbackWhere,
			"ResultExplanation",
			record.ExplanationID,
			action,
			before,
			after,
			reason,
			traceID,
			"",
		),
	)
}

func (svc *ResultExplanationService) resultExplanationAuditTraceID(ctx context.Context, jobID string) string {
	if svc.jobs == nil {
		return ""
	}
	job, err := svc.jobs.FindJobByID(ctx, jobID)
	if err != nil || job == nil {
		return ""
	}
	return job.TraceID
}

func resultExplanationAuditState(record ResultExplanationRecord) map[string]any {
	state := map[string]any{
		"explanation_id":              record.ExplanationID,
		"job_id":                      record.JobID,
		"status":                      record.Status,
		"payload_hash":                record.PayloadHash,
		"resolved_evidence_ref_count": len(record.ResolvedEvidenceRefs),
		"source_system":               record.SourceSystem,
		"requested_by":                record.RequestedBy,
	}
	if record.TenantID != "" {
		state["tenant_id"] = record.TenantID
	}
	if record.ProjectID != "" {
		state["project_id"] = record.ProjectID
	}
	if record.ReviewedBy != "" {
		state["reviewed_by"] = record.ReviewedBy
	}
	if record.ReviewDecision != "" {
		state["review_decision"] = record.ReviewDecision
	}
	if record.ReviewReason != "" {
		state["review_reason"] = record.ReviewReason
	}
	if record.PublishedBy != "" {
		state["published_by"] = record.PublishedBy
	}
	return state
}
