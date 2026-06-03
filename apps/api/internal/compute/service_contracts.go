package compute

import "context"

func (svc *Service) ValidateContractDocument(bytes []byte) (ContractValidationResponse, error) {
	return validateContractDocument(bytes, svc.validator)
}

func (svc *Service) ConfirmDraftDocument(ctx context.Context, bytes []byte, defaultSourceSystem, defaultRequestedBy string) (ContractValidationResponse, error) {
	return svc.draftWorkflows.ConfirmDraftDocument(ctx, bytes, defaultSourceSystem, defaultRequestedBy)
}

func (svc *Service) GetDraftConfirmation(ctx context.Context, confirmationID string) (DraftConfirmationRecord, error) {
	return svc.draftWorkflows.GetDraftConfirmation(ctx, confirmationID)
}

func (svc *Service) ConstraintApplicationPlan(ctx context.Context, confirmationID string) (ConstraintApplicationPlan, error) {
	return svc.draftWorkflows.ConstraintApplicationPlan(ctx, confirmationID)
}

func (svc *Service) PromoteDraftConfirmationToSimulationCheck(ctx context.Context, confirmationID string) (JobSnapshot, int, error) {
	return svc.draftWorkflows.PromoteDraftConfirmationToSimulationCheck(ctx, confirmationID)
}

func (svc *Service) SubmitResultExplanation(ctx context.Context, jobID string, bytes []byte, defaultSourceSystem, defaultRequestedBy string) (ResultExplanationRecord, int, error) {
	return svc.resultExplanations.SubmitResultExplanation(ctx, jobID, bytes, defaultSourceSystem, defaultRequestedBy)
}

func (svc *Service) GetResultExplanation(ctx context.Context, jobID, explanationID string) (ResultExplanationRecord, error) {
	return svc.resultExplanations.GetResultExplanation(ctx, jobID, explanationID)
}

func (svc *Service) ReviewResultExplanation(ctx context.Context, jobID, explanationID string, request ResultExplanationReviewRequest, reviewer string) (ResultExplanationRecord, error) {
	return svc.resultExplanations.ReviewResultExplanation(ctx, jobID, explanationID, request, reviewer)
}

func (svc *Service) PublishResultExplanation(ctx context.Context, jobID, explanationID, publisher string) (ResultExplanationRecord, error) {
	return svc.resultExplanations.PublishResultExplanation(ctx, jobID, explanationID, publisher)
}
