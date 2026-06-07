package compute

import (
	"context"
	"encoding/json"

	domainsimulation "autowatersimu/apps/api/internal/domain/simulation"
)

func (svc *SimulationInputService) RegisterProcessGraph(ctx context.Context, bytes []byte, defaultSourceSystem, defaultRequestedBy string) (ProcessGraphRecord, int, error) {
	return svc.RegisterProcessGraphForScope(ctx, bytes, defaultSourceSystem, defaultRequestedBy, ListFilter{})
}

func (svc *SimulationInputService) RegisterProcessGraphForScope(ctx context.Context, bytes []byte, defaultSourceSystem, defaultRequestedBy string, filter ListFilter) (ProcessGraphRecord, int, error) {
	var processGraph map[string]any
	if err := json.Unmarshal(bytes, &processGraph); err != nil {
		return ProcessGraphRecord{}, 0, ValidationError("process_graph JSON is invalid")
	}
	record, err := svc.processGraphRecord(processGraph, defaultSourceSystem, defaultRequestedBy)
	if err != nil {
		return ProcessGraphRecord{}, 0, err
	}
	if err := authorizeListFilterDataScope(filter, "process graph", record.TenantID, record.ProjectID, record.SiteID); err != nil {
		return ProcessGraphRecord{}, 0, err
	}
	created, err := svc.processGraphs.UpsertProcessGraph(ctx, record, svc.processGraphRegisteredAudit(ctx, record))
	if err != nil {
		return ProcessGraphRecord{}, 0, err
	}
	if created {
		return record, 201, nil
	}
	existing, err := svc.processGraphs.FindProcessGraph(ctx, record.ProcessGraphID, record.Version)
	if err != nil {
		return ProcessGraphRecord{}, 0, err
	}
	return *existing, 200, nil
}

func (svc *SimulationInputService) GetProcessGraph(ctx context.Context, processGraphID string, version int) (ProcessGraphRecord, error) {
	if version <= 0 {
		version = 1
	}
	record, err := svc.processGraphs.FindProcessGraph(ctx, required(processGraphID, "process_graph_id"), version)
	if err != nil {
		return ProcessGraphRecord{}, err
	}
	return *record, nil
}

func (svc *SimulationInputService) processGraphRecord(processGraph map[string]any, defaultSourceSystem, defaultRequestedBy string) (ProcessGraphRecord, error) {
	if svc.validator != nil {
		if err := svc.validator.Validate("process_graph.v1.json", processGraph); err != nil {
			return ProcessGraphRecord{}, err
		}
	}
	if err := domainsimulation.ValidateProcessGraphForSimulationInput(processGraph); err != nil {
		return ProcessGraphRecord{}, ValidationError(err.Error())
	}
	recordData, err := domainsimulation.ProcessGraphRecordDataFromDocument(domainsimulation.ProcessGraphRecordDataInput{
		ProcessGraph:        processGraph,
		DefaultSourceSystem: defaultSourceSystem,
		DefaultRequestedBy:  defaultRequestedBy,
		CreatedAt:           svc.now(),
	})
	if err != nil {
		return ProcessGraphRecord{}, ValidationError(err.Error())
	}
	return ProcessGraphRecord{
		ProcessGraphID:      recordData.ProcessGraphID,
		SchemaVersion:       recordData.SchemaVersion,
		Version:             recordData.Version,
		SourceCanvasGraphID: recordData.SourceCanvasGraphID,
		PayloadHash:         recordData.PayloadHash,
		Payload:             recordData.Payload,
		SourceSystem:        recordData.SourceSystem,
		RequestedBy:         recordData.RequestedBy,
		TenantID:            recordData.TenantID,
		ProjectID:           recordData.ProjectID,
		SiteID:              recordData.SiteID,
		Metadata:            recordData.Metadata,
		CreatedAt:           recordData.CreatedAt,
	}, nil
}

func (svc *SimulationInputService) processGraphToSimulationInput(processGraph map[string]any, parameters map[string]any, simulationInputID, jobType string) (map[string]any, error) {
	if svc.validator != nil {
		if err := svc.validator.Validate("process_graph.v1.json", processGraph); err != nil {
			return nil, err
		}
	}
	simulationInput, err := domainsimulation.ProcessGraphToSimulationInput(processGraph, parameters, simulationInputID, jobType)
	if err != nil {
		return nil, ValidationError(err.Error())
	}
	return simulationInput, nil
}
