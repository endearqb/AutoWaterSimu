package agent

import (
	"errors"
	"strings"
)

const (
	DraftConfirmationSchema = "draft_confirmation.v1"

	ConstraintApplicationPlanSchema = "constraint_application_plan.v1"
	ConstraintApplicationMode       = "advisory_only"

	ConstraintPlanWarningAdvisoryOnly = "constraint application plan is advisory only; no compute job was created"
	ConstraintPlanWarningApproval     = "production approval is owned by the consuming approval system"
)

type ValidationIssue struct {
	Path    string
	Message string
}

type DraftConfirmationEnvelope struct {
	Draft                    map[string]any
	DraftSchemaVersion       string
	ActualDraftSchemaVersion string
	DraftID                  string
	ActualDraftID            string
}

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

func ValidateDraftConfirmationEnvelope(document map[string]any) (DraftConfirmationEnvelope, []ValidationIssue) {
	envelope := DraftConfirmationEnvelope{
		Draft:              mapValue(document, "draft"),
		DraftSchemaVersion: stringValue(document, "draft_schema_version"),
		DraftID:            stringValue(document, "draft_id"),
	}
	issues := []ValidationIssue{}
	if stringValue(document, "schema_version") != DraftConfirmationSchema {
		issues = append(issues, ValidationIssue{
			Path:    "/schema_version",
			Message: "schema_version must be draft_confirmation.v1",
		})
	}
	if envelope.Draft == nil {
		issues = append(issues, ValidationIssue{
			Path:    "/draft",
			Message: "draft is required",
		})
	}
	envelope.ActualDraftSchemaVersion = stringValue(envelope.Draft, "schema_version")
	if envelope.ActualDraftSchemaVersion != envelope.DraftSchemaVersion {
		issues = append(issues, ValidationIssue{
			Path:    "/draft/schema_version",
			Message: "draft.schema_version must match draft_schema_version",
		})
	}
	envelope.ActualDraftID = stringValue(envelope.Draft, "draft_id")
	if envelope.ActualDraftID == "" {
		envelope.ActualDraftID = stringValue(envelope.Draft, "constraint_id")
	}
	if envelope.ActualDraftID != envelope.DraftID {
		issues = append(issues, ValidationIssue{
			Path:    "/draft_id",
			Message: "draft_id must match the embedded draft id",
		})
	}
	if requiresConfirmation, ok := envelope.Draft["requires_confirmation"].(bool); !ok || !requiresConfirmation {
		issues = append(issues, ValidationIssue{
			Path:    "/draft/requires_confirmation",
			Message: "embedded draft must explicitly require confirmation",
		})
	}
	return envelope, issues
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

func ProposedSimulationRequestFromDraft(draft map[string]any) (map[string]any, error) {
	if draft == nil {
		return nil, errors.New("draft confirmation draft is required")
	}
	proposedRequest := mapValue(draft, "proposed_request")
	if proposedRequest == nil {
		return nil, errors.New("agent_scenario_draft.proposed_request is required")
	}
	return proposedRequest, nil
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
