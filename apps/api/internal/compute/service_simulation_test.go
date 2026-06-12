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
	"time"
)

func TestHTTPSimulationCheckMutationTenantProjectSiteScope(t *testing.T) {
	svc := testValidatedService(t)
	auth, err := NewAuthenticator(`{"tokens":[
		{"name":"scope-a","token":"scope-a-token","scopes":["job:create"],"tenant_id":"tenant_a","project_id":"project_a","site_id":"site_a"},
		{"name":"global","token":"global-token","scopes":["job:create"]}
	]}`)
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()
	ctx := context.Background()
	postSimulationCheck := func(body []byte, token string, expectedStatus int) *httptest.ResponseRecorder {
		t.Helper()
		req := httptest.NewRequest(http.MethodPost, "/api/v1/simulation-checks", bytes.NewReader(body))
		req.Header.Set("Authorization", "Bearer "+token)
		rec := httptest.NewRecorder()
		server.ServeHTTP(rec, req)
		if rec.Code != expectedStatus {
			t.Fatalf("simulation check with %s got %d want %d: %s", token, rec.Code, expectedStatus, rec.Body.String())
		}
		return rec
	}

	rec := postSimulationCheck(scopedSimulationCheckBytes(t, "sim_req_check_scope_alpha", "si_check_scope_alpha", "tenant_a", "project_a", "site_a", "", "", ""), "scope-a-token", http.StatusAccepted)
	var snapshot JobSnapshot
	if err := json.Unmarshal(rec.Body.Bytes(), &snapshot); err != nil {
		t.Fatal(err)
	}
	if snapshot.Job.JobID != "job_simcheck_sim_req_check_scope_alpha" ||
		snapshot.Job.TenantID != "tenant_a" ||
		snapshot.Job.ProjectID != "project_a" ||
		snapshot.Job.SiteID != "site_a" {
		t.Fatalf("scope-matching simulation check should create scoped job, got %#v", snapshot.Job)
	}
	record, err := svc.GetSimulationInput(ctx, "si_check_scope_alpha")
	if err != nil {
		t.Fatal(err)
	}
	if record.TenantID != "tenant_a" || record.ProjectID != "project_a" || record.SiteID != "site_a" {
		t.Fatalf("embedded simulation_input should inherit simulation request scope before registry write, got %#v", record)
	}

	postSimulationCheck(scopedSimulationCheckBytes(t, "sim_req_check_scope_cross_site", "si_check_scope_cross_site", "tenant_a", "project_a", "site_b", "", "", ""), "scope-a-token", http.StatusForbidden)
	if _, err := svc.GetJob(ctx, "job_simcheck_sim_req_check_scope_cross_site"); err == nil {
		t.Fatalf("cross-scope denied simulation check must not write a job")
	}
	if _, err := svc.GetSimulationInput(ctx, "si_check_scope_cross_site"); err == nil {
		t.Fatalf("cross-scope denied simulation check must not auto-write simulation input")
	}

	postSimulationCheck(scopedSimulationCheckBytes(t, "sim_req_check_scope_input_cross", "si_check_scope_input_cross", "tenant_a", "project_a", "site_a", "tenant_a", "project_b", "site_a"), "scope-a-token", http.StatusForbidden)
	if _, err := svc.GetJob(ctx, "job_simcheck_sim_req_check_scope_input_cross"); err == nil {
		t.Fatalf("cross-scope embedded input must not write a job")
	}
	if _, err := svc.GetSimulationInput(ctx, "si_check_scope_input_cross"); err == nil {
		t.Fatalf("cross-scope embedded input must not write a simulation input")
	}

	auditEvents, _, auditTotal, err := svc.store.ListMutationAuditEvents(ctx, MutationAuditFilter{TargetObject: "SimulationInput", Limit: 10})
	if err != nil {
		t.Fatal(err)
	}
	if auditTotal != 1 || len(auditEvents) != 1 || auditEvents[0].TargetID != "si_check_scope_alpha" {
		t.Fatalf("denied simulation checks must not write simulation input audit events, total=%d events=%#v", auditTotal, auditEvents)
	}
}

func TestSimulationCheckEndpointCreatesComputeJob(t *testing.T) {
	svc := testValidatedService(t)
	auth, err := NewAuthenticator("")
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()
	assertRequiredCapabilities := func(jobPayload map[string]any, expected []string) {
		t.Helper()
		execution := mapValue(jobPayload, "execution")
		if execution == nil {
			t.Fatalf("expected job execution payload, got %#v", jobPayload)
		}
		capabilities, ok := execution["required_capabilities"].([]any)
		if !ok {
			t.Fatalf("expected required_capabilities array, got %#v", execution["required_capabilities"])
		}
		if len(capabilities) != len(expected) {
			t.Fatalf("unexpected required_capabilities length: got %#v want %#v", capabilities, expected)
		}
		for index, capability := range expected {
			if capabilities[index] != capability {
				t.Fatalf("unexpected required_capabilities: got %#v want %#v", capabilities, expected)
			}
		}
	}
	validBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "milp_material_balance.simulation_request.v1.json"))
	if err != nil {
		t.Fatal(err)
	}

	req := httptest.NewRequest(http.MethodPost, "/api/v1/simulation-checks", bytes.NewReader(validBytes))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec := httptest.NewRecorder()
	server.ServeHTTP(rec, req)
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
	assertRequiredCapabilities(jobPayload, []string{"material_balance", "ode"})

	req = httptest.NewRequest(http.MethodPost, "/api/v1/simulation-checks", bytes.NewReader(validBytes))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
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

	referenceOnlyBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance.simulation_request.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/simulation-checks", bytes.NewReader(referenceOnlyBytes))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusNotFound || !strings.Contains(rec.Body.String(), "simulation input not found") {
		t.Fatalf("unregistered reference-only simulation check should be rejected, got %d %s", rec.Code, rec.Body.String())
	}

	processGraphRequestBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance_process_graph.simulation_request.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/simulation-checks", bytes.NewReader(processGraphRequestBytes))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusNotFound || !strings.Contains(rec.Body.String(), "process graph not found") {
		t.Fatalf("unregistered process_graph simulation check should be rejected, got %d %s", rec.Code, rec.Body.String())
	}

	processGraphBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance_3_node.process_graph.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/process-graphs", bytes.NewReader(processGraphBytes))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
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
	req = httptest.NewRequest(http.MethodPost, "/api/v1/process-graphs", bytes.NewReader(processGraphBytes))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("duplicate process graph register should be idempotent, got %d %s", rec.Code, rec.Body.String())
	}
	req = httptest.NewRequest(http.MethodGet, "/api/v1/process-graphs/pg_material_balance_minimal?version=1", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("process graph get failed: %d %s", rec.Code, rec.Body.String())
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/simulation-checks", bytes.NewReader(processGraphRequestBytes))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
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
	req = httptest.NewRequest(http.MethodPost, "/api/v1/simulation-checks", bytes.NewReader(encodeMap(t, asmProcessGraphRequest)))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusBadRequest || !strings.Contains(rec.Body.String(), "process_graph lookup only supports simulation.material_balance.v1") {
		t.Fatalf("ASM/UDM process_graph simulation check should stay unsupported, got %d %s", rec.Code, rec.Body.String())
	}

	modelRunRequestBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance_model_run.simulation_request.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/simulation-checks", bytes.NewReader(modelRunRequestBytes))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusNotFound || !strings.Contains(rec.Body.String(), "model run not found") {
		t.Fatalf("unregistered model_run simulation check should be rejected, got %d %s", rec.Code, rec.Body.String())
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
	req = httptest.NewRequest(http.MethodPost, "/api/v1/simulation-checks", bytes.NewReader(modelRunRequestBytes))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
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

	inputBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance_minimal.simulation_input.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/simulation-inputs", bytes.NewReader(inputBytes))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
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
	req = httptest.NewRequest(http.MethodPost, "/api/v1/simulation-inputs", bytes.NewReader(inputBytes))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("duplicate simulation input register should be idempotent, got %d %s", rec.Code, rec.Body.String())
	}
	req = httptest.NewRequest(http.MethodGet, "/api/v1/simulation-inputs/si_material_balance_minimal", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("simulation input get failed: %d %s", rec.Code, rec.Body.String())
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/simulation-checks", bytes.NewReader(referenceOnlyBytes))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
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
	assertRequiredCapabilities(referencePayload, []string{"material_balance", "ode"})

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
		t.Run("reference-only "+tc.name, func(t *testing.T) {
			caseInputBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", tc.inputFixture))
			if err != nil {
				t.Fatal(err)
			}
			req := httptest.NewRequest(http.MethodPost, "/api/v1/simulation-inputs", bytes.NewReader(caseInputBytes))
			req.Header.Set("Authorization", "Bearer dev-public-token")
			rec := httptest.NewRecorder()
			server.ServeHTTP(rec, req)
			if rec.Code != http.StatusCreated {
				t.Fatalf("simulation input register failed: %d %s", rec.Code, rec.Body.String())
			}

			requestBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", tc.requestFixture))
			if err != nil {
				t.Fatal(err)
			}
			req = httptest.NewRequest(http.MethodPost, "/api/v1/simulation-checks", bytes.NewReader(requestBytes))
			req.Header.Set("Authorization", "Bearer dev-public-token")
			rec = httptest.NewRecorder()
			server.ServeHTTP(rec, req)
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
			assertRequiredCapabilities(modelPayload, tc.capabilities)
		})
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/simulation-checks", bytes.NewReader(validBytes))
	req.Header.Set("Authorization", "Bearer dev-worker-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("worker token should not create simulation checks, got %d %s", rec.Code, rec.Body.String())
	}
}
