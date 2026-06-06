package compute

import (
	"context"
	"encoding/json"

	domainsimulation "autowatersimu/apps/api/internal/domain/simulation"
)

func (svc *SimulationInputService) RegisterSimulationInput(ctx context.Context, bytes []byte, defaultSourceSystem, defaultRequestedBy string) (SimulationInputRecord, int, error) {
	var input map[string]any
	if err := json.Unmarshal(bytes, &input); err != nil {
		return SimulationInputRecord{}, 0, ValidationError("simulation_input JSON is invalid")
	}
	record, err := svc.simulationInputRecord(input, defaultSourceSystem, defaultRequestedBy)
	if err != nil {
		return SimulationInputRecord{}, 0, err
	}
	created, err := svc.inputs.UpsertSimulationInput(ctx, record)
	if err != nil {
		return SimulationInputRecord{}, 0, err
	}
	if created {
		return record, 201, nil
	}
	existing, err := svc.inputs.FindSimulationInput(ctx, record.SimulationInputID)
	if err != nil {
		return SimulationInputRecord{}, 0, err
	}
	return *existing, 200, nil
}

func (svc *SimulationInputService) GetSimulationInput(ctx context.Context, simulationInputID string) (SimulationInputRecord, error) {
	record, err := svc.inputs.FindSimulationInput(ctx, required(simulationInputID, "simulation_input_id"))
	if err != nil {
		return SimulationInputRecord{}, err
	}
	return *record, nil
}

func (svc *SimulationInputService) simulationInputRecord(input map[string]any, defaultSourceSystem, defaultRequestedBy string) (SimulationInputRecord, error) {
	if svc.validator != nil {
		if err := svc.validator.Validate("simulation_input.v1.json", input); err != nil {
			return SimulationInputRecord{}, err
		}
	}
	recordData, err := domainsimulation.SimulationInputRecordDataFromDocument(domainsimulation.SimulationInputRecordDataInput{
		SimulationInput:     input,
		DefaultSourceSystem: defaultSourceSystem,
		DefaultRequestedBy:  defaultRequestedBy,
		CreatedAt:           svc.now(),
	})
	if err != nil {
		return SimulationInputRecord{}, ValidationError(err.Error())
	}
	return SimulationInputRecord{
		SimulationInputID:   recordData.SimulationInputID,
		SchemaVersion:       recordData.SchemaVersion,
		JobType:             recordData.JobType,
		ProcessGraphID:      recordData.ProcessGraphID,
		ProcessGraphVersion: recordData.ProcessGraphVersion,
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
