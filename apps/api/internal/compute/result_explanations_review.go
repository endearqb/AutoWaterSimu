package compute

import "context"

func (svc *ResultExplanationService) ReviewResultExplanation(ctx context.Context, jobID, explanationID string, request ResultExplanationReviewRequest, reviewer string) (ResultExplanationRecord, error) {
	decision := required(request.Decision, "decision")
	if decision != "approved" && decision != "rejected" {
		return ResultExplanationRecord{}, ValidationError("decision must be approved or rejected")
	}
	jobID = required(jobID, "job_id")
	explanationID = required(explanationID, "explanation_id")
	before, err := svc.explanations.FindResultExplanation(ctx, jobID, explanationID)
	if err != nil {
		return ResultExplanationRecord{}, err
	}
	now := svc.now()
	reviewer = defaultString(reviewer, "unknown")
	record, err := svc.explanations.UpdateResultExplanationReview(ctx, jobID, explanationID, reviewer, decision, request.Reason, nil, now, svc.resultExplanationReviewedAuditEvent(ctx, *before, reviewer, decision, request.Reason, now))
	if err != nil {
		return ResultExplanationRecord{}, err
	}
	return *record, nil
}

func (svc *ResultExplanationService) PublishResultExplanation(ctx context.Context, jobID, explanationID, publisher string) (ResultExplanationRecord, error) {
	jobID = required(jobID, "job_id")
	explanationID = required(explanationID, "explanation_id")
	before, err := svc.explanations.FindResultExplanation(ctx, jobID, explanationID)
	if err != nil {
		return ResultExplanationRecord{}, err
	}
	now := svc.now()
	publisher = defaultString(publisher, "unknown")
	var event *EventRecord
	if before.Status != "published" {
		event = svc.resultExplanationPublishedAuditEvent(ctx, *before, publisher, now)
	}
	record, err := svc.explanations.PublishResultExplanation(ctx, jobID, explanationID, publisher, now, event)
	if err != nil {
		return ResultExplanationRecord{}, err
	}
	return *record, nil
}
