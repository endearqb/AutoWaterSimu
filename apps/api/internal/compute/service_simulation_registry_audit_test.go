package compute

import (
	"context"
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"testing"
)

func TestHTTPSimulationRegistryMutationAuditEvents(t *testing.T) {
	svc, server := newSimulationRegistryTestServer(t, `{"tokens":[
		{"name":"registry-auditor","token":"registry-audit-token","scopes":["job:create","job:read"]}
	]}`)

	processGraphBytes := scopedProcessGraphBytes(t, "pg_audit_alpha", "tenant_audit", "project_audit", "site_audit")
	rec := postSimulationRegistryRequest(t, server, "/api/v1/process-graphs", processGraphBytes, "registry-audit-token", http.StatusCreated)
	var processGraph ProcessGraphRecord
	if err := json.Unmarshal(rec.Body.Bytes(), &processGraph); err != nil {
		t.Fatal(err)
	}
	postSimulationRegistryRequest(t, server, "/api/v1/process-graphs", processGraphBytes, "registry-audit-token", http.StatusOK)

	simulationInputBytes := scopedSimulationInputBytes(t, "si_audit_alpha", "pg_audit_alpha", "tenant_audit", "project_audit", "site_audit")
	rec = postSimulationRegistryRequest(t, server, "/api/v1/simulation-inputs", simulationInputBytes, "registry-audit-token", http.StatusCreated)
	var simulationInput SimulationInputRecord
	if err := json.Unmarshal(rec.Body.Bytes(), &simulationInput); err != nil {
		t.Fatal(err)
	}
	postSimulationRegistryRequest(t, server, "/api/v1/simulation-inputs", simulationInputBytes, "registry-audit-token", http.StatusOK)

	auditEvents, _, auditTotal, err := svc.store.ListMutationAuditEvents(context.Background(), MutationAuditFilter{Limit: 10})
	if err != nil {
		t.Fatal(err)
	}
	if auditTotal != 2 || len(auditEvents) != 2 {
		t.Fatalf("expected process graph and simulation input audit events only, total=%d events=%#v", auditTotal, auditEvents)
	}
	auditByType := map[string]MutationAuditRecord{}
	for _, event := range auditEvents {
		auditByType[event.EventType] = event
	}
	processGraphEvent, ok := auditByType[processGraphRegisteredEvent]
	if !ok {
		t.Fatalf("process graph registered audit missing: %#v", auditEvents)
	}
	processPayload := mutationAuditPayloadMap(t, processGraphEvent)
	if _, ok := processPayload["payload"]; ok {
		t.Fatalf("process graph audit must not include full payload: %#v", processPayload)
	}
	processAudit := mutationAuditMap(t, processGraphEvent)
	if processAudit["who"] != "registry-auditor" ||
		processAudit["where"] != "POST /api/v1/process-graphs" ||
		processAudit["target_object"] != "ProcessGraph" ||
		processAudit["target_id"] != "pg_audit_alpha" ||
		processAudit["action"] != "process_graph.register" {
		t.Fatalf("unexpected process graph audit envelope: %#v", processAudit)
	}
	processAfter, ok := processAudit["after"].(map[string]any)
	if !ok ||
		processAfter["payload_hash"] != processGraph.PayloadHash ||
		processAfter["tenant_id"] != "tenant_audit" ||
		processAfter["project_id"] != "project_audit" ||
		processAfter["site_id"] != "site_audit" ||
		processAfter["version"] != float64(1) {
		t.Fatalf("process graph audit should include compact after state, got %#v", processAudit["after"])
	}

	inputEvent, ok := auditByType[simulationInputRegisteredEvent]
	if !ok {
		t.Fatalf("simulation input registered audit missing: %#v", auditEvents)
	}
	inputPayload := mutationAuditPayloadMap(t, inputEvent)
	if _, ok := inputPayload["payload"]; ok {
		t.Fatalf("simulation input audit must not include full payload: %#v", inputPayload)
	}
	inputAudit := mutationAuditMap(t, inputEvent)
	if inputAudit["who"] != "registry-auditor" ||
		inputAudit["where"] != "POST /api/v1/simulation-inputs" ||
		inputAudit["target_object"] != "SimulationInput" ||
		inputAudit["target_id"] != "si_audit_alpha" ||
		inputAudit["action"] != "simulation_input.register" {
		t.Fatalf("unexpected simulation input audit envelope: %#v", inputAudit)
	}
	inputAfter, ok := inputAudit["after"].(map[string]any)
	if !ok ||
		inputAfter["payload_hash"] != simulationInput.PayloadHash ||
		inputAfter["job_type"] != "simulation.material_balance.v1" ||
		inputAfter["process_graph_id"] != "pg_audit_alpha" ||
		inputAfter["tenant_id"] != "tenant_audit" ||
		inputAfter["project_id"] != "project_audit" ||
		inputAfter["site_id"] != "site_audit" {
		t.Fatalf("simulation input audit should include compact after state, got %#v", inputAudit["after"])
	}

	processGraphRequestBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance_process_graph.simulation_request.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	processGraphRequest := decodeMap(t, processGraphRequestBytes)
	processGraphRequest["request_id"] = "sim_req_registry_audit_process_graph"
	inputRef := mapValue(processGraphRequest, "input_ref")
	inputRef["process_graph_id"] = "pg_audit_alpha"
	inputRef["process_graph_version"] = 1
	postSimulationRegistryRequest(t, server, "/api/v1/simulation-checks", encodeMap(t, processGraphRequest), "registry-audit-token", http.StatusAccepted)

	auditEvents, _, auditTotal, err = svc.store.ListMutationAuditEvents(context.Background(), MutationAuditFilter{Limit: 10})
	if err != nil {
		t.Fatal(err)
	}
	if auditTotal != 3 || len(auditEvents) != 3 {
		t.Fatalf("expected simulation-check generated input to add one registry audit event, total=%d events=%#v", auditTotal, auditEvents)
	}
	var generatedInputEvent *MutationAuditRecord
	for _, event := range auditEvents {
		if event.EventType == simulationInputRegisteredEvent && event.TargetID == "si_pg_audit_alpha" {
			copied := event
			generatedInputEvent = &copied
			break
		}
	}
	if generatedInputEvent == nil {
		t.Fatalf("simulation-check generated simulation input audit missing: %#v", auditEvents)
	}
	generatedInputAudit := mutationAuditMap(t, *generatedInputEvent)
	if generatedInputAudit["who"] != "registry-auditor" ||
		generatedInputAudit["where"] != "POST /api/v1/simulation-checks" ||
		generatedInputAudit["target_object"] != "SimulationInput" ||
		generatedInputAudit["target_id"] != "si_pg_audit_alpha" ||
		generatedInputAudit["action"] != "simulation_input.register" {
		t.Fatalf("unexpected generated simulation input audit envelope: %#v", generatedInputAudit)
	}
}
