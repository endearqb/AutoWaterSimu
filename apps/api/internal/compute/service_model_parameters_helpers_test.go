package compute

import (
	"context"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

const (
	defaultParameterSetPromotionPlanPath   = "/api/v1/model-catalog/material_balance/versions/material_balance.v1/default-parameter-set/promotion-plan"
	defaultParameterSetPromoteApprovedPath = "/api/v1/model-catalog/material_balance/versions/material_balance.v1/default-parameter-set/promote-approved"
	defaultParameterSetPromotionBody       = `{"parameter_set_id":"ps_material_balance_default_v1","reason":"regression evidence gate","metadata":{"release_ticket":"PROMO-1"}}`
)

func registerValidatedDefaultParameterCatalog(t *testing.T, server http.Handler) string {
	t.Helper()
	catalog := decodeMap(t, modelCatalogExampleBytes(t))
	models := catalog["models"].([]any)
	version := models[0].(map[string]any)["versions"].([]any)[0].(map[string]any)
	parameterSet := version["default_parameter_set"].(map[string]any)
	parameterSet["status"] = "validated"
	parameterHash := parameterSet["parameter_hash"].(string)

	rec := serveModelCatalogRequest(t, server, http.MethodPost, "/api/v1/model-catalog", encodeMap(t, catalog), "dev-public-token")
	if rec.Code != http.StatusCreated {
		t.Fatalf("model catalog registration failed: %d %s", rec.Code, rec.Body.String())
	}
	return parameterHash
}

func recordDefaultParameterPromotionEvidence(t *testing.T, svc *Service, server http.Handler, parameterHash string) {
	t.Helper()
	ctx := context.Background()
	if _, _, err := svc.CreateJob(ctx, fixtureJobBytes(t), ""); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.RegisterWorker(ctx, compatibleWorkerRegistration("worker_promotion")); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Claim(ctx, "worker_promotion"); err != nil {
		t.Fatal(err)
	}
	modelRun := map[string]any{
		"schema_version":  "model_run.v1",
		"model_run_id":    "mr_material_balance_promotion",
		"job_id":          "job_material_balance_minimal",
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
		"job_id":         "job_material_balance_minimal",
		"job_type":       "simulation.material_balance.v1",
		"status":         StatusSucceeded,
		"summary":        map[string]any{"converged": true},
		"data":           map[string]any{},
		"quality":        map[string]any{"data_quality": "ok", "warnings": []any{}},
		"artifacts":      []any{},
		"runtime_audit":  map[string]any{"model_runs": []any{modelRun}, "timings_ms": map[string]any{}, "fallback_used": false},
	}
	if _, err := svc.Complete(ctx, "worker_promotion", "job_material_balance_minimal", 1, result); err != nil {
		t.Fatal(err)
	}

	benchmarkRunBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance.benchmark_run.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	benchmarkRun := decodeMap(t, benchmarkRunBytes)
	benchmarkRun["benchmark_run_id"] = "br_material_balance_promotion"
	benchmarkRun["model_run_id"] = "mr_material_balance_promotion"
	benchmarkRun["job_id"] = "job_material_balance_minimal"
	benchmarkRun["evidence_refs"] = []any{"model_run:mr_material_balance_promotion"}
	benchmarkRun["executed_at"] = "2026-05-31T00:00:00Z"
	rec := serveModelCatalogRequest(t, server, http.MethodPost, "/api/v1/model-catalog/material_balance/versions/material_balance.v1/benchmark-runs", encodeMap(t, benchmarkRun), "dev-public-token")
	if rec.Code != http.StatusCreated {
		t.Fatalf("benchmark run record failed: %d %s", rec.Code, rec.Body.String())
	}
}
