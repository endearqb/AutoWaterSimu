package compute

import (
	domainmodels "autowatersimu/apps/api/internal/domain/models"
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
	after := domainmodels.ModelCatalogAuditState(domainmodels.ModelCatalogAuditStateInput{
		CatalogID:     record.CatalogID,
		SchemaVersion: record.SchemaVersion,
		PayloadHash:   record.PayloadHash,
		TenantID:      record.TenantID,
		ProjectID:     record.ProjectID,
		SiteID:        record.SiteID,
	})
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
		copyStringAnyMap(after),
	)
}

func (svc *ModelGovernanceService) parameterSetTransitionAudit(ctx context.Context, eventType, action, modelKey, modelVersion, parameterSetID, fromStatus, toStatus, beforeCatalogHash, afterCatalogHash, reason, requestedBy string, createdAt time.Time, createdSnapshot bool) *MutationAuditRecord {
	projection := domainmodels.ParameterSetTransitionAuditState(domainmodels.ParameterSetTransitionAuditStateInput{
		ModelKey:          modelKey,
		ModelVersion:      modelVersion,
		ParameterSetID:    parameterSetID,
		FromStatus:        fromStatus,
		ToStatus:          toStatus,
		BeforeCatalogHash: beforeCatalogHash,
		AfterCatalogHash:  afterCatalogHash,
		CreatedSnapshot:   createdSnapshot,
	})
	return svc.modelGovernanceMutationAudit(
		ctx,
		createdAt,
		eventType,
		"ModelParameterSet",
		projection.TargetID,
		action,
		projection.Before,
		projection.After,
		reason,
		"",
		requestedBy,
		"service:model_parameter_set.transition",
		projection.Payload,
	)
}

func (svc *ModelGovernanceService) benchmarkRunRegisteredAudit(ctx context.Context, record BenchmarkRunRecord, evidenceRefCount int) *MutationAuditRecord {
	after := domainmodels.BenchmarkRunAuditState(domainmodels.BenchmarkRunAuditStateInput{
		BenchmarkRunID:   record.BenchmarkRunID,
		ModelKey:         record.ModelKey,
		ModelVersion:     record.ModelVersion,
		BenchmarkCaseID:  record.BenchmarkCaseID,
		ParameterSetID:   record.ParameterSetID,
		ModelRunID:       record.ModelRunID,
		JobID:            record.JobID,
		Status:           record.Status,
		PayloadHash:      record.PayloadHash,
		EvidenceRefCount: evidenceRefCount,
	})
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
