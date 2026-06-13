package compute

import (
	"encoding/json"
	"net/http"
	"strings"
	"testing"
)

func TestSimulationCheckEndpointCreatesJobFromProcessGraph(t *testing.T) {
	_, server := newSimulationTestServer(t)
	processGraphBytes := validContractFixture(t, "material_balance_3_node.process_graph.v1.json")

	rec := serveWithToken(t, server, http.MethodPost, "/api/v1/process-graphs", "dev-public-token", processGraphBytes)
	if rec.Code != http.StatusCreated {
		t.Fatalf("process graph register failed: %d %s", rec.Code, rec.Body.String())
	}
	var processGraphRecord ProcessGraphRecord
	if err := json.Unmarshal(rec.Body.Bytes(), &processGraphRecord); err != nil {
		t.Fatal(err)
	}
	if processGraphRecord.ProcessGraphID != "pg_material_balance_minimal" ||
		processGraphRecord.Version != 1 ||
		processGraphRecord.PayloadHash == "" ||
		processGraphRecord.RequestedBy != "dev-public" {
		t.Fatalf("unexpected process graph record: %#v", processGraphRecord)
	}

	rec = serveWithToken(t, server, http.MethodPost, "/api/v1/process-graphs", "dev-public-token", processGraphBytes)
	if rec.Code != http.StatusOK {
		t.Fatalf("duplicate process graph register should be idempotent, got %d %s", rec.Code, rec.Body.String())
	}

	rec = serveWithToken(t, server, http.MethodGet, "/api/v1/process-graphs/pg_material_balance_minimal?version=1", "dev-public-token", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("process graph get failed: %d %s", rec.Code, rec.Body.String())
	}

	processGraphRequestBytes := validContractFixture(t, "material_balance_process_graph.simulation_request.v1.json")
	rec = serveWithToken(t, server, http.MethodPost, "/api/v1/simulation-checks", "dev-public-token", processGraphRequestBytes)
	if rec.Code != http.StatusAccepted {
		t.Fatalf("registered process_graph simulation check should create a job, got %d %s", rec.Code, rec.Body.String())
	}
	var processGraphJob JobSnapshot
	if err := json.Unmarshal(rec.Body.Bytes(), &processGraphJob); err != nil {
		t.Fatal(err)
	}
	if processGraphJob.Job.JobID != "job_simcheck_sim_req_process_graph_material_balance_minimal" ||
		processGraphJob.Job.RequestID != "sim_req_process_graph_material_balance_minimal" {
		t.Fatalf("unexpected process graph simulation check job: %#v", processGraphJob.Job)
	}
	var processGraphPayload map[string]any
	if err := json.Unmarshal(processGraphJob.Job.InputJSON, &processGraphPayload); err != nil {
		t.Fatal(err)
	}
	generatedPayload := mapValue(processGraphPayload, "payload")
	if stringValue(generatedPayload, "simulation_input_id") != "si_pg_material_balance_minimal" ||
		stringValue(generatedPayload, "process_graph_id") != "pg_material_balance_minimal" {
		t.Fatalf("process graph simulation check should generate simulation_input payload, got %#v", processGraphPayload["payload"])
	}

	asmProcessGraphRequest := decodeMap(t, processGraphRequestBytes)
	asmProcessGraphRequest["request_id"] = "sim_req_process_graph_asm1_unsupported"
	asmProcessGraphRequest["job_type"] = "simulation.asm1.v1"
	rec = serveWithToken(t, server, http.MethodPost, "/api/v1/simulation-checks", "dev-public-token", encodeMap(t, asmProcessGraphRequest))
	if rec.Code != http.StatusBadRequest || !strings.Contains(rec.Body.String(), "process_graph lookup only supports simulation.material_balance.v1") {
		t.Fatalf("ASM/UDM process_graph simulation check should stay unsupported, got %d %s", rec.Code, rec.Body.String())
	}
}
