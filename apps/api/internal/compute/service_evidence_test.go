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
