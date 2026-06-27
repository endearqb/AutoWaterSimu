package compute

import (
	"context"
	"encoding/json"
	"strings"

	domainmodels "autowatersimu/apps/api/internal/domain/models"
)

func (svc *SimulationInputService) ResolveSimulationInput(ctx context.Context, inputRef map[string]any, sourceSystem, requestedBy, jobType string) (map[string]any, error) {
	return svc.ResolveSimulationInputForScope(ctx, inputRef, sourceSystem, requestedBy, jobType, ListFilter{})
}

func (svc *SimulationInputService) ResolveSimulationInputForScope(ctx context.Context, inputRef map[string]any, sourceSystem, requestedBy, jobType string, filter ListFilter) (map[string]any, error) {
	if simulationInput := mapValue(inputRef, "simulation_input"); simulationInput != nil {
		if stringValue(simulationInput, "schema_version") == "network_simulation_input.v1" {
			if svc.validator != nil {
				if err := svc.validator.Validate("network_simulation_input.v1.json", simulationInput); err != nil {
					return nil, err
				}
			}
			metadata := mapValue(simulationInput, "metadata")
			if err := authorizeListFilterDataScope(filter, "network simulation input", stringValue(metadata, "tenant_id"), stringValue(metadata, "project_id"), stringValue(metadata, "site_id")); err != nil {
				return nil, err
			}
			return simulationInput, nil
		}
		record, err := svc.simulationInputRecord(simulationInput, sourceSystem, requestedBy)
		if err != nil {
			return nil, err
		}
		if err := authorizeListFilterDataScope(filter, "simulation input", record.TenantID, record.ProjectID, record.SiteID); err != nil {
			return nil, err
		}
		if _, err := svc.inputs.UpsertSimulationInput(ctx, record, svc.simulationInputRegisteredAudit(ctx, record)); err != nil {
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
		if err := authorizeListFilterDataScope(filter, "process graph", record.TenantID, record.ProjectID, record.SiteID); err != nil {
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
		inheritSimulationInputScopeFromRecord(simulationInput, record.TenantID, record.ProjectID, record.SiteID)
		inputRecord, err := svc.simulationInputRecord(simulationInput, sourceSystem, requestedBy)
		if err != nil {
			return nil, err
		}
		if err := authorizeListFilterDataScope(filter, "simulation input", inputRecord.TenantID, inputRecord.ProjectID, inputRecord.SiteID); err != nil {
			return nil, err
		}
		if _, err := svc.inputs.UpsertSimulationInput(ctx, inputRecord, svc.simulationInputRegisteredAudit(ctx, inputRecord)); err != nil {
			return nil, err
		}
		return simulationInput, nil
	}
	if modelRunID := stringValue(inputRef, "model_run_id"); modelRunID != "" {
		simulationInput, err := svc.simulationInputFromModelRunForScope(ctx, modelRunID, filter)
		if err != nil {
			return nil, err
		}
		record, err := svc.simulationInputRecord(simulationInput, sourceSystem, requestedBy)
		if err != nil {
			return nil, err
		}
		if _, err := svc.inputs.UpsertSimulationInput(ctx, record, svc.simulationInputRegisteredAudit(ctx, record)); err != nil {
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
	if err := authorizeListFilterDataScope(filter, "simulation input", record.TenantID, record.ProjectID, record.SiteID); err != nil {
		return nil, err
	}
	var simulationInput map[string]any
	if err := json.Unmarshal(record.Payload, &simulationInput); err != nil {
		return nil, NewAppError(500, CodeInternal, "stored simulation input JSON is invalid", true, nil)
	}
	return simulationInput, nil
}

func (svc *SimulationInputService) simulationInputFromModelRun(ctx context.Context, modelRunID string) (map[string]any, error) {
	return svc.simulationInputFromModelRunForScope(ctx, modelRunID, ListFilter{})
}

func (svc *SimulationInputService) simulationInputFromModelRunForScope(ctx context.Context, modelRunID string, filter ListFilter) (map[string]any, error) {
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
	if err := authorizeListFilterDataScope(filter, "model run source job", job.TenantID, job.ProjectID, job.SiteID); err != nil {
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

func inheritSimulationInputScopeFromRecord(simulationInput map[string]any, tenantID, projectID, siteID string) {
	inheritSimulationInputScopeFromFilter(simulationInput, ListFilter{TenantID: tenantID, ProjectID: projectID, SiteID: siteID})
}

func inheritSimulationInputScopeFromFilter(simulationInput map[string]any, scope ListFilter) {
	if simulationInput == nil || !listFilterHasDataScope(scope) {
		return
	}
	metadata := mapValue(simulationInput, "metadata")
	if metadata == nil {
		metadata = map[string]any{}
		simulationInput["metadata"] = metadata
	}
	if strings.TrimSpace(scope.TenantID) != "" && stringValue(metadata, "tenant_id") == "" {
		metadata["tenant_id"] = strings.TrimSpace(scope.TenantID)
	}
	if strings.TrimSpace(scope.ProjectID) != "" && stringValue(metadata, "project_id") == "" {
		metadata["project_id"] = strings.TrimSpace(scope.ProjectID)
	}
	if strings.TrimSpace(scope.SiteID) != "" && stringValue(metadata, "site_id") == "" {
		metadata["site_id"] = strings.TrimSpace(scope.SiteID)
	}
}
