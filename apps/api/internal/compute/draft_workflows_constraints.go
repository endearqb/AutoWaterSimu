package compute

import (
	"context"
	"encoding/json"

	domainagent "autowatersimu/apps/api/internal/domain/agent"
)

func (svc *DraftWorkflowService) ConstraintApplicationPlan(ctx context.Context, confirmationID string) (ConstraintApplicationPlan, error) {
	record, err := svc.confirmations.FindDraftConfirmation(ctx, required(confirmationID, "confirmation_id"))
	if err != nil {
		return ConstraintApplicationPlan{}, err
	}
	if record.Decision != "approved" {
		return ConstraintApplicationPlan{}, Conflict(CodeDraftConfirmationNotApproved, "draft confirmation is not approved")
	}
	if record.DraftSchemaVersion != "constraint_draft.v1" {
		return ConstraintApplicationPlan{}, ValidationError("only constraint_draft.v1 can produce a constraint application plan")
	}
	var confirmation map[string]any
	if err := json.Unmarshal(record.Payload, &confirmation); err != nil {
		return ConstraintApplicationPlan{}, NewAppError(500, CodeInternal, "stored draft confirmation JSON is invalid", true, nil)
	}
	draft := mapValue(confirmation, "draft")
	if draft == nil {
		return ConstraintApplicationPlan{}, ValidationError("draft confirmation draft is required")
	}
	if svc.validator != nil {
		if err := svc.validator.Validate("constraint_draft.v1.json", draft); err != nil {
			return ConstraintApplicationPlan{}, err
		}
	}
	plan, err := domainagent.ConstraintApplicationPlanFromDraft(domainagent.ConstraintApplicationPlanInput{
		ConfirmationID: record.ConfirmationID,
		DraftID:        record.DraftID,
		Draft:          draft,
	})
	if err != nil {
		return ConstraintApplicationPlan{}, ValidationError(err.Error())
	}
	return plan, nil
}
