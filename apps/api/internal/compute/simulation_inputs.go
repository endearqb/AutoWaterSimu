package compute

import (
	"context"
	"encoding/json"
	"strings"
	"time"
)

type SimulationInputService struct {
	inputs        SimulationInputStore
	processGraphs ProcessGraphStore
	modelRuns     ModelRunStore
	jobs          JobStore
	validator     *ContractValidator
	now           func() time.Time
}

func NewSimulationInputService(inputs SimulationInputStore, processGraphs ProcessGraphStore, modelRuns ModelRunStore, jobs JobStore, validator *ContractValidator, now func() time.Time) *SimulationInputService {
	if now == nil {
		now = func() time.Time { return time.Now().UTC() }
	}
	return &SimulationInputService{
		inputs:        inputs,
		processGraphs: processGraphs,
		modelRuns:     modelRuns,
		jobs:          jobs,
		validator:     validator,
		now:           now,
	}
}

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

func (svc *SimulationInputService) RegisterProcessGraph(ctx context.Context, bytes []byte, defaultSourceSystem, defaultRequestedBy string) (ProcessGraphRecord, int, error) {
	var processGraph map[string]any
	if err := json.Unmarshal(bytes, &processGraph); err != nil {
		return ProcessGraphRecord{}, 0, ValidationError("process_graph JSON is invalid")
	}
	record, err := svc.processGraphRecord(processGraph, defaultSourceSystem, defaultRequestedBy)
	if err != nil {
		return ProcessGraphRecord{}, 0, err
	}
	created, err := svc.processGraphs.UpsertProcessGraph(ctx, record)
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
	_, jobID, _, _, _, err := modelRunFieldsFromRaw(modelRun)
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

func (svc *SimulationInputService) processGraphRecord(processGraph map[string]any, defaultSourceSystem, defaultRequestedBy string) (ProcessGraphRecord, error) {
	if svc.validator != nil {
		if err := svc.validator.Validate("process_graph.v1.json", processGraph); err != nil {
			return ProcessGraphRecord{}, err
		}
	}
	if err := validateProcessGraphForSimulationInput(processGraph); err != nil {
		return ProcessGraphRecord{}, err
	}
	version := int(numberValue(processGraph, "version"))
	if version <= 0 {
		return ProcessGraphRecord{}, ValidationError("process_graph.version must be a positive integer")
	}
	payloadHash, err := ResultHash(processGraph)
	if err != nil {
		return ProcessGraphRecord{}, err
	}
	metadata := mapValue(processGraph, "metadata")
	sourceSystem := defaultString(stringValue(metadata, "source_system"), defaultString(defaultSourceSystem, "compute-api"))
	requestedBy := defaultString(stringValue(metadata, "requested_by"), defaultString(defaultRequestedBy, "compute-api"))
	return ProcessGraphRecord{
		ProcessGraphID:      required(stringValue(processGraph, "process_graph_id"), "process_graph_id"),
		SchemaVersion:       required(stringValue(processGraph, "schema_version"), "schema_version"),
		Version:             version,
		SourceCanvasGraphID: required(stringValue(processGraph, "source_canvas_graph_id"), "source_canvas_graph_id"),
		PayloadHash:         payloadHash,
		Payload:             mustJSON(processGraph),
		SourceSystem:        sourceSystem,
		RequestedBy:         requestedBy,
		TenantID:            stringValue(metadata, "tenant_id"),
		ProjectID:           stringValue(metadata, "project_id"),
		Metadata:            mustJSON(metadata),
		CreatedAt:           svc.now(),
	}, nil
}

func (svc *SimulationInputService) simulationInputRecord(input map[string]any, defaultSourceSystem, defaultRequestedBy string) (SimulationInputRecord, error) {
	if svc.validator != nil {
		if err := svc.validator.Validate("simulation_input.v1.json", input); err != nil {
			return SimulationInputRecord{}, err
		}
	}
	payloadHash, err := ResultHash(input)
	if err != nil {
		return SimulationInputRecord{}, err
	}
	metadata := mapValue(input, "metadata")
	sourceSystem := defaultString(stringValue(metadata, "source_system"), defaultString(defaultSourceSystem, "compute-api"))
	requestedBy := defaultString(stringValue(metadata, "requested_by"), defaultString(defaultRequestedBy, "compute-api"))
	return SimulationInputRecord{
		SimulationInputID:   required(stringValue(input, "simulation_input_id"), "simulation_input_id"),
		SchemaVersion:       required(stringValue(input, "schema_version"), "schema_version"),
		JobType:             required(stringValue(input, "job_type"), "job_type"),
		ProcessGraphID:      required(stringValue(input, "process_graph_id"), "process_graph_id"),
		ProcessGraphVersion: int(numberValue(input, "process_graph_version")),
		PayloadHash:         payloadHash,
		Payload:             mustJSON(input),
		SourceSystem:        sourceSystem,
		RequestedBy:         requestedBy,
		TenantID:            stringValue(metadata, "tenant_id"),
		ProjectID:           stringValue(metadata, "project_id"),
		Metadata:            mustJSON(metadata),
		CreatedAt:           svc.now(),
	}, nil
}

func (svc *SimulationInputService) processGraphToSimulationInput(processGraph map[string]any, parameters map[string]any, simulationInputID, jobType string) (map[string]any, error) {
	if jobType != "simulation.material_balance.v1" {
		return nil, ValidationError("process_graph lookup only supports simulation.material_balance.v1")
	}
	if svc.validator != nil {
		if err := svc.validator.Validate("process_graph.v1.json", processGraph); err != nil {
			return nil, err
		}
	}
	if err := validateProcessGraphForSimulationInput(processGraph); err != nil {
		return nil, err
	}
	resolvedParameters := map[string]any{
		"hours":          4.0,
		"steps_per_hour": 60,
		"solver_method":  "scipy_solver",
		"tolerance":      0.000001,
		"max_iterations": 1000,
		"max_memory_mb":  1000,
	}
	metadata := mapValue(processGraph, "metadata")
	for key, value := range mapValue(metadata, "source_calculation_parameters") {
		resolvedParameters[key] = value
	}
	for key, value := range parameters {
		resolvedParameters[key] = value
	}
	processGraphID := required(stringValue(processGraph, "process_graph_id"), "process_graph_id")
	processGraphVersion := int(numberValue(processGraph, "version"))
	if processGraphVersion <= 0 {
		return nil, ValidationError("process_graph.version must be a positive integer")
	}
	if strings.TrimSpace(simulationInputID) == "" {
		simulationInputID = "si_" + processGraphID
	}
	return map[string]any{
		"schema_version":        "simulation_input.v1",
		"simulation_input_id":   simulationInputID,
		"process_graph_id":      processGraphID,
		"process_graph_version": processGraphVersion,
		"job_type":              jobType,
		"component_schema":      mapValue(processGraph, "component_schema"),
		"nodes":                 processGraphSimulationNodes(processGraph),
		"edges":                 processGraphSimulationEdges(processGraph),
		"time_segments":         collectProcessGraphTimeSegments(processGraph),
		"parameters":            resolvedParameters,
		"runtime_options":       map[string]any{"numerical_tolerance": map[string]any{"rtol": 0.000001, "atol": 0.000000001}},
		"metadata":              map[string]any{"source_canvas_graph_id": stringValue(processGraph, "source_canvas_graph_id"), "transform": "process_graph_to_simulation_input.v1"},
	}, nil
}
