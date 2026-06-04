package compute

import "context"

func (svc *ResultExplanationService) GetResultExplanation(ctx context.Context, jobID, explanationID string) (ResultExplanationRecord, error) {
	record, err := svc.explanations.FindResultExplanation(ctx, required(jobID, "job_id"), required(explanationID, "explanation_id"))
	if err != nil {
		return ResultExplanationRecord{}, err
	}
	return *record, nil
}
