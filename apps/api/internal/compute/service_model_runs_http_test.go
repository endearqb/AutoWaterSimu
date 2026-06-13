package compute

import (
	"encoding/json"
	"net/http"
	"testing"
)

func TestHTTPModelRunReadListEndpoints(t *testing.T) {
	scenario := newCompletedModelRunScenario(t)

	rec := serveWithToken(t, scenario.server, http.MethodGet, "/api/v1/model-runs/"+scenario.modelRunID, "dev-public-token", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("model run endpoint failed: %d %s", rec.Code, rec.Body.String())
	}

	rec = serveWithToken(t, scenario.server, http.MethodGet, "/api/v1/model-runs?model_key=material_balance&model_version=material_balance.v1", "dev-public-token", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("model run list endpoint failed: %d %s", rec.Code, rec.Body.String())
	}
	var listedResponse map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &listedResponse); err != nil {
		t.Fatal(err)
	}
	if int(listedResponse["total_estimate"].(float64)) != 1 {
		t.Fatalf("unexpected model run list response: %#v", listedResponse)
	}
}
