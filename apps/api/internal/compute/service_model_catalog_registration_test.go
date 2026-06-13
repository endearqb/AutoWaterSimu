package compute

import (
	"encoding/json"
	"net/http"
	"testing"
)

func TestModelCatalogRegistrationEndpoint(t *testing.T) {
	_, server := newModelCatalogTestServer(t, "")
	catalogBytes := modelCatalogExampleBytes(t)

	rec := serveModelCatalogRequest(t, server, http.MethodPost, "/api/v1/model-catalog", catalogBytes, "dev-public-token")
	if rec.Code != http.StatusCreated {
		t.Fatalf("model catalog registration failed: %d %s", rec.Code, rec.Body.String())
	}
	var record ModelCatalogRecord
	if err := json.Unmarshal(rec.Body.Bytes(), &record); err != nil {
		t.Fatal(err)
	}
	if record.CatalogID != "default" || record.SchemaVersion != "model_catalog.v1" || record.PayloadHash == "" {
		t.Fatalf("unexpected model catalog record: %#v", record)
	}

	rec = serveModelCatalogRequest(t, server, http.MethodPost, "/api/v1/model-catalog", catalogBytes, "dev-public-token")
	if rec.Code != http.StatusOK {
		t.Fatalf("duplicate model catalog registration should be idempotent, got %d %s", rec.Code, rec.Body.String())
	}

	rec = serveModelCatalogRequest(t, server, http.MethodGet, "/api/v1/model-catalog", nil, "dev-public-token")
	if rec.Code != http.StatusOK {
		t.Fatalf("persisted model catalog endpoint failed: %d %s", rec.Code, rec.Body.String())
	}
	var response ModelCatalogResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatal(err)
	}
	if response.GeneratedAt != "2026-05-30T00:00:00Z" ||
		response.Models[0].Versions[0].DefaultParameterSet == nil ||
		response.Models[0].Versions[0].DefaultParameterSet.ParameterHash != "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" {
		t.Fatalf("expected persisted model catalog response, got %#v", response)
	}

	rec = serveModelCatalogRequest(t, server, http.MethodGet, "/api/v1/model-catalog/material_balance", nil, "dev-public-token")
	if rec.Code != http.StatusOK {
		t.Fatalf("model catalog by key failed: %d %s", rec.Code, rec.Body.String())
	}
	var model ModelCatalogModel
	if err := json.Unmarshal(rec.Body.Bytes(), &model); err != nil {
		t.Fatal(err)
	}
	if model.ModelKey != "material_balance" {
		t.Fatalf("unexpected model response: %#v", model)
	}

	rec = serveModelCatalogRequest(t, server, http.MethodGet, "/api/v1/model-catalog/asm1", nil, "dev-public-token")
	if rec.Code != http.StatusNotFound {
		t.Fatalf("missing model should return 404, got %d %s", rec.Code, rec.Body.String())
	}
	rec = serveModelCatalogRequest(t, server, http.MethodPost, "/api/v1/model-catalog", catalogBytes, "dev-worker-token")
	if rec.Code != http.StatusForbidden {
		t.Fatalf("worker token should not write model catalog, got %d %s", rec.Code, rec.Body.String())
	}
}
