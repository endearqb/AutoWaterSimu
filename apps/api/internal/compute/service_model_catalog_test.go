package compute

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestModelCatalogEndpoint(t *testing.T) {
	svc := testValidatedService(t)
	auth, err := NewAuthenticator("")
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()

	catalog, err := svc.ModelCatalog(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if catalog.SchemaVersion != "model_catalog.v1" || len(catalog.Models) != 5 {
		t.Fatalf("unexpected model catalog: %#v", catalog)
	}
	modelsByKey := map[string]ModelCatalogModel{}
	for _, model := range catalog.Models {
		modelsByKey[model.ModelKey] = model
	}
	materialModel, ok := modelsByKey["material_balance"]
	if !ok {
		t.Fatalf("expected material_balance catalog entry, got %#v", catalog.Models)
	}
	if materialModel.Versions[0].DefaultParameterSet == nil ||
		materialModel.Versions[0].DefaultParameterSet.Status != "approved" {
		t.Fatalf("expected approved default parameter set: %#v", materialModel.Versions[0])
	}
	if len(materialModel.Versions[0].BenchmarkCases) != 1 ||
		materialModel.Versions[0].BenchmarkCases[0].Status != "validated" {
		t.Fatalf("expected validated benchmark case: %#v", materialModel.Versions[0].BenchmarkCases)
	}
	for _, modelKey := range []string{"asm1slim", "asm1", "asm3", "udm"} {
		model, ok := modelsByKey[modelKey]
		if !ok {
			t.Fatalf("expected %s catalog entry, got %#v", modelKey, catalog.Models)
		}
		if len(model.Versions) != 1 || model.Versions[0].Status != "active" {
			t.Fatalf("expected active %s model version, got %#v", modelKey, model.Versions)
		}
		if model.Versions[0].DefaultParameterSet != nil {
			t.Fatalf("ASM/UDM built-in catalog entries should not define default parameter sets yet: %#v", model.Versions[0])
		}
		if len(model.Versions[0].BenchmarkCases) != 1 || model.Versions[0].BenchmarkCases[0].Status != "validated" {
			t.Fatalf("expected validated %s benchmark case, got %#v", modelKey, model.Versions[0].BenchmarkCases)
		}
	}

	req := httptest.NewRequest(http.MethodGet, "/api/v1/model-catalog", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec := httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("model catalog endpoint failed: %d %s", rec.Code, rec.Body.String())
	}
	var response ModelCatalogResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatal(err)
	}
	if response.SchemaVersion != "model_catalog.v1" || len(response.Models) != 5 {
		t.Fatalf("unexpected model catalog response: %#v", response)
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/model-catalog/asm1", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("built-in asm1 model catalog by key failed: %d %s", rec.Code, rec.Body.String())
	}
	var builtinModel ModelCatalogModel
	if err := json.Unmarshal(rec.Body.Bytes(), &builtinModel); err != nil {
		t.Fatal(err)
	}
	if builtinModel.ModelKey != "asm1" || len(builtinModel.Versions) != 1 {
		t.Fatalf("unexpected built-in asm1 model response: %#v", builtinModel)
	}

	catalogBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance.model_catalog.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/model-catalog", bytes.NewReader(catalogBytes))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
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

	req = httptest.NewRequest(http.MethodPost, "/api/v1/model-catalog", bytes.NewReader(catalogBytes))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("duplicate model catalog registration should be idempotent, got %d %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/model-catalog", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("persisted model catalog endpoint failed: %d %s", rec.Code, rec.Body.String())
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatal(err)
	}
	if response.GeneratedAt != "2026-05-30T00:00:00Z" ||
		response.Models[0].Versions[0].DefaultParameterSet == nil ||
		response.Models[0].Versions[0].DefaultParameterSet.ParameterHash != "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" {
		t.Fatalf("expected persisted model catalog response, got %#v", response)
	}

	transitionBody := `{"parameter_set_id":"ps_material_balance_default_v1","from_status":"approved","to_status":"retired","reason":"regression test"}`
	req = httptest.NewRequest(http.MethodPost, "/api/v1/model-catalog/material_balance/versions/material_balance.v1/default-parameter-set/status", strings.NewReader(transitionBody))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("parameter set status transition failed: %d %s", rec.Code, rec.Body.String())
	}
	var transition ModelParameterSetTransitionResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &transition); err != nil {
		t.Fatal(err)
	}
	if !transition.CreatedSnapshot || transition.FromStatus != "approved" || transition.ToStatus != "retired" ||
		transition.Catalog.Models[0].Versions[0].DefaultParameterSet.Status != "retired" {
		t.Fatalf("unexpected parameter set transition response: %#v", transition)
	}
	req = httptest.NewRequest(http.MethodGet, "/api/v1/model-catalog/snapshots?limit=1", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("model catalog snapshot list failed: %d %s", rec.Code, rec.Body.String())
	}
	var snapshotList ListModelCatalogSnapshotsResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &snapshotList); err != nil {
		t.Fatal(err)
	}
	if snapshotList.TotalEstimate != 2 || len(snapshotList.Items) != 1 || snapshotList.NextCursor == "" {
		t.Fatalf("expected first page of two catalog snapshots, got %#v", snapshotList)
	}
	if snapshotList.Items[0].PayloadHash != transition.CatalogPayloadHash {
		t.Fatalf("newest snapshot should be the transition snapshot, got %#v", snapshotList.Items[0])
	}
	req = httptest.NewRequest(http.MethodGet, "/api/v1/model-catalog/snapshots?cursor="+url.QueryEscape(snapshotList.NextCursor), nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("model catalog snapshot second page failed: %d %s", rec.Code, rec.Body.String())
	}
	snapshotList = ListModelCatalogSnapshotsResponse{}
	if err := json.Unmarshal(rec.Body.Bytes(), &snapshotList); err != nil {
		t.Fatal(err)
	}
	if snapshotList.TotalEstimate != 2 || len(snapshotList.Items) != 1 || snapshotList.NextCursor != "" {
		t.Fatalf("expected second page of catalog snapshots, got %#v", snapshotList)
	}

	auditEvents, _, auditTotal, err := svc.store.ListMutationAuditEvents(context.Background(), MutationAuditFilter{Limit: 10})
	if err != nil {
		t.Fatal(err)
	}
	if auditTotal != 2 || len(auditEvents) != 2 {
		t.Fatalf("expected catalog register and status mutation audit events only, total=%d events=%#v", auditTotal, auditEvents)
	}
	auditByType := map[string]MutationAuditRecord{}
	for _, event := range auditEvents {
		auditByType[event.EventType] = event
	}
	catalogAudit := mutationAuditMap(t, auditByType[modelCatalogRegisteredEvent])
	if catalogAudit["who"] != "dev-public" ||
		catalogAudit["where"] != "POST /api/v1/model-catalog" ||
		catalogAudit["target_object"] != "ModelCatalog" ||
		catalogAudit["target_id"] != "default" ||
		catalogAudit["action"] != "model.catalog.register" {
		t.Fatalf("unexpected model catalog audit envelope: %#v", catalogAudit)
	}
	catalogAfter, ok := catalogAudit["after"].(map[string]any)
	if !ok || catalogAfter["payload_hash"] != record.PayloadHash {
		t.Fatalf("catalog audit should include compact after hash, got %#v", catalogAudit["after"])
	}
	statusAudit := mutationAuditMap(t, auditByType[modelParameterSetStatusChangedEvent])
	if statusAudit["who"] != "dev-public" ||
		statusAudit["where"] != "POST /api/v1/model-catalog/material_balance/versions/material_balance.v1/default-parameter-set/status" ||
		statusAudit["target_object"] != "ModelParameterSet" ||
		statusAudit["target_id"] != "material_balance:material_balance.v1:ps_material_balance_default_v1" ||
		statusAudit["action"] != "model.parameter_set.status_update" ||
		statusAudit["reason"] != "regression test" {
		t.Fatalf("unexpected parameter set status audit envelope: %#v", statusAudit)
	}
	statusBefore, ok := statusAudit["before"].(map[string]any)
	if !ok || statusBefore["status"] != "approved" {
		t.Fatalf("status audit should include approved before state, got %#v", statusAudit["before"])
	}
	statusAfter, ok := statusAudit["after"].(map[string]any)
	if !ok || statusAfter["status"] != "retired" || statusAfter["catalog_payload_hash"] != transition.CatalogPayloadHash {
		t.Fatalf("status audit should include retired after state, got %#v", statusAudit["after"])
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/model-catalog/material_balance/versions/material_balance.v1/default-parameter-set/status", strings.NewReader(`{"from_status":"retired","to_status":"approved"}`))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusConflict {
		t.Fatalf("invalid parameter set transition should conflict, got %d %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/model-catalog/material_balance/versions/material_balance.v1/default-parameter-set/status", strings.NewReader(`{"to_status":"retired"}`))
	req.Header.Set("Authorization", "Bearer dev-worker-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("worker token should not update parameter set status, got %d %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/model-catalog/material_balance", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
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

	req = httptest.NewRequest(http.MethodGet, "/api/v1/model-catalog/asm1", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("missing model should return 404, got %d %s", rec.Code, rec.Body.String())
	}
	req = httptest.NewRequest(http.MethodGet, "/api/v1/model-catalog", nil)
	req.Header.Set("Authorization", "Bearer dev-worker-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("worker token should not read model catalog, got %d %s", rec.Code, rec.Body.String())
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/model-catalog", bytes.NewReader(catalogBytes))
	req.Header.Set("Authorization", "Bearer dev-worker-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("worker token should not write model catalog, got %d %s", rec.Code, rec.Body.String())
	}
}
