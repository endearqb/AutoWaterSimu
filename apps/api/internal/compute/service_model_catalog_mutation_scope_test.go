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
