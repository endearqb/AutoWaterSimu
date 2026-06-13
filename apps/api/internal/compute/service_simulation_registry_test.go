package compute

import (
	"encoding/json"
	"net/http"
	"testing"
)

func TestHTTPSimulationRegistryTenantProjectSiteScope(t *testing.T) {
	_, server := newSimulationRegistryTestServer(t, `{"tokens":[
		{"name":"scope-a","token":"scope-a-token","scopes":["job:create","job:read"],"tenant_id":"tenant_a","project_id":"project_a","site_id":"site_a"},
		{"name":"global","token":"global-token","scopes":["job:create","job:read"]}
	]}`)

	rec := postSimulationRegistryRequest(t, server, "/api/v1/process-graphs", scopedProcessGraphBytes(t, "pg_scope_alpha", "tenant_a", "project_a", "site_a"), "global-token", http.StatusCreated)
	var processGraph ProcessGraphRecord
	if err := json.Unmarshal(rec.Body.Bytes(), &processGraph); err != nil {
		t.Fatal(err)
	}
	if processGraph.TenantID != "tenant_a" || processGraph.ProjectID != "project_a" || processGraph.SiteID != "site_a" {
		t.Fatalf("process graph should persist tenant/project/site metadata, got %#v", processGraph)
	}
	postSimulationRegistryRequest(t, server, "/api/v1/process-graphs", scopedProcessGraphBytes(t, "pg_scope_cross_site", "tenant_a", "project_a", "site_b"), "global-token", http.StatusCreated)

	rec = serveSimulationRegistryRequest(t, server, http.MethodGet, "/api/v1/process-graphs/pg_scope_alpha?version=1", nil, "scope-a-token")
	if rec.Code != http.StatusOK {
		t.Fatalf("scope-matching process graph read should pass: %d %s", rec.Code, rec.Body.String())
	}
	rec = serveSimulationRegistryRequest(t, server, http.MethodGet, "/api/v1/process-graphs/pg_scope_cross_site?version=1", nil, "scope-a-token")
	if rec.Code != http.StatusForbidden {
		t.Fatalf("cross-site process graph read should be denied, got %d %s", rec.Code, rec.Body.String())
	}
	rec = serveSimulationRegistryRequest(t, server, http.MethodGet, "/api/v1/process-graphs/pg_scope_cross_site?version=1", nil, "global-token")
	if rec.Code != http.StatusOK {
		t.Fatalf("global process graph read should pass: %d %s", rec.Code, rec.Body.String())
	}

	rec = postSimulationRegistryRequest(t, server, "/api/v1/simulation-inputs", scopedSimulationInputBytes(t, "si_scope_alpha", "pg_scope_alpha", "tenant_a", "project_a", "site_a"), "global-token", http.StatusCreated)
	var simulationInput SimulationInputRecord
	if err := json.Unmarshal(rec.Body.Bytes(), &simulationInput); err != nil {
		t.Fatal(err)
	}
	if simulationInput.TenantID != "tenant_a" || simulationInput.ProjectID != "project_a" || simulationInput.SiteID != "site_a" {
		t.Fatalf("simulation input should persist tenant/project/site metadata, got %#v", simulationInput)
	}
	postSimulationRegistryRequest(t, server, "/api/v1/simulation-inputs", scopedSimulationInputBytes(t, "si_scope_cross_project", "pg_scope_alpha", "tenant_a", "project_b", "site_a"), "global-token", http.StatusCreated)

	rec = serveSimulationRegistryRequest(t, server, http.MethodGet, "/api/v1/simulation-inputs/si_scope_alpha", nil, "scope-a-token")
	if rec.Code != http.StatusOK {
		t.Fatalf("scope-matching simulation input read should pass: %d %s", rec.Code, rec.Body.String())
	}
	rec = serveSimulationRegistryRequest(t, server, http.MethodGet, "/api/v1/simulation-inputs/si_scope_cross_project", nil, "scope-a-token")
	if rec.Code != http.StatusForbidden {
		t.Fatalf("cross-project simulation input read should be denied, got %d %s", rec.Code, rec.Body.String())
	}
	rec = serveSimulationRegistryRequest(t, server, http.MethodGet, "/api/v1/simulation-inputs/si_scope_cross_project", nil, "global-token")
	if rec.Code != http.StatusOK {
		t.Fatalf("global simulation input read should pass: %d %s", rec.Code, rec.Body.String())
	}
}
