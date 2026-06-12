package compute

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

func TestHTTPSimulationRegistryTenantProjectSiteScope(t *testing.T) {
	svc := testValidatedService(t)
	auth, err := NewAuthenticator(`{"tokens":[
		{"name":"scope-a","token":"scope-a-token","scopes":["job:create","job:read"],"tenant_id":"tenant_a","project_id":"project_a","site_id":"site_a"},
		{"name":"global","token":"global-token","scopes":["job:create","job:read"]}
	]}`)
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()

	post := func(path string, body []byte) *httptest.ResponseRecorder {
		t.Helper()
		req := httptest.NewRequest(http.MethodPost, path, bytes.NewReader(body))
		req.Header.Set("Authorization", "Bearer global-token")
		rec := httptest.NewRecorder()
		server.ServeHTTP(rec, req)
		if rec.Code != http.StatusCreated {
			t.Fatalf("register %s failed: %d %s", path, rec.Code, rec.Body.String())
		}
		return rec
	}
	get := func(path, token string) *httptest.ResponseRecorder {
		t.Helper()
		req := httptest.NewRequest(http.MethodGet, path, nil)
		req.Header.Set("Authorization", "Bearer "+token)
		rec := httptest.NewRecorder()
		server.ServeHTTP(rec, req)
		return rec
	}

	rec := post("/api/v1/process-graphs", scopedProcessGraphBytes(t, "pg_scope_alpha", "tenant_a", "project_a", "site_a"))
	var processGraph ProcessGraphRecord
	if err := json.Unmarshal(rec.Body.Bytes(), &processGraph); err != nil {
		t.Fatal(err)
	}
	if processGraph.TenantID != "tenant_a" || processGraph.ProjectID != "project_a" || processGraph.SiteID != "site_a" {
		t.Fatalf("process graph should persist tenant/project/site metadata, got %#v", processGraph)
	}
	post("/api/v1/process-graphs", scopedProcessGraphBytes(t, "pg_scope_cross_site", "tenant_a", "project_a", "site_b"))

	rec = get("/api/v1/process-graphs/pg_scope_alpha?version=1", "scope-a-token")
	if rec.Code != http.StatusOK {
		t.Fatalf("scope-matching process graph read should pass: %d %s", rec.Code, rec.Body.String())
	}
	rec = get("/api/v1/process-graphs/pg_scope_cross_site?version=1", "scope-a-token")
	if rec.Code != http.StatusForbidden {
		t.Fatalf("cross-site process graph read should be denied, got %d %s", rec.Code, rec.Body.String())
	}
	rec = get("/api/v1/process-graphs/pg_scope_cross_site?version=1", "global-token")
	if rec.Code != http.StatusOK {
		t.Fatalf("global process graph read should pass: %d %s", rec.Code, rec.Body.String())
	}

	rec = post("/api/v1/simulation-inputs", scopedSimulationInputBytes(t, "si_scope_alpha", "pg_scope_alpha", "tenant_a", "project_a", "site_a"))
	var simulationInput SimulationInputRecord
	if err := json.Unmarshal(rec.Body.Bytes(), &simulationInput); err != nil {
		t.Fatal(err)
	}
	if simulationInput.TenantID != "tenant_a" || simulationInput.ProjectID != "project_a" || simulationInput.SiteID != "site_a" {
		t.Fatalf("simulation input should persist tenant/project/site metadata, got %#v", simulationInput)
	}
	post("/api/v1/simulation-inputs", scopedSimulationInputBytes(t, "si_scope_cross_project", "pg_scope_alpha", "tenant_a", "project_b", "site_a"))

	rec = get("/api/v1/simulation-inputs/si_scope_alpha", "scope-a-token")
	if rec.Code != http.StatusOK {
		t.Fatalf("scope-matching simulation input read should pass: %d %s", rec.Code, rec.Body.String())
	}
	rec = get("/api/v1/simulation-inputs/si_scope_cross_project", "scope-a-token")
	if rec.Code != http.StatusForbidden {
		t.Fatalf("cross-project simulation input read should be denied, got %d %s", rec.Code, rec.Body.String())
	}
	rec = get("/api/v1/simulation-inputs/si_scope_cross_project", "global-token")
	if rec.Code != http.StatusOK {
		t.Fatalf("global simulation input read should pass: %d %s", rec.Code, rec.Body.String())
	}
}

func TestHTTPSimulationRegistryMutationTenantProjectSiteScope(t *testing.T) {
	svc := testValidatedService(t)
	auth, err := NewAuthenticator(`{"tokens":[
		{"name":"scope-a","token":"scope-a-token","scopes":["job:create"],"tenant_id":"tenant_a","project_id":"project_a","site_id":"site_a"},
		{"name":"global","token":"global-token","scopes":["job:create"]}
	]}`)
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()
	ctx := context.Background()

	post := func(path string, body []byte, token string, expectedStatus int) *httptest.ResponseRecorder {
		t.Helper()
		req := httptest.NewRequest(http.MethodPost, path, bytes.NewReader(body))
		req.Header.Set("Authorization", "Bearer "+token)
		rec := httptest.NewRecorder()
		server.ServeHTTP(rec, req)
		if rec.Code != expectedStatus {
			t.Fatalf("registry mutation %s with %s got %d want %d: %s", path, token, rec.Code, expectedStatus, rec.Body.String())
		}
		return rec
	}

	rec := post("/api/v1/process-graphs", scopedProcessGraphBytes(t, "pg_registry_mutation_alpha", "tenant_a", "project_a", "site_a"), "scope-a-token", http.StatusCreated)
	var processGraph ProcessGraphRecord
	if err := json.Unmarshal(rec.Body.Bytes(), &processGraph); err != nil {
		t.Fatal(err)
	}
	if processGraph.TenantID != "tenant_a" || processGraph.ProjectID != "project_a" || processGraph.SiteID != "site_a" {
		t.Fatalf("scope-matching process graph should persist tenant/project/site metadata, got %#v", processGraph)
	}

	post("/api/v1/process-graphs", scopedProcessGraphBytes(t, "pg_registry_mutation_cross_site", "tenant_a", "project_a", "site_b"), "scope-a-token", http.StatusForbidden)
	if _, err := svc.GetProcessGraph(ctx, "pg_registry_mutation_cross_site", 1); err == nil {
		t.Fatalf("cross-scope denied process graph registration must not write a record")
	}

	rec = post("/api/v1/simulation-inputs", scopedSimulationInputBytes(t, "si_registry_mutation_alpha", "pg_registry_mutation_alpha", "tenant_a", "project_a", "site_a"), "scope-a-token", http.StatusCreated)
	var simulationInput SimulationInputRecord
	if err := json.Unmarshal(rec.Body.Bytes(), &simulationInput); err != nil {
		t.Fatal(err)
	}
	if simulationInput.TenantID != "tenant_a" || simulationInput.ProjectID != "project_a" || simulationInput.SiteID != "site_a" {
		t.Fatalf("scope-matching simulation input should persist tenant/project/site metadata, got %#v", simulationInput)
	}

	post("/api/v1/simulation-inputs", scopedSimulationInputBytes(t, "si_registry_mutation_cross_project", "pg_registry_mutation_alpha", "tenant_a", "project_b", "site_a"), "scope-a-token", http.StatusForbidden)
	if _, err := svc.GetSimulationInput(ctx, "si_registry_mutation_cross_project"); err == nil {
		t.Fatalf("cross-scope denied simulation input registration must not write a record")
	}

	processGraphAudit, _, processGraphAuditTotal, err := svc.store.ListMutationAuditEvents(ctx, MutationAuditFilter{TargetObject: "ProcessGraph", Limit: 10})
	if err != nil {
		t.Fatal(err)
	}
	if processGraphAuditTotal != 1 || len(processGraphAudit) != 1 || processGraphAudit[0].TargetID != "pg_registry_mutation_alpha" {
		t.Fatalf("cross-scope denied process graph registration must not write audit events, total=%d events=%#v", processGraphAuditTotal, processGraphAudit)
	}

	simulationInputAudit, _, simulationInputAuditTotal, err := svc.store.ListMutationAuditEvents(ctx, MutationAuditFilter{TargetObject: "SimulationInput", Limit: 10})
	if err != nil {
		t.Fatal(err)
	}
	if simulationInputAuditTotal != 1 || len(simulationInputAudit) != 1 || simulationInputAudit[0].TargetID != "si_registry_mutation_alpha" {
		t.Fatalf("cross-scope denied simulation input registration must not write audit events, total=%d events=%#v", simulationInputAuditTotal, simulationInputAudit)
	}
}

func TestHTTPSimulationRegistryMutationAuditEvents(t *testing.T) {
	svc := testValidatedService(t)
	auth, err := NewAuthenticator(`{"tokens":[
		{"name":"registry-auditor","token":"registry-audit-token","scopes":["job:create","job:read"]}
	]}`)
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()

	post := func(path string, body []byte, expectedStatus int) *httptest.ResponseRecorder {
		t.Helper()
		req := httptest.NewRequest(http.MethodPost, path, bytes.NewReader(body))
		req.Header.Set("Authorization", "Bearer registry-audit-token")
		rec := httptest.NewRecorder()
		server.ServeHTTP(rec, req)
		if rec.Code != expectedStatus {
			t.Fatalf("register %s expected %d, got %d %s", path, expectedStatus, rec.Code, rec.Body.String())
		}
		return rec
	}

	processGraphBytes := scopedProcessGraphBytes(t, "pg_audit_alpha", "tenant_audit", "project_audit", "site_audit")
	rec := post("/api/v1/process-graphs", processGraphBytes, http.StatusCreated)
	var processGraph ProcessGraphRecord
	if err := json.Unmarshal(rec.Body.Bytes(), &processGraph); err != nil {
		t.Fatal(err)
	}
	post("/api/v1/process-graphs", processGraphBytes, http.StatusOK)

	simulationInputBytes := scopedSimulationInputBytes(t, "si_audit_alpha", "pg_audit_alpha", "tenant_audit", "project_audit", "site_audit")
	rec = post("/api/v1/simulation-inputs", simulationInputBytes, http.StatusCreated)
	var simulationInput SimulationInputRecord
	if err := json.Unmarshal(rec.Body.Bytes(), &simulationInput); err != nil {
		t.Fatal(err)
	}
	post("/api/v1/simulation-inputs", simulationInputBytes, http.StatusOK)

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
	post("/api/v1/simulation-checks", encodeMap(t, processGraphRequest), http.StatusAccepted)

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
