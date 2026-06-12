package compute

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestDefaultParameterSetPromotionPlanEndpoint(t *testing.T) {
	svc := testValidatedService(t)
	auth, err := NewAuthenticator("")
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()
	catalogBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance.model_catalog.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	catalog := decodeMap(t, catalogBytes)
	models := catalog["models"].([]any)
	version := models[0].(map[string]any)["versions"].([]any)[0].(map[string]any)
	parameterSet := version["default_parameter_set"].(map[string]any)
	parameterSet["status"] = "validated"
	parameterHash := parameterSet["parameter_hash"].(string)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/model-catalog", bytes.NewReader(encodeMap(t, catalog)))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec := httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("model catalog registration failed: %d %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/model-catalog/material_balance/versions/material_balance.v1/default-parameter-set/promotion-plan", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("promotion plan before benchmark failed: %d %s", rec.Code, rec.Body.String())
	}
	var plan ModelParameterSetPromotionPlan
	if err := json.Unmarshal(rec.Body.Bytes(), &plan); err != nil {
		t.Fatal(err)
	}
	if plan.CanPromoteToApproved || plan.CurrentStatus != "validated" || plan.BenchmarkCasesChecked != 1 ||
		!containsString(plan.BlockingReasons, "benchmark_run_missing_for_parameter_set") {
		t.Fatalf("expected missing benchmark blocker, got %#v", plan)
	}

	ctx := context.Background()
	promotionPath := "/api/v1/model-catalog/material_balance/versions/material_balance.v1/default-parameter-set/promote-approved"
	promotionBody := `{"parameter_set_id":"ps_material_balance_default_v1","reason":"regression evidence gate","metadata":{"release_ticket":"PROMO-1"}}`
	req = httptest.NewRequest(http.MethodPost, promotionPath, strings.NewReader(promotionBody))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusConflict {
		t.Fatalf("promotion without benchmark evidence should conflict, got %d %s", rec.Code, rec.Body.String())
	}
	var appErr AppError
	if err := json.Unmarshal(rec.Body.Bytes(), &appErr); err != nil {
		t.Fatal(err)
	}
	blockingReasons, ok := appErr.Details["blocking_reasons"].([]any)
	if appErr.ErrorCode != CodeParameterSetTransitionFailed || !ok || len(blockingReasons) != 1 ||
		blockingReasons[0] != "benchmark_run_missing_for_parameter_set" {
		t.Fatalf("expected benchmark promotion blocker, got %#v", appErr)
	}
	blockedCatalog, err := svc.ModelCatalog(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if blockedCatalog.Models[0].Versions[0].DefaultParameterSet.Status != "validated" {
		t.Fatalf("blocked promotion should not mutate catalog: %#v", blockedCatalog.Models[0].Versions[0].DefaultParameterSet)
	}
	req = httptest.NewRequest(http.MethodPost, promotionPath, strings.NewReader(promotionBody))
	req.Header.Set("Authorization", "Bearer dev-worker-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("worker token should not promote parameter set, got %d %s", rec.Code, rec.Body.String())
	}

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
	req = httptest.NewRequest(http.MethodPost, "/api/v1/model-catalog/material_balance/versions/material_balance.v1/benchmark-runs", bytes.NewReader(encodeMap(t, benchmarkRun)))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("benchmark run record failed: %d %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/model-catalog/material_balance/versions/material_balance.v1/default-parameter-set/promotion-plan", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("promotion plan after benchmark failed: %d %s", rec.Code, rec.Body.String())
	}
	plan = ModelParameterSetPromotionPlan{}
	if err := json.Unmarshal(rec.Body.Bytes(), &plan); err != nil {
		t.Fatal(err)
	}
	if !plan.CanPromoteToApproved || plan.WouldModifyCatalog || plan.BenchmarkCasesPassed != 1 ||
		len(plan.BlockingReasons) != 0 || len(plan.CaseResults) != 1 || !plan.CaseResults[0].Ready {
		t.Fatalf("expected promotable advisory plan without mutation, got %#v", plan)
	}

	req = httptest.NewRequest(http.MethodPost, promotionPath, strings.NewReader(promotionBody))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("benchmark-backed promotion failed: %d %s", rec.Code, rec.Body.String())
	}
	var transition ModelParameterSetTransitionResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &transition); err != nil {
		t.Fatal(err)
	}
	promotedParameterSet := transition.Catalog.Models[0].Versions[0].DefaultParameterSet
	if !transition.CreatedSnapshot || transition.FromStatus != "validated" || transition.ToStatus != "approved" ||
		transition.ParameterSetID != "ps_material_balance_default_v1" || promotedParameterSet == nil ||
		promotedParameterSet.Status != "approved" {
		t.Fatalf("unexpected benchmark-backed transition response: %#v", transition)
	}
	lastTransition, ok := promotedParameterSet.Metadata["last_status_transition"].(map[string]any)
	if !ok {
		t.Fatalf("expected last_status_transition metadata, got %#v", promotedParameterSet.Metadata)
	}
	transitionMetadata, ok := lastTransition["metadata"].(map[string]any)
	if !ok || transitionMetadata["release_ticket"] != "PROMO-1" ||
		transitionMetadata["promotion_source"] != "default_parameter_set_promotion_plan" ||
		transitionMetadata["benchmark_cases_checked"] != float64(1) ||
		transitionMetadata["benchmark_cases_passed"] != float64(1) {
		t.Fatalf("unexpected promotion transition metadata: %#v", lastTransition)
	}
	promotedCatalog, err := svc.ModelCatalog(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if promotedCatalog.Models[0].Versions[0].DefaultParameterSet.Status != "approved" {
		t.Fatalf("promotion should persist approved status: %#v", promotedCatalog.Models[0].Versions[0].DefaultParameterSet)
	}
	auditEvents, _, _, err := svc.store.ListMutationAuditEvents(ctx, MutationAuditFilter{Limit: 10})
	if err != nil {
		t.Fatal(err)
	}
	auditByType := map[string]MutationAuditRecord{}
	for _, event := range auditEvents {
		if event.TargetObject != "ModelCatalog" && event.TargetObject != "BenchmarkRun" && event.TargetObject != "ModelParameterSet" {
			continue
		}
		auditByType[event.EventType] = event
	}
	if len(auditByType) != 3 {
		t.Fatalf("expected catalog register, benchmark run, and promotion audit events, got %#v", auditByType)
	}
	benchmarkAudit := mutationAuditMap(t, auditByType[benchmarkRunRegisteredEvent])
	if benchmarkAudit["who"] != "dev-public" ||
		benchmarkAudit["where"] != "POST /api/v1/model-catalog/material_balance/versions/material_balance.v1/benchmark-runs" ||
		benchmarkAudit["target_object"] != "BenchmarkRun" ||
		benchmarkAudit["target_id"] != "br_material_balance_promotion" ||
		benchmarkAudit["action"] != "model.benchmark_run.register" {
		t.Fatalf("unexpected benchmark run audit envelope: %#v", benchmarkAudit)
	}
	benchmarkAfter, ok := benchmarkAudit["after"].(map[string]any)
	if !ok || benchmarkAfter["status"] != "passed" || benchmarkAfter["job_id"] != "job_material_balance_minimal" || benchmarkAfter["evidence_ref_count"] != float64(1) {
		t.Fatalf("benchmark run audit should include compact after state, got %#v", benchmarkAudit["after"])
	}
	promotionAudit := mutationAuditMap(t, auditByType[modelParameterSetPromotedApprovedEvent])
	if promotionAudit["who"] != "dev-public" ||
		promotionAudit["where"] != "POST "+promotionPath ||
		promotionAudit["target_object"] != "ModelParameterSet" ||
		promotionAudit["target_id"] != "material_balance:material_balance.v1:ps_material_balance_default_v1" ||
		promotionAudit["action"] != "model.parameter_set.promote_approved" ||
		promotionAudit["reason"] != "regression evidence gate" {
		t.Fatalf("unexpected parameter set promotion audit envelope: %#v", promotionAudit)
	}
	promotionBefore, ok := promotionAudit["before"].(map[string]any)
	if !ok || promotionBefore["status"] != "validated" {
		t.Fatalf("promotion audit should include validated before state, got %#v", promotionAudit["before"])
	}
	promotionAfter, ok := promotionAudit["after"].(map[string]any)
	if !ok || promotionAfter["status"] != "approved" || promotionAfter["created_snapshot"] != true || promotionAfter["catalog_payload_hash"] != transition.CatalogPayloadHash {
		t.Fatalf("promotion audit should include approved after state, got %#v", promotionAudit["after"])
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/model-catalog/material_balance/versions/material_balance.v1/default-parameter-set/promotion-plan", nil)
	req.Header.Set("Authorization", "Bearer dev-worker-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("worker token should not read promotion plan, got %d %s", rec.Code, rec.Body.String())
	}
}
