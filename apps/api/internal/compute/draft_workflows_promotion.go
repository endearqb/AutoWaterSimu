package compute

import (
	"context"
	"encoding/json"

	domainagent "autowatersimu/apps/api/internal/domain/agent"
)

func (svc *DraftWorkflowService) PromoteDraftConfirmationToSimulationCheck(ctx context.Context, confirmationID string) (JobSnapshot, int, error) {
	return svc.PromoteDraftConfirmationToSimulationCheckForScope(ctx, confirmationID, ListFilter{})
}

func (svc *DraftWorkflowService) PromoteDraftConfirmationToSimulationCheckForScope(ctx context.Context, confirmationID string, filter ListFilter) (JobSnapshot, int, error) {
	record, err := svc.confirmations.FindDraftConfirmation(ctx, required(confirmationID, "confirmation_id"))
	if err != nil {
		return JobSnapshot{}, 0, err
	}
	if record.Decision != "approved" {
		return JobSnapshot{}, 0, Conflict(CodeDraftConfirmationNotApproved, "draft confirmation is not approved")
	}
	if record.DraftSchemaVersion != "agent_scenario_draft.v1" {
		return JobSnapshot{}, 0, ValidationError("only agent_scenario_draft.v1 can be promoted to a simulation check")
	}
	var confirmation map[string]any
	if err := json.Unmarshal(record.Payload, &confirmation); err != nil {
		return JobSnapshot{}, 0, NewAppError(500, CodeInternal, "stored draft confirmation JSON is invalid", true, nil)
	}
	draft := mapValue(confirmation, "draft")
	proposedRequest, err := domainagent.ProposedSimulationRequestFromDraft(draft)
	if err != nil {
		return JobSnapshot{}, 0, ValidationError(err.Error())
	}
	if svc.validator != nil {
		if err := svc.validator.Validate("simulation_request.v1.json", proposedRequest); err != nil {
			return JobSnapshot{}, 0, err
		}
	}
	requestBytes, err := json.Marshal(proposedRequest)
	if err != nil {
		return JobSnapshot{}, 0, err
	}
	if svc.createSimulationCheck == nil {
		return JobSnapshot{}, 0, NewAppError(500, CodeInternal, "simulation check promoter is not configured", true, nil)
	}
	return svc.createSimulationCheck(ctx, requestBytes, filter)
}
