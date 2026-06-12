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

func TestBenchmarkCaseScheduleRunEndpoint(t *testing.T) {
	svc := testValidatedService(t)
	auth, err := NewAuthenticator("")
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()

	inputBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance_minimal.simulation_input.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	req := httptest.NewRequest(http.MethodPost, "/api/v1/simulation-inputs", bytes.NewReader(inputBytes))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec := httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("simulation input register failed: %d %s", rec.Code, rec.Body.String())
	}

	requestBody := `{"request_id":"bench_req_material_balance_minimal","metadata":{"project_id":"project_benchmark"}}`
	path := "/api/v1/model-catalog/material_balance/versions/material_balance.v1/benchmark-cases/bc_material_balance_minimal_v1/schedule-run"
	req = httptest.NewRequest(http.MethodPost, path, strings.NewReader(requestBody))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusAccepted {
		t.Fatalf("benchmark case schedule-run failed: %d %s", rec.Code, rec.Body.String())
	}
	var snapshot JobSnapshot
	if err := json.Unmarshal(rec.Body.Bytes(), &snapshot); err != nil {
		t.Fatal(err)
	}
	if snapshot.Job.Status != StatusQueued ||
		snapshot.Job.JobID != "job_benchmark_bench_req_material_balance_minimal" ||
		snapshot.Job.JobType != "simulation.material_balance.v1" ||
		snapshot.Job.RequestID != "bench_req_material_balance_minimal" ||
		snapshot.Job.ProjectID != "project_benchmark" {
		t.Fatalf("unexpected scheduled benchmark job: %#v", snapshot.Job)
	}
	var jobPayload map[string]any
	if err := json.Unmarshal(snapshot.Job.InputJSON, &jobPayload); err != nil {
		t.Fatal(err)
	}
	if payload := mapValue(jobPayload, "payload"); stringValue(payload, "simulation_input_id") != "si_material_balance_minimal" {
		t.Fatalf("scheduled benchmark should use registered simulation input payload, got %#v", jobPayload["payload"])
	}
	assertRequiredCapabilities(t, jobPayload, []string{"material_balance", "ode"})
	metadata := mapValue(jobPayload, "metadata")
	if metadata["source"] != "model_catalog_benchmark_case" ||
		metadata["benchmark_case_id"] != "bc_material_balance_minimal_v1" ||
		metadata["parameter_set_id"] != "ps_material_balance_default_v1" ||
		metadata["benchmark_run_required"] != true {
		t.Fatalf("unexpected benchmark job metadata: %#v", metadata)
	}

	benchmarkRuns, err := svc.ListBenchmarkRuns(context.Background(), BenchmarkRunFilter{
		ModelKey:     "material_balance",
		ModelVersion: "material_balance.v1",
		Limit:        10,
	})
	if err != nil {
		t.Fatal(err)
	}
	if benchmarkRuns.TotalEstimate != 0 || len(benchmarkRuns.Items) != 0 {
		t.Fatalf("schedule-run must not record benchmark_run history, got %#v", benchmarkRuns)
	}
	scheduledEvents, err := svc.Events(context.Background(), snapshot.Job.JobID)
	if err != nil {
		t.Fatal(err)
	}
	scheduleAuditCounts := map[string]int{}
	for _, event := range scheduledEvents {
		if event.EventType != "job.created" && event.EventType != "job.queued" {
			continue
		}
		scheduleAuditCounts[event.EventType]++
		audit := eventAuditMap(t, event)
		if audit["who"] != "dev-public" ||
			audit["where"] != "POST "+path ||
			audit["target_object"] != "ComputeJob" ||
			audit["target_id"] != snapshot.Job.JobID {
			t.Fatalf("unexpected benchmark schedule job audit envelope for %s: %#v", event.EventType, audit)
		}
	}
	if scheduleAuditCounts["job.created"] != 1 || scheduleAuditCounts["job.queued"] != 1 {
		t.Fatalf("benchmark schedule-run should write one create and one queue audit event, got counts=%#v events=%#v", scheduleAuditCounts, scheduledEvents)
	}

	req = httptest.NewRequest(http.MethodPost, path, strings.NewReader(requestBody))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("duplicate benchmark schedule-run should be idempotent, got %d %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodPost, path, strings.NewReader(requestBody))
	req.Header.Set("Authorization", "Bearer dev-worker-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("worker token should not schedule benchmark runs, got %d %s", rec.Code, rec.Body.String())
	}

	asmPath := "/api/v1/model-catalog/asm1/versions/asm1.v1/benchmark-cases/bc_asm1_independent_v1/schedule-run"
	req = httptest.NewRequest(http.MethodPost, asmPath, strings.NewReader(`{"request_id":"bench_req_asm1"}`))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("ASM benchmark without default parameter set should not schedule, got %d %s", rec.Code, rec.Body.String())
	}
}
