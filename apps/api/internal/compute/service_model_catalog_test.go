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

func TestHTTPModelCatalogTenantProjectSiteScope(t *testing.T) {
	svc := testValidatedService(t)
	auth, err := NewAuthenticator(`{"tokens":[
		{"name":"scope-a","token":"scope-a-token","scopes":["job:read"],"tenant_id":"tenant_a","project_id":"project_a","site_id":"site_a"},
		{"name":"global","token":"global-token","scopes":["job:read","model:write"]}
	]}`)
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()

	postCatalog := func(body []byte) ModelCatalogRecord {
		t.Helper()
		req := httptest.NewRequest(http.MethodPost, "/api/v1/model-catalog", bytes.NewReader(body))
		req.Header.Set("Authorization", "Bearer global-token")
		rec := httptest.NewRecorder()
		server.ServeHTTP(rec, req)
		if rec.Code != http.StatusCreated {
			t.Fatalf("model catalog registration failed: %d %s", rec.Code, rec.Body.String())
		}
		var record ModelCatalogRecord
		if err := json.Unmarshal(rec.Body.Bytes(), &record); err != nil {
			t.Fatal(err)
		}
		return record
	}
	request := func(method, path, token string) *httptest.ResponseRecorder {
		t.Helper()
		req := httptest.NewRequest(method, path, nil)
		req.Header.Set("Authorization", "Bearer "+token)
		rec := httptest.NewRecorder()
		server.ServeHTTP(rec, req)
		return rec
	}

	alpha := postCatalog(scopedModelCatalogBytes(t, "2026-05-30T00:00:00Z", "tenant_a", "project_a", "site_a"))
	if alpha.TenantID != "tenant_a" || alpha.ProjectID != "project_a" || alpha.SiteID != "site_a" {
		t.Fatalf("model catalog should persist tenant/project/site metadata, got %#v", alpha)
	}
	postCatalog(scopedModelCatalogBytes(t, "2026-05-30T00:01:00Z", "tenant_a", "project_a", "site_b"))
	postCatalog(scopedModelCatalogBytes(t, "2026-05-30T00:02:00Z", "tenant_b", "project_b", "site_b"))

	rec := request(http.MethodGet, "/api/v1/model-catalog", "scope-a-token")
	if rec.Code != http.StatusOK {
		t.Fatalf("scope-matching model catalog read should pass: %d %s", rec.Code, rec.Body.String())
	}
	var catalog ModelCatalogResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &catalog); err != nil {
		t.Fatal(err)
	}
	if catalog.Metadata["tenant_id"] != "tenant_a" ||
		catalog.Metadata["project_id"] != "project_a" ||
		catalog.Metadata["site_id"] != "site_a" {
		t.Fatalf("scoped catalog read should use the matching persisted snapshot, got %#v", catalog.Metadata)
	}

	rec = request(http.MethodGet, "/api/v1/model-catalog", "global-token")
	if rec.Code != http.StatusOK {
		t.Fatalf("global model catalog read should pass: %d %s", rec.Code, rec.Body.String())
	}
	catalog = ModelCatalogResponse{}
	if err := json.Unmarshal(rec.Body.Bytes(), &catalog); err != nil {
		t.Fatal(err)
	}
	if catalog.Metadata["site_id"] != "site_b" || catalog.Metadata["tenant_id"] != "tenant_b" {
		t.Fatalf("global catalog read should still see the latest persisted snapshot, got %#v", catalog.Metadata)
	}

	rec = request(http.MethodGet, "/api/v1/model-catalog/snapshots", "scope-a-token")
	if rec.Code != http.StatusOK {
		t.Fatalf("scope-matching model catalog snapshot list should pass: %d %s", rec.Code, rec.Body.String())
	}
	var snapshots ListModelCatalogSnapshotsResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &snapshots); err != nil {
		t.Fatal(err)
	}
	if snapshots.TotalEstimate != 1 ||
		len(snapshots.Items) != 1 ||
		snapshots.Items[0].TenantID != "tenant_a" ||
		snapshots.Items[0].ProjectID != "project_a" ||
		snapshots.Items[0].SiteID != "site_a" {
		t.Fatalf("scoped snapshot list should not expose cross-scope records, got %#v", snapshots)
	}

	rec = request(http.MethodGet, "/api/v1/model-catalog/material_balance", "scope-a-token")
	if rec.Code != http.StatusOK {
		t.Fatalf("scope-matching model catalog model read should pass: %d %s", rec.Code, rec.Body.String())
	}
	var model ModelCatalogModel
	if err := json.Unmarshal(rec.Body.Bytes(), &model); err != nil {
		t.Fatal(err)
	}
	if model.ModelKey != "material_balance" {
		t.Fatalf("unexpected scoped model catalog entry: %#v", model)
	}

	rec = request(http.MethodGet, "/api/v1/model-catalog/material_balance/versions/material_balance.v1/default-parameter-set/promotion-plan", "scope-a-token")
	if rec.Code != http.StatusForbidden {
		t.Fatalf("scoped promotion plan without job_id should be denied, got %d %s", rec.Code, rec.Body.String())
	}
}

func TestHTTPModelCatalogMutationTenantProjectSiteScope(t *testing.T) {
	svc := testValidatedService(t)
	auth, err := NewAuthenticator(`{"tokens":[
		{"name":"scope-a","token":"scope-a-token","scopes":["job:read","model:write"],"tenant_id":"tenant_a","project_id":"project_a","site_id":"site_a"},
		{"name":"scope-miss","token":"scope-miss-token","scopes":["model:write"],"tenant_id":"tenant_x","project_id":"project_x","site_id":"site_x"},
		{"name":"global","token":"global-token","scopes":["job:read","model:write"]}
	]}`)
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()
	ctx := context.Background()

	postCatalog := func(body []byte, token string, expectedStatus int) ModelCatalogRecord {
		t.Helper()
		req := httptest.NewRequest(http.MethodPost, "/api/v1/model-catalog", bytes.NewReader(body))
		req.Header.Set("Authorization", "Bearer "+token)
		rec := httptest.NewRecorder()
		server.ServeHTTP(rec, req)
		if rec.Code != expectedStatus {
			t.Fatalf("model catalog registration with %s got %d want %d: %s", token, rec.Code, expectedStatus, rec.Body.String())
		}
		if expectedStatus != http.StatusCreated && expectedStatus != http.StatusOK {
			return ModelCatalogRecord{}
		}
		var record ModelCatalogRecord
		if err := json.Unmarshal(rec.Body.Bytes(), &record); err != nil {
			t.Fatal(err)
		}
		return record
	}
	request := func(method, path, token, body string) *httptest.ResponseRecorder {
		t.Helper()
		req := httptest.NewRequest(method, path, strings.NewReader(body))
		req.Header.Set("Authorization", "Bearer "+token)
		rec := httptest.NewRecorder()
		server.ServeHTTP(rec, req)
		return rec
	}

	alpha := postCatalog(scopedModelCatalogBytes(t, "2026-05-30T00:00:00Z", "tenant_a", "project_a", "site_a"), "scope-a-token", http.StatusCreated)
	if alpha.TenantID != "tenant_a" || alpha.ProjectID != "project_a" || alpha.SiteID != "site_a" {
		t.Fatalf("scope-matching catalog should persist tenant/project/site metadata, got %#v", alpha)
	}
	siteBBytes := scopedModelCatalogBytes(t, "2026-05-30T00:01:00Z", "tenant_a", "project_a", "site_b")
	postCatalog(siteBBytes, "scope-a-token", http.StatusForbidden)
	snapshots, err := svc.ListModelCatalogSnapshots(ctx, ModelCatalogSnapshotFilter{CatalogID: "default", Limit: 10})
	if err != nil {
		t.Fatal(err)
	}
	if snapshots.TotalEstimate != 1 || len(snapshots.Items) != 1 || snapshots.Items[0].SiteID != "site_a" {
		t.Fatalf("cross-scope denied registration must not write a snapshot, got %#v", snapshots)
	}
	postCatalog(siteBBytes, "global-token", http.StatusCreated)

	statusPath := "/api/v1/model-catalog/material_balance/versions/material_balance.v1/default-parameter-set/status"
	statusBody := `{"parameter_set_id":"ps_material_balance_default_v1","from_status":"approved","to_status":"retired","reason":"scope regression"}`
	rec := request(http.MethodPost, statusPath, "scope-miss-token", statusBody)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("scoped status mutation without matching persisted catalog should be denied, got %d %s", rec.Code, rec.Body.String())
	}
	rec = request(http.MethodPost, statusPath, "scope-a-token", statusBody)
	if rec.Code != http.StatusCreated {
		t.Fatalf("scope-matching status mutation should pass, got %d %s", rec.Code, rec.Body.String())
	}
	var transition ModelParameterSetTransitionResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &transition); err != nil {
		t.Fatal(err)
	}
	if !transition.CreatedSnapshot || transition.FromStatus != "approved" || transition.ToStatus != "retired" {
		t.Fatalf("unexpected scoped status transition: %#v", transition)
	}
	if transition.Catalog.Metadata["tenant_id"] != "tenant_a" ||
		transition.Catalog.Metadata["project_id"] != "project_a" ||
		transition.Catalog.Metadata["site_id"] != "site_a" ||
		transition.Catalog.Models[0].Versions[0].DefaultParameterSet.Status != "retired" {
		t.Fatalf("scoped status mutation should use the matching persisted catalog, got metadata=%#v parameter_set=%#v", transition.Catalog.Metadata, transition.Catalog.Models[0].Versions[0].DefaultParameterSet)
	}

	promotionPath := "/api/v1/model-catalog/material_balance/versions/material_balance.v1/default-parameter-set/promote-approved"
	rec = request(http.MethodPost, promotionPath, "scope-a-token", `{}`)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("scoped promote-approved without job_id should be denied, got %d %s", rec.Code, rec.Body.String())
	}
}

func TestHTTPModelCatalogPromotionTenantProjectSiteScope(t *testing.T) {
	svc := testValidatedService(t)
	auth, err := NewAuthenticator(`{"tokens":[
		{"name":"scope-a","token":"scope-a-token","scopes":["job:read","model:write"],"tenant_id":"tenant_a","project_id":"project_a","site_id":"site_a"},
		{"name":"global","token":"global-token","scopes":["job:create","job:read","model:write"]}
	]}`)
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()
	ctx := context.Background()
	promotionPlanPath := "/api/v1/model-catalog/material_balance/versions/material_balance.v1/default-parameter-set/promotion-plan"
	promotionPath := "/api/v1/model-catalog/material_balance/versions/material_balance.v1/default-parameter-set/promote-approved"
	request := func(method, path, token, body string) *httptest.ResponseRecorder {
		t.Helper()
		req := httptest.NewRequest(method, path, strings.NewReader(body))
		req.Header.Set("Authorization", "Bearer "+token)
		rec := httptest.NewRecorder()
		server.ServeHTTP(rec, req)
		return rec
	}
	postCatalog := func(body []byte, token string, expectedStatus int) ModelCatalogRecord {
		t.Helper()
		rec := request(http.MethodPost, "/api/v1/model-catalog", token, string(body))
		if rec.Code != expectedStatus {
			t.Fatalf("catalog registration with %s got %d want %d: %s", token, rec.Code, expectedStatus, rec.Body.String())
		}
		var record ModelCatalogRecord
		if err := json.Unmarshal(rec.Body.Bytes(), &record); err != nil {
			t.Fatal(err)
		}
		return record
	}

	catalogBytes := scopedModelCatalogBytesWithDefaultParameterSetStatus(t, "2026-05-30T00:00:00Z", "tenant_a", "project_a", "site_a", "validated")
	alphaCatalog := postCatalog(catalogBytes, "scope-a-token", http.StatusCreated)
	if alphaCatalog.TenantID != "tenant_a" || alphaCatalog.ProjectID != "project_a" || alphaCatalog.SiteID != "site_a" {
		t.Fatalf("scope-matching catalog should persist tenant/project/site metadata, got %#v", alphaCatalog)
	}
	catalog := decodeMap(t, catalogBytes)
	models := catalog["models"].([]any)
	version := models[0].(map[string]any)["versions"].([]any)[0].(map[string]any)
	parameterSet := version["default_parameter_set"].(map[string]any)
	parameterHash := parameterSet["parameter_hash"].(string)

	if _, _, err := svc.CreateJob(ctx, scopedFixtureJobBytes(t, "job_promotion_scope_alpha", "tenant_a", "project_a", "site_a"), ""); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.RegisterWorker(ctx, compatibleWorkerRegistration("worker_promotion_scope_alpha")); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Claim(ctx, "worker_promotion_scope_alpha"); err != nil {
		t.Fatal(err)
	}
	modelRun := map[string]any{
		"schema_version":  "model_run.v1",
		"model_run_id":    "mr_promotion_scope_alpha",
		"job_id":          "job_promotion_scope_alpha",
		"model_key":       "material_balance",
		"model_version":   "material_balance.v1",
		"parameter_hash":  parameterHash,
		"input_hash":      "sha256:" + strings.Repeat("c", 64),
		"quality_metrics": map[string]any{"convergence_status": "converged"},
		"warnings":        []any{},
		"evidence_refs":   []any{},
	}
	result := map[string]any{
		"schema_version": "compute_result.v1",
		"job_id":         "job_promotion_scope_alpha",
		"job_type":       "simulation.material_balance.v1",
		"status":         StatusSucceeded,
		"summary":        map[string]any{"converged": true},
		"data":           map[string]any{},
		"quality":        map[string]any{"data_quality": "ok", "warnings": []any{}},
		"artifacts":      []any{},
		"runtime_audit":  map[string]any{"model_runs": []any{modelRun}, "timings_ms": map[string]any{}, "fallback_used": false},
	}
	if _, err := svc.Complete(ctx, "worker_promotion_scope_alpha", "job_promotion_scope_alpha", 1, result); err != nil {
		t.Fatal(err)
	}
	if _, _, err := svc.CreateJob(ctx, scopedFixtureJobBytes(t, "job_promotion_scope_beta", "tenant_b", "project_b", "site_b"), ""); err != nil {
		t.Fatal(err)
	}

	benchmarkRunBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance.benchmark_run.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	benchmarkRun := decodeMap(t, benchmarkRunBytes)
	benchmarkRun["benchmark_run_id"] = "br_promotion_scope_alpha"
	benchmarkRun["model_run_id"] = "mr_promotion_scope_alpha"
	benchmarkRun["job_id"] = "job_promotion_scope_alpha"
	benchmarkRun["evidence_refs"] = []any{"model_run:mr_promotion_scope_alpha"}
	benchmarkRun["executed_at"] = "2026-05-31T00:00:00Z"
	rec := request(http.MethodPost, "/api/v1/model-catalog/material_balance/versions/material_balance.v1/benchmark-runs", "scope-a-token", string(encodeMap(t, benchmarkRun)))
	if rec.Code != http.StatusCreated {
		t.Fatalf("scope-matching benchmark_run registration should pass, got %d %s", rec.Code, rec.Body.String())
	}

	rec = request(http.MethodGet, promotionPlanPath, "scope-a-token", "")
	if rec.Code != http.StatusForbidden {
		t.Fatalf("scoped promotion plan without job_id should be denied, got %d %s", rec.Code, rec.Body.String())
	}
	rec = request(http.MethodGet, promotionPlanPath+"?job_id=job_promotion_scope_beta", "scope-a-token", "")
	if rec.Code != http.StatusForbidden {
		t.Fatalf("scoped promotion plan with cross-scope job_id should be denied, got %d %s", rec.Code, rec.Body.String())
	}
	rec = request(http.MethodGet, promotionPlanPath+"?job_id=job_promotion_scope_alpha", "scope-a-token", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("scoped promotion plan with authorized job_id should pass, got %d %s", rec.Code, rec.Body.String())
	}
	var plan ModelParameterSetPromotionPlan
	if err := json.Unmarshal(rec.Body.Bytes(), &plan); err != nil {
		t.Fatal(err)
	}
	if !plan.CanPromoteToApproved || plan.BenchmarkCasesPassed != 1 || len(plan.CaseResults) != 1 ||
		plan.CaseResults[0].JobID != "job_promotion_scope_alpha" || !plan.CaseResults[0].Ready {
		t.Fatalf("expected scoped promotable plan from authorized job evidence only, got %#v", plan)
	}

	promotionBody := `{"parameter_set_id":"ps_material_balance_default_v1","reason":"scoped evidence promotion","metadata":{"release_ticket":"PROMO-SCOPE"}}`
	rec = request(http.MethodPost, promotionPath, "scope-a-token", promotionBody)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("scoped promote-approved without job_id should be denied, got %d %s", rec.Code, rec.Body.String())
	}
	rec = request(http.MethodPost, promotionPath+"?job_id=job_promotion_scope_beta", "scope-a-token", promotionBody)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("scoped promote-approved with cross-scope job_id should be denied, got %d %s", rec.Code, rec.Body.String())
	}
	rec = request(http.MethodPost, promotionPath+"?job_id=job_promotion_scope_alpha", "scope-a-token", promotionBody)
	if rec.Code != http.StatusCreated {
		t.Fatalf("scoped promote-approved with authorized job_id should pass, got %d %s", rec.Code, rec.Body.String())
	}
	var transition ModelParameterSetTransitionResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &transition); err != nil {
		t.Fatal(err)
	}
	if transition.FromStatus != "validated" || transition.ToStatus != "approved" ||
		transition.Catalog.Metadata["tenant_id"] != "tenant_a" ||
		transition.Catalog.Metadata["project_id"] != "project_a" ||
		transition.Catalog.Metadata["site_id"] != "site_a" ||
		transition.Catalog.Models[0].Versions[0].DefaultParameterSet.Status != "approved" {
		t.Fatalf("scoped promotion should update only matching persisted catalog, got %#v", transition)
	}
}
