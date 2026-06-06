package compute

import (
	"context"
	"strings"
	"time"
)

const (
	processGraphRegisteredEvent    = "process_graph.registered"
	simulationInputRegisteredEvent = "simulation_input.registered"
)

func (svc *SimulationInputService) processGraphRegisteredAudit(ctx context.Context, record ProcessGraphRecord) *MutationAuditRecord {
	after := map[string]any{
		"process_graph_id":       record.ProcessGraphID,
		"schema_version":         record.SchemaVersion,
		"version":                record.Version,
		"source_canvas_graph_id": record.SourceCanvasGraphID,
		"payload_hash":           record.PayloadHash,
		"tenant_id":              record.TenantID,
		"project_id":             record.ProjectID,
		"site_id":                record.SiteID,
	}
	return svc.simulationRegistryMutationAudit(
		ctx,
		record.CreatedAt,
		processGraphRegisteredEvent,
		"ProcessGraph",
		record.ProcessGraphID,
		"process_graph.register",
		nil,
		after,
		"process graph registered",
		record.RequestedBy,
		"service:process_graph.register",
		copyStringAnyMap(after),
	)
}

func (svc *SimulationInputService) simulationInputRegisteredAudit(ctx context.Context, record SimulationInputRecord) *MutationAuditRecord {
	after := map[string]any{
		"simulation_input_id":   record.SimulationInputID,
		"schema_version":        record.SchemaVersion,
		"job_type":              record.JobType,
		"process_graph_id":      record.ProcessGraphID,
		"process_graph_version": record.ProcessGraphVersion,
		"payload_hash":          record.PayloadHash,
		"tenant_id":             record.TenantID,
		"project_id":            record.ProjectID,
		"site_id":               record.SiteID,
	}
	return svc.simulationRegistryMutationAudit(
		ctx,
		record.CreatedAt,
		simulationInputRegisteredEvent,
		"SimulationInput",
		record.SimulationInputID,
		"simulation_input.register",
		nil,
		after,
		"simulation input registered",
		record.RequestedBy,
		"service:simulation_input.register",
		copyStringAnyMap(after),
	)
}

func (svc *SimulationInputService) simulationRegistryMutationAudit(ctx context.Context, createdAt time.Time, eventType, targetObject, targetID, action string, before, after any, reason, requestedBy, fallbackWhere string, payload map[string]any) *MutationAuditRecord {
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
	audit := mutationAuditEnvelope(ctx, createdAt, requestedBy, fallbackWhere, targetObject, targetID, action, before, after, reason, "", "")
	return &MutationAuditRecord{
		EventType:    strings.TrimSpace(eventType),
		TargetObject: targetObject,
		TargetID:     targetID,
		EventJSON:    eventJSONWithAudit(payload, audit),
		CreatedAt:    createdAt,
	}
}
