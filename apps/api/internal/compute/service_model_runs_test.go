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
