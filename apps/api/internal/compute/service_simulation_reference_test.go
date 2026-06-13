package compute

import (
	"encoding/json"
	"net/http"
	"testing"
)

func TestSimulationCheckEndpointCreatesJobFromRegisteredSimulationInput(t *testing.T) {
	_, server := newSimulationTestServer(t)
	inputBytes := validContractFixture(t, "material_balance_minimal.simulation_input.v1.json")

	rec := serveWithToken(t, server, http.MethodPost, "/api/v1/simulation-inputs", "dev-public-token", inputBytes)
	if rec.Code != http.StatusCreated {
		t.Fatalf("simulation input register failed: %d %s", rec.Code, rec.Body.String())
	}
	var inputRecord SimulationInputRecord
	if err := json.Unmarshal(rec.Body.Bytes(), &inputRecord); err != nil {
		t.Fatal(err)
	}
	if inputRecord.SimulationInputID != "si_material_balance_minimal" ||
		inputRecord.PayloadHash == "" ||
		inputRecord.SourceSystem != "compute-api" ||
		inputRecord.RequestedBy != "dev-public" {
		t.Fatalf("unexpected simulation input record: %#v", inputRecord)
	}

	rec = serveWithToken(t, server, http.MethodPost, "/api/v1/simulation-inputs", "dev-public-token", inputBytes)
	if rec.Code != http.StatusOK {
		t.Fatalf("duplicate simulation input register should be idempotent, got %d %s", rec.Code, rec.Body.String())
	}

	rec = serveWithToken(t, server, http.MethodGet, "/api/v1/simulation-inputs/si_material_balance_minimal", "dev-public-token", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("simulation input get failed: %d %s", rec.Code, rec.Body.String())
	}

	rec = serveWithToken(t, server, http.MethodPost, "/api/v1/simulation-checks", "dev-public-token", validContractFixture(t, "material_balance.simulation_request.v1.json"))
	if rec.Code != http.StatusAccepted {
		t.Fatalf("registered reference-only simulation check should create a job, got %d %s", rec.Code, rec.Body.String())
	}
	var referenceJob JobSnapshot
	if err := json.Unmarshal(rec.Body.Bytes(), &referenceJob); err != nil {
		t.Fatal(err)
	}
	if referenceJob.Job.JobID != "job_simcheck_sim_req_material_balance_minimal" ||
		referenceJob.Job.RequestID != "sim_req_material_balance_minimal" {
		t.Fatalf("unexpected reference simulation check job: %#v", referenceJob.Job)
	}
	var referencePayload map[string]any
	if err := json.Unmarshal(referenceJob.Job.InputJSON, &referencePayload); err != nil {
		t.Fatal(err)
	}
	if payload := mapValue(referencePayload, "payload"); stringValue(payload, "simulation_input_id") != "si_material_balance_minimal" {
		t.Fatalf("reference simulation check should use registered payload, got %#v", referencePayload["payload"])
	}
	assertRequiredCapabilities(t, referencePayload, []string{"material_balance", "ode"})
}

func TestSimulationCheckEndpointCreatesJobsForRegisteredModelInputs(t *testing.T) {
	for _, tc := range []struct {
		name           string
		inputFixture   string
		requestFixture string
		jobID          string
		requestID      string
		inputID        string
		jobType        string
		capabilities   []string
	}{
		{
			name:           "asm1slim",
			inputFixture:   "asm1slim_independent.simulation_input.v1.json",
			requestFixture: "asm1slim_independent.simulation_request.v1.json",
			jobID:          "job_simcheck_sim_req_asm1slim_independent",
			requestID:      "sim_req_asm1slim_independent",
			inputID:        "si_asm1slim_independent",
			jobType:        "simulation.asm1slim.v1",
			capabilities:   []string{"asm1slim", "ode"},
		},
		{
			name:           "asm1",
			inputFixture:   "asm1_independent.simulation_input.v1.json",
			requestFixture: "asm1_independent.simulation_request.v1.json",
			jobID:          "job_simcheck_sim_req_asm1_independent",
			requestID:      "sim_req_asm1_independent",
			inputID:        "si_asm1_independent",
			jobType:        "simulation.asm1.v1",
			capabilities:   []string{"asm1", "ode"},
		},
		{
			name:           "asm3",
			inputFixture:   "asm3_independent.simulation_input.v1.json",
			requestFixture: "asm3_independent.simulation_request.v1.json",
			jobID:          "job_simcheck_sim_req_asm3_independent",
			requestID:      "sim_req_asm3_independent",
			inputID:        "si_asm3_independent",
			jobType:        "simulation.asm3.v1",
			capabilities:   []string{"asm3", "ode"},
		},
		{
			name:           "udm",
			inputFixture:   "udm_independent.simulation_input.v1.json",
			requestFixture: "udm_independent.simulation_request.v1.json",
			jobID:          "job_simcheck_sim_req_udm_independent",
			requestID:      "sim_req_udm_independent",
			inputID:        "si_udm_independent",
			jobType:        "simulation.udm.v1",
			capabilities:   []string{"udm", "ode"},
		},
	} {
		t.Run(tc.name, func(t *testing.T) {
			_, server := newSimulationTestServer(t)

			rec := serveWithToken(t, server, http.MethodPost, "/api/v1/simulation-inputs", "dev-public-token", validContractFixture(t, tc.inputFixture))
			if rec.Code != http.StatusCreated {
				t.Fatalf("simulation input register failed: %d %s", rec.Code, rec.Body.String())
			}

			rec = serveWithToken(t, server, http.MethodPost, "/api/v1/simulation-checks", "dev-public-token", validContractFixture(t, tc.requestFixture))
			if rec.Code != http.StatusAccepted {
				t.Fatalf("registered %s simulation check should create a job, got %d %s", tc.name, rec.Code, rec.Body.String())
			}
			var modelJob JobSnapshot
			if err := json.Unmarshal(rec.Body.Bytes(), &modelJob); err != nil {
				t.Fatal(err)
			}
			if modelJob.Job.JobID != tc.jobID ||
				modelJob.Job.RequestID != tc.requestID ||
				modelJob.Job.JobType != tc.jobType {
				t.Fatalf("unexpected %s simulation check job: %#v", tc.name, modelJob.Job)
			}
			var modelPayload map[string]any
			if err := json.Unmarshal(modelJob.Job.InputJSON, &modelPayload); err != nil {
				t.Fatal(err)
			}
			payload := mapValue(modelPayload, "payload")
			if stringValue(payload, "simulation_input_id") != tc.inputID ||
				stringValue(payload, "job_type") != tc.jobType {
				t.Fatalf("%s simulation check should use registered payload, got %#v", tc.name, modelPayload["payload"])
			}
			assertRequiredCapabilities(t, modelPayload, tc.capabilities)
		})
	}
}
