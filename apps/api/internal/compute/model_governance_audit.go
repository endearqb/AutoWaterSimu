package compute

import (
	"context"
	"strings"
	"time"
)

const (
	modelCatalogRegisteredEvent            = "model_catalog.registered"
	modelParameterSetStatusChangedEvent    = "model_parameter_set.status_changed"
	modelParameterSetPromotedApprovedEvent = "model_parameter_set.promoted_approved"
	benchmarkRunRegisteredEvent            = "benchmark_run.registered"
)

func (svc *ModelGovernanceService) modelCatalogRegisteredAudit(ctx context.Context, record ModelCatalogRecord) *MutationAuditRecord {
	after := map[string]any{
		"catalog_id":     record.CatalogID,
		"schema_version": record.SchemaVersion,
		"payload_hash":   record.PayloadHash,
		"tenant_id":      record.TenantID,
		"project_id":     record.ProjectID,
		"site_id":        record.SiteID,
	}
	return svc.modelGovernanceMutationAudit(
		ctx,
		record.CreatedAt,
		modelCatalogRegisteredEvent,
		"ModelCatalog",
		record.CatalogID,
		"model.catalog.register",
		nil,
		after,
		"model catalog snapshot registered",
		"",
		record.RequestedBy,
		"service:model_catalog.register",
		map[string]any{
			"catalog_id":     record.CatalogID,
			"schema_version": record.SchemaVersion,
			"payload_hash":   record.PayloadHash,
			"tenant_id":      record.TenantID,
			"project_id":     record.ProjectID,
			"site_id":        record.SiteID,
		},
	)
}

func (svc *ModelGovernanceService) parameterSetTransitionAudit(ctx context.Context, eventType, action, modelKey, modelVersion, parameterSetID, fromStatus, toStatus, beforeCatalogHash, afterCatalogHash, reason, requestedBy string, createdAt time.Time, createdSnapshot bool) *MutationAuditRecord {
	before := map[string]any{
		"model_key":            modelKey,
		"model_version":        modelVersion,
		"parameter_set_id":     parameterSetID,
		"status":               fromStatus,
		"catalog_payload_hash": beforeCatalogHash,
	}
	after := map[string]any{
		"model_key":            modelKey,
		"model_version":        modelVersion,
		"parameter_set_id":     parameterSetID,
		"status":               toStatus,
		"catalog_payload_hash": afterCatalogHash,
		"created_snapshot":     createdSnapshot,
	}
	return svc.modelGovernanceMutationAudit(
		ctx,
		createdAt,
		eventType,
		"ModelParameterSet",
		parameterSetTargetID(modelKey, modelVersion, parameterSetID),
		action,
		before,
		after,
		reason,
		"",
		requestedBy,
		"service:model_parameter_set.transition",
		map[string]any{
			"model_key":        modelKey,
			"model_version":    modelVersion,
			"parameter_set_id": parameterSetID,
			"from_status":      fromStatus,
			"to_status":        toStatus,
			"created_snapshot": createdSnapshot,
		},
	)
}

func (svc *ModelGovernanceService) benchmarkRunRegisteredAudit(ctx context.Context, record BenchmarkRunRecord, evidenceRefCount int) *MutationAuditRecord {
	after := map[string]any{
		"benchmark_run_id":   record.BenchmarkRunID,
		"model_key":          record.ModelKey,
		"model_version":      record.ModelVersion,
		"benchmark_case_id":  record.BenchmarkCaseID,
		"parameter_set_id":   record.ParameterSetID,
		"model_run_id":       record.ModelRunID,
		"job_id":             record.JobID,
		"status":             record.Status,
		"payload_hash":       record.PayloadHash,
		"evidence_ref_count": evidenceRefCount,
	}
	return svc.modelGovernanceMutationAudit(
		ctx,
		record.CreatedAt,
		benchmarkRunRegisteredEvent,
		"BenchmarkRun",
		record.BenchmarkRunID,
		"model.benchmark_run.register",
		nil,
		after,
		"benchmark run recorded",
		"",
		record.RequestedBy,
		"service:benchmark_run.register",
		copyStringAnyMap(after),
	)
}

func (svc *ModelGovernanceService) modelGovernanceMutationAudit(ctx context.Context, createdAt time.Time, eventType, targetObject, targetID, action string, before, after any, reason, traceID, requestedBy, fallbackWhere string, payload map[string]any) *MutationAuditRecord {
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
	audit := mutationAuditEnvelope(ctx, createdAt, requestedBy, fallbackWhere, targetObject, targetID, action, before, after, reason, traceID, "")
	return &MutationAuditRecord{
		EventType:    strings.TrimSpace(eventType),
		TargetObject: targetObject,
		TargetID:     targetID,
		EventJSON:    eventJSONWithAudit(payload, audit),
		CreatedAt:    createdAt,
	}
}

func parameterSetTargetID(modelKey, modelVersion, parameterSetID string) string {
	return strings.TrimSpace(modelKey) + ":" + strings.TrimSpace(modelVersion) + ":" + strings.TrimSpace(parameterSetID)
}
