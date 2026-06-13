package compute

import (
	"encoding/json"
	"net/http"
	"testing"
)

func TestBenchmarkRunEndpointRecordsCompletedModelRun(t *testing.T) {
	scenario := newCompletedModelRunScenario(t)
	benchmarkRun := scenario.benchmarkRunDocument(t)

	rec := serveWithToken(t, scenario.server, http.MethodPost, "/api/v1/model-catalog/material_balance/versions/material_balance.v1/benchmark-runs", "dev-public-token", encodeMap(t, benchmarkRun))
	if rec.Code != http.StatusCreated {
		t.Fatalf("benchmark run record failed: %d %s", rec.Code, rec.Body.String())
	}
	var benchmarkRecord BenchmarkRunRecord
	if err := json.Unmarshal(rec.Body.Bytes(), &benchmarkRecord); err != nil {
		t.Fatal(err)
	}
	if benchmarkRecord.BenchmarkRunID != "br_material_balance_test" ||
		benchmarkRecord.Status != "passed" ||
		benchmarkRecord.PayloadHash == "" {
		t.Fatalf("unexpected benchmark run record: %#v", benchmarkRecord)
	}

	rec = serveWithToken(t, scenario.server, http.MethodPost, "/api/v1/model-catalog/material_balance/versions/material_balance.v1/benchmark-runs", "dev-public-token", encodeMap(t, benchmarkRun))
	if rec.Code != http.StatusOK {
		t.Fatalf("duplicate benchmark run should be idempotent, got %d %s", rec.Code, rec.Body.String())
	}
	rec = serveWithToken(t, scenario.server, http.MethodGet, "/api/v1/model-catalog/material_balance/versions/material_balance.v1/benchmark-runs?benchmark_case_id=bc_material_balance_minimal_v1", "dev-public-token", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("benchmark run list failed: %d %s", rec.Code, rec.Body.String())
	}
	var benchmarkList ListBenchmarkRunsResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &benchmarkList); err != nil {
		t.Fatal(err)
	}
	if benchmarkList.TotalEstimate != 1 || len(benchmarkList.Items) != 1 {
		t.Fatalf("unexpected benchmark run list: %#v", benchmarkList)
	}
	rec = serveWithToken(t, scenario.server, http.MethodGet, "/api/v1/benchmark-runs/br_material_balance_test", "dev-public-token", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("benchmark run get failed: %d %s", rec.Code, rec.Body.String())
	}
}

func TestBenchmarkRunEndpointRejectsWorkerToken(t *testing.T) {
	scenario := newCompletedModelRunScenario(t)

	rec := serveWithToken(t, scenario.server, http.MethodPost, "/api/v1/model-catalog/material_balance/versions/material_balance.v1/benchmark-runs", "dev-worker-token", encodeMap(t, scenario.benchmarkRunDocument(t)))
	if rec.Code != http.StatusForbidden {
		t.Fatalf("worker token should not record benchmark runs, got %d %s", rec.Code, rec.Body.String())
	}
}
