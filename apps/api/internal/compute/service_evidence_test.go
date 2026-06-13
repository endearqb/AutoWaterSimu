package compute

import (
	"context"
	"strings"
	"testing"
)

func TestProductionReadinessBlocksHighRiskFindings(t *testing.T) {
	svc := testValidatedService(t)
	ctx := context.Background()
	job := decodeMap(t, fixtureJobBytes(t))
	job["job_id"] = "job_material_balance_high_risk"
	job["request_id"] = "req_material_balance_high_risk"
	job["idempotency_key"] = "idem_material_balance_high_risk"
	payload := job["payload"].(map[string]any)
	payload["simulation_input_id"] = "si_material_balance_high_risk"
	payload["process_graph_id"] = "pg_material_balance_high_risk"
	contextMap := job["context"].(map[string]any)
	contextMap["trace_id"] = "trace_material_balance_high_risk"
	if _, _, err := svc.CreateJob(ctx, encodeMap(t, job), ""); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.RegisterWorker(ctx, compatibleWorkerRegistration("worker_high_risk")); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Claim(ctx, "worker_high_risk"); err != nil {
		t.Fatal(err)
	}
	defaultParameterHash := builtInModelCatalog("2026-05-30T00:00:00Z").Models[0].Versions[0].DefaultParameterSet.ParameterHash
	modelRun := map[string]any{
		"schema_version":  "model_run.v1",
		"model_run_id":    "mr_material_balance_high_risk",
		"job_id":          "job_material_balance_high_risk",
		"model_key":       "material_balance",
		"model_version":   "material_balance.v1",
		"parameter_hash":  defaultParameterHash,
		"input_hash":      "sha256:" + strings.Repeat("c", 64),
		"quality_metrics": map[string]any{"convergence_status": "converged"},
		"warnings":        []any{},
		"evidence_refs":   []any{},
	}
	result := map[string]any{
		"schema_version": "compute_result.v1",
		"job_id":         "job_material_balance_high_risk",
		"job_type":       "simulation.material_balance.v1",
		"status":         StatusSucceeded,
		"summary":        map[string]any{"converged": true},
		"data":           map[string]any{},
		"quality":        map[string]any{"data_quality": "ok", "warnings": []any{}},
		"artifacts":      []any{},
		"risk_findings": []any{
			map[string]any{
				"risk_code":     "effluent_limit_exceeded",
				"severity":      "high",
				"title":         "Effluent limit exceeded",
				"description":   "The simulated effluent concentration exceeds the review threshold.",
				"evidence_refs": []any{"model_run:mr_material_balance_high_risk"},
			},
		},
		"runtime_audit": map[string]any{"model_runs": []any{modelRun}, "timings_ms": map[string]any{}, "fallback_used": false},
	}
	if _, err := svc.Complete(ctx, "worker_high_risk", "job_material_balance_high_risk", 1, result); err != nil {
		t.Fatal(err)
	}
	readiness, err := svc.ProductionReadiness(ctx, "job_material_balance_high_risk")
	if err != nil {
		t.Fatal(err)
	}
	if readiness.ProductionReady ||
		readiness.ReadinessStatus != "blocked" ||
		readiness.RiskFindingsSummary.BySeverity["high"] != 1 ||
		len(readiness.RiskFindingsSummary.Blocking) != 1 ||
		readiness.RiskFindingsSummary.Blocking[0] != "effluent_limit_exceeded" {
		t.Fatalf("expected high risk finding to block production readiness, got %#v", readiness)
	}
	foundBlockingCheck := false
	for _, check := range readiness.Checks {
		if check.CheckID == "risk_findings_no_high_or_critical" && check.Status == "failed" {
			foundBlockingCheck = true
		}
	}
	if !foundBlockingCheck {
		t.Fatalf("expected failed risk finding check, got %#v", readiness.Checks)
	}
}

func TestEvidenceGovernanceUsesJobScopedModelCatalog(t *testing.T) {
	svc := testValidatedService(t)
	ctx := context.Background()

	alphaCatalog := decodeMap(t, scopedModelCatalogBytesWithDefaultParameterSetStatus(t, "2026-06-13T09:00:00Z", "tenant_a", "project_a", "site_a", "approved"))
	models := alphaCatalog["models"].([]any)
	version := models[0].(map[string]any)["versions"].([]any)[0].(map[string]any)
	parameterSet := version["default_parameter_set"].(map[string]any)
	parameterHash := parameterSet["parameter_hash"].(string)
	if _, _, err := svc.RegisterModelCatalog(ctx, encodeMap(t, alphaCatalog), "compute-api", "catalog-test"); err != nil {
		t.Fatal(err)
	}
	if _, _, err := svc.RegisterModelCatalog(ctx, scopedModelCatalogBytesWithDefaultParameterSetStatus(t, "2026-06-13T10:00:00Z", "tenant_b", "project_b", "site_b", "retired"), "compute-api", "catalog-test"); err != nil {
		t.Fatal(err)
	}

	jobID := "job_evidence_catalog_scope_alpha"
	workerID := "worker_evidence_catalog_scope_alpha"
	if _, _, err := svc.CreateJob(ctx, scopedFixtureJobBytes(t, jobID, "tenant_a", "project_a", "site_a"), ""); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.RegisterWorker(ctx, compatibleWorkerRegistration(workerID)); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Claim(ctx, workerID); err != nil {
		t.Fatal(err)
	}
	modelRun := map[string]any{
		"schema_version":  "model_run.v1",
		"model_run_id":    "mr_evidence_catalog_scope_alpha",
		"job_id":          jobID,
		"model_key":       "material_balance",
		"model_version":   "material_balance.v1",
		"parameter_hash":  parameterHash,
		"input_hash":      "sha256:" + strings.Repeat("d", 64),
		"quality_metrics": map[string]any{"convergence_status": "converged"},
		"warnings":        []any{},
		"evidence_refs":   []any{},
	}
	result := map[string]any{
		"schema_version": "compute_result.v1",
		"job_id":         jobID,
		"job_type":       "simulation.material_balance.v1",
		"status":         StatusSucceeded,
		"summary":        map[string]any{"converged": true},
		"data":           map[string]any{},
		"quality":        map[string]any{"data_quality": "ok", "warnings": []any{}},
		"artifacts":      []any{},
		"runtime_audit":  map[string]any{"model_runs": []any{modelRun}, "timings_ms": map[string]any{}, "fallback_used": false},
	}
	if _, err := svc.Complete(ctx, workerID, jobID, 1, result); err != nil {
		t.Fatal(err)
	}

	evidence, _, err := svc.EvidencePackage(ctx, jobID)
	if err != nil {
		t.Fatal(err)
	}
	governance := mapValue(evidence, "governance")
	if governance == nil || !boolValue(governance, "production_allowed") {
		t.Fatalf("tenant_a evidence governance should use tenant_a approved catalog, got %#v", governance)
	}
	refs, ok := governance["model_version_refs"].([]any)
	if !ok || len(refs) != 1 {
		t.Fatalf("expected one model_version_ref, got %#v", governance["model_version_refs"])
	}
	ref, ok := refs[0].(map[string]any)
	if !ok || ref["parameter_set_status"] != "approved" || ref["parameter_hash"] != parameterHash {
		t.Fatalf("evidence governance should not use latest cross-scope catalog, got %#v", refs[0])
	}
	readiness, err := svc.ProductionReadiness(ctx, jobID)
	if err != nil {
		t.Fatal(err)
	}
	if !readiness.ProductionReady || readiness.ReadinessStatus != "ready_for_external_approval" {
		t.Fatalf("production readiness should follow tenant_a evidence governance, got %#v", readiness)
	}
}
