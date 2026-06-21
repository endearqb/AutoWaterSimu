package compute

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
)

type ScenarioWorkspaceService struct {
	scenarios        ScenarioStore
	canvasGraphs     CanvasGraphStore
	contexts         ContextSnapshotStore
	simulation       *SimulationInputService
	validator        *ContractValidator
	now              func() time.Time
	createSimulation func(ctx context.Context, bytes []byte, filter ListFilter) (JobSnapshot, int, error)
}

func NewScenarioWorkspaceService(
	scenarios ScenarioStore,
	canvasGraphs CanvasGraphStore,
	contexts ContextSnapshotStore,
	simulation *SimulationInputService,
	validator *ContractValidator,
	now func() time.Time,
	createSimulation func(ctx context.Context, bytes []byte, filter ListFilter) (JobSnapshot, int, error),
) *ScenarioWorkspaceService {
	return &ScenarioWorkspaceService{
		scenarios:        scenarios,
		canvasGraphs:     canvasGraphs,
		contexts:         contexts,
		simulation:       simulation,
		validator:        validator,
		now:              now,
		createSimulation: createSimulation,
	}
}

func (svc *ScenarioWorkspaceService) CreateScenario(ctx context.Context, request ScenarioUpsertRequest, requestedBy string, filter ListFilter) (ScenarioRecord, error) {
	now := svc.now()
	metadata := metadataWithScope(request.Metadata, filter)
	scenarioID := defaultString(request.ScenarioID, "scenario_"+safeIDPart(defaultString(request.Name, fmt.Sprintf("%d", now.UnixNano()))))
	record := ScenarioRecord{
		ScenarioID:                   scenarioID,
		Name:                         defaultString(request.Name, "Untitled Scenario"),
		Description:                  request.Description,
		ModelFamily:                  defaultString(request.ModelFamily, "material_balance"),
		Status:                       defaultString(request.Status, "draft"),
		Version:                      1,
		CurrentCanvasGraphID:         strings.TrimSpace(request.CurrentCanvasGraphID),
		CurrentCanvasGraphVersion:    request.CurrentCanvasGraphVersion,
		PublishedProcessGraphID:      strings.TrimSpace(request.PublishedProcessGraphID),
		PublishedProcessGraphVersion: request.PublishedProcessGraphVersion,
		CurrentSimulationInputID:     strings.TrimSpace(request.CurrentSimulationInputID),
		ContextSnapshotID:            strings.TrimSpace(request.ContextSnapshotID),
		LastJobID:                    strings.TrimSpace(request.LastJobID),
		SourceSystem:                 defaultString(request.SourceSystem, "autowatersimu-standalone"),
		RequestedBy:                  defaultString(requestedBy, "standalone:developer"),
		TenantID:                     stringValue(metadata, "tenant_id"),
		ProjectID:                    stringValue(metadata, "project_id"),
		SiteID:                       stringValue(metadata, "site_id"),
		Metadata:                     mustJSON(metadata),
		CreatedAt:                    now,
		UpdatedAt:                    now,
	}
	if err := authorizeListFilterDataScope(filter, "scenario", record.TenantID, record.ProjectID, record.SiteID); err != nil {
		return ScenarioRecord{}, err
	}
	if err := svc.scenarios.InsertScenario(ctx, record); err != nil {
		return ScenarioRecord{}, err
	}
	return record, nil
}

func (svc *ScenarioWorkspaceService) UpdateScenario(ctx context.Context, scenarioID string, request ScenarioUpsertRequest, filter ListFilter) (ScenarioRecord, error) {
	record, err := svc.scenarios.FindScenario(ctx, required(scenarioID, "scenario_id"))
	if err != nil {
		return ScenarioRecord{}, err
	}
	if err := authorizeListFilterDataScope(filter, "scenario", record.TenantID, record.ProjectID, record.SiteID); err != nil {
		return ScenarioRecord{}, err
	}
	if strings.TrimSpace(request.Name) != "" {
		record.Name = strings.TrimSpace(request.Name)
	}
	if request.Description != "" {
		record.Description = request.Description
	}
	if strings.TrimSpace(request.ModelFamily) != "" {
		record.ModelFamily = strings.TrimSpace(request.ModelFamily)
	}
	if strings.TrimSpace(request.Status) != "" {
		record.Status = strings.TrimSpace(request.Status)
	}
	if strings.TrimSpace(request.CurrentCanvasGraphID) != "" {
		record.CurrentCanvasGraphID = strings.TrimSpace(request.CurrentCanvasGraphID)
		record.CurrentCanvasGraphVersion = request.CurrentCanvasGraphVersion
	}
	if strings.TrimSpace(request.PublishedProcessGraphID) != "" {
		record.PublishedProcessGraphID = strings.TrimSpace(request.PublishedProcessGraphID)
		record.PublishedProcessGraphVersion = request.PublishedProcessGraphVersion
	}
	if strings.TrimSpace(request.CurrentSimulationInputID) != "" {
		record.CurrentSimulationInputID = strings.TrimSpace(request.CurrentSimulationInputID)
	}
	if strings.TrimSpace(request.ContextSnapshotID) != "" {
		record.ContextSnapshotID = strings.TrimSpace(request.ContextSnapshotID)
	}
	if strings.TrimSpace(request.LastJobID) != "" {
		record.LastJobID = strings.TrimSpace(request.LastJobID)
	}
	if request.Metadata != nil {
		metadata := metadataWithScope(request.Metadata, filter)
		if err := authorizeListFilterDataScope(filter, "scenario", stringValue(metadata, "tenant_id"), stringValue(metadata, "project_id"), stringValue(metadata, "site_id")); err != nil {
			return ScenarioRecord{}, err
		}
		record.Metadata = mustJSON(metadata)
		record.TenantID = stringValue(metadata, "tenant_id")
		record.ProjectID = stringValue(metadata, "project_id")
		record.SiteID = stringValue(metadata, "site_id")
	}
	record.Version++
	record.UpdatedAt = svc.now()
	if err := svc.scenarios.UpdateScenario(ctx, *record); err != nil {
		return ScenarioRecord{}, err
	}
	return *record, nil
}

func (svc *ScenarioWorkspaceService) GetScenario(ctx context.Context, scenarioID string, filter ListFilter) (ScenarioRecord, error) {
	record, err := svc.scenarios.FindScenario(ctx, required(scenarioID, "scenario_id"))
	if err != nil {
		return ScenarioRecord{}, err
	}
	if err := authorizeListFilterDataScope(filter, "scenario", record.TenantID, record.ProjectID, record.SiteID); err != nil {
		return ScenarioRecord{}, err
	}
	return *record, nil
}

func (svc *ScenarioWorkspaceService) ListScenarios(ctx context.Context, filter ScenarioFilter) (ListScenariosResponse, error) {
	items, next, total, err := svc.scenarios.ListScenarios(ctx, filter)
	if err != nil {
		return ListScenariosResponse{}, err
	}
	return ListScenariosResponse{Items: items, NextCursor: next, TotalEstimate: total}, nil
}

func (svc *ScenarioWorkspaceService) CloneScenario(ctx context.Context, sourceScenarioID string, request ScenarioCloneRequest, requestedBy string, filter ListFilter) (ScenarioRecord, error) {
	source, err := svc.GetScenario(ctx, sourceScenarioID, filter)
	if err != nil {
		return ScenarioRecord{}, err
	}
	metadata := metadataWithScope(request.Metadata, filter)
	metadata["source_scenario_id"] = source.ScenarioID
	now := svc.now()
	cloneID := defaultString(request.ScenarioID, source.ScenarioID+"_copy_"+fmt.Sprint(now.Unix()))
	clone := ScenarioRecord{
		ScenarioID:       cloneID,
		Name:             defaultString(request.Name, source.Name+" Copy"),
		Description:      defaultString(request.Description, source.Description),
		ModelFamily:      source.ModelFamily,
		Status:           "draft",
		Version:          1,
		SourceScenarioID: source.ScenarioID,
		SourceSystem:     source.SourceSystem,
		RequestedBy:      defaultString(requestedBy, source.RequestedBy),
		TenantID:         stringValue(metadata, "tenant_id"),
		ProjectID:        stringValue(metadata, "project_id"),
		SiteID:           stringValue(metadata, "site_id"),
		Metadata:         mustJSON(metadata),
		CreatedAt:        now,
		UpdatedAt:        now,
	}
	if source.CurrentCanvasGraphID != "" {
		graph, err := svc.canvasGraphs.LatestCanvasGraph(ctx, source.CurrentCanvasGraphID)
		if err == nil {
			var canvas map[string]any
			if json.Unmarshal(graph.Payload, &canvas) == nil {
				canvas["graph_id"] = "graph_" + cloneID
				canvas["name"] = clone.Name
				record, err := svc.canvasGraphRecord(ctx, CanvasGraphSaveRequest{
					ScenarioID:  cloneID,
					GraphID:     "graph_" + cloneID,
					Name:        clone.Name,
					CanvasGraph: canvas,
					Metadata:    metadata,
				}, requestedBy, filter)
				if err != nil {
					return ScenarioRecord{}, err
				}
				if err := svc.canvasGraphs.InsertCanvasGraph(ctx, record); err != nil {
					return ScenarioRecord{}, err
				}
				clone.CurrentCanvasGraphID = record.GraphID
				clone.CurrentCanvasGraphVersion = record.Version
			}
		}
	}
	if err := svc.scenarios.InsertScenario(ctx, clone); err != nil {
		return ScenarioRecord{}, err
	}
	return clone, nil
}

func (svc *ScenarioWorkspaceService) ArchiveScenario(ctx context.Context, scenarioID string, filter ListFilter) (ScenarioRecord, error) {
	record, err := svc.GetScenario(ctx, scenarioID, filter)
	if err != nil {
		return ScenarioRecord{}, err
	}
	now := svc.now()
	record.Status = "archived"
	record.Version++
	record.UpdatedAt = now
	record.ArchivedAt = &now
	if err := svc.scenarios.UpdateScenario(ctx, record); err != nil {
		return ScenarioRecord{}, err
	}
	return record, nil
}

func (svc *ScenarioWorkspaceService) SaveCanvasGraph(ctx context.Context, request CanvasGraphSaveRequest, requestedBy string, filter ListFilter) (CanvasGraphRecord, error) {
	record, err := svc.canvasGraphRecord(ctx, request, requestedBy, filter)
	if err != nil {
		return CanvasGraphRecord{}, err
	}
	if err := svc.canvasGraphs.InsertCanvasGraph(ctx, record); err != nil {
		return CanvasGraphRecord{}, err
	}
	if record.ScenarioID != "" {
		if scenario, err := svc.scenarios.FindScenario(ctx, record.ScenarioID); err == nil {
			if err := authorizeListFilterDataScope(filter, "scenario", scenario.TenantID, scenario.ProjectID, scenario.SiteID); err != nil {
				return CanvasGraphRecord{}, err
			}
			scenario.CurrentCanvasGraphID = record.GraphID
			scenario.CurrentCanvasGraphVersion = record.Version
			scenario.UpdatedAt = svc.now()
			scenario.Version++
			_ = svc.scenarios.UpdateScenario(ctx, *scenario)
		}
	}
	return record, nil
}

func (svc *ScenarioWorkspaceService) canvasGraphRecord(ctx context.Context, request CanvasGraphSaveRequest, requestedBy string, filter ListFilter) (CanvasGraphRecord, error) {
	if request.CanvasGraph == nil {
		return CanvasGraphRecord{}, ValidationError("canvas_graph is required")
	}
	canvas := copyStringAnyMap(request.CanvasGraph)
	if stringValue(canvas, "schema_version") == "" {
		canvas["schema_version"] = "canvas_graph.v1"
	}
	graphID := defaultString(request.GraphID, stringValue(canvas, "graph_id"))
	if graphID == "" {
		graphID = "graph_" + fmt.Sprint(svc.now().UnixNano())
	}
	canvas["graph_id"] = graphID
	canvas["name"] = defaultString(request.Name, defaultString(stringValue(canvas, "name"), "Untitled Graph"))
	if stringValue(canvas, "exported_at") == "" {
		canvas["exported_at"] = svc.now().Format(time.RFC3339Nano)
	}
	if svc.validator != nil {
		if err := svc.validator.Validate("canvas_graph.v1.json", canvas); err != nil {
			return CanvasGraphRecord{}, err
		}
	}
	metadata := metadataWithScope(request.Metadata, filter)
	if request.ScenarioID != "" {
		metadata["scenario_id"] = strings.TrimSpace(request.ScenarioID)
	}
	metadata["source_system"] = defaultString(request.SourceSystem, "autowatersimu-web")
	metadata["requested_by"] = defaultString(requestedBy, "standalone:developer")
	if err := authorizeListFilterDataScope(filter, "canvas graph", stringValue(metadata, "tenant_id"), stringValue(metadata, "project_id"), stringValue(metadata, "site_id")); err != nil {
		return CanvasGraphRecord{}, err
	}
	payload, err := json.Marshal(canvas)
	if err != nil {
		return CanvasGraphRecord{}, err
	}
	latest, err := svc.canvasGraphs.LatestCanvasGraph(ctx, graphID)
	version := 1
	if err == nil {
		version = latest.Version + 1
	} else if appErr := ToAppError(err); appErr.ErrorCode != CodeCanvasGraphNotFound {
		return CanvasGraphRecord{}, err
	}
	now := svc.now()
	return CanvasGraphRecord{
		GraphID:       graphID,
		ScenarioID:    strings.TrimSpace(request.ScenarioID),
		SchemaVersion: "canvas_graph.v1",
		Name:          stringValue(canvas, "name"),
		Version:       version,
		PayloadHash:   "sha256:" + SHA256Hex(payload),
		Payload:       payload,
		SourceSystem:  defaultString(request.SourceSystem, "autowatersimu-web"),
		RequestedBy:   defaultString(requestedBy, "standalone:developer"),
		TenantID:      stringValue(metadata, "tenant_id"),
		ProjectID:     stringValue(metadata, "project_id"),
		SiteID:        stringValue(metadata, "site_id"),
		Metadata:      mustJSON(metadata),
		CreatedAt:     now,
	}, nil
}

func (svc *ScenarioWorkspaceService) GetCanvasGraph(ctx context.Context, graphID string, version int, filter ListFilter) (CanvasGraphRecord, error) {
	var record *CanvasGraphRecord
	var err error
	if version > 0 {
		record, err = svc.canvasGraphs.FindCanvasGraph(ctx, required(graphID, "graph_id"), version)
	} else {
		record, err = svc.canvasGraphs.LatestCanvasGraph(ctx, required(graphID, "graph_id"))
	}
	if err != nil {
		return CanvasGraphRecord{}, err
	}
	if err := authorizeListFilterDataScope(filter, "canvas graph", record.TenantID, record.ProjectID, record.SiteID); err != nil {
		return CanvasGraphRecord{}, err
	}
	return *record, nil
}

func (svc *ScenarioWorkspaceService) ListCanvasGraphs(ctx context.Context, filter CanvasGraphFilter) (ListCanvasGraphsResponse, error) {
	items, next, total, err := svc.canvasGraphs.ListCanvasGraphs(ctx, filter)
	if err != nil {
		return ListCanvasGraphsResponse{}, err
	}
	return ListCanvasGraphsResponse{Items: items, NextCursor: next, TotalEstimate: total}, nil
}

func (svc *ScenarioWorkspaceService) ArchiveCanvasGraph(ctx context.Context, graphID string, filter ListFilter) error {
	record, err := svc.GetCanvasGraph(ctx, graphID, 0, filter)
	if err != nil {
		return err
	}
	if err := authorizeListFilterDataScope(filter, "canvas graph", record.TenantID, record.ProjectID, record.SiteID); err != nil {
		return err
	}
	return svc.canvasGraphs.ArchiveCanvasGraph(ctx, graphID, svc.now())
}

func (svc *ScenarioWorkspaceService) PublishCanvasGraph(ctx context.Context, graphID string, version int, request CanvasGraphPublishRequest, requestedBy string, filter ListFilter) (CanvasGraphPublishResponse, error) {
	canvasRecord, err := svc.GetCanvasGraph(ctx, graphID, version, filter)
	if err != nil {
		return CanvasGraphPublishResponse{}, err
	}
	processGraph := request.ProcessGraph
	derivedProcessGraph := processGraph == nil
	if processGraph == nil {
		var canvas map[string]any
		if err := json.Unmarshal(canvasRecord.Payload, &canvas); err != nil {
			return CanvasGraphPublishResponse{}, NewAppError(http.StatusInternalServerError, CodeInternal, "stored canvas graph JSON is invalid", true, nil)
		}
		processGraph, err = materialBalanceProcessGraphFromCanvas(canvas)
		if err != nil {
			return CanvasGraphPublishResponse{}, err
		}
	}
	metadata := mapValue(processGraph, "metadata")
	if metadata == nil {
		metadata = map[string]any{}
		processGraph["metadata"] = metadata
	}
	if stringValue(processGraph, "source_canvas_graph_id") == "" {
		processGraph["source_canvas_graph_id"] = canvasRecord.GraphID
	}
	if derivedProcessGraph || int(numberFromAny(processGraph["version"], 0)) <= 0 {
		processGraph["version"] = canvasRecord.Version
	}
	metadata["source_canvas_graph_id"] = canvasRecord.GraphID
	if canvasRecord.ScenarioID != "" {
		metadata["scenario_id"] = canvasRecord.ScenarioID
	}
	for _, key := range []string{"tenant_id", "project_id", "site_id"} {
		if stringValue(metadata, key) == "" {
			switch key {
			case "tenant_id":
				metadata[key] = canvasRecord.TenantID
			case "project_id":
				metadata[key] = canvasRecord.ProjectID
			case "site_id":
				metadata[key] = canvasRecord.SiteID
			}
		}
	}
	processBytes, err := json.Marshal(processGraph)
	if err != nil {
		return CanvasGraphPublishResponse{}, err
	}
	processRecord, status, err := svc.simulation.RegisterProcessGraphForScope(ctx, processBytes, "canvas-graph-publish", requestedBy, filter)
	if err != nil {
		return CanvasGraphPublishResponse{}, err
	}
	_ = status
	var inputRecord *SimulationInputRecord
	if request.RegisterSimulationInput {
		simulationInputID := defaultString(request.SimulationInputID, fmt.Sprintf("si_%s_v%d", processRecord.ProcessGraphID, processRecord.Version))
		simulationInput, err := svc.simulation.processGraphToSimulationInput(processGraph, request.Parameters, simulationInputID, "simulation.material_balance.v1")
		if err != nil {
			return CanvasGraphPublishResponse{}, err
		}
		inheritSimulationInputScopeFromRecord(simulationInput, processRecord.TenantID, processRecord.ProjectID, processRecord.SiteID)
		inputBytes, err := json.Marshal(simulationInput)
		if err != nil {
			return CanvasGraphPublishResponse{}, err
		}
		record, _, err := svc.simulation.RegisterSimulationInputForScope(ctx, inputBytes, "canvas-graph-publish", requestedBy, filter)
		if err != nil {
			return CanvasGraphPublishResponse{}, err
		}
		inputRecord = &record
	}
	if canvasRecord.ScenarioID != "" {
		if scenario, err := svc.scenarios.FindScenario(ctx, canvasRecord.ScenarioID); err == nil {
			scenario.PublishedProcessGraphID = processRecord.ProcessGraphID
			scenario.PublishedProcessGraphVersion = processRecord.Version
			if inputRecord != nil {
				scenario.CurrentSimulationInputID = inputRecord.SimulationInputID
			}
			scenario.UpdatedAt = svc.now()
			scenario.Version++
			_ = svc.scenarios.UpdateScenario(ctx, *scenario)
		}
	}
	return CanvasGraphPublishResponse{
		CanvasGraph:     canvasRecord,
		ProcessGraph:    processRecord,
		SimulationInput: inputRecord,
		Validation:      map[string]any{"status": "valid"},
	}, nil
}

func (svc *ScenarioWorkspaceService) CreateContextSnapshot(ctx context.Context, request ContextSnapshotCreateRequest, requestedBy string, filter ListFilter) (ContextSnapshotRecord, error) {
	now := svc.now()
	metadata := metadataWithScope(request.Metadata, filter)
	if request.ScenarioID != "" {
		metadata["scenario_id"] = strings.TrimSpace(request.ScenarioID)
	}
	contextSnapshotID := defaultString(request.ContextSnapshotID, "ctx_"+fmt.Sprint(now.UnixNano()))
	sourceSystem := defaultString(request.SourceSystem, "standalone-fixture")
	payload := map[string]any{
		"schema_version":      "context_snapshot.v1",
		"context_snapshot_id": contextSnapshotID,
		"scenario_id":         strings.TrimSpace(request.ScenarioID),
		"source_system":       sourceSystem,
		"captured_at":         now.Format(time.RFC3339Nano),
		"context":             request.Context,
		"metadata":            metadata,
	}
	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return ContextSnapshotRecord{}, err
	}
	record := ContextSnapshotRecord{
		ContextSnapshotID: contextSnapshotID,
		ScenarioID:        strings.TrimSpace(request.ScenarioID),
		SchemaVersion:     "context_snapshot.v1",
		SourceSystem:      sourceSystem,
		CapturedAt:        now,
		PayloadHash:       "sha256:" + SHA256Hex(payloadBytes),
		Payload:           payloadBytes,
		TenantID:          stringValue(metadata, "tenant_id"),
		ProjectID:         stringValue(metadata, "project_id"),
		SiteID:            stringValue(metadata, "site_id"),
		Metadata:          mustJSON(metadata),
		CreatedAt:         now,
	}
	if err := authorizeListFilterDataScope(filter, "context snapshot", record.TenantID, record.ProjectID, record.SiteID); err != nil {
		return ContextSnapshotRecord{}, err
	}
	if err := svc.contexts.InsertContextSnapshot(ctx, record); err != nil {
		return ContextSnapshotRecord{}, err
	}
	if record.ScenarioID != "" {
		if scenario, err := svc.scenarios.FindScenario(ctx, record.ScenarioID); err == nil {
			scenario.ContextSnapshotID = record.ContextSnapshotID
			scenario.UpdatedAt = svc.now()
			scenario.Version++
			_ = svc.scenarios.UpdateScenario(ctx, *scenario)
		}
	}
	_ = requestedBy
	return record, nil
}

func (svc *ScenarioWorkspaceService) GetContextSnapshot(ctx context.Context, snapshotID string, filter ListFilter) (ContextSnapshotRecord, error) {
	record, err := svc.contexts.FindContextSnapshot(ctx, required(snapshotID, "context_snapshot_id"))
	if err != nil {
		return ContextSnapshotRecord{}, err
	}
	if err := authorizeListFilterDataScope(filter, "context snapshot", record.TenantID, record.ProjectID, record.SiteID); err != nil {
		return ContextSnapshotRecord{}, err
	}
	return *record, nil
}

func (svc *ScenarioWorkspaceService) ListContextSnapshots(ctx context.Context, filter ContextSnapshotFilter) (ListContextSnapshotsResponse, error) {
	items, next, total, err := svc.contexts.ListContextSnapshots(ctx, filter)
	if err != nil {
		return ListContextSnapshotsResponse{}, err
	}
	return ListContextSnapshotsResponse{Items: items, NextCursor: next, TotalEstimate: total}, nil
}

func (svc *ScenarioWorkspaceService) RunScenario(ctx context.Context, scenarioID string, request ScenarioRunRequest, requestedBy string, filter ListFilter) (JobSnapshot, int, error) {
	scenario, err := svc.GetScenario(ctx, scenarioID, filter)
	if err != nil {
		return JobSnapshot{}, 0, err
	}
	if scenario.PublishedProcessGraphID == "" {
		return JobSnapshot{}, 0, ValidationError("scenario has no published process graph")
	}
	jobType := defaultString(request.JobType, "simulation.material_balance.v1")
	if jobType != "simulation.material_balance.v1" {
		return JobSnapshot{}, 0, ValidationError("scenario process_graph run currently supports simulation.material_balance.v1 only")
	}
	requestID := defaultString(request.RequestID, "sim_req_"+safeIDPart(scenario.ScenarioID)+"_"+fmt.Sprint(svc.now().Unix()))
	metadata := metadataWithScope(request.Metadata, filter)
	metadata["trace_id"] = defaultString(request.TraceID, "trace_"+safeIDPart(requestID))
	metadata["idempotency_key"] = defaultString(request.IdempotencyKey, "scenario:"+scenario.ScenarioID+":"+requestID)
	if scenario.ContextSnapshotID != "" {
		metadata["context_snapshot_ref"] = "context_snapshot:" + scenario.ContextSnapshotID
	}
	externalRefs := map[string]any{
		"scenario_id": scenario.ScenarioID,
	}
	if scenario.ContextSnapshotID != "" {
		externalRefs["context_snapshot_id"] = scenario.ContextSnapshotID
	}
	inputRef := map[string]any{
		"process_graph_id":      scenario.PublishedProcessGraphID,
		"process_graph_version": scenario.PublishedProcessGraphVersion,
		"simulation_input_id":   defaultString(request.SimulationInputID, fmt.Sprintf("si_%s_v%d", scenario.PublishedProcessGraphID, scenario.PublishedProcessGraphVersion)),
	}
	if request.Parameters != nil {
		inputRef["parameters"] = request.Parameters
	}
	simulationRequest := map[string]any{
		"schema_version": "simulation_request.v1",
		"request_id":     requestID,
		"source_system":  "autowatersimu-scenario",
		"requested_by":   defaultString(requestedBy, scenario.RequestedBy),
		"job_type":       jobType,
		"input_ref":      inputRef,
		"external_refs":  externalRefs,
		"metadata":       metadata,
	}
	bytes, err := json.Marshal(simulationRequest)
	if err != nil {
		return JobSnapshot{}, 0, err
	}
	snapshot, status, err := svc.createSimulation(ctx, bytes, filter)
	if err != nil {
		return JobSnapshot{}, 0, err
	}
	scenario.LastJobID = snapshot.Job.JobID
	scenario.UpdatedAt = svc.now()
	scenario.Version++
	_ = svc.scenarios.UpdateScenario(ctx, scenario)
	return snapshot, status, nil
}

func metadataWithScope(metadata map[string]any, filter ListFilter) map[string]any {
	result := map[string]any{}
	for key, value := range metadata {
		result[key] = value
	}
	if strings.TrimSpace(filter.TenantID) != "" && stringValue(result, "tenant_id") == "" {
		result["tenant_id"] = strings.TrimSpace(filter.TenantID)
	}
	if strings.TrimSpace(filter.ProjectID) != "" && stringValue(result, "project_id") == "" {
		result["project_id"] = strings.TrimSpace(filter.ProjectID)
	}
	if strings.TrimSpace(filter.SiteID) != "" && stringValue(result, "site_id") == "" {
		result["site_id"] = strings.TrimSpace(filter.SiteID)
	}
	return result
}

func materialBalanceProcessGraphFromCanvas(canvas map[string]any) (map[string]any, error) {
	if stringValue(canvas, "schema_version") != "canvas_graph.v1" {
		return nil, ValidationError("canvas_graph.schema_version must be canvas_graph.v1")
	}
	components := canvasComponents(canvas)
	if len(components) == 0 {
		components = []string{"COD"}
	}
	graphID := required(stringValue(canvas, "graph_id"), "graph_id")
	processGraph := map[string]any{
		"schema_version":         "process_graph.v1",
		"process_graph_id":       "pg_" + graphID,
		"version":                1,
		"source_canvas_graph_id": graphID,
		"component_schema":       map[string]any{"component_schema_id": "material_balance_components.v1", "components": stringsToAny(components), "unit": defaultString(stringValue(canvasComponentSchema(canvas), "unit"), "mg/L")},
		"nodes":                  canvasProcessNodes(canvas, components),
		"edges":                  canvasProcessEdges(canvas, components),
		"validation":             map[string]any{"status": "valid", "errors": []any{}, "warnings": []any{}},
		"metadata":               map[string]any{"source_name": stringValue(canvas, "name"), "source_exported_at": stringValue(canvas, "exported_at"), "source_calculation_parameters": canvasCalculationParameters(canvas)},
	}
	return processGraph, nil
}

func canvasComponents(canvas map[string]any) []string {
	schemaComponents := stringsFromAny(canvasComponentSchema(canvas)["components"])
	if len(schemaComponents) > 0 {
		return schemaComponents
	}
	var result []string
	for _, item := range sliceFromAny(canvas["customParameters"]) {
		if param, ok := item.(map[string]any); ok {
			if name := stringValue(param, "name"); name != "" {
				result = append(result, name)
			}
		}
	}
	return result
}

func canvasComponentSchema(canvas map[string]any) map[string]any {
	if schema := mapValue(canvas, "component_schema"); schema != nil {
		return schema
	}
	return mapValue(mapValue(canvas, "metadata"), "component_schema")
}

func canvasCalculationParameters(canvas map[string]any) map[string]any {
	if params := mapValue(canvas, "calculationParameters"); params != nil {
		return params
	}
	return mapValue(mapValue(canvas, "metadata"), "calculationParameters")
}

func canvasProcessNodes(canvas map[string]any, components []string) []any {
	nodes := []any{}
	for _, item := range sliceFromAny(canvas["nodes"]) {
		node, ok := item.(map[string]any)
		if !ok {
			continue
		}
		nodeType := stringValue(node, "type")
		data := mapValue(node, "data")
		initial := map[string]any{}
		for _, component := range components {
			initial[component] = numberFromAny(data[component], 0)
		}
		nodes = append(nodes, map[string]any{
			"node_id":            stringValue(node, "id"),
			"node_type":          nodeType,
			"process_unit_type":  processUnitType(nodeType),
			"ports":              processNodePorts(nodeType),
			"volume":             nodeVolume(data, nodeType),
			"initial_conditions": initial,
			"model_binding":      map[string]any{"model_key": "material_balance", "model_version": "v1"},
			"parameter_binding":  map[string]any{},
			"unit_metadata":      map[string]any{"volume": "m3", "concentration": "mg/L", "position": node["position"], "label": data["label"]},
		})
	}
	return nodes
}

func canvasProcessEdges(canvas map[string]any, components []string) []any {
	edges := []any{}
	for _, item := range sliceFromAny(canvas["edges"]) {
		edge, ok := item.(map[string]any)
		if !ok {
			continue
		}
		data := mapValue(edge, "data")
		transform := map[string]any{}
		nested := mapValue(data, "concentration_transform")
		for _, component := range components {
			factor := mapValue(nested, component)
			transform[component] = map[string]any{
				"a": numberFromAny(firstNonNil(factor["a"], data[component+"_a"]), 1),
				"b": numberFromAny(firstNonNil(factor["b"], data[component+"_b"]), 0),
			}
		}
		edges = append(edges, map[string]any{
			"edge_id":                 stringValue(edge, "id"),
			"source_node_id":          stringValue(edge, "source"),
			"target_node_id":          stringValue(edge, "target"),
			"source_port":             defaultString(stringValue(edge, "sourceHandle"), "out"),
			"target_port":             defaultString(stringValue(edge, "targetHandle"), "in"),
			"flow_rate":               numberFromAny(firstNonNil(data["flow_rate"], data["flow"]), 1000),
			"concentration_transform": transform,
			"time_segment_overrides":  []any{},
		})
	}
	return edges
}

func processUnitType(nodeType string) string {
	switch nodeType {
	case "input", "inlet":
		return "influent"
	case "output", "outlet":
		return "effluent"
	default:
		return "storage"
	}
}

func processNodePorts(nodeType string) []any {
	switch nodeType {
	case "input", "inlet":
		return []any{map[string]any{"port_id": "out", "direction": "out"}}
	case "output", "outlet":
		return []any{map[string]any{"port_id": "in", "direction": "in"}}
	default:
		return []any{map[string]any{"port_id": "in", "direction": "in"}, map[string]any{"port_id": "out", "direction": "out"}}
	}
}

func stringsToAny(values []string) []any {
	result := make([]any, 0, len(values))
	for _, value := range values {
		result = append(result, value)
	}
	return result
}

func nodeVolume(data map[string]any, nodeType string) float64 {
	if nodeType == "input" || nodeType == "inlet" || nodeType == "output" || nodeType == "outlet" {
		return numberFromAny(data["volume"], 1)
	}
	return numberFromAny(data["volume"], 10)
}

func firstNonNil(values ...any) any {
	for _, value := range values {
		if value != nil {
			return value
		}
	}
	return nil
}

func numberFromAny(value any, fallback float64) float64 {
	switch typed := value.(type) {
	case float64:
		return typed
	case int:
		return float64(typed)
	case json.Number:
		if parsed, err := typed.Float64(); err == nil {
			return parsed
		}
	}
	return fallback
}
