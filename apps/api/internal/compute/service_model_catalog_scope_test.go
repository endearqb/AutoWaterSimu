package compute

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

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
