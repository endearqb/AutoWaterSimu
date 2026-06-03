package compute

import (
	"context"
	"encoding/json"
	"time"

	domainagent "autowatersimu/apps/api/internal/domain/agent"
)

type DraftWorkflowService struct {
	confirmations         DraftConfirmationStore
	validator             *ContractValidator
	now                   func() time.Time
	createSimulationCheck func(context.Context, []byte) (JobSnapshot, int, error)
}

func NewDraftWorkflowService(confirmations DraftConfirmationStore, validator *ContractValidator, now func() time.Time, createSimulationCheck func(context.Context, []byte) (JobSnapshot, int, error)) *DraftWorkflowService {
	if now == nil {
		now = func() time.Time { return time.Now().UTC() }
	}
	return &DraftWorkflowService{
		confirmations:         confirmations,
		validator:             validator,
		now:                   now,
		createSimulationCheck: createSimulationCheck,
	}
}

func (svc *DraftWorkflowService) ConfirmDraftDocument(ctx context.Context, bytes []byte, defaultSourceSystem, defaultRequestedBy string) (ContractValidationResponse, error) {
	response, err := validateContractDocument(bytes, svc.validator)
	if err != nil || !response.Valid {
		return response, err
	}
	var document map[string]any
	if err := json.Unmarshal(bytes, &document); err != nil {
		return response, ValidationError("draft confirmation JSON is invalid")
	}
	envelope, issues := domainagent.ValidateDraftConfirmationEnvelope(document)
	for _, issue := range issues {
		response.Valid = false
		response.Errors = append(response.Errors, ContractValidationIssue{
			Path:    issue.Path,
			Message: issue.Message,
		})
		if issue.Path == "/schema_version" {
			return response, nil
		}
	}
	draftSchemaName, ok := ContractSchemaName(envelope.ActualDraftSchemaVersion)
	if !ok {
		response.Valid = false
		response.Errors = append(response.Errors, ContractValidationIssue{
			Path:    "/draft/schema_version",
			Message: "unsupported draft schema_version: " + envelope.ActualDraftSchemaVersion,
		})
	} else if svc.validator == nil {
		return response, NewAppError(500, CodeInternal, "contract validator is not configured", true, nil)
	} else if err := svc.validator.Validate(draftSchemaName, envelope.Draft); err != nil {
		response.Valid = false
		response.Errors = append(response.Errors, ContractValidationIssue{
			Path:    "/draft",
			Message: err.Error(),
		})
	}
	if response.Valid {
		record, err := svc.draftConfirmationRecord(document, defaultSourceSystem, defaultRequestedBy)
		if err != nil {
			return response, err
		}
		created, err := svc.confirmations.UpsertDraftConfirmation(ctx, record)
		if err != nil {
			return response, err
		}
		if !created {
			existing, err := svc.confirmations.FindDraftConfirmation(ctx, record.ConfirmationID)
			if err != nil {
				return response, err
			}
			record = *existing
			response.Warnings = append(response.Warnings, "draft confirmation already existed; no compute job was created")
		} else {
			response.Warnings = append(response.Warnings, "draft confirmation persisted; no compute job was created")
		}
		response.ConfirmationRecord = &record
	}
	return response, nil
}

func (svc *DraftWorkflowService) GetDraftConfirmation(ctx context.Context, confirmationID string) (DraftConfirmationRecord, error) {
	record, err := svc.confirmations.FindDraftConfirmation(ctx, required(confirmationID, "confirmation_id"))
	if err != nil {
		return DraftConfirmationRecord{}, err
	}
	return *record, nil
}

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

func (svc *DraftWorkflowService) PromoteDraftConfirmationToSimulationCheck(ctx context.Context, confirmationID string) (JobSnapshot, int, error) {
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
	return svc.createSimulationCheck(ctx, requestBytes)
}

func (svc *DraftWorkflowService) draftConfirmationRecord(document map[string]any, defaultSourceSystem, defaultRequestedBy string) (DraftConfirmationRecord, error) {
	payload, err := json.Marshal(document)
	if err != nil {
		return DraftConfirmationRecord{}, err
	}
	metadata := mapValue(document, "metadata")
	metadataBytes := json.RawMessage("null")
	if metadata != nil {
		metadataBytes, err = json.Marshal(metadata)
		if err != nil {
			return DraftConfirmationRecord{}, err
		}
	}
	confirmedAt, err := time.Parse(time.RFC3339, required(stringValue(document, "confirmed_at"), "confirmed_at"))
	if err != nil {
		return DraftConfirmationRecord{}, ValidationError("confirmed_at must be RFC3339 date-time")
	}
	return DraftConfirmationRecord{
		ConfirmationID:     required(stringValue(document, "confirmation_id"), "confirmation_id"),
		SchemaVersion:      "draft_confirmation.v1",
		DraftSchemaVersion: required(stringValue(document, "draft_schema_version"), "draft_schema_version"),
		DraftID:            required(stringValue(document, "draft_id"), "draft_id"),
		Decision:           required(stringValue(document, "decision"), "decision"),
		DecisionReason:     stringValue(document, "decision_reason"),
		ConfirmedBy:        required(stringValue(document, "confirmed_by"), "confirmed_by"),
		ConfirmedAt:        confirmedAt.UTC(),
		PayloadHash:        "sha256:" + SHA256Hex(payload),
		Payload:            payload,
		SourceSystem:       defaultString(stringValue(metadata, "source_system"), defaultString(defaultSourceSystem, "compute-api")),
		RequestedBy:        defaultString(stringValue(metadata, "requested_by"), defaultString(defaultRequestedBy, "unknown")),
		TenantID:           stringValue(metadata, "tenant_id"),
		ProjectID:          stringValue(metadata, "project_id"),
		Metadata:           metadataBytes,
		CreatedAt:          svc.now(),
	}, nil
}
