package compute

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"testing"
	"time"
)

func TestSimulationCheckEndpointCreatesJobFromModelRunReplay(t *testing.T) {
	svc, server := newSimulationTestServer(t)

	rec := serveWithToken(t, server, http.MethodPost, "/api/v1/simulation-checks", "dev-public-token", validContractFixture(t, "milp_material_balance.simulation_request.v1.json"))
	if rec.Code != http.StatusAccepted {
		t.Fatalf("source simulation check create failed: %d %s", rec.Code, rec.Body.String())
	}
	var created JobSnapshot
	if err := json.Unmarshal(rec.Body.Bytes(), &created); err != nil {
		t.Fatal(err)
	}

	replayModelRun := map[string]any{
		"schema_version":  "model_run.v1",
		"model_run_id":    "mr_replay_source_material_balance",
		"job_id":          created.Job.JobID,
		"model_key":       "material_balance",
		"model_version":   "material_balance.v1",
		"parameter_hash":  "sha256:" + strings.Repeat("a", 64),
		"input_hash":      "sha256:" + strings.Repeat("b", 64),
		"quality_metrics": map[string]any{"convergence_status": "completed"},
		"warnings":        []any{},
		"evidence_refs":   []any{"job:" + created.Job.JobID},
	}
	if err := svc.store.InsertModelRuns(context.Background(), created.Job.JobID, []json.RawMessage{mustJSON(replayModelRun)}, time.Now().UTC()); err != nil {
		t.Fatal(err)
	}

	rec = serveWithToken(t, server, http.MethodPost, "/api/v1/simulation-checks", "dev-public-token", validContractFixture(t, "material_balance_model_run.simulation_request.v1.json"))
	if rec.Code != http.StatusAccepted {
		t.Fatalf("registered model_run simulation check should create a job, got %d %s", rec.Code, rec.Body.String())
	}
	var modelRunReplayJob JobSnapshot
	if err := json.Unmarshal(rec.Body.Bytes(), &modelRunReplayJob); err != nil {
		t.Fatal(err)
	}
	if modelRunReplayJob.Job.JobID != "job_simcheck_sim_req_model_run_material_balance_minimal" ||
		modelRunReplayJob.Job.RequestID != "sim_req_model_run_material_balance_minimal" {
		t.Fatalf("unexpected model_run replay simulation check job: %#v", modelRunReplayJob.Job)
	}
	var modelRunReplayPayload map[string]any
	if err := json.Unmarshal(modelRunReplayJob.Job.InputJSON, &modelRunReplayPayload); err != nil {
		t.Fatal(err)
	}
	if payload := mapValue(modelRunReplayPayload, "payload"); stringValue(payload, "simulation_input_id") != "si_milp_material_balance_minimal" {
		t.Fatalf("model_run replay should reuse source job simulation_input payload, got %#v", modelRunReplayPayload["payload"])
	}
}
