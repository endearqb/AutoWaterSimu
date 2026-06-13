package compute

import (
	"encoding/json"
	"testing"
)

func TestValidatedCompletePersistsModelRun(t *testing.T) {
	scenario := newCompletedModelRunScenario(t)

	stored, err := scenario.svc.GetModelRun(scenario.ctx, scenario.modelRunID)
	if err != nil {
		t.Fatal(err)
	}
	var decoded map[string]any
	if err := json.Unmarshal(stored, &decoded); err != nil {
		t.Fatal(err)
	}
	if decoded["model_run_id"] != scenario.modelRunID || decoded["model_key"] != "material_balance" {
		t.Fatalf("unexpected persisted model run: %#v", decoded)
	}
	listed, err := scenario.svc.ListModelRuns(scenario.ctx, ModelRunFilter{ModelKey: "material_balance", ModelVersion: "material_balance.v1"})
	if err != nil {
		t.Fatal(err)
	}
	if listed.TotalEstimate != 1 || len(listed.Items) != 1 {
		t.Fatalf("expected one listed model run, got %#v", listed)
	}
	filtered, err := scenario.svc.ListModelRuns(scenario.ctx, ModelRunFilter{ModelKey: "asm1"})
	if err != nil {
		t.Fatal(err)
	}
	if filtered.TotalEstimate != 0 || len(filtered.Items) != 0 {
		t.Fatalf("unexpected model run filter result: %#v", filtered)
	}
	resultView, err := scenario.svc.Result(scenario.ctx, scenario.jobID)
	if err != nil {
		t.Fatal(err)
	}
	modelRuns, ok := resultView["model_runs"].([]any)
	if !ok || len(modelRuns) != 1 {
		t.Fatalf("expected result view to include model_runs, got %#v", resultView["model_runs"])
	}
	summaryView, ok := resultView["summary"].(map[string]any)
	if !ok {
		t.Fatalf("expected result summary object, got %#v", resultView["summary"])
	}
	riskFindings, ok := summaryView["risk_findings"].([]any)
	if !ok || len(riskFindings) != 1 {
		t.Fatalf("expected result summary to include risk_findings, got %#v", summaryView["risk_findings"])
	}
}
