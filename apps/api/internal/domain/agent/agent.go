package agent

import (
	"errors"
	"strings"
)

const (
	ConstraintApplicationPlanSchema = "constraint_application_plan.v1"
	ConstraintApplicationMode       = "advisory_only"

	ConstraintPlanWarningAdvisoryOnly = "constraint application plan is advisory only; no compute job was created"
	ConstraintPlanWarningApproval     = "production approval is owned by the consuming approval system"
)

type ConstraintApplicationPlan struct {
	SchemaVersion              string         `json:"schema_version"`
	ConfirmationID             string         `json:"confirmation_id"`
	DraftID                    string         `json:"draft_id"`
	ConstraintID               string         `json:"constraint_id"`
	Scope                      string         `json:"scope"`
	TargetRef                  map[string]any `json:"target_ref"`
	Constraints                []any          `json:"constraints"`
	ApplicationMode            string         `json:"application_mode"`
	WouldCreateJob             bool           `json:"would_create_job"`
	WouldModifyTarget          bool           `json:"would_modify_target"`
	ProductionApprovalRequired bool           `json:"production_approval_required"`
	Warnings                   []string       `json:"warnings"`
}

type ConstraintApplicationPlanInput struct {
	ConfirmationID string
	DraftID        string
	Draft          map[string]any
}

func ConstraintApplicationPlanFromDraft(input ConstraintApplicationPlanInput) (ConstraintApplicationPlan, error) {
	draft := input.Draft
	if draft == nil {
		return ConstraintApplicationPlan{}, errors.New("draft confirmation draft is required")
	}
	targetRef := mapValue(draft, "target_ref")
	if targetRef == nil {
		return ConstraintApplicationPlan{}, errors.New("constraint_draft.target_ref is required")
	}
	constraints, ok := draft["constraints"].([]any)
	if !ok {
		return ConstraintApplicationPlan{}, errors.New("constraint_draft.constraints is required")
	}
	return ConstraintApplicationPlan{
		SchemaVersion:              ConstraintApplicationPlanSchema,
		ConfirmationID:             strings.TrimSpace(input.ConfirmationID),
		DraftID:                    strings.TrimSpace(input.DraftID),
		ConstraintID:               stringValue(draft, "constraint_id"),
		Scope:                      stringValue(draft, "scope"),
		TargetRef:                  targetRef,
		Constraints:                constraints,
		ApplicationMode:            ConstraintApplicationMode,
		WouldCreateJob:             false,
		WouldModifyTarget:          false,
		ProductionApprovalRequired: true,
		Warnings: []string{
			ConstraintPlanWarningAdvisoryOnly,
			ConstraintPlanWarningApproval,
		},
	}, nil
}

func mapValue(value map[string]any, key string) map[string]any {
	if value == nil {
		return nil
	}
	item, _ := value[key].(map[string]any)
	return item
}

func stringValue(value map[string]any, key string) string {
	if value == nil {
		return ""
	}
	if text, ok := value[key].(string); ok {
		return strings.TrimSpace(text)
	}
	return ""
}
