package compute

import (
	"encoding/json"
	"net/http"
	"testing"
)

func TestContractValidationEndpoint(t *testing.T) {
	_, server := newContractsTestServer(t)

	validCases := []struct {
		name           string
		fixture        string
		contractSchema string
	}{
		{
			name:           "simulation request",
			fixture:        "material_balance.simulation_request.v1.json",
			contractSchema: "simulation_request.v1.json",
		},
		{
			name:           "constraint draft",
			fixture:        "material_balance.constraint_draft.v1.json",
			contractSchema: "constraint_draft.v1.json",
		},
		{
			name:           "result explanation",
			fixture:        "material_balance.result_explanation.v1.json",
			contractSchema: "result_explanation.v1.json",
		},
		{
			name:           "model catalog",
			fixture:        "material_balance.model_catalog.v1.json",
			contractSchema: "model_catalog.v1.json",
		},
	}
	for _, tc := range validCases {
		t.Run(tc.name, func(t *testing.T) {
			rec := serveContractRequest(t, server, http.MethodPost, "/api/v1/contracts/validate", validContractExampleBytes(t, tc.fixture), "dev-public-token")
			if rec.Code != http.StatusOK {
				t.Fatalf("validation endpoint failed: %d %s", rec.Code, rec.Body.String())
			}
			var response ContractValidationResponse
			if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
				t.Fatal(err)
			}
			if !response.Valid || response.ContractSchema != tc.contractSchema || len(response.Errors) != 0 {
				t.Fatalf("unexpected valid contract response: %#v", response)
			}
		})
	}

	invalidCases := []struct {
		name           string
		body           []byte
		contractSchema string
	}{
		{
			name:           "invalid simulation request",
			body:           []byte(`{"schema_version":"simulation_request.v1","request_id":""}`),
			contractSchema: "simulation_request.v1.json",
		},
		{
			name: "unknown future schema",
			body: []byte(`{"schema_version":"future_draft.v1"}`),
		},
	}
	for _, tc := range invalidCases {
		t.Run(tc.name, func(t *testing.T) {
			rec := serveContractRequest(t, server, http.MethodPost, "/api/v1/contracts/validate", tc.body, "dev-public-token")
			if rec.Code != http.StatusOK {
				t.Fatalf("invalid contract should return validation response, got %d %s", rec.Code, rec.Body.String())
			}
			var response ContractValidationResponse
			if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
				t.Fatal(err)
			}
			if response.Valid || len(response.Errors) == 0 {
				t.Fatalf("unexpected invalid contract response: %#v", response)
			}
			if tc.contractSchema != "" && response.ContractSchema != tc.contractSchema {
				t.Fatalf("unexpected invalid contract schema: got %q want %q", response.ContractSchema, tc.contractSchema)
			}
		})
	}

	rec := serveContractRequest(t, server, http.MethodPost, "/api/v1/contracts/validate", validContractExampleBytes(t, "material_balance.simulation_request.v1.json"), "dev-worker-token")
	if rec.Code != http.StatusForbidden {
		t.Fatalf("worker token should not validate contracts, got %d %s", rec.Code, rec.Body.String())
	}
}
