package compute

import (
	"encoding/json"
	"net/http"
	"testing"
)

func TestSimulationCheckEndpointCreatesComputeJob(t *testing.T) {
	_, server := newSimulationTestServer(t)

	validBytes := validContractFixture(t, "milp_material_balance.simulation_request.v1.json")
	rec := serveWithToken(t, server, http.MethodPost, "/api/v1/simulation-checks", "dev-public-token", validBytes)
	if rec.Code != http.StatusAccepted {
		t.Fatalf("simulation check create failed: %d %s", rec.Code, rec.Body.String())
	}
	var created JobSnapshot
	if err := json.Unmarshal(rec.Body.Bytes(), &created); err != nil {
		t.Fatal(err)
	}
	if created.Job.JobID != "job_simcheck_sim_req_milp_material_balance_minimal" ||
		created.Job.RequestID != "sim_req_milp_material_balance_minimal" ||
		created.Job.SourceSystem != "milp" ||
		created.Job.ProjectID != "project_demo" ||
		created.Job.Status != StatusQueued {
		t.Fatalf("unexpected simulation check job: %#v", created.Job)
	}
	var jobPayload map[string]any
	if err := json.Unmarshal(created.Job.InputJSON, &jobPayload); err != nil {
		t.Fatal(err)
	}
	if asRecord := mapValue(jobPayload, "payload"); stringValue(asRecord, "schema_version") != "simulation_input.v1" {
		t.Fatalf("simulation check job should embed simulation_input payload, got %#v", jobPayload["payload"])
	}
	contextValue := mapValue(jobPayload, "context")
	externalRefs := mapValue(contextValue, "external_refs")
	if stringValue(externalRefs, "plan_id") != "plan_milp_minimal" {
		t.Fatalf("expected plan id in job context external_refs, got %#v", externalRefs)
	}
	assertRequiredCapabilities(t, jobPayload, []string{"material_balance", "ode"})

	rec = serveWithToken(t, server, http.MethodPost, "/api/v1/simulation-checks", "dev-public-token", validBytes)
	if rec.Code != http.StatusOK {
		t.Fatalf("duplicate simulation check should be idempotent, got %d %s", rec.Code, rec.Body.String())
	}
	var duplicate JobSnapshot
	if err := json.Unmarshal(rec.Body.Bytes(), &duplicate); err != nil {
		t.Fatal(err)
	}
	if duplicate.Job.JobID != created.Job.JobID {
		t.Fatalf("duplicate simulation check returned a different job: %#v", duplicate.Job)
	}
}

func TestSimulationCheckEndpointRejectsWorkerToken(t *testing.T) {
	_, server := newSimulationTestServer(t)

	rec := serveWithToken(t, server, http.MethodPost, "/api/v1/simulation-checks", "dev-worker-token", validContractFixture(t, "milp_material_balance.simulation_request.v1.json"))
	if rec.Code != http.StatusForbidden {
		t.Fatalf("worker token should not create simulation checks, got %d %s", rec.Code, rec.Body.String())
	}
}
