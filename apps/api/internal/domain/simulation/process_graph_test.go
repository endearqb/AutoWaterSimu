package simulation

import (
	"reflect"
	"strings"
	"testing"
)

func TestValidateProcessGraphForSimulationInput(t *testing.T) {
	if err := ValidateProcessGraphForSimulationInput(testProcessGraph()); err != nil {
		t.Fatalf("expected valid process graph, got %v", err)
	}

	duplicateNode := testProcessGraph()
	nodes := duplicateNode["nodes"].([]any)
	nodes[1].(map[string]any)["node_id"] = "n_in"
	err := ValidateProcessGraphForSimulationInput(duplicateNode)
	if err == nil || !strings.Contains(err.Error(), "duplicate node_id") {
		t.Fatalf("expected duplicate node error, got %v", err)
	}

	missingTransform := testProcessGraph()
	edge := missingTransform["edges"].([]any)[0].(map[string]any)
	edge["concentration_transform"] = map[string]any{}
	err = ValidateProcessGraphForSimulationInput(missingTransform)
	if err == nil || !strings.Contains(err.Error(), "missing component") {
		t.Fatalf("expected missing concentration transform error, got %v", err)
	}
}

func TestProcessGraphToSimulationInput(t *testing.T) {
	input, err := ProcessGraphToSimulationInput(testProcessGraph(), map[string]any{
		"steps_per_hour": 12,
		"tolerance":      0.00001,
	}, "", JobTypeMaterialBalance)
	if err != nil {
		t.Fatalf("expected process graph transform, got %v", err)
	}
	if input["schema_version"] != "simulation_input.v1" ||
		input["simulation_input_id"] != "si_pg_material_balance_minimal" ||
		input["process_graph_id"] != "pg_material_balance_minimal" ||
		input["process_graph_version"] != 1 ||
		input["job_type"] != JobTypeMaterialBalance {
		t.Fatalf("unexpected simulation input identity fields: %#v", input)
	}

	parameters := input["parameters"].(map[string]any)
	if parameters["hours"] != 8.0 || parameters["steps_per_hour"] != 12 || parameters["tolerance"] != 0.00001 {
		t.Fatalf("unexpected resolved parameters: %#v", parameters)
	}

	nodes := input["nodes"].([]any)
	if len(nodes) != 3 {
		t.Fatalf("unexpected nodes: %#v", nodes)
	}
	inlet := nodes[0].(map[string]any)
	outlet := nodes[2].(map[string]any)
	if inlet["is_inlet"] != true || outlet["is_outlet"] != true {
		t.Fatalf("unexpected inlet/outlet flags: %#v", nodes)
	}

	segments := input["time_segments"].([]any)
	wantSegments := []any{
		map[string]any{
			"id":         "seg_early",
			"start_hour": 0.0,
			"end_hour":   1.0,
			"edge_overrides": map[string]any{
				"e_in_tank": map[string]any{"factors": map[string]any{"COD": map[string]any{"a": 0.9, "b": 1.0}}, "flow": 90.0},
			},
		},
		map[string]any{
			"id":         "seg_1",
			"start_hour": 1.0,
			"end_hour":   2.0,
			"edge_overrides": map[string]any{
				"e_tank_out": map[string]any{"factors": map[string]any{"COD": map[string]any{"a": 1.1, "b": 0.0}}},
			},
		},
	}
	if !reflect.DeepEqual(segments, wantSegments) {
		t.Fatalf("unexpected time segments: got %#v want %#v", segments, wantSegments)
	}
}

func TestProcessGraphToSimulationInputRejectsUnsupportedJobType(t *testing.T) {
	_, err := ProcessGraphToSimulationInput(testProcessGraph(), nil, "", JobTypeASM1)
	if err == nil || !strings.Contains(err.Error(), "only supports simulation.material_balance.v1") {
		t.Fatalf("expected unsupported process graph job type error, got %v", err)
	}
}

func testProcessGraph() map[string]any {
	return map[string]any{
		"schema_version":         "process_graph.v1",
		"process_graph_id":       "pg_material_balance_minimal",
		"version":                1.0,
		"source_canvas_graph_id": "graph_material_balance_minimal",
		"component_schema": map[string]any{
			"components": []any{"COD"},
			"unit":       "mg/L",
		},
		"nodes": []any{
			map[string]any{
				"node_id":            "n_in",
				"node_type":          "input",
				"volume":             1.0,
				"initial_conditions": map[string]any{"COD": 10.0},
			},
			map[string]any{
				"node_id":            "n_tank",
				"node_type":          "tank",
				"volume":             10.0,
				"initial_conditions": map[string]any{"COD": 0.0},
			},
			map[string]any{
				"node_id":            "n_out",
				"node_type":          "output",
				"volume":             1.0,
				"initial_conditions": map[string]any{"COD": 0.0},
			},
		},
		"edges": []any{
			map[string]any{
				"edge_id":        "e_in_tank",
				"source_node_id": "n_in",
				"target_node_id": "n_tank",
				"flow_rate":      100.0,
				"concentration_transform": map[string]any{
					"COD": map[string]any{"a": 1.0, "b": 0.0},
				},
				"time_segment_overrides": []any{
					map[string]any{
						"segment_id": "seg_early",
						"startHour":  0.0,
						"endHour":    1.0,
						"flow":       90.0,
						"factors":    map[string]any{"COD": map[string]any{"a": 0.9, "b": 1.0}},
					},
				},
			},
			map[string]any{
				"edge_id":        "e_tank_out",
				"source_node_id": "n_tank",
				"target_node_id": "n_out",
				"flow_rate":      100.0,
				"concentration_transform": map[string]any{
					"COD": map[string]any{"a": 1.0, "b": 0.0},
				},
				"time_segment_overrides": []any{
					map[string]any{
						"start_hour": 1.0,
						"end_hour":   2.0,
						"factors":    map[string]any{"COD": map[string]any{"a": 1.1, "b": 0.0}},
					},
				},
			},
		},
		"metadata": map[string]any{
			"source_calculation_parameters": map[string]any{"hours": 8.0},
		},
	}
}
