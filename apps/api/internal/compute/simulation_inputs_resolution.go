package compute

import (
	"context"
	"encoding/json"

	domainmodels "autowatersimu/apps/api/internal/domain/models"
)

func (svc *SimulationInputService) ResolveSimulationInput(ctx context.Context, inputRef map[string]any, sourceSystem, requestedBy, jobType string) (map[string]any, error) {
	if simulationInput := mapValue(inputRef, "simulation_input"); simulationInput != nil {
		record, err := svc.simulationInputRecord(simulationInput, sourceSystem, requestedBy)
		if err != nil {
			return nil, err
		}
		if _, err := svc.inputs.UpsertSimulationInput(ctx, record); err != nil {
			return nil, err
		}
		return simulationInput, nil
	}
	if processGraphID := stringValue(inputRef, "process_graph_id"); processGraphID != "" {
		version := int(numberValue(inputRef, "process_graph_version"))
		if version <= 0 {
			version = 1
		}
		record, err := svc.processGraphs.FindProcessGraph(ctx, processGraphID, version)
		if err != nil {
			return nil, err
		}
		var processGraph map[string]any
		if err := json.Unmarshal(record.Payload, &processGraph); err != nil {
			return nil, NewAppError(500, CodeInternal, "stored process graph JSON is invalid", true, nil)
		}
		simulationInput, err := svc.processGraphToSimulationInput(
			processGraph,
			mapValue(inputRef, "parameters"),
			stringValue(inputRef, "simulation_input_id"),
			jobType,
		)
		if err != nil {
			return nil, err
		}
		inputRecord, err := svc.simulationInputRecord(simulationInput, sourceSystem, requestedBy)
		if err != nil {
			return nil, err
		}
		if _, err := svc.inputs.UpsertSimulationInput(ctx, inputRecord); err != nil {
			return nil, err
		}
		return simulationInput, nil
	}
	if modelRunID := stringValue(inputRef, "model_run_id"); modelRunID != "" {
		simulationInput, err := svc.simulationInputFromModelRun(ctx, modelRunID)
		if err != nil {
			return nil, err
		}
		record, err := svc.simulationInputRecord(simulationInput, sourceSystem, requestedBy)
		if err != nil {
			return nil, err
		}
		if _, err := svc.inputs.UpsertSimulationInput(ctx, record); err != nil {
			return nil, err
		}
		return simulationInput, nil
	}
	simulationInputID := stringValue(inputRef, "simulation_input_id")
	if simulationInputID == "" {
		return nil, ValidationError("simulation_request.input_ref.simulation_input, process_graph_id, model_run_id, or simulation_input_id is required")
	}
	record, err := svc.inputs.FindSimulationInput(ctx, simulationInputID)
	if err != nil {
		return nil, err
	}
	var simulationInput map[string]any
	if err := json.Unmarshal(record.Payload, &simulationInput); err != nil {
		return nil, NewAppError(500, CodeInternal, "stored simulation input JSON is invalid", true, nil)
	}
	return simulationInput, nil
}

func (svc *SimulationInputService) simulationInputFromModelRun(ctx context.Context, modelRunID string) (map[string]any, error) {
	modelRun, err := svc.modelRuns.FindModelRun(ctx, required(modelRunID, "model_run_id"))
	if err != nil {
		return nil, err
	}
	_, jobID, _, _, _, err := domainmodels.RunFieldsFromRaw(modelRun)
	if err != nil {
		return nil, NewAppError(500, CodeInternal, "stored model_run JSON is invalid", true, nil)
	}
	if jobID == "" {
		return nil, ValidationError("model_run job_id is required for replay")
	}
	job, err := svc.jobs.FindJobByID(ctx, jobID)
	if err != nil {
		appErr := ToAppError(err)
		if appErr.ErrorCode == CodeJobNotFound {
			return nil, NotFound(CodeModelRunNotFound, "model run source job not found")
		}
		return nil, err
	}
	var sourceJob map[string]any
	if err := json.Unmarshal(job.InputJSON, &sourceJob); err != nil {
		return nil, NewAppError(500, CodeInternal, "model run source job JSON is invalid", true, nil)
	}
	payload := mapValue(sourceJob, "payload")
	if payload == nil || stringValue(payload, "schema_version") != "simulation_input.v1" {
		return nil, ValidationError("model_run replay requires a source job with simulation_input.v1 payload")
	}
	if svc.validator != nil {
		if err := svc.validator.Validate("simulation_input.v1.json", payload); err != nil {
			return nil, err
		}
	}
	return payload, nil
}
