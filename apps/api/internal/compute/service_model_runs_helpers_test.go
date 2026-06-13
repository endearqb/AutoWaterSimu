package compute

import (
	"context"
	"net/http"
	"strings"
	"testing"
)

type completedModelRunScenario struct {
	ctx        context.Context
	svc        *Service
	server     http.Handler
	jobID      string
	modelRunID string
}

func newCompletedModelRunScenario(t *testing.T) completedModelRunScenario {
	t.Helper()

	svc := testValidatedService(t)
	ctx := context.Background()
	jobID := "job_material_balance_minimal"
	modelRunID := "mr_material_balance_test"

	if _, _, err := svc.CreateJob(ctx, fixtureJobBytes(t), ""); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.RegisterWorker(ctx, compatibleWorkerRegistration("worker_1")); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Claim(ctx, "worker_1"); err != nil {
		t.Fatal(err)
	}
	completed, err := svc.Complete(ctx, "worker_1", jobID, 1, materialBalanceComputeResultWithModelRun(modelRunID, jobID))
	if err != nil {
		t.Fatal(err)
	}
	if completed.Job.Status != StatusSucceeded {
		t.Fatalf("expected succeeded job, got %s", completed.Job.Status)
	}

	auth, err := NewAuthenticator("")
	if err != nil {
		t.Fatal(err)
	}
	return completedModelRunScenario{
		ctx:        ctx,
		svc:        svc,
		server:     NewServer(svc, auth, nil).Routes(),
		jobID:      jobID,
		modelRunID: modelRunID,
	}
}

func materialBalanceModelRunDocument(modelRunID, jobID string) map[string]any {
	defaultParameterHash := builtInModelCatalog("2026-05-30T00:00:00Z").Models[0].Versions[0].DefaultParameterSet.ParameterHash
	return map[string]any{
		"schema_version":  "model_run.v1",
		"model_run_id":    modelRunID,
		"job_id":          jobID,
		"model_key":       "material_balance",
		"model_version":   "material_balance.v1",
		"parameter_hash":  defaultParameterHash,
		"input_hash":      "sha256:" + strings.Repeat("b", 64),
		"quality_metrics": map[string]any{"convergence_status": "converged"},
		"warnings":        []any{},
		"evidence_refs":   []any{},
	}
}

func materialBalanceComputeResultWithModelRun(modelRunID, jobID string) map[string]any {
	return map[string]any{
		"schema_version": "compute_result.v1",
		"job_id":         jobID,
		"job_type":       "simulation.material_balance.v1",
		"status":         StatusSucceeded,
		"summary":        map[string]any{"converged": true},
		"data":           map[string]any{},
		"quality":        map[string]any{"data_quality": "ok", "warnings": []any{}},
		"artifacts":      []any{},
		"risk_findings": []any{
			map[string]any{
				"risk_code":     "material_balance_smoke_ok",
				"severity":      "info",
				"title":         "Material balance smoke run completed",
				"description":   "The minimal material balance smoke run completed without warnings.",
				"evidence_refs": []any{"model_run:" + modelRunID},
			},
		},
		"runtime_audit": map[string]any{
			"model_runs":    []any{materialBalanceModelRunDocument(modelRunID, jobID)},
			"timings_ms":    map[string]any{},
			"fallback_used": false,
		},
	}
}

func (scenario completedModelRunScenario) benchmarkRunDocument(t *testing.T) map[string]any {
	t.Helper()
	benchmarkRun := decodeMap(t, validContractFixture(t, "material_balance.benchmark_run.v1.json"))
	benchmarkRun["benchmark_run_id"] = "br_material_balance_test"
	benchmarkRun["model_run_id"] = scenario.modelRunID
	benchmarkRun["job_id"] = scenario.jobID
	benchmarkRun["evidence_refs"] = []any{
		"model_run:" + scenario.modelRunID,
		"evidence_package:evidence_" + scenario.jobID,
	}
	return benchmarkRun
}

func (scenario completedModelRunScenario) resultExplanationDocument(t *testing.T) map[string]any {
	t.Helper()
	explanation := decodeMap(t, validContractFixture(t, "material_balance.result_explanation.v1.json"))
	explanation["evidence_refs"] = []any{"evidence_package:evidence_" + scenario.jobID, "model_run:" + scenario.modelRunID}
	statements := explanation["statements"].([]any)
	statements[0].(map[string]any)["evidence_refs"] = []any{"model_run:" + scenario.modelRunID}
	return explanation
}
