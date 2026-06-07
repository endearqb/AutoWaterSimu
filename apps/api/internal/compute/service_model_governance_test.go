package compute

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestValidatedCompletePersistsModelRun(t *testing.T) {
	svc := testValidatedService(t)
	ctx := context.Background()
	if _, _, err := svc.CreateJob(ctx, fixtureJobBytes(t), ""); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.RegisterWorker(ctx, compatibleWorkerRegistration("worker_1")); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Claim(ctx, "worker_1"); err != nil {
		t.Fatal(err)
	}
	defaultParameterHash := builtInModelCatalog("2026-05-30T00:00:00Z").Models[0].Versions[0].DefaultParameterSet.ParameterHash
	modelRun := map[string]any{
		"schema_version":  "model_run.v1",
		"model_run_id":    "mr_material_balance_test",
		"job_id":          "job_material_balance_minimal",
		"model_key":       "material_balance",
		"model_version":   "material_balance.v1",
		"parameter_hash":  defaultParameterHash,
		"input_hash":      "sha256:" + strings.Repeat("b", 64),
		"quality_metrics": map[string]any{"convergence_status": "converged"},
		"warnings":        []any{},
		"evidence_refs":   []any{},
	}
	result := map[string]any{
		"schema_version": "compute_result.v1",
		"job_id":         "job_material_balance_minimal",
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
				"evidence_refs": []any{"model_run:mr_material_balance_test"},
			},
		},
		"runtime_audit": map[string]any{"model_runs": []any{modelRun}, "timings_ms": map[string]any{}, "fallback_used": false},
	}
	completed, err := svc.Complete(ctx, "worker_1", "job_material_balance_minimal", 1, result)
	if err != nil {
		t.Fatal(err)
	}
	if completed.Job.Status != StatusSucceeded {
		t.Fatalf("expected succeeded job, got %s", completed.Job.Status)
	}
	stored, err := svc.GetModelRun(ctx, "mr_material_balance_test")
	if err != nil {
		t.Fatal(err)
	}
	var decoded map[string]any
	if err := json.Unmarshal(stored, &decoded); err != nil {
		t.Fatal(err)
	}
	if decoded["model_run_id"] != "mr_material_balance_test" || decoded["model_key"] != "material_balance" {
		t.Fatalf("unexpected persisted model run: %#v", decoded)
	}
	listed, err := svc.ListModelRuns(ctx, ModelRunFilter{ModelKey: "material_balance", ModelVersion: "material_balance.v1"})
	if err != nil {
		t.Fatal(err)
	}
	if listed.TotalEstimate != 1 || len(listed.Items) != 1 {
		t.Fatalf("expected one listed model run, got %#v", listed)
	}
	filtered, err := svc.ListModelRuns(ctx, ModelRunFilter{ModelKey: "asm1"})
	if err != nil {
		t.Fatal(err)
	}
	if filtered.TotalEstimate != 0 || len(filtered.Items) != 0 {
		t.Fatalf("unexpected model run filter result: %#v", filtered)
	}
	resultView, err := svc.Result(ctx, "job_material_balance_minimal")
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
	evidence, checksum, err := svc.EvidencePackage(ctx, "job_material_balance_minimal")
	if err != nil {
		t.Fatal(err)
	}
	if evidence["schema_version"] != "evidence_package.v1" || evidence["job_id"] != "job_material_balance_minimal" {
		t.Fatalf("unexpected evidence package: %#v", evidence)
	}
	if checksum == "" || !strings.HasPrefix(checksum, "sha256:") {
		t.Fatalf("expected evidence checksum, got %q", checksum)
	}
	refs, ok := evidence["model_run_refs"].([]any)
	if !ok || len(refs) != 1 || refs[0] != "mr_material_balance_test" {
		t.Fatalf("unexpected model_run_refs: %#v", evidence["model_run_refs"])
	}
	governance, ok := evidence["governance"].(map[string]any)
	if !ok || governance["production_allowed"] != true {
		t.Fatalf("expected production-allowed governance summary, got %#v", evidence["governance"])
	}
	versionRefs, ok := governance["model_version_refs"].([]any)
	if !ok || len(versionRefs) != 1 {
		t.Fatalf("expected one governance model version ref, got %#v", governance["model_version_refs"])
	}
	readiness, err := svc.ProductionReadiness(ctx, "job_material_balance_minimal")
	if err != nil {
		t.Fatal(err)
	}
	if !readiness.ProductionReady ||
		readiness.ReadinessStatus != "ready_for_external_approval" ||
		!readiness.ExternalApprovalRequired ||
		readiness.AutoPublishAllowed ||
		readiness.RiskFindingsSummary.BySeverity["info"] != 1 {
		t.Fatalf("unexpected production readiness report: %#v", readiness)
	}

	auth, _ := NewAuthenticator("")
	server := NewServer(svc, auth, nil).Routes()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/model-runs/mr_material_balance_test", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec := httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("model run endpoint failed: %d %s", rec.Code, rec.Body.String())
	}
	req = httptest.NewRequest(http.MethodGet, "/api/v1/model-runs?model_key=material_balance&model_version=material_balance.v1", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("model run list endpoint failed: %d %s", rec.Code, rec.Body.String())
	}
	var listedResponse map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &listedResponse); err != nil {
		t.Fatal(err)
	}
	if int(listedResponse["total_estimate"].(float64)) != 1 {
		t.Fatalf("unexpected model run list response: %#v", listedResponse)
	}
	req = httptest.NewRequest(http.MethodGet, "/api/v1/compute/jobs/job_material_balance_minimal/evidence", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK || rec.Header().Get("X-Evidence-Checksum") == "" {
		t.Fatalf("evidence endpoint failed: %d checksum=%q body=%s", rec.Code, rec.Header().Get("X-Evidence-Checksum"), rec.Body.String())
	}
	req = httptest.NewRequest(http.MethodGet, "/api/v1/compute/jobs/job_material_balance_minimal/evidence-ref?ref=model_run:mr_material_balance_test", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("evidence ref endpoint failed: %d %s", rec.Code, rec.Body.String())
	}
	var resolution EvidenceReferenceResolution
	if err := json.Unmarshal(rec.Body.Bytes(), &resolution); err != nil {
		t.Fatal(err)
	}
	payload, ok := resolution.Payload.(map[string]any)
	if !ok || resolution.RefType != "model_run" || payload["model_run_id"] != "mr_material_balance_test" {
		t.Fatalf("unexpected evidence ref resolution: %#v", resolution)
	}
	req = httptest.NewRequest(http.MethodGet, "/api/v1/compute/jobs/job_material_balance_minimal/evidence-ref?ref=evidence_package:evidence_job_material_balance_minimal", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("evidence package ref endpoint failed: %d %s", rec.Code, rec.Body.String())
	}
	req = httptest.NewRequest(http.MethodGet, "/api/v1/compute/jobs/job_material_balance_minimal/production-readiness", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("production readiness endpoint failed: %d %s", rec.Code, rec.Body.String())
	}
	var readinessResponse ProductionReadinessReport
	if err := json.Unmarshal(rec.Body.Bytes(), &readinessResponse); err != nil {
		t.Fatal(err)
	}
	if !readinessResponse.ProductionReady ||
		readinessResponse.PolicyVersion != "production_readiness_policy.v1" ||
		readinessResponse.AutoPublishAllowed {
		t.Fatalf("unexpected production readiness endpoint response: %#v", readinessResponse)
	}

	benchmarkRunBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance.benchmark_run.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	benchmarkRun := decodeMap(t, benchmarkRunBytes)
	benchmarkRun["benchmark_run_id"] = "br_material_balance_test"
	benchmarkRun["model_run_id"] = "mr_material_balance_test"
	benchmarkRun["job_id"] = "job_material_balance_minimal"
	benchmarkRun["evidence_refs"] = []any{
		"model_run:mr_material_balance_test",
		"evidence_package:evidence_job_material_balance_minimal",
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/model-catalog/material_balance/versions/material_balance.v1/benchmark-runs", bytes.NewReader(encodeMap(t, benchmarkRun)))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
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
	req = httptest.NewRequest(http.MethodPost, "/api/v1/model-catalog/material_balance/versions/material_balance.v1/benchmark-runs", bytes.NewReader(encodeMap(t, benchmarkRun)))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("duplicate benchmark run should be idempotent, got %d %s", rec.Code, rec.Body.String())
	}
	req = httptest.NewRequest(http.MethodGet, "/api/v1/model-catalog/material_balance/versions/material_balance.v1/benchmark-runs?benchmark_case_id=bc_material_balance_minimal_v1", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
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
	req = httptest.NewRequest(http.MethodGet, "/api/v1/benchmark-runs/br_material_balance_test", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("benchmark run get failed: %d %s", rec.Code, rec.Body.String())
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/model-catalog/material_balance/versions/material_balance.v1/benchmark-runs", bytes.NewReader(encodeMap(t, benchmarkRun)))
	req.Header.Set("Authorization", "Bearer dev-worker-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("worker token should not record benchmark runs, got %d %s", rec.Code, rec.Body.String())
	}

	explanationBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance.result_explanation.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	explanation := decodeMap(t, explanationBytes)
	explanation["evidence_refs"] = []any{"evidence_package:evidence_job_material_balance_minimal", "model_run:mr_material_balance_test"}
	statements := explanation["statements"].([]any)
	statements[0].(map[string]any)["evidence_refs"] = []any{"model_run:mr_material_balance_test"}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/compute/jobs/job_material_balance_minimal/result-explanations", bytes.NewReader(encodeMap(t, explanation)))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("result explanation submit failed: %d %s", rec.Code, rec.Body.String())
	}
	var explanationRecord ResultExplanationRecord
	if err := json.Unmarshal(rec.Body.Bytes(), &explanationRecord); err != nil {
		t.Fatal(err)
	}
	if explanationRecord.Status != "submitted" ||
		explanationRecord.ExplanationID != "explanation_material_balance_minimal" ||
		len(explanationRecord.ResolvedEvidenceRefs) != 2 {
		t.Fatalf("unexpected submitted result explanation: %#v", explanationRecord)
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/compute/jobs/job_material_balance_minimal/result-explanations", bytes.NewReader(encodeMap(t, explanation)))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("duplicate result explanation should be idempotent, got %d %s", rec.Code, rec.Body.String())
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/compute/jobs/job_material_balance_minimal/result-explanations/explanation_material_balance_minimal/publish", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusConflict {
		t.Fatalf("unreviewed result explanation should not publish, got %d %s", rec.Code, rec.Body.String())
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/compute/jobs/job_material_balance_minimal/result-explanations/explanation_material_balance_minimal/review", strings.NewReader(`{"decision":"approved","reason":"evidence refs verified"}`))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("result explanation review failed: %d %s", rec.Code, rec.Body.String())
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &explanationRecord); err != nil {
		t.Fatal(err)
	}
	if explanationRecord.Status != "approved" || explanationRecord.ReviewedBy != "dev-public" {
		t.Fatalf("unexpected reviewed result explanation: %#v", explanationRecord)
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/compute/jobs/job_material_balance_minimal/result-explanations/explanation_material_balance_minimal/publish", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("result explanation publish failed: %d %s", rec.Code, rec.Body.String())
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &explanationRecord); err != nil {
		t.Fatal(err)
	}
	if explanationRecord.Status != "published" || explanationRecord.PublishedBy != "dev-public" {
		t.Fatalf("unexpected published result explanation: %#v", explanationRecord)
	}
	req = httptest.NewRequest(http.MethodGet, "/api/v1/compute/jobs/job_material_balance_minimal/result-explanations/explanation_material_balance_minimal", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("result explanation read failed: %d %s", rec.Code, rec.Body.String())
	}
	badExplanation := decodeMap(t, encodeMap(t, explanation))
	badExplanation["explanation_id"] = "explanation_unresolved_ref"
	badExplanation["evidence_refs"] = []any{"model_run:missing"}
	badStatements := badExplanation["statements"].([]any)
	badStatements[0].(map[string]any)["evidence_refs"] = []any{"model_run:missing"}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/compute/jobs/job_material_balance_minimal/result-explanations", bytes.NewReader(encodeMap(t, badExplanation)))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("unresolved evidence ref should reject explanation, got %d %s", rec.Code, rec.Body.String())
	}
	req = httptest.NewRequest(http.MethodGet, "/api/v1/compute/jobs/job_material_balance_minimal/evidence-ref?ref=model_run:missing", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("missing evidence ref should return 404, got %d %s", rec.Code, rec.Body.String())
	}
	req = httptest.NewRequest(http.MethodGet, "/api/v1/compute/jobs/job_material_balance_minimal/evidence", nil)
	req.Header.Set("Authorization", "Bearer dev-worker-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("worker token should not read evidence, got %d %s", rec.Code, rec.Body.String())
	}
	req = httptest.NewRequest(http.MethodGet, "/api/v1/compute/jobs/job_material_balance_minimal/evidence-ref?ref=model_run:mr_material_balance_test", nil)
	req.Header.Set("Authorization", "Bearer dev-worker-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("worker token should not dereference evidence, got %d %s", rec.Code, rec.Body.String())
	}
}

func TestHTTPModelRunTenantProjectSiteScope(t *testing.T) {
	svc := testService(t)
	ctx := context.Background()
	if _, _, err := svc.CreateJob(ctx, scopedFixtureJobBytes(t, "job_scope_alpha", "tenant_a", "project_a", "site_a"), ""); err != nil {
		t.Fatal(err)
	}
	if _, _, err := svc.CreateJob(ctx, scopedFixtureJobBytes(t, "job_scope_beta", "tenant_b", "project_b", "site_b"), ""); err != nil {
		t.Fatal(err)
	}
	modelRun := func(modelRunID, jobID string) json.RawMessage {
		return mustJSON(map[string]any{
			"schema_version":   "model_run.v1",
			"model_run_id":     modelRunID,
			"job_id":           jobID,
			"model_key":        "material_balance",
			"model_version":    "material_balance.v1",
			"parameter_hash":   "sha256:" + strings.Repeat("a", 64),
			"input_hash":       "sha256:" + strings.Repeat("b", 64),
			"quality_metrics":  map[string]any{"convergence_status": "converged"},
			"warnings":         []any{},
			"evidence_refs":    []any{},
			"parameter_set_id": "default",
		})
	}
	if err := svc.store.InsertModelRuns(ctx, "job_scope_alpha", []json.RawMessage{modelRun("mr_scope_alpha", "job_scope_alpha")}, time.Now().UTC()); err != nil {
		t.Fatal(err)
	}
	if err := svc.store.InsertModelRuns(ctx, "job_scope_beta", []json.RawMessage{modelRun("mr_scope_beta", "job_scope_beta")}, time.Now().UTC()); err != nil {
		t.Fatal(err)
	}
	auth, err := NewAuthenticator(`{"tokens":[
		{"name":"tenant-a-reader","token":"tenant-a-token","scopes":["job:read"],"tenant_id":"tenant_a","project_id":"project_a","site_id":"site_a"},
		{"name":"global-reader","token":"global-token","scopes":["job:read"]}
	]}`)
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()

	req := httptest.NewRequest(http.MethodGet, "/api/v1/model-runs/mr_scope_alpha", nil)
	req.Header.Set("Authorization", "Bearer tenant-a-token")
	rec := httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("tenant scoped model run get should pass: %d %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/model-runs/mr_scope_beta", nil)
	req.Header.Set("Authorization", "Bearer tenant-a-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("tenant scoped model run get should reject cross-scope job, got %d %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/model-runs?job_id=job_scope_alpha", nil)
	req.Header.Set("Authorization", "Bearer tenant-a-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("tenant scoped model run list by matching job should pass: %d %s", rec.Code, rec.Body.String())
	}
	var scopedList ListModelRunsResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &scopedList); err != nil {
		t.Fatal(err)
	}
	if scopedList.TotalEstimate != 1 || len(scopedList.Items) != 1 {
		t.Fatalf("tenant scoped model run list should include only matching job, got %#v", scopedList)
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/model-runs?job_id=job_scope_beta", nil)
	req.Header.Set("Authorization", "Bearer tenant-a-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("tenant scoped model run list should reject cross-scope job, got %d %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/model-runs", nil)
	req.Header.Set("Authorization", "Bearer tenant-a-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("tenant scoped model run list should require job_id to avoid cross-scope leakage, got %d %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/model-runs", nil)
	req.Header.Set("Authorization", "Bearer global-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("global model run list should pass: %d %s", rec.Code, rec.Body.String())
	}
	var globalList ListModelRunsResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &globalList); err != nil {
		t.Fatal(err)
	}
	if globalList.TotalEstimate != 2 || len(globalList.Items) != 2 {
		t.Fatalf("global token should see all model runs, got %#v", globalList)
	}
}

func TestHTTPBenchmarkRunTenantProjectSiteScope(t *testing.T) {
	svc := testService(t)
	ctx := context.Background()
	if _, _, err := svc.CreateJob(ctx, scopedFixtureJobBytes(t, "job_benchmark_scope_alpha", "tenant_a", "project_a", "site_a"), ""); err != nil {
		t.Fatal(err)
	}
	if _, _, err := svc.CreateJob(ctx, scopedFixtureJobBytes(t, "job_benchmark_scope_beta", "tenant_b", "project_b", "site_b"), ""); err != nil {
		t.Fatal(err)
	}
	benchmarkRun := func(benchmarkRunID, jobID string, executedAt time.Time) BenchmarkRunRecord {
		return BenchmarkRunRecord{
			BenchmarkRunID:  benchmarkRunID,
			SchemaVersion:   "benchmark_run.v1",
			ModelKey:        "material_balance",
			ModelVersion:    "material_balance.v1",
			BenchmarkCaseID: "bc_material_balance_minimal",
			ParameterSetID:  "ps_material_balance_default_v1",
			ModelRunID:      "mr_" + benchmarkRunID,
			JobID:           jobID,
			Status:          "passed",
			PayloadHash:     "sha256:" + strings.Repeat("a", 64),
			Payload:         mustJSON(map[string]any{"benchmark_run_id": benchmarkRunID, "job_id": jobID}),
			SourceSystem:    "test",
			RequestedBy:     "tester",
			Metadata:        mustJSON(map[string]any{}),
			ExecutedAt:      executedAt,
			CreatedAt:       executedAt,
		}
	}
	now := time.Now().UTC()
	if _, _, err := svc.store.UpsertBenchmarkRun(ctx, benchmarkRun("br_scope_alpha", "job_benchmark_scope_alpha", now.Add(-time.Minute)), nil); err != nil {
		t.Fatal(err)
	}
	if _, _, err := svc.store.UpsertBenchmarkRun(ctx, benchmarkRun("br_scope_beta", "job_benchmark_scope_beta", now), nil); err != nil {
		t.Fatal(err)
	}
	auth, err := NewAuthenticator(`{"tokens":[
		{"name":"tenant-a-reader","token":"tenant-a-token","scopes":["job:read"],"tenant_id":"tenant_a","project_id":"project_a","site_id":"site_a"},
		{"name":"global-reader","token":"global-token","scopes":["job:read"]}
	]}`)
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()
	listPath := "/api/v1/model-catalog/material_balance/versions/material_balance.v1/benchmark-runs"

	req := httptest.NewRequest(http.MethodGet, "/api/v1/benchmark-runs/br_scope_alpha", nil)
	req.Header.Set("Authorization", "Bearer tenant-a-token")
	rec := httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("tenant scoped benchmark_run get should pass: %d %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/benchmark-runs/br_scope_beta", nil)
	req.Header.Set("Authorization", "Bearer tenant-a-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("tenant scoped benchmark_run get should reject cross-scope job, got %d %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, listPath+"?job_id=job_benchmark_scope_alpha", nil)
	req.Header.Set("Authorization", "Bearer tenant-a-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("tenant scoped benchmark_run list by matching job should pass: %d %s", rec.Code, rec.Body.String())
	}
	var scopedList ListBenchmarkRunsResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &scopedList); err != nil {
		t.Fatal(err)
	}
	if scopedList.TotalEstimate != 1 || len(scopedList.Items) != 1 || scopedList.Items[0].BenchmarkRunID != "br_scope_alpha" {
		t.Fatalf("tenant scoped benchmark_run list should include only matching job, got %#v", scopedList)
	}

	req = httptest.NewRequest(http.MethodGet, listPath+"?job_id=job_benchmark_scope_beta", nil)
	req.Header.Set("Authorization", "Bearer tenant-a-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("tenant scoped benchmark_run list should reject cross-scope job, got %d %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, listPath, nil)
	req.Header.Set("Authorization", "Bearer tenant-a-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("tenant scoped benchmark_run list should require job_id to avoid cross-scope leakage, got %d %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, listPath, nil)
	req.Header.Set("Authorization", "Bearer global-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("global benchmark_run list should pass: %d %s", rec.Code, rec.Body.String())
	}
	var globalList ListBenchmarkRunsResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &globalList); err != nil {
		t.Fatal(err)
	}
	if globalList.TotalEstimate != 2 || len(globalList.Items) != 2 {
		t.Fatalf("global token should see all benchmark runs, got %#v", globalList)
	}
}

func TestHTTPBenchmarkRunMutationTenantProjectSiteScope(t *testing.T) {
	svc := testValidatedService(t)
	ctx := context.Background()
	defaultParameterHash := builtInModelCatalog("2026-05-30T00:00:00Z").Models[0].Versions[0].DefaultParameterSet.ParameterHash
	completeJob := func(jobID, workerID, modelRunID, tenantID, projectID, siteID string) {
		t.Helper()
		if _, _, err := svc.CreateJob(ctx, scopedFixtureJobBytes(t, jobID, tenantID, projectID, siteID), ""); err != nil {
			t.Fatal(err)
		}
		if _, err := svc.RegisterWorker(ctx, compatibleWorkerRegistration(workerID)); err != nil {
			t.Fatal(err)
		}
		if _, err := svc.Claim(ctx, workerID); err != nil {
			t.Fatal(err)
		}
		modelRun := map[string]any{
			"schema_version":  "model_run.v1",
			"model_run_id":    modelRunID,
			"job_id":          jobID,
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
			"job_id":         jobID,
			"job_type":       "simulation.material_balance.v1",
			"status":         StatusSucceeded,
			"summary":        map[string]any{"converged": true},
			"data":           map[string]any{},
			"quality":        map[string]any{"data_quality": "ok", "warnings": []any{}},
			"artifacts":      []any{},
			"runtime_audit":  map[string]any{"model_runs": []any{modelRun}, "timings_ms": map[string]any{}, "fallback_used": false},
		}
		if _, err := svc.Complete(ctx, workerID, jobID, 1, result); err != nil {
			t.Fatal(err)
		}
	}
	completeJob("job_benchmark_mutation_alpha", "worker_benchmark_mutation_alpha", "mr_benchmark_mutation_alpha", "tenant_a", "project_a", "site_a")
	completeJob("job_benchmark_mutation_beta", "worker_benchmark_mutation_beta", "mr_benchmark_mutation_beta", "tenant_b", "project_b", "site_b")

	auth, err := NewAuthenticator(`{"tokens":[
		{"name":"scope-a","token":"scope-a-token","scopes":["model:write"],"tenant_id":"tenant_a","project_id":"project_a","site_id":"site_a"},
		{"name":"global","token":"global-token","scopes":["model:write"]}
	]}`)
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()
	benchmarkRunBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance.benchmark_run.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	benchmarkRunBody := func(benchmarkRunID, jobID, modelRunID string) []byte {
		t.Helper()
		benchmarkRun := decodeMap(t, benchmarkRunBytes)
		benchmarkRun["benchmark_run_id"] = benchmarkRunID
		benchmarkRun["job_id"] = jobID
		benchmarkRun["model_run_id"] = modelRunID
		benchmarkRun["evidence_refs"] = []any{"model_run:" + modelRunID}
		benchmarkRun["executed_at"] = "2026-06-07T00:00:00Z"
		return encodeMap(t, benchmarkRun)
	}
	postBenchmarkRun := func(body []byte, token string) *httptest.ResponseRecorder {
		t.Helper()
		req := httptest.NewRequest(http.MethodPost, "/api/v1/model-catalog/material_balance/versions/material_balance.v1/benchmark-runs", bytes.NewReader(body))
		req.Header.Set("Authorization", "Bearer "+token)
		rec := httptest.NewRecorder()
		server.ServeHTTP(rec, req)
		return rec
	}

	rec := postBenchmarkRun(benchmarkRunBody("br_benchmark_mutation_alpha", "job_benchmark_mutation_alpha", "mr_benchmark_mutation_alpha"), "scope-a-token")
	if rec.Code != http.StatusCreated {
		t.Fatalf("scope-matching benchmark_run registration should pass, got %d %s", rec.Code, rec.Body.String())
	}
	var record BenchmarkRunRecord
	if err := json.Unmarshal(rec.Body.Bytes(), &record); err != nil {
		t.Fatal(err)
	}
	if record.BenchmarkRunID != "br_benchmark_mutation_alpha" || record.JobID != "job_benchmark_mutation_alpha" {
		t.Fatalf("unexpected scoped benchmark_run record: %#v", record)
	}

	rec = postBenchmarkRun(benchmarkRunBody("br_benchmark_mutation_beta_denied", "job_benchmark_mutation_beta", "mr_benchmark_mutation_beta"), "scope-a-token")
	if rec.Code != http.StatusForbidden {
		t.Fatalf("cross-scope benchmark_run registration should be denied, got %d %s", rec.Code, rec.Body.String())
	}
	if _, err := svc.GetBenchmarkRun(ctx, "br_benchmark_mutation_beta_denied"); err == nil {
		t.Fatalf("cross-scope denied benchmark_run registration must not write a record")
	}
	auditEvents, _, auditTotal, err := svc.store.ListMutationAuditEvents(ctx, MutationAuditFilter{TargetObject: "BenchmarkRun", Limit: 10})
	if err != nil {
		t.Fatal(err)
	}
	if auditTotal != 1 || len(auditEvents) != 1 || auditEvents[0].TargetID != "br_benchmark_mutation_alpha" {
		t.Fatalf("cross-scope denied benchmark_run registration must not write audit events, total=%d events=%#v", auditTotal, auditEvents)
	}
}

func TestModelCatalogEndpoint(t *testing.T) {
	svc := testValidatedService(t)
	auth, err := NewAuthenticator("")
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()

	catalog, err := svc.ModelCatalog(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if catalog.SchemaVersion != "model_catalog.v1" || len(catalog.Models) != 5 {
		t.Fatalf("unexpected model catalog: %#v", catalog)
	}
	modelsByKey := map[string]ModelCatalogModel{}
	for _, model := range catalog.Models {
		modelsByKey[model.ModelKey] = model
	}
	materialModel, ok := modelsByKey["material_balance"]
	if !ok {
		t.Fatalf("expected material_balance catalog entry, got %#v", catalog.Models)
	}
	if materialModel.Versions[0].DefaultParameterSet == nil ||
		materialModel.Versions[0].DefaultParameterSet.Status != "approved" {
		t.Fatalf("expected approved default parameter set: %#v", materialModel.Versions[0])
	}
	if len(materialModel.Versions[0].BenchmarkCases) != 1 ||
		materialModel.Versions[0].BenchmarkCases[0].Status != "validated" {
		t.Fatalf("expected validated benchmark case: %#v", materialModel.Versions[0].BenchmarkCases)
	}
	for _, modelKey := range []string{"asm1slim", "asm1", "asm3", "udm"} {
		model, ok := modelsByKey[modelKey]
		if !ok {
			t.Fatalf("expected %s catalog entry, got %#v", modelKey, catalog.Models)
		}
		if len(model.Versions) != 1 || model.Versions[0].Status != "active" {
			t.Fatalf("expected active %s model version, got %#v", modelKey, model.Versions)
		}
		if model.Versions[0].DefaultParameterSet != nil {
			t.Fatalf("ASM/UDM built-in catalog entries should not define default parameter sets yet: %#v", model.Versions[0])
		}
		if len(model.Versions[0].BenchmarkCases) != 1 || model.Versions[0].BenchmarkCases[0].Status != "validated" {
			t.Fatalf("expected validated %s benchmark case, got %#v", modelKey, model.Versions[0].BenchmarkCases)
		}
	}

	req := httptest.NewRequest(http.MethodGet, "/api/v1/model-catalog", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec := httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("model catalog endpoint failed: %d %s", rec.Code, rec.Body.String())
	}
	var response ModelCatalogResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatal(err)
	}
	if response.SchemaVersion != "model_catalog.v1" || len(response.Models) != 5 {
		t.Fatalf("unexpected model catalog response: %#v", response)
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/model-catalog/asm1", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("built-in asm1 model catalog by key failed: %d %s", rec.Code, rec.Body.String())
	}
	var builtinModel ModelCatalogModel
	if err := json.Unmarshal(rec.Body.Bytes(), &builtinModel); err != nil {
		t.Fatal(err)
	}
	if builtinModel.ModelKey != "asm1" || len(builtinModel.Versions) != 1 {
		t.Fatalf("unexpected built-in asm1 model response: %#v", builtinModel)
	}

	catalogBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance.model_catalog.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/model-catalog", bytes.NewReader(catalogBytes))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("model catalog registration failed: %d %s", rec.Code, rec.Body.String())
	}
	var record ModelCatalogRecord
	if err := json.Unmarshal(rec.Body.Bytes(), &record); err != nil {
		t.Fatal(err)
	}
	if record.CatalogID != "default" || record.SchemaVersion != "model_catalog.v1" || record.PayloadHash == "" {
		t.Fatalf("unexpected model catalog record: %#v", record)
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/model-catalog", bytes.NewReader(catalogBytes))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("duplicate model catalog registration should be idempotent, got %d %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/model-catalog", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("persisted model catalog endpoint failed: %d %s", rec.Code, rec.Body.String())
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatal(err)
	}
	if response.GeneratedAt != "2026-05-30T00:00:00Z" ||
		response.Models[0].Versions[0].DefaultParameterSet == nil ||
		response.Models[0].Versions[0].DefaultParameterSet.ParameterHash != "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" {
		t.Fatalf("expected persisted model catalog response, got %#v", response)
	}

	transitionBody := `{"parameter_set_id":"ps_material_balance_default_v1","from_status":"approved","to_status":"retired","reason":"regression test"}`
	req = httptest.NewRequest(http.MethodPost, "/api/v1/model-catalog/material_balance/versions/material_balance.v1/default-parameter-set/status", strings.NewReader(transitionBody))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("parameter set status transition failed: %d %s", rec.Code, rec.Body.String())
	}
	var transition ModelParameterSetTransitionResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &transition); err != nil {
		t.Fatal(err)
	}
	if !transition.CreatedSnapshot || transition.FromStatus != "approved" || transition.ToStatus != "retired" ||
		transition.Catalog.Models[0].Versions[0].DefaultParameterSet.Status != "retired" {
		t.Fatalf("unexpected parameter set transition response: %#v", transition)
	}
	req = httptest.NewRequest(http.MethodGet, "/api/v1/model-catalog/snapshots?limit=1", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("model catalog snapshot list failed: %d %s", rec.Code, rec.Body.String())
	}
	var snapshotList ListModelCatalogSnapshotsResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &snapshotList); err != nil {
		t.Fatal(err)
	}
	if snapshotList.TotalEstimate != 2 || len(snapshotList.Items) != 1 || snapshotList.NextCursor == "" {
		t.Fatalf("expected first page of two catalog snapshots, got %#v", snapshotList)
	}
	if snapshotList.Items[0].PayloadHash != transition.CatalogPayloadHash {
		t.Fatalf("newest snapshot should be the transition snapshot, got %#v", snapshotList.Items[0])
	}
	req = httptest.NewRequest(http.MethodGet, "/api/v1/model-catalog/snapshots?cursor="+url.QueryEscape(snapshotList.NextCursor), nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("model catalog snapshot second page failed: %d %s", rec.Code, rec.Body.String())
	}
	snapshotList = ListModelCatalogSnapshotsResponse{}
	if err := json.Unmarshal(rec.Body.Bytes(), &snapshotList); err != nil {
		t.Fatal(err)
	}
	if snapshotList.TotalEstimate != 2 || len(snapshotList.Items) != 1 || snapshotList.NextCursor != "" {
		t.Fatalf("expected second page of catalog snapshots, got %#v", snapshotList)
	}

	auditEvents, _, auditTotal, err := svc.store.ListMutationAuditEvents(context.Background(), MutationAuditFilter{Limit: 10})
	if err != nil {
		t.Fatal(err)
	}
	if auditTotal != 2 || len(auditEvents) != 2 {
		t.Fatalf("expected catalog register and status mutation audit events only, total=%d events=%#v", auditTotal, auditEvents)
	}
	auditByType := map[string]MutationAuditRecord{}
	for _, event := range auditEvents {
		auditByType[event.EventType] = event
	}
	catalogAudit := mutationAuditMap(t, auditByType[modelCatalogRegisteredEvent])
	if catalogAudit["who"] != "dev-public" ||
		catalogAudit["where"] != "POST /api/v1/model-catalog" ||
		catalogAudit["target_object"] != "ModelCatalog" ||
		catalogAudit["target_id"] != "default" ||
		catalogAudit["action"] != "model.catalog.register" {
		t.Fatalf("unexpected model catalog audit envelope: %#v", catalogAudit)
	}
	catalogAfter, ok := catalogAudit["after"].(map[string]any)
	if !ok || catalogAfter["payload_hash"] != record.PayloadHash {
		t.Fatalf("catalog audit should include compact after hash, got %#v", catalogAudit["after"])
	}
	statusAudit := mutationAuditMap(t, auditByType[modelParameterSetStatusChangedEvent])
	if statusAudit["who"] != "dev-public" ||
		statusAudit["where"] != "POST /api/v1/model-catalog/material_balance/versions/material_balance.v1/default-parameter-set/status" ||
		statusAudit["target_object"] != "ModelParameterSet" ||
		statusAudit["target_id"] != "material_balance:material_balance.v1:ps_material_balance_default_v1" ||
		statusAudit["action"] != "model.parameter_set.status_update" ||
		statusAudit["reason"] != "regression test" {
		t.Fatalf("unexpected parameter set status audit envelope: %#v", statusAudit)
	}
	statusBefore, ok := statusAudit["before"].(map[string]any)
	if !ok || statusBefore["status"] != "approved" {
		t.Fatalf("status audit should include approved before state, got %#v", statusAudit["before"])
	}
	statusAfter, ok := statusAudit["after"].(map[string]any)
	if !ok || statusAfter["status"] != "retired" || statusAfter["catalog_payload_hash"] != transition.CatalogPayloadHash {
		t.Fatalf("status audit should include retired after state, got %#v", statusAudit["after"])
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/model-catalog/material_balance/versions/material_balance.v1/default-parameter-set/status", strings.NewReader(`{"from_status":"retired","to_status":"approved"}`))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusConflict {
		t.Fatalf("invalid parameter set transition should conflict, got %d %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/model-catalog/material_balance/versions/material_balance.v1/default-parameter-set/status", strings.NewReader(`{"to_status":"retired"}`))
	req.Header.Set("Authorization", "Bearer dev-worker-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("worker token should not update parameter set status, got %d %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/model-catalog/material_balance", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("model catalog by key failed: %d %s", rec.Code, rec.Body.String())
	}
	var model ModelCatalogModel
	if err := json.Unmarshal(rec.Body.Bytes(), &model); err != nil {
		t.Fatal(err)
	}
	if model.ModelKey != "material_balance" {
		t.Fatalf("unexpected model response: %#v", model)
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/model-catalog/asm1", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("missing model should return 404, got %d %s", rec.Code, rec.Body.String())
	}
	req = httptest.NewRequest(http.MethodGet, "/api/v1/model-catalog", nil)
	req.Header.Set("Authorization", "Bearer dev-worker-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("worker token should not read model catalog, got %d %s", rec.Code, rec.Body.String())
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/model-catalog", bytes.NewReader(catalogBytes))
	req.Header.Set("Authorization", "Bearer dev-worker-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("worker token should not write model catalog, got %d %s", rec.Code, rec.Body.String())
	}
}

func TestHTTPModelCatalogTenantProjectSiteScope(t *testing.T) {
	svc := testValidatedService(t)
	auth, err := NewAuthenticator(`{"tokens":[
		{"name":"scope-a","token":"scope-a-token","scopes":["job:read"],"tenant_id":"tenant_a","project_id":"project_a","site_id":"site_a"},
		{"name":"global","token":"global-token","scopes":["job:read","model:write"]}
	]}`)
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()

	postCatalog := func(body []byte) ModelCatalogRecord {
		t.Helper()
		req := httptest.NewRequest(http.MethodPost, "/api/v1/model-catalog", bytes.NewReader(body))
		req.Header.Set("Authorization", "Bearer global-token")
		rec := httptest.NewRecorder()
		server.ServeHTTP(rec, req)
		if rec.Code != http.StatusCreated {
			t.Fatalf("model catalog registration failed: %d %s", rec.Code, rec.Body.String())
		}
		var record ModelCatalogRecord
		if err := json.Unmarshal(rec.Body.Bytes(), &record); err != nil {
			t.Fatal(err)
		}
		return record
	}
	request := func(method, path, token string) *httptest.ResponseRecorder {
		t.Helper()
		req := httptest.NewRequest(method, path, nil)
		req.Header.Set("Authorization", "Bearer "+token)
		rec := httptest.NewRecorder()
		server.ServeHTTP(rec, req)
		return rec
	}

	alpha := postCatalog(scopedModelCatalogBytes(t, "2026-05-30T00:00:00Z", "tenant_a", "project_a", "site_a"))
	if alpha.TenantID != "tenant_a" || alpha.ProjectID != "project_a" || alpha.SiteID != "site_a" {
		t.Fatalf("model catalog should persist tenant/project/site metadata, got %#v", alpha)
	}
	postCatalog(scopedModelCatalogBytes(t, "2026-05-30T00:01:00Z", "tenant_a", "project_a", "site_b"))
	postCatalog(scopedModelCatalogBytes(t, "2026-05-30T00:02:00Z", "tenant_b", "project_b", "site_b"))

	rec := request(http.MethodGet, "/api/v1/model-catalog", "scope-a-token")
	if rec.Code != http.StatusOK {
		t.Fatalf("scope-matching model catalog read should pass: %d %s", rec.Code, rec.Body.String())
	}
	var catalog ModelCatalogResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &catalog); err != nil {
		t.Fatal(err)
	}
	if catalog.Metadata["tenant_id"] != "tenant_a" ||
		catalog.Metadata["project_id"] != "project_a" ||
		catalog.Metadata["site_id"] != "site_a" {
		t.Fatalf("scoped catalog read should use the matching persisted snapshot, got %#v", catalog.Metadata)
	}

	rec = request(http.MethodGet, "/api/v1/model-catalog", "global-token")
	if rec.Code != http.StatusOK {
		t.Fatalf("global model catalog read should pass: %d %s", rec.Code, rec.Body.String())
	}
	catalog = ModelCatalogResponse{}
	if err := json.Unmarshal(rec.Body.Bytes(), &catalog); err != nil {
		t.Fatal(err)
	}
	if catalog.Metadata["site_id"] != "site_b" || catalog.Metadata["tenant_id"] != "tenant_b" {
		t.Fatalf("global catalog read should still see the latest persisted snapshot, got %#v", catalog.Metadata)
	}

	rec = request(http.MethodGet, "/api/v1/model-catalog/snapshots", "scope-a-token")
	if rec.Code != http.StatusOK {
		t.Fatalf("scope-matching model catalog snapshot list should pass: %d %s", rec.Code, rec.Body.String())
	}
	var snapshots ListModelCatalogSnapshotsResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &snapshots); err != nil {
		t.Fatal(err)
	}
	if snapshots.TotalEstimate != 1 ||
		len(snapshots.Items) != 1 ||
		snapshots.Items[0].TenantID != "tenant_a" ||
		snapshots.Items[0].ProjectID != "project_a" ||
		snapshots.Items[0].SiteID != "site_a" {
		t.Fatalf("scoped snapshot list should not expose cross-scope records, got %#v", snapshots)
	}

	rec = request(http.MethodGet, "/api/v1/model-catalog/material_balance", "scope-a-token")
	if rec.Code != http.StatusOK {
		t.Fatalf("scope-matching model catalog model read should pass: %d %s", rec.Code, rec.Body.String())
	}
	var model ModelCatalogModel
	if err := json.Unmarshal(rec.Body.Bytes(), &model); err != nil {
		t.Fatal(err)
	}
	if model.ModelKey != "material_balance" {
		t.Fatalf("unexpected scoped model catalog entry: %#v", model)
	}

	rec = request(http.MethodGet, "/api/v1/model-catalog/material_balance/versions/material_balance.v1/default-parameter-set/promotion-plan", "scope-a-token")
	if rec.Code != http.StatusForbidden {
		t.Fatalf("scoped promotion plan without job_id should be denied, got %d %s", rec.Code, rec.Body.String())
	}
}

func TestHTTPModelCatalogMutationTenantProjectSiteScope(t *testing.T) {
	svc := testValidatedService(t)
	auth, err := NewAuthenticator(`{"tokens":[
		{"name":"scope-a","token":"scope-a-token","scopes":["job:read","model:write"],"tenant_id":"tenant_a","project_id":"project_a","site_id":"site_a"},
		{"name":"scope-miss","token":"scope-miss-token","scopes":["model:write"],"tenant_id":"tenant_x","project_id":"project_x","site_id":"site_x"},
		{"name":"global","token":"global-token","scopes":["job:read","model:write"]}
	]}`)
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()
	ctx := context.Background()

	postCatalog := func(body []byte, token string, expectedStatus int) ModelCatalogRecord {
		t.Helper()
		req := httptest.NewRequest(http.MethodPost, "/api/v1/model-catalog", bytes.NewReader(body))
		req.Header.Set("Authorization", "Bearer "+token)
		rec := httptest.NewRecorder()
		server.ServeHTTP(rec, req)
		if rec.Code != expectedStatus {
			t.Fatalf("model catalog registration with %s got %d want %d: %s", token, rec.Code, expectedStatus, rec.Body.String())
		}
		if expectedStatus != http.StatusCreated && expectedStatus != http.StatusOK {
			return ModelCatalogRecord{}
		}
		var record ModelCatalogRecord
		if err := json.Unmarshal(rec.Body.Bytes(), &record); err != nil {
			t.Fatal(err)
		}
		return record
	}
	request := func(method, path, token, body string) *httptest.ResponseRecorder {
		t.Helper()
		req := httptest.NewRequest(method, path, strings.NewReader(body))
		req.Header.Set("Authorization", "Bearer "+token)
		rec := httptest.NewRecorder()
		server.ServeHTTP(rec, req)
		return rec
	}

	alpha := postCatalog(scopedModelCatalogBytes(t, "2026-05-30T00:00:00Z", "tenant_a", "project_a", "site_a"), "scope-a-token", http.StatusCreated)
	if alpha.TenantID != "tenant_a" || alpha.ProjectID != "project_a" || alpha.SiteID != "site_a" {
		t.Fatalf("scope-matching catalog should persist tenant/project/site metadata, got %#v", alpha)
	}
	siteBBytes := scopedModelCatalogBytes(t, "2026-05-30T00:01:00Z", "tenant_a", "project_a", "site_b")
	postCatalog(siteBBytes, "scope-a-token", http.StatusForbidden)
	snapshots, err := svc.ListModelCatalogSnapshots(ctx, ModelCatalogSnapshotFilter{CatalogID: "default", Limit: 10})
	if err != nil {
		t.Fatal(err)
	}
	if snapshots.TotalEstimate != 1 || len(snapshots.Items) != 1 || snapshots.Items[0].SiteID != "site_a" {
		t.Fatalf("cross-scope denied registration must not write a snapshot, got %#v", snapshots)
	}
	postCatalog(siteBBytes, "global-token", http.StatusCreated)

	statusPath := "/api/v1/model-catalog/material_balance/versions/material_balance.v1/default-parameter-set/status"
	statusBody := `{"parameter_set_id":"ps_material_balance_default_v1","from_status":"approved","to_status":"retired","reason":"scope regression"}`
	rec := request(http.MethodPost, statusPath, "scope-miss-token", statusBody)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("scoped status mutation without matching persisted catalog should be denied, got %d %s", rec.Code, rec.Body.String())
	}
	rec = request(http.MethodPost, statusPath, "scope-a-token", statusBody)
	if rec.Code != http.StatusCreated {
		t.Fatalf("scope-matching status mutation should pass, got %d %s", rec.Code, rec.Body.String())
	}
	var transition ModelParameterSetTransitionResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &transition); err != nil {
		t.Fatal(err)
	}
	if !transition.CreatedSnapshot || transition.FromStatus != "approved" || transition.ToStatus != "retired" {
		t.Fatalf("unexpected scoped status transition: %#v", transition)
	}
	if transition.Catalog.Metadata["tenant_id"] != "tenant_a" ||
		transition.Catalog.Metadata["project_id"] != "project_a" ||
		transition.Catalog.Metadata["site_id"] != "site_a" ||
		transition.Catalog.Models[0].Versions[0].DefaultParameterSet.Status != "retired" {
		t.Fatalf("scoped status mutation should use the matching persisted catalog, got metadata=%#v parameter_set=%#v", transition.Catalog.Metadata, transition.Catalog.Models[0].Versions[0].DefaultParameterSet)
	}

	promotionPath := "/api/v1/model-catalog/material_balance/versions/material_balance.v1/default-parameter-set/promote-approved"
	rec = request(http.MethodPost, promotionPath, "scope-a-token", `{}`)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("scoped promote-approved without job_id should be denied, got %d %s", rec.Code, rec.Body.String())
	}
}

func TestHTTPModelCatalogPromotionTenantProjectSiteScope(t *testing.T) {
	svc := testValidatedService(t)
	auth, err := NewAuthenticator(`{"tokens":[
		{"name":"scope-a","token":"scope-a-token","scopes":["job:read","model:write"],"tenant_id":"tenant_a","project_id":"project_a","site_id":"site_a"},
		{"name":"global","token":"global-token","scopes":["job:create","job:read","model:write"]}
	]}`)
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()
	ctx := context.Background()
	promotionPlanPath := "/api/v1/model-catalog/material_balance/versions/material_balance.v1/default-parameter-set/promotion-plan"
	promotionPath := "/api/v1/model-catalog/material_balance/versions/material_balance.v1/default-parameter-set/promote-approved"
	request := func(method, path, token, body string) *httptest.ResponseRecorder {
		t.Helper()
		req := httptest.NewRequest(method, path, strings.NewReader(body))
		req.Header.Set("Authorization", "Bearer "+token)
		rec := httptest.NewRecorder()
		server.ServeHTTP(rec, req)
		return rec
	}
	postCatalog := func(body []byte, token string, expectedStatus int) ModelCatalogRecord {
		t.Helper()
		rec := request(http.MethodPost, "/api/v1/model-catalog", token, string(body))
		if rec.Code != expectedStatus {
			t.Fatalf("catalog registration with %s got %d want %d: %s", token, rec.Code, expectedStatus, rec.Body.String())
		}
		var record ModelCatalogRecord
		if err := json.Unmarshal(rec.Body.Bytes(), &record); err != nil {
			t.Fatal(err)
		}
		return record
	}

	catalogBytes := scopedModelCatalogBytesWithDefaultParameterSetStatus(t, "2026-05-30T00:00:00Z", "tenant_a", "project_a", "site_a", "validated")
	alphaCatalog := postCatalog(catalogBytes, "scope-a-token", http.StatusCreated)
	if alphaCatalog.TenantID != "tenant_a" || alphaCatalog.ProjectID != "project_a" || alphaCatalog.SiteID != "site_a" {
		t.Fatalf("scope-matching catalog should persist tenant/project/site metadata, got %#v", alphaCatalog)
	}
	catalog := decodeMap(t, catalogBytes)
	models := catalog["models"].([]any)
	version := models[0].(map[string]any)["versions"].([]any)[0].(map[string]any)
	parameterSet := version["default_parameter_set"].(map[string]any)
	parameterHash := parameterSet["parameter_hash"].(string)

	if _, _, err := svc.CreateJob(ctx, scopedFixtureJobBytes(t, "job_promotion_scope_alpha", "tenant_a", "project_a", "site_a"), ""); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.RegisterWorker(ctx, compatibleWorkerRegistration("worker_promotion_scope_alpha")); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Claim(ctx, "worker_promotion_scope_alpha"); err != nil {
		t.Fatal(err)
	}
	modelRun := map[string]any{
		"schema_version":  "model_run.v1",
		"model_run_id":    "mr_promotion_scope_alpha",
		"job_id":          "job_promotion_scope_alpha",
		"model_key":       "material_balance",
		"model_version":   "material_balance.v1",
		"parameter_hash":  parameterHash,
		"input_hash":      "sha256:" + strings.Repeat("c", 64),
		"quality_metrics": map[string]any{"convergence_status": "converged"},
		"warnings":        []any{},
		"evidence_refs":   []any{},
	}
	result := map[string]any{
		"schema_version": "compute_result.v1",
		"job_id":         "job_promotion_scope_alpha",
		"job_type":       "simulation.material_balance.v1",
		"status":         StatusSucceeded,
		"summary":        map[string]any{"converged": true},
		"data":           map[string]any{},
		"quality":        map[string]any{"data_quality": "ok", "warnings": []any{}},
		"artifacts":      []any{},
		"runtime_audit":  map[string]any{"model_runs": []any{modelRun}, "timings_ms": map[string]any{}, "fallback_used": false},
	}
	if _, err := svc.Complete(ctx, "worker_promotion_scope_alpha", "job_promotion_scope_alpha", 1, result); err != nil {
		t.Fatal(err)
	}
	if _, _, err := svc.CreateJob(ctx, scopedFixtureJobBytes(t, "job_promotion_scope_beta", "tenant_b", "project_b", "site_b"), ""); err != nil {
		t.Fatal(err)
	}

	benchmarkRunBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance.benchmark_run.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	benchmarkRun := decodeMap(t, benchmarkRunBytes)
	benchmarkRun["benchmark_run_id"] = "br_promotion_scope_alpha"
	benchmarkRun["model_run_id"] = "mr_promotion_scope_alpha"
	benchmarkRun["job_id"] = "job_promotion_scope_alpha"
	benchmarkRun["evidence_refs"] = []any{"model_run:mr_promotion_scope_alpha"}
	benchmarkRun["executed_at"] = "2026-05-31T00:00:00Z"
	rec := request(http.MethodPost, "/api/v1/model-catalog/material_balance/versions/material_balance.v1/benchmark-runs", "scope-a-token", string(encodeMap(t, benchmarkRun)))
	if rec.Code != http.StatusCreated {
		t.Fatalf("scope-matching benchmark_run registration should pass, got %d %s", rec.Code, rec.Body.String())
	}

	rec = request(http.MethodGet, promotionPlanPath, "scope-a-token", "")
	if rec.Code != http.StatusForbidden {
		t.Fatalf("scoped promotion plan without job_id should be denied, got %d %s", rec.Code, rec.Body.String())
	}
	rec = request(http.MethodGet, promotionPlanPath+"?job_id=job_promotion_scope_beta", "scope-a-token", "")
	if rec.Code != http.StatusForbidden {
		t.Fatalf("scoped promotion plan with cross-scope job_id should be denied, got %d %s", rec.Code, rec.Body.String())
	}
	rec = request(http.MethodGet, promotionPlanPath+"?job_id=job_promotion_scope_alpha", "scope-a-token", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("scoped promotion plan with authorized job_id should pass, got %d %s", rec.Code, rec.Body.String())
	}
	var plan ModelParameterSetPromotionPlan
	if err := json.Unmarshal(rec.Body.Bytes(), &plan); err != nil {
		t.Fatal(err)
	}
	if !plan.CanPromoteToApproved || plan.BenchmarkCasesPassed != 1 || len(plan.CaseResults) != 1 ||
		plan.CaseResults[0].JobID != "job_promotion_scope_alpha" || !plan.CaseResults[0].Ready {
		t.Fatalf("expected scoped promotable plan from authorized job evidence only, got %#v", plan)
	}

	promotionBody := `{"parameter_set_id":"ps_material_balance_default_v1","reason":"scoped evidence promotion","metadata":{"release_ticket":"PROMO-SCOPE"}}`
	rec = request(http.MethodPost, promotionPath, "scope-a-token", promotionBody)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("scoped promote-approved without job_id should be denied, got %d %s", rec.Code, rec.Body.String())
	}
	rec = request(http.MethodPost, promotionPath+"?job_id=job_promotion_scope_beta", "scope-a-token", promotionBody)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("scoped promote-approved with cross-scope job_id should be denied, got %d %s", rec.Code, rec.Body.String())
	}
	rec = request(http.MethodPost, promotionPath+"?job_id=job_promotion_scope_alpha", "scope-a-token", promotionBody)
	if rec.Code != http.StatusCreated {
		t.Fatalf("scoped promote-approved with authorized job_id should pass, got %d %s", rec.Code, rec.Body.String())
	}
	var transition ModelParameterSetTransitionResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &transition); err != nil {
		t.Fatal(err)
	}
	if transition.FromStatus != "validated" || transition.ToStatus != "approved" ||
		transition.Catalog.Metadata["tenant_id"] != "tenant_a" ||
		transition.Catalog.Metadata["project_id"] != "project_a" ||
		transition.Catalog.Metadata["site_id"] != "site_a" ||
		transition.Catalog.Models[0].Versions[0].DefaultParameterSet.Status != "approved" {
		t.Fatalf("scoped promotion should update only matching persisted catalog, got %#v", transition)
	}
}

func TestDefaultParameterSetPromotionPlanEndpoint(t *testing.T) {
	svc := testValidatedService(t)
	auth, err := NewAuthenticator("")
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()
	catalogBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance.model_catalog.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	catalog := decodeMap(t, catalogBytes)
	models := catalog["models"].([]any)
	version := models[0].(map[string]any)["versions"].([]any)[0].(map[string]any)
	parameterSet := version["default_parameter_set"].(map[string]any)
	parameterSet["status"] = "validated"
	parameterHash := parameterSet["parameter_hash"].(string)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/model-catalog", bytes.NewReader(encodeMap(t, catalog)))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec := httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("model catalog registration failed: %d %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/model-catalog/material_balance/versions/material_balance.v1/default-parameter-set/promotion-plan", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("promotion plan before benchmark failed: %d %s", rec.Code, rec.Body.String())
	}
	var plan ModelParameterSetPromotionPlan
	if err := json.Unmarshal(rec.Body.Bytes(), &plan); err != nil {
		t.Fatal(err)
	}
	if plan.CanPromoteToApproved || plan.CurrentStatus != "validated" || plan.BenchmarkCasesChecked != 1 ||
		!containsString(plan.BlockingReasons, "benchmark_run_missing_for_parameter_set") {
		t.Fatalf("expected missing benchmark blocker, got %#v", plan)
	}

	ctx := context.Background()
	promotionPath := "/api/v1/model-catalog/material_balance/versions/material_balance.v1/default-parameter-set/promote-approved"
	promotionBody := `{"parameter_set_id":"ps_material_balance_default_v1","reason":"regression evidence gate","metadata":{"release_ticket":"PROMO-1"}}`
	req = httptest.NewRequest(http.MethodPost, promotionPath, strings.NewReader(promotionBody))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusConflict {
		t.Fatalf("promotion without benchmark evidence should conflict, got %d %s", rec.Code, rec.Body.String())
	}
	var appErr AppError
	if err := json.Unmarshal(rec.Body.Bytes(), &appErr); err != nil {
		t.Fatal(err)
	}
	blockingReasons, ok := appErr.Details["blocking_reasons"].([]any)
	if appErr.ErrorCode != CodeParameterSetTransitionFailed || !ok || len(blockingReasons) != 1 ||
		blockingReasons[0] != "benchmark_run_missing_for_parameter_set" {
		t.Fatalf("expected benchmark promotion blocker, got %#v", appErr)
	}
	blockedCatalog, err := svc.ModelCatalog(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if blockedCatalog.Models[0].Versions[0].DefaultParameterSet.Status != "validated" {
		t.Fatalf("blocked promotion should not mutate catalog: %#v", blockedCatalog.Models[0].Versions[0].DefaultParameterSet)
	}
	req = httptest.NewRequest(http.MethodPost, promotionPath, strings.NewReader(promotionBody))
	req.Header.Set("Authorization", "Bearer dev-worker-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("worker token should not promote parameter set, got %d %s", rec.Code, rec.Body.String())
	}

	if _, _, err := svc.CreateJob(ctx, fixtureJobBytes(t), ""); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.RegisterWorker(ctx, compatibleWorkerRegistration("worker_promotion")); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Claim(ctx, "worker_promotion"); err != nil {
		t.Fatal(err)
	}
	modelRun := map[string]any{
		"schema_version":  "model_run.v1",
		"model_run_id":    "mr_material_balance_promotion",
		"job_id":          "job_material_balance_minimal",
		"model_key":       "material_balance",
		"model_version":   "material_balance.v1",
		"parameter_hash":  parameterHash,
		"input_hash":      "sha256:" + strings.Repeat("c", 64),
		"quality_metrics": map[string]any{"convergence_status": "converged"},
		"warnings":        []any{},
		"evidence_refs":   []any{},
	}
	result := map[string]any{
		"schema_version": "compute_result.v1",
		"job_id":         "job_material_balance_minimal",
		"job_type":       "simulation.material_balance.v1",
		"status":         StatusSucceeded,
		"summary":        map[string]any{"converged": true},
		"data":           map[string]any{},
		"quality":        map[string]any{"data_quality": "ok", "warnings": []any{}},
		"artifacts":      []any{},
		"runtime_audit":  map[string]any{"model_runs": []any{modelRun}, "timings_ms": map[string]any{}, "fallback_used": false},
	}
	if _, err := svc.Complete(ctx, "worker_promotion", "job_material_balance_minimal", 1, result); err != nil {
		t.Fatal(err)
	}

	benchmarkRunBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance.benchmark_run.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	benchmarkRun := decodeMap(t, benchmarkRunBytes)
	benchmarkRun["benchmark_run_id"] = "br_material_balance_promotion"
	benchmarkRun["model_run_id"] = "mr_material_balance_promotion"
	benchmarkRun["job_id"] = "job_material_balance_minimal"
	benchmarkRun["evidence_refs"] = []any{"model_run:mr_material_balance_promotion"}
	benchmarkRun["executed_at"] = "2026-05-31T00:00:00Z"
	req = httptest.NewRequest(http.MethodPost, "/api/v1/model-catalog/material_balance/versions/material_balance.v1/benchmark-runs", bytes.NewReader(encodeMap(t, benchmarkRun)))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("benchmark run record failed: %d %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/model-catalog/material_balance/versions/material_balance.v1/default-parameter-set/promotion-plan", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("promotion plan after benchmark failed: %d %s", rec.Code, rec.Body.String())
	}
	plan = ModelParameterSetPromotionPlan{}
	if err := json.Unmarshal(rec.Body.Bytes(), &plan); err != nil {
		t.Fatal(err)
	}
	if !plan.CanPromoteToApproved || plan.WouldModifyCatalog || plan.BenchmarkCasesPassed != 1 ||
		len(plan.BlockingReasons) != 0 || len(plan.CaseResults) != 1 || !plan.CaseResults[0].Ready {
		t.Fatalf("expected promotable advisory plan without mutation, got %#v", plan)
	}

	req = httptest.NewRequest(http.MethodPost, promotionPath, strings.NewReader(promotionBody))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("benchmark-backed promotion failed: %d %s", rec.Code, rec.Body.String())
	}
	var transition ModelParameterSetTransitionResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &transition); err != nil {
		t.Fatal(err)
	}
	promotedParameterSet := transition.Catalog.Models[0].Versions[0].DefaultParameterSet
	if !transition.CreatedSnapshot || transition.FromStatus != "validated" || transition.ToStatus != "approved" ||
		transition.ParameterSetID != "ps_material_balance_default_v1" || promotedParameterSet == nil ||
		promotedParameterSet.Status != "approved" {
		t.Fatalf("unexpected benchmark-backed transition response: %#v", transition)
	}
	lastTransition, ok := promotedParameterSet.Metadata["last_status_transition"].(map[string]any)
	if !ok {
		t.Fatalf("expected last_status_transition metadata, got %#v", promotedParameterSet.Metadata)
	}
	transitionMetadata, ok := lastTransition["metadata"].(map[string]any)
	if !ok || transitionMetadata["release_ticket"] != "PROMO-1" ||
		transitionMetadata["promotion_source"] != "default_parameter_set_promotion_plan" ||
		transitionMetadata["benchmark_cases_checked"] != float64(1) ||
		transitionMetadata["benchmark_cases_passed"] != float64(1) {
		t.Fatalf("unexpected promotion transition metadata: %#v", lastTransition)
	}
	promotedCatalog, err := svc.ModelCatalog(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if promotedCatalog.Models[0].Versions[0].DefaultParameterSet.Status != "approved" {
		t.Fatalf("promotion should persist approved status: %#v", promotedCatalog.Models[0].Versions[0].DefaultParameterSet)
	}
	auditEvents, _, _, err := svc.store.ListMutationAuditEvents(ctx, MutationAuditFilter{Limit: 10})
	if err != nil {
		t.Fatal(err)
	}
	auditByType := map[string]MutationAuditRecord{}
	for _, event := range auditEvents {
		if event.TargetObject != "ModelCatalog" && event.TargetObject != "BenchmarkRun" && event.TargetObject != "ModelParameterSet" {
			continue
		}
		auditByType[event.EventType] = event
	}
	if len(auditByType) != 3 {
		t.Fatalf("expected catalog register, benchmark run, and promotion audit events, got %#v", auditByType)
	}
	benchmarkAudit := mutationAuditMap(t, auditByType[benchmarkRunRegisteredEvent])
	if benchmarkAudit["who"] != "dev-public" ||
		benchmarkAudit["where"] != "POST /api/v1/model-catalog/material_balance/versions/material_balance.v1/benchmark-runs" ||
		benchmarkAudit["target_object"] != "BenchmarkRun" ||
		benchmarkAudit["target_id"] != "br_material_balance_promotion" ||
		benchmarkAudit["action"] != "model.benchmark_run.register" {
		t.Fatalf("unexpected benchmark run audit envelope: %#v", benchmarkAudit)
	}
	benchmarkAfter, ok := benchmarkAudit["after"].(map[string]any)
	if !ok || benchmarkAfter["status"] != "passed" || benchmarkAfter["job_id"] != "job_material_balance_minimal" || benchmarkAfter["evidence_ref_count"] != float64(1) {
		t.Fatalf("benchmark run audit should include compact after state, got %#v", benchmarkAudit["after"])
	}
	promotionAudit := mutationAuditMap(t, auditByType[modelParameterSetPromotedApprovedEvent])
	if promotionAudit["who"] != "dev-public" ||
		promotionAudit["where"] != "POST "+promotionPath ||
		promotionAudit["target_object"] != "ModelParameterSet" ||
		promotionAudit["target_id"] != "material_balance:material_balance.v1:ps_material_balance_default_v1" ||
		promotionAudit["action"] != "model.parameter_set.promote_approved" ||
		promotionAudit["reason"] != "regression evidence gate" {
		t.Fatalf("unexpected parameter set promotion audit envelope: %#v", promotionAudit)
	}
	promotionBefore, ok := promotionAudit["before"].(map[string]any)
	if !ok || promotionBefore["status"] != "validated" {
		t.Fatalf("promotion audit should include validated before state, got %#v", promotionAudit["before"])
	}
	promotionAfter, ok := promotionAudit["after"].(map[string]any)
	if !ok || promotionAfter["status"] != "approved" || promotionAfter["created_snapshot"] != true || promotionAfter["catalog_payload_hash"] != transition.CatalogPayloadHash {
		t.Fatalf("promotion audit should include approved after state, got %#v", promotionAudit["after"])
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/model-catalog/material_balance/versions/material_balance.v1/default-parameter-set/promotion-plan", nil)
	req.Header.Set("Authorization", "Bearer dev-worker-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("worker token should not read promotion plan, got %d %s", rec.Code, rec.Body.String())
	}
}

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
