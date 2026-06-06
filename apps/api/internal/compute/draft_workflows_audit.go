package compute

import (
	"context"
	"encoding/json"
	"strings"
	"time"
)

const draftConfirmationRecordedEvent = "draft_confirmation.recorded"

func (svc *DraftWorkflowService) draftConfirmationRecordedAudit(ctx context.Context, record DraftConfirmationRecord) *MutationAuditRecord {
	after := draftConfirmationAuditState(record)
	return svc.draftWorkflowMutationAudit(
		ctx,
		record.CreatedAt,
		draftConfirmationRecordedEvent,
		"DraftConfirmation",
		record.ConfirmationID,
		"draft_confirmation.record",
		nil,
		after,
		defaultString(record.DecisionReason, "draft confirmation recorded"),
		draftConfirmationTraceID(record),
		draftConfirmationApprovalRef(record),
		record.RequestedBy,
		"service:draft_confirmation.record",
		copyStringAnyMap(after),
	)
}

func (svc *DraftWorkflowService) draftWorkflowMutationAudit(ctx context.Context, createdAt time.Time, eventType, targetObject, targetID, action string, before, after any, reason, traceID, approvalRef, requestedBy, fallbackWhere string, payload map[string]any) *MutationAuditRecord {
	if createdAt.IsZero() {
		createdAt = svc.now()
	}
	targetObject = strings.TrimSpace(targetObject)
	targetID = strings.TrimSpace(targetID)
	if payload == nil {
		payload = map[string]any{}
	}
	payload["event_type"] = strings.TrimSpace(eventType)
	payload["target_object"] = targetObject
	payload["target_id"] = targetID
	audit := mutationAuditEnvelope(ctx, createdAt, requestedBy, fallbackWhere, targetObject, targetID, action, before, after, reason, traceID, approvalRef)
	return &MutationAuditRecord{
		EventType:    strings.TrimSpace(eventType),
		TargetObject: targetObject,
		TargetID:     targetID,
		EventJSON:    eventJSONWithAudit(payload, audit),
		CreatedAt:    createdAt,
	}
}

func draftConfirmationAuditState(record DraftConfirmationRecord) map[string]any {
	state := map[string]any{
		"confirmation_id":      record.ConfirmationID,
		"schema_version":       record.SchemaVersion,
		"draft_schema_version": record.DraftSchemaVersion,
		"draft_id":             record.DraftID,
		"decision":             record.Decision,
		"confirmed_by":         record.ConfirmedBy,
		"payload_hash":         record.PayloadHash,
		"tenant_id":            record.TenantID,
		"project_id":           record.ProjectID,
		"site_id":              record.SiteID,
	}
	if strings.TrimSpace(record.DecisionReason) != "" {
		state["decision_reason"] = strings.TrimSpace(record.DecisionReason)
	}
	return state
}

func draftConfirmationTraceID(record DraftConfirmationRecord) string {
	return draftConfirmationMetadataString(record, "trace_id")
}

func draftConfirmationApprovalRef(record DraftConfirmationRecord) string {
	return draftConfirmationMetadataString(record, "approval_ref")
}

func draftConfirmationMetadataString(record DraftConfirmationRecord, key string) string {
	if len(record.Metadata) == 0 {
		return ""
	}
	var metadata map[string]any
	if err := json.Unmarshal(record.Metadata, &metadata); err != nil {
		return ""
	}
	return stringValue(metadata, key)
}
