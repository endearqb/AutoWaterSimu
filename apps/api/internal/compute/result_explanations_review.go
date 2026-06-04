package compute

import "context"

func (svc *ResultExplanationService) ReviewResultExplanation(ctx context.Context, jobID, explanationID string, request ResultExplanationReviewRequest, reviewer string) (ResultExplanationRecord, error) {
	decision := required(request.Decision, "decision")
	if decision != "approved" && decision != "rejected" {
		return ResultExplanationRecord{}, ValidationError("decision must be approved or rejected")
	}
	record, err := svc.explanations.UpdateResultExplanationReview(ctx, required(jobID, "job_id"), required(explanationID, "explanation_id"), defaultString(reviewer, "unknown"), decision, request.Reason, nil, svc.now())
	if err != nil {
		return ResultExplanationRecord{}, err
	}
	return *record, nil
}

func (svc *ResultExplanationService) PublishResultExplanation(ctx context.Context, jobID, explanationID, publisher string) (ResultExplanationRecord, error) {
	record, err := svc.explanations.PublishResultExplanation(ctx, required(jobID, "job_id"), required(explanationID, "explanation_id"), defaultString(publisher, "unknown"), svc.now())
	if err != nil {
		return ResultExplanationRecord{}, err
	}
	return *record, nil
}
