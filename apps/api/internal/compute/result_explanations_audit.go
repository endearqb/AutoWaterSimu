package compute

import (
	domainevidence "autowatersimu/apps/api/internal/domain/evidence"
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
	return domainevidence.ResultExplanationAuditState(domainevidence.ResultExplanationAuditStateInput{
		ExplanationID:        record.ExplanationID,
		JobID:                record.JobID,
		Status:               record.Status,
		PayloadHash:          record.PayloadHash,
		ResolvedEvidenceRefs: record.ResolvedEvidenceRefs,
		SourceSystem:         record.SourceSystem,
		RequestedBy:          record.RequestedBy,
		TenantID:             record.TenantID,
		ProjectID:            record.ProjectID,
		ReviewedBy:           record.ReviewedBy,
		ReviewDecision:       record.ReviewDecision,
		ReviewReason:         record.ReviewReason,
		PublishedBy:          record.PublishedBy,
	})
}
