package compute

import (
	"net/http"
	"strings"
	"testing"
)

func TestSimulationCheckEndpointRejectsUnregisteredInputRefs(t *testing.T) {
	_, server := newSimulationTestServer(t)

	rec := serveWithToken(t, server, http.MethodPost, "/api/v1/simulation-checks", "dev-public-token", validContractFixture(t, "material_balance.simulation_request.v1.json"))
	if rec.Code != http.StatusNotFound || !strings.Contains(rec.Body.String(), "simulation input not found") {
		t.Fatalf("unregistered reference-only simulation check should be rejected, got %d %s", rec.Code, rec.Body.String())
	}

	rec = serveWithToken(t, server, http.MethodPost, "/api/v1/simulation-checks", "dev-public-token", validContractFixture(t, "material_balance_process_graph.simulation_request.v1.json"))
	if rec.Code != http.StatusNotFound || !strings.Contains(rec.Body.String(), "process graph not found") {
		t.Fatalf("unregistered process_graph simulation check should be rejected, got %d %s", rec.Code, rec.Body.String())
	}

	rec = serveWithToken(t, server, http.MethodPost, "/api/v1/simulation-checks", "dev-public-token", validContractFixture(t, "material_balance_model_run.simulation_request.v1.json"))
	if rec.Code != http.StatusNotFound || !strings.Contains(rec.Body.String(), "model run not found") {
		t.Fatalf("unregistered model_run simulation check should be rejected, got %d %s", rec.Code, rec.Body.String())
	}
}
