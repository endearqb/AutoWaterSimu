package compute

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

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
