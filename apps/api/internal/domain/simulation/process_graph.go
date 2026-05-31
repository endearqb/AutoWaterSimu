package simulation

import (
	"errors"
	"fmt"
	"sort"
	"strings"
)

func ValidateProcessGraphForSimulationInput(processGraph map[string]any) error {
	components := stringsFromAny(mapValue(processGraph, "component_schema")["components"])
	if len(components) == 0 {
		return errors.New("process_graph.component_schema.components is required")
	}
	nodeIDs := map[string]bool{}
	nodes := sliceFromAny(processGraph["nodes"])
	if len(nodes) < 2 {
		return errors.New("process_graph.nodes must include at least two nodes")
	}
	for index, item := range nodes {
		node, ok := item.(map[string]any)
		if !ok {
			return fmt.Errorf("process_graph.nodes[%d] must be an object", index)
		}
		nodeID := stringValue(node, "node_id")
		if nodeID == "" {
			return fmt.Errorf("process_graph.nodes[%d].node_id is required", index)
		}
		if nodeIDs[nodeID] {
			return errors.New("process_graph contains duplicate node_id: " + nodeID)
		}
		if mapValue(node, "initial_conditions") == nil {
			return errors.New("process_graph node initial_conditions is required: " + nodeID)
		}
		nodeIDs[nodeID] = true
	}
	edges := sliceFromAny(processGraph["edges"])
	if len(edges) == 0 {
		return errors.New("process_graph.edges must include at least one edge")
	}
	edgeIDs := map[string]bool{}
	for index, item := range edges {
		edge, ok := item.(map[string]any)
		if !ok {
			return fmt.Errorf("process_graph.edges[%d] must be an object", index)
		}
		edgeID := stringValue(edge, "edge_id")
		if edgeID == "" {
			return fmt.Errorf("process_graph.edges[%d].edge_id is required", index)
		}
		if edgeIDs[edgeID] {
			return errors.New("process_graph contains duplicate edge_id: " + edgeID)
		}
		edgeIDs[edgeID] = true
		if !nodeIDs[stringValue(edge, "source_node_id")] {
			return errors.New("process_graph edge references unknown source node: " + edgeID)
		}
		if !nodeIDs[stringValue(edge, "target_node_id")] {
			return errors.New("process_graph edge references unknown target node: " + edgeID)
		}
		transform := mapValue(edge, "concentration_transform")
		for _, component := range components {
			factor := mapValue(transform, component)
			if factor == nil {
				return errors.New("process_graph edge concentration_transform missing component: " + edgeID + "." + component)
			}
			if _, ok := factor["a"]; !ok {
				return errors.New("process_graph edge concentration_transform missing a: " + edgeID + "." + component)
			}
			if _, ok := factor["b"]; !ok {
				return errors.New("process_graph edge concentration_transform missing b: " + edgeID + "." + component)
			}
		}
	}
	return nil
}

func ProcessGraphToSimulationInput(processGraph map[string]any, parameters map[string]any, simulationInputID, jobType string) (map[string]any, error) {
	if jobType != JobTypeMaterialBalance {
		return nil, errors.New("process_graph lookup only supports simulation.material_balance.v1")
	}
	if err := ValidateProcessGraphForSimulationInput(processGraph); err != nil {
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
	processGraphID := stringValue(processGraph, "process_graph_id")
	if processGraphID == "" {
		return nil, errors.New("process_graph_id is required")
	}
	processGraphVersion := int(numberValue(processGraph, "version"))
	if processGraphVersion <= 0 {
		return nil, errors.New("process_graph.version must be a positive integer")
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

func processGraphSimulationNodes(processGraph map[string]any) []any {
	nodes := make([]any, 0)
	for _, item := range sliceFromAny(processGraph["nodes"]) {
		node, ok := item.(map[string]any)
		if !ok {
			continue
		}
		nodeType := stringValue(node, "node_type")
		nodes = append(nodes, map[string]any{
			"node_id":                stringValue(node, "node_id"),
			"node_type":              nodeType,
			"initial_volume":         node["volume"],
			"initial_concentrations": mapValue(node, "initial_conditions"),
			"is_inlet":               nodeType == "input" || nodeType == "inlet",
			"is_outlet":              nodeType == "output" || nodeType == "outlet",
		})
	}
	return nodes
}

func processGraphSimulationEdges(processGraph map[string]any) []any {
	edges := make([]any, 0)
	for _, item := range sliceFromAny(processGraph["edges"]) {
		edge, ok := item.(map[string]any)
		if !ok {
			continue
		}
		edges = append(edges, map[string]any{
			"edge_id":                 stringValue(edge, "edge_id"),
			"source_node_id":          stringValue(edge, "source_node_id"),
			"target_node_id":          stringValue(edge, "target_node_id"),
			"flow_rate":               edge["flow_rate"],
			"concentration_transform": mapValue(edge, "concentration_transform"),
		})
	}
	return edges
}

func collectProcessGraphTimeSegments(processGraph map[string]any) []any {
	segments := map[string]map[string]any{}
	for _, item := range sliceFromAny(processGraph["edges"]) {
		edge, ok := item.(map[string]any)
		if !ok {
			continue
		}
		edgeID := stringValue(edge, "edge_id")
		for index, overrideItem := range sliceFromAny(edge["time_segment_overrides"]) {
			override, ok := overrideItem.(map[string]any)
			if !ok {
				continue
			}
			segmentID := stringValue(override, "segment_id")
			if segmentID == "" {
				segmentID = stringValue(override, "id")
			}
			if segmentID == "" {
				segmentID = fmt.Sprintf("seg_%d", index+1)
			}
			segment, ok := segments[segmentID]
			if !ok {
				segment = map[string]any{
					"id":             segmentID,
					"start_hour":     numberValueWithAliases(override, "start_hour", "startHour"),
					"end_hour":       numberValueWithAliases(override, "end_hour", "endHour"),
					"edge_overrides": map[string]any{},
				}
				segments[segmentID] = segment
			}
			edgeOverride := map[string]any{"factors": mapValue(override, "factors")}
			if rawFlow, ok := override["flow"]; ok && rawFlow != nil {
				edgeOverride["flow"] = rawFlow
			}
			segment["edge_overrides"].(map[string]any)[edgeID] = edgeOverride
		}
	}
	result := make([]any, 0, len(segments))
	for _, segment := range segments {
		result = append(result, segment)
	}
	sort.Slice(result, func(i, j int) bool {
		left := result[i].(map[string]any)
		right := result[j].(map[string]any)
		if left["start_hour"] == right["start_hour"] {
			if left["end_hour"] == right["end_hour"] {
				return stringValue(left, "id") < stringValue(right, "id")
			}
			return left["end_hour"].(float64) < right["end_hour"].(float64)
		}
		return left["start_hour"].(float64) < right["start_hour"].(float64)
	})
	return result
}

func mapValue(value map[string]any, key string) map[string]any {
	if value == nil {
		return nil
	}
	raw, ok := value[key]
	if !ok || raw == nil {
		return nil
	}
	if child, ok := raw.(map[string]any); ok {
		return child
	}
	return nil
}

func numberValue(value map[string]any, key string) float64 {
	if value == nil {
		return 0
	}
	if raw, ok := value[key].(float64); ok {
		return raw
	}
	if raw, ok := value[key].(int); ok {
		return float64(raw)
	}
	return 0
}

func numberValueWithAliases(value map[string]any, primary, fallback string) float64 {
	if raw, ok := value[primary].(float64); ok {
		return raw
	}
	if raw, ok := value[fallback].(float64); ok {
		return raw
	}
	return 0
}

func sliceFromAny(value any) []any {
	items, ok := value.([]any)
	if !ok {
		return nil
	}
	return items
}

func stringValue(value map[string]any, key string) string {
	if value == nil {
		return ""
	}
	if text, ok := value[key].(string); ok {
		return strings.TrimSpace(text)
	}
	return ""
}

func stringsFromAny(value any) []string {
	items, ok := value.([]any)
	if !ok {
		return nil
	}
	var result []string
	for _, item := range items {
		if text, ok := item.(string); ok && strings.TrimSpace(text) != "" {
			result = append(result, strings.TrimSpace(text))
		}
	}
	return result
}
