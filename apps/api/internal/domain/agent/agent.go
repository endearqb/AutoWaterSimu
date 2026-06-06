package agent

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"strings"
	"time"
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

type DraftConfirmationRecordDataInput struct {
	Document            map[string]any
	DefaultSourceSystem string
	DefaultRequestedBy  string
	CreatedAt           time.Time
}

type DraftConfirmationRecordData struct {
	ConfirmationID     string
	SchemaVersion      string
	DraftSchemaVersion string
	DraftID            string
	Decision           string
	DecisionReason     string
	ConfirmedBy        string
	ConfirmedAt        time.Time
	PayloadHash        string
	Payload            json.RawMessage
	SourceSystem       string
	RequestedBy        string
	TenantID           string
	ProjectID          string
	SiteID             string
	Metadata           json.RawMessage
	CreatedAt          time.Time
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

func DraftConfirmationRecordDataFromDocument(input DraftConfirmationRecordDataInput) (DraftConfirmationRecordData, error) {
	document := input.Document
	payload, err := json.Marshal(document)
	if err != nil {
		return DraftConfirmationRecordData{}, err
	}
	metadata := mapValue(document, "metadata")
	metadataBytes := json.RawMessage("null")
	if metadata != nil {
		metadataBytes, err = json.Marshal(metadata)
		if err != nil {
			return DraftConfirmationRecordData{}, err
		}
	}
	confirmedAtText, err := requiredString(stringValue(document, "confirmed_at"), "confirmed_at")
	if err != nil {
		return DraftConfirmationRecordData{}, err
	}
	confirmedAt, err := time.Parse(time.RFC3339, confirmedAtText)
	if err != nil {
		return DraftConfirmationRecordData{}, errors.New("confirmed_at must be RFC3339 date-time")
	}
	confirmationID, err := requiredString(stringValue(document, "confirmation_id"), "confirmation_id")
	if err != nil {
		return DraftConfirmationRecordData{}, err
	}
	draftSchemaVersion, err := requiredString(stringValue(document, "draft_schema_version"), "draft_schema_version")
	if err != nil {
		return DraftConfirmationRecordData{}, err
	}
	draftID, err := requiredString(stringValue(document, "draft_id"), "draft_id")
	if err != nil {
		return DraftConfirmationRecordData{}, err
	}
	decision, err := requiredString(stringValue(document, "decision"), "decision")
	if err != nil {
		return DraftConfirmationRecordData{}, err
	}
	confirmedBy, err := requiredString(stringValue(document, "confirmed_by"), "confirmed_by")
	if err != nil {
		return DraftConfirmationRecordData{}, err
	}
	return DraftConfirmationRecordData{
		ConfirmationID:     confirmationID,
		SchemaVersion:      DraftConfirmationSchema,
		DraftSchemaVersion: draftSchemaVersion,
		DraftID:            draftID,
		Decision:           decision,
		DecisionReason:     stringValue(document, "decision_reason"),
		ConfirmedBy:        confirmedBy,
		ConfirmedAt:        confirmedAt.UTC(),
		PayloadHash:        "sha256:" + sha256Hex(payload),
		Payload:            payload,
		SourceSystem:       defaultString(stringValue(metadata, "source_system"), defaultString(input.DefaultSourceSystem, "compute-api")),
		RequestedBy:        defaultString(stringValue(metadata, "requested_by"), defaultString(input.DefaultRequestedBy, "unknown")),
		TenantID:           stringValue(metadata, "tenant_id"),
		ProjectID:          stringValue(metadata, "project_id"),
		SiteID:             stringValue(metadata, "site_id"),
		Metadata:           metadataBytes,
		CreatedAt:          input.CreatedAt,
	}, nil
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

func requiredString(value, name string) (string, error) {
	if strings.TrimSpace(value) == "" {
		return "", errors.New(name + " is required")
	}
	return strings.TrimSpace(value), nil
}

func defaultString(value, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return strings.TrimSpace(value)
}

func sha256Hex(bytes []byte) string {
	sum := sha256.Sum256(bytes)
	return hex.EncodeToString(sum[:])
}
