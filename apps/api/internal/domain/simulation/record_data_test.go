package simulation

import (
	"encoding/json"
	"testing"
	"time"
)

func TestProcessGraphRecordDataFromDocument(t *testing.T) {
	createdAt := time.Date(2026, 6, 3, 12, 34, 56, 0, time.UTC)
	processGraph := testProcessGraph()
	processGraph["metadata"].(map[string]any)["source_system"] = " NewSystem "
	processGraph["metadata"].(map[string]any)["requested_by"] = " planner "
	processGraph["metadata"].(map[string]any)["tenant_id"] = " tenant_1 "
	processGraph["metadata"].(map[string]any)["project_id"] = " project_1 "
	processGraph["metadata"].(map[string]any)["site_id"] = " site_1 "

	record, err := ProcessGraphRecordDataFromDocument(ProcessGraphRecordDataInput{
		ProcessGraph:        processGraph,
		DefaultSourceSystem: "compute-api",
		DefaultRequestedBy:  "fallback",
		CreatedAt:           createdAt,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	payload, _ := json.Marshal(processGraph)
	if record.ProcessGraphID != "pg_material_balance_minimal" ||
		record.SchemaVersion != "process_graph.v1" ||
		record.Version != 1 ||
		record.SourceCanvasGraphID != "graph_material_balance_minimal" ||
		record.PayloadHash != "sha256:"+sha256Hex(payload) ||
		string(record.Payload) != string(payload) ||
		record.SourceSystem != "NewSystem" ||
		record.RequestedBy != "planner" ||
		record.TenantID != "tenant_1" ||
		record.ProjectID != "project_1" ||
		record.SiteID != "site_1" ||
		string(record.Metadata) == "null" ||
		!record.CreatedAt.Equal(createdAt) {
		t.Fatalf("unexpected process graph record data: %#v", record)
	}
}

func TestProcessGraphRecordDataFromDocumentDefaultsMetadata(t *testing.T) {
	processGraph := testProcessGraph()
	delete(processGraph, "metadata")
	record, err := ProcessGraphRecordDataFromDocument(ProcessGraphRecordDataInput{
		ProcessGraph:        processGraph,
		DefaultSourceSystem: "",
		DefaultRequestedBy:  "",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if record.SourceSystem != "compute-api" || record.RequestedBy != "compute-api" || string(record.Metadata) != "null" {
		t.Fatalf("unexpected process graph defaults: %#v", record)
	}
}

func TestProcessGraphRecordDataFromDocumentRejectsInvalidVersion(t *testing.T) {
	processGraph := testProcessGraph()
	processGraph["version"] = 0.0
	_, err := ProcessGraphRecordDataFromDocument(ProcessGraphRecordDataInput{ProcessGraph: processGraph})
	if err == nil || err.Error() != "process_graph.version must be a positive integer" {
		t.Fatalf("unexpected version error: %v", err)
	}
}

func TestSimulationInputRecordDataFromDocument(t *testing.T) {
	createdAt := time.Date(2026, 6, 3, 13, 0, 0, 0, time.UTC)
	simulationInput := testSimulationInput()
	record, err := SimulationInputRecordDataFromDocument(SimulationInputRecordDataInput{
		SimulationInput:     simulationInput,
		DefaultSourceSystem: "compute-api",
		DefaultRequestedBy:  "fallback",
		CreatedAt:           createdAt,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	payload, _ := json.Marshal(simulationInput)
	if record.SimulationInputID != "si_material_balance_minimal" ||
		record.SchemaVersion != "simulation_input.v1" ||
		record.JobType != JobTypeMaterialBalance ||
		record.ProcessGraphID != "pg_material_balance_minimal" ||
		record.ProcessGraphVersion != 1 ||
		record.PayloadHash != "sha256:"+sha256Hex(payload) ||
		string(record.Payload) != string(payload) ||
		record.SourceSystem != "web" ||
		record.RequestedBy != "operator" ||
		record.TenantID != "tenant_1" ||
		record.ProjectID != "project_1" ||
		record.SiteID != "site_1" ||
		string(record.Metadata) == "null" ||
		!record.CreatedAt.Equal(createdAt) {
		t.Fatalf("unexpected simulation input record data: %#v", record)
	}
}

func TestSimulationInputRecordDataFromDocumentDefaultsMetadata(t *testing.T) {
	simulationInput := testSimulationInput()
	delete(simulationInput, "metadata")
	record, err := SimulationInputRecordDataFromDocument(SimulationInputRecordDataInput{SimulationInput: simulationInput})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if record.SourceSystem != "compute-api" || record.RequestedBy != "compute-api" || string(record.Metadata) != "null" {
		t.Fatalf("unexpected simulation input defaults: %#v", record)
	}
}

func TestSimulationInputRecordDataFromDocumentRequiresIdentityFields(t *testing.T) {
	simulationInput := testSimulationInput()
	delete(simulationInput, "simulation_input_id")
	_, err := SimulationInputRecordDataFromDocument(SimulationInputRecordDataInput{SimulationInput: simulationInput})
	if err == nil || err.Error() != "simulation_input_id is required" {
		t.Fatalf("unexpected simulation_input_id error: %v", err)
	}
	simulationInput = testSimulationInput()
	delete(simulationInput, "process_graph_id")
	_, err = SimulationInputRecordDataFromDocument(SimulationInputRecordDataInput{SimulationInput: simulationInput})
	if err == nil || err.Error() != "process_graph_id is required" {
		t.Fatalf("unexpected process_graph_id error: %v", err)
	}
}

func testSimulationInput() map[string]any {
	return map[string]any{
		"schema_version":        "simulation_input.v1",
		"simulation_input_id":   " si_material_balance_minimal ",
		"process_graph_id":      " pg_material_balance_minimal ",
		"process_graph_version": 1.0,
		"job_type":              " simulation.material_balance.v1 ",
		"component_schema":      map[string]any{"components": []any{"COD"}},
		"nodes":                 []any{},
		"edges":                 []any{},
		"time_segments":         []any{},
		"parameters":            map[string]any{"hours": 4.0},
		"runtime_options":       map[string]any{},
		"metadata": map[string]any{
			"source_system": " web ",
			"requested_by":  " operator ",
			"tenant_id":     " tenant_1 ",
			"project_id":    " project_1 ",
			"site_id":       " site_1 ",
		},
	}
}
