package compute

import (
	"context"
	"encoding/json"
	"net/http"
	"testing"
)

func TestHTTPSimulationRegistryMutationTenantProjectSiteScope(t *testing.T) {
	svc, server := newSimulationRegistryTestServer(t, `{"tokens":[
		{"name":"scope-a","token":"scope-a-token","scopes":["job:create"],"tenant_id":"tenant_a","project_id":"project_a","site_id":"site_a"},
		{"name":"global","token":"global-token","scopes":["job:create"]}
	]}`)
	ctx := context.Background()

	rec := postSimulationRegistryRequest(t, server, "/api/v1/process-graphs", scopedProcessGraphBytes(t, "pg_registry_mutation_alpha", "tenant_a", "project_a", "site_a"), "scope-a-token", http.StatusCreated)
	var processGraph ProcessGraphRecord
	if err := json.Unmarshal(rec.Body.Bytes(), &processGraph); err != nil {
		t.Fatal(err)
	}
	if processGraph.TenantID != "tenant_a" || processGraph.ProjectID != "project_a" || processGraph.SiteID != "site_a" {
		t.Fatalf("scope-matching process graph should persist tenant/project/site metadata, got %#v", processGraph)
	}

	postSimulationRegistryRequest(t, server, "/api/v1/process-graphs", scopedProcessGraphBytes(t, "pg_registry_mutation_cross_site", "tenant_a", "project_a", "site_b"), "scope-a-token", http.StatusForbidden)
	if _, err := svc.GetProcessGraph(ctx, "pg_registry_mutation_cross_site", 1); err == nil {
		t.Fatalf("cross-scope denied process graph registration must not write a record")
	}

	rec = postSimulationRegistryRequest(t, server, "/api/v1/simulation-inputs", scopedSimulationInputBytes(t, "si_registry_mutation_alpha", "pg_registry_mutation_alpha", "tenant_a", "project_a", "site_a"), "scope-a-token", http.StatusCreated)
	var simulationInput SimulationInputRecord
	if err := json.Unmarshal(rec.Body.Bytes(), &simulationInput); err != nil {
		t.Fatal(err)
	}
	if simulationInput.TenantID != "tenant_a" || simulationInput.ProjectID != "project_a" || simulationInput.SiteID != "site_a" {
		t.Fatalf("scope-matching simulation input should persist tenant/project/site metadata, got %#v", simulationInput)
	}

	postSimulationRegistryRequest(t, server, "/api/v1/simulation-inputs", scopedSimulationInputBytes(t, "si_registry_mutation_cross_project", "pg_registry_mutation_alpha", "tenant_a", "project_b", "site_a"), "scope-a-token", http.StatusForbidden)
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
