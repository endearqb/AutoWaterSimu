package compute

import (
	"context"
	"encoding/json"

	domainagent "autowatersimu/apps/api/internal/domain/agent"
)

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

func (svc *DraftWorkflowService) draftConfirmationRecord(document map[string]any, defaultSourceSystem, defaultRequestedBy string) (DraftConfirmationRecord, error) {
	recordData, err := domainagent.DraftConfirmationRecordDataFromDocument(domainagent.DraftConfirmationRecordDataInput{
		Document:            document,
		DefaultSourceSystem: defaultSourceSystem,
		DefaultRequestedBy:  defaultRequestedBy,
		CreatedAt:           svc.now(),
	})
	if err != nil {
		return DraftConfirmationRecord{}, ValidationError(err.Error())
	}
	return DraftConfirmationRecord{
		ConfirmationID:     recordData.ConfirmationID,
		SchemaVersion:      recordData.SchemaVersion,
		DraftSchemaVersion: recordData.DraftSchemaVersion,
		DraftID:            recordData.DraftID,
		Decision:           recordData.Decision,
		DecisionReason:     recordData.DecisionReason,
		ConfirmedBy:        recordData.ConfirmedBy,
		ConfirmedAt:        recordData.ConfirmedAt,
		PayloadHash:        recordData.PayloadHash,
		Payload:            recordData.Payload,
		SourceSystem:       recordData.SourceSystem,
		RequestedBy:        recordData.RequestedBy,
		TenantID:           recordData.TenantID,
		ProjectID:          recordData.ProjectID,
		Metadata:           recordData.Metadata,
		CreatedAt:          recordData.CreatedAt,
	}, nil
}
