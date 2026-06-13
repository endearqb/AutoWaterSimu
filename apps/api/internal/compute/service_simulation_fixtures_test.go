package compute

import (
	"os"
	"path/filepath"
	"testing"
)

func scopedProcessGraphBytes(t *testing.T, processGraphID, tenantID, projectID, siteID string) []byte {
	t.Helper()
	processGraphBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance_3_node.process_graph.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	processGraph := decodeMap(t, processGraphBytes)
	processGraph["process_graph_id"] = processGraphID
	processGraph["source_canvas_graph_id"] = "graph_" + processGraphID
	processGraph["metadata"] = map[string]any{
		"source_system": "test",
		"requested_by":  "registry-test",
		"tenant_id":     tenantID,
		"project_id":    projectID,
		"site_id":       siteID,
	}
	return encodeMap(t, processGraph)
}

func scopedSimulationInputBytes(t *testing.T, simulationInputID, processGraphID, tenantID, projectID, siteID string) []byte {
	t.Helper()
	inputBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance_minimal.simulation_input.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	input := decodeMap(t, inputBytes)
	input["simulation_input_id"] = simulationInputID
	input["process_graph_id"] = processGraphID
	input["metadata"] = map[string]any{
		"source_system": "test",
		"requested_by":  "registry-test",
		"tenant_id":     tenantID,
		"project_id":    projectID,
		"site_id":       siteID,
	}
	return encodeMap(t, input)
}

func scopedSimulationCheckBytes(t *testing.T, requestID, simulationInputID, tenantID, projectID, siteID, inputTenantID, inputProjectID, inputSiteID string) []byte {
	t.Helper()
	requestBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "milp_material_balance.simulation_request.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	request := decodeMap(t, requestBytes)
	request["request_id"] = requestID
	metadata := mapValue(request, "metadata")
	if metadata == nil {
		metadata = map[string]any{}
		request["metadata"] = metadata
	}
	metadata["trace_id"] = "trace_" + requestID
	metadata["tenant_id"] = tenantID
	metadata["project_id"] = projectID
	externalRefs := mapValue(request, "external_refs")
	if externalRefs == nil {
		externalRefs = map[string]any{}
		request["external_refs"] = externalRefs
	}
	externalRefs["site_id"] = siteID
	inputRef := mapValue(request, "input_ref")
	inputRef["simulation_input_id"] = simulationInputID
	simulationInput := mapValue(inputRef, "simulation_input")
	simulationInput["simulation_input_id"] = simulationInputID
	simulationInput["process_graph_id"] = "pg_" + simulationInputID
	if inputTenantID != "" || inputProjectID != "" || inputSiteID != "" {
		simulationInput["metadata"] = map[string]any{
			"tenant_id":  inputTenantID,
			"project_id": inputProjectID,
			"site_id":    inputSiteID,
		}
	} else {
		delete(simulationInput, "metadata")
	}
	return encodeMap(t, request)
}
