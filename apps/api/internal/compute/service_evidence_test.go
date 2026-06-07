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

func TestProductionReadinessBlocksHighRiskFindings(t *testing.T) {
	svc := testValidatedService(t)
	ctx := context.Background()
	job := decodeMap(t, fixtureJobBytes(t))
	job["job_id"] = "job_material_balance_high_risk"
	job["request_id"] = "req_material_balance_high_risk"
	job["idempotency_key"] = "idem_material_balance_high_risk"
	payload := job["payload"].(map[string]any)
	payload["simulation_input_id"] = "si_material_balance_high_risk"
	payload["process_graph_id"] = "pg_material_balance_high_risk"
	contextMap := job["context"].(map[string]any)
	contextMap["trace_id"] = "trace_material_balance_high_risk"
	if _, _, err := svc.CreateJob(ctx, encodeMap(t, job), ""); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.RegisterWorker(ctx, compatibleWorkerRegistration("worker_high_risk")); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Claim(ctx, "worker_high_risk"); err != nil {
		t.Fatal(err)
	}
	defaultParameterHash := builtInModelCatalog("2026-05-30T00:00:00Z").Models[0].Versions[0].DefaultParameterSet.ParameterHash
	modelRun := map[string]any{
		"schema_version":  "model_run.v1",
		"model_run_id":    "mr_material_balance_high_risk",
		"job_id":          "job_material_balance_high_risk",
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
		"job_id":         "job_material_balance_high_risk",
		"job_type":       "simulation.material_balance.v1",
		"status":         StatusSucceeded,
		"summary":        map[string]any{"converged": true},
		"data":           map[string]any{},
		"quality":        map[string]any{"data_quality": "ok", "warnings": []any{}},
		"artifacts":      []any{},
		"risk_findings": []any{
			map[string]any{
				"risk_code":     "effluent_limit_exceeded",
				"severity":      "high",
				"title":         "Effluent limit exceeded",
				"description":   "The simulated effluent concentration exceeds the review threshold.",
				"evidence_refs": []any{"model_run:mr_material_balance_high_risk"},
			},
		},
		"runtime_audit": map[string]any{"model_runs": []any{modelRun}, "timings_ms": map[string]any{}, "fallback_used": false},
	}
	if _, err := svc.Complete(ctx, "worker_high_risk", "job_material_balance_high_risk", 1, result); err != nil {
		t.Fatal(err)
	}
	readiness, err := svc.ProductionReadiness(ctx, "job_material_balance_high_risk")
	if err != nil {
		t.Fatal(err)
	}
	if readiness.ProductionReady ||
		readiness.ReadinessStatus != "blocked" ||
		readiness.RiskFindingsSummary.BySeverity["high"] != 1 ||
		len(readiness.RiskFindingsSummary.Blocking) != 1 ||
		readiness.RiskFindingsSummary.Blocking[0] != "effluent_limit_exceeded" {
		t.Fatalf("expected high risk finding to block production readiness, got %#v", readiness)
	}
	foundBlockingCheck := false
	for _, check := range readiness.Checks {
		if check.CheckID == "risk_findings_no_high_or_critical" && check.Status == "failed" {
			foundBlockingCheck = true
		}
	}
	if !foundBlockingCheck {
		t.Fatalf("expected failed risk finding check, got %#v", readiness.Checks)
	}
}

func TestHTTPResultExplanationAuditEvents(t *testing.T) {
	svc := testValidatedService(t)
	ctx := context.Background()
	if _, _, err := svc.CreateJob(ctx, fixtureJobBytes(t), ""); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.RegisterWorker(ctx, compatibleWorkerRegistration("worker_result_audit")); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Claim(ctx, "worker_result_audit"); err != nil {
		t.Fatal(err)
	}
	defaultParameterHash := builtInModelCatalog("2026-05-30T00:00:00Z").Models[0].Versions[0].DefaultParameterSet.ParameterHash
	modelRun := map[string]any{
		"schema_version":  "model_run.v1",
		"model_run_id":    "mr_material_balance_minimal",
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
		"runtime_audit":  map[string]any{"model_runs": []any{modelRun}, "timings_ms": map[string]any{}, "fallback_used": false},
	}
	if _, err := svc.Complete(ctx, "worker_result_audit", "job_material_balance_minimal", 1, result); err != nil {
		t.Fatal(err)
	}

	auth, err := NewAuthenticator(`{"tokens":[
		{"name":"result-auditor","token":"result-audit-token","scopes":["job:read","explanation:write"]}
	]}`)
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()
	explanationBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance.result_explanation.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	explanationID := "explanation_material_balance_minimal"
	req := httptest.NewRequest(http.MethodPost, "/api/v1/compute/jobs/job_material_balance_minimal/result-explanations", bytes.NewReader(explanationBytes))
	req.Header.Set("Authorization", "Bearer result-audit-token")
	rec := httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("result explanation submit failed: %d %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/compute/jobs/job_material_balance_minimal/result-explanations", bytes.NewReader(explanationBytes))
	req.Header.Set("Authorization", "Bearer result-audit-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("duplicate submit should be idempotent: %d %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/compute/jobs/job_material_balance_minimal/result-explanations/"+explanationID+"/review", strings.NewReader(`{"decision":"approved","reason":"evidence refs verified"}`))
	req.Header.Set("Authorization", "Bearer result-audit-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("result explanation review failed: %d %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/compute/jobs/job_material_balance_minimal/result-explanations/"+explanationID+"/publish", nil)
	req.Header.Set("Authorization", "Bearer result-audit-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("result explanation publish failed: %d %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/compute/jobs/job_material_balance_minimal/result-explanations/"+explanationID+"/publish", nil)
	req.Header.Set("Authorization", "Bearer result-audit-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("duplicate publish should be idempotent: %d %s", rec.Code, rec.Body.String())
	}

	events, err := svc.Events(context.Background(), "job_material_balance_minimal")
	if err != nil {
		t.Fatal(err)
	}
	counts := map[string]int{}
	byType := map[string]EventRecord{}
	for _, event := range events {
		if strings.HasPrefix(event.EventType, "result_explanation.") {
			counts[event.EventType]++
			byType[event.EventType] = event
		}
	}
	if counts["result_explanation.submitted"] != 1 ||
		counts["result_explanation.reviewed"] != 1 ||
		counts["result_explanation.published"] != 1 {
		t.Fatalf("expected one audit event per result explanation mutation, got counts=%#v events=%#v", counts, events)
	}

	assertResultExplanationAudit := func(eventType, action, path, status string) map[string]any {
		t.Helper()
		event := byType[eventType]
		payload := eventPayloadMap(t, event)
		if payload["explanation_id"] != explanationID || payload["status"] != status {
			t.Fatalf("unexpected %s payload: %#v", eventType, payload)
		}
		if _, ok := payload["payload"]; ok {
			t.Fatalf("%s audit payload must not include full explanation payload: %#v", eventType, payload)
		}
		audit := eventAuditMap(t, event)
		if audit["who"] != "result-auditor" ||
			audit["where"] != path ||
			audit["target_object"] != "ResultExplanation" ||
			audit["target_id"] != explanationID ||
			audit["action"] != action ||
			audit["trace_id"] != "trace_material_balance_minimal" {
			t.Fatalf("unexpected audit envelope for %s: %#v", eventType, audit)
		}
		if audit["when"] == "" {
			t.Fatalf("%s audit envelope should include when: %#v", eventType, audit)
		}
		return audit
	}
	submittedAudit := assertResultExplanationAudit(
		"result_explanation.submitted",
		"result_explanation.submit",
		"POST /api/v1/compute/jobs/job_material_balance_minimal/result-explanations",
		"submitted",
	)
	if submittedAudit["before"] != nil {
		t.Fatalf("submit audit should not have before state: %#v", submittedAudit["before"])
	}
	submittedAfter, ok := submittedAudit["after"].(map[string]any)
	if !ok || submittedAfter["payload_hash"] == "" || submittedAfter["resolved_evidence_ref_count"].(float64) != 2 {
		t.Fatalf("submit audit should include compact after state: %#v", submittedAudit["after"])
	}

	reviewedAudit := assertResultExplanationAudit(
		"result_explanation.reviewed",
		"result_explanation.review",
		"POST /api/v1/compute/jobs/job_material_balance_minimal/result-explanations/"+explanationID+"/review",
		"approved",
	)
	reviewBefore, ok := reviewedAudit["before"].(map[string]any)
	if !ok || reviewBefore["status"] != "submitted" {
		t.Fatalf("review audit should include submitted before state: %#v", reviewedAudit["before"])
	}
	reviewAfter, ok := reviewedAudit["after"].(map[string]any)
	if !ok || reviewAfter["status"] != "approved" || reviewAfter["review_decision"] != "approved" {
		t.Fatalf("review audit should include approved after state: %#v", reviewedAudit["after"])
	}
	if reviewedAudit["reason"] != "evidence refs verified" {
		t.Fatalf("review audit should preserve reason, got %#v", reviewedAudit)
	}

	publishedAudit := assertResultExplanationAudit(
		"result_explanation.published",
		"result_explanation.publish",
		"POST /api/v1/compute/jobs/job_material_balance_minimal/result-explanations/"+explanationID+"/publish",
		"published",
	)
	publishBefore, ok := publishedAudit["before"].(map[string]any)
	if !ok || publishBefore["status"] != "approved" {
		t.Fatalf("publish audit should include approved before state: %#v", publishedAudit["before"])
	}
	publishAfter, ok := publishedAudit["after"].(map[string]any)
	if !ok || publishAfter["status"] != "published" || publishAfter["published_by"] != "result-auditor" {
		t.Fatalf("publish audit should include published after state: %#v", publishedAudit["after"])
	}
}

func TestNewSystemEvidenceReferenceE2E(t *testing.T) {
	svc := testValidatedService(t)
	auth, err := NewAuthenticator("")
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()
	ctx := context.Background()

	processGraphBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance_3_node.process_graph.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	req := httptest.NewRequest(http.MethodPost, "/api/v1/process-graphs", bytes.NewReader(processGraphBytes))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec := httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("process graph registration failed: %d %s", rec.Code, rec.Body.String())
	}

	processGraphRequestBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance_process_graph.simulation_request.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	processGraphRequest := decodeMap(t, processGraphRequestBytes)
	processGraphRequest["request_id"] = "sim_req_newsystem_evidence_e2e"
	processGraphRequest["source_system"] = "NewSystem"
	processGraphRequest["requested_by"] = "new-system:approval"
	processGraphRequest["external_refs"] = map[string]any{
		"approval_id": "approval_newsystem_evidence_e2e",
		"site_id":     "site_demo",
	}
	metadata := mapValue(processGraphRequest, "metadata")
	metadata["trace_id"] = "trace_newsystem_evidence_e2e"
	metadata["project_id"] = "project_demo"

	req = httptest.NewRequest(http.MethodPost, "/api/v1/simulation-checks", bytes.NewReader(encodeMap(t, processGraphRequest)))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusAccepted {
		t.Fatalf("NewSystem simulation check create failed: %d %s", rec.Code, rec.Body.String())
	}
	var created JobSnapshot
	if err := json.Unmarshal(rec.Body.Bytes(), &created); err != nil {
		t.Fatal(err)
	}
	if created.Job.SourceSystem != "NewSystem" || created.Job.ProjectID != "project_demo" || created.Job.SiteID != "site_demo" {
		t.Fatalf("unexpected NewSystem simulation check job metadata: %#v", created.Job)
	}

	if _, err := svc.RegisterWorker(ctx, compatibleWorkerRegistration("worker_newsystem")); err != nil {
		t.Fatal(err)
	}
	claimed, err := svc.Claim(ctx, "worker_newsystem")
	if err != nil {
		t.Fatal(err)
	}
	claimedJob := mapValue(claimed, "job")
	if stringValue(claimedJob, "job_id") != created.Job.JobID {
		t.Fatalf("expected to claim NewSystem job %s, got %#v", created.Job.JobID, claimed["job"])
	}

	processGraphID := "pg_material_balance_minimal"
	simulationInputID := "si_pg_material_balance_minimal"
	modelRunID := "mr_newsystem_evidence_e2e"
	defaultParameterHash := builtInModelCatalog("2026-05-30T00:00:00Z").Models[0].Versions[0].DefaultParameterSet.ParameterHash
	modelRun := map[string]any{
		"schema_version":  "model_run.v1",
		"model_run_id":    modelRunID,
		"job_id":          created.Job.JobID,
		"model_key":       "material_balance",
		"model_version":   "material_balance.v1",
		"parameter_hash":  defaultParameterHash,
		"input_hash":      "sha256:" + strings.Repeat("c", 64),
		"quality_metrics": map[string]any{"convergence_status": "converged"},
		"warnings":        []any{},
		"evidence_refs": []any{
			"simulation_input:" + simulationInputID,
			"process_graph:" + processGraphID,
		},
	}
	evidenceRefs := []any{
		"simulation_input:" + simulationInputID,
		"process_graph:" + processGraphID,
		"model_run:" + modelRunID,
	}
	result := map[string]any{
		"schema_version": "compute_result.v1",
		"job_id":         created.Job.JobID,
		"job_type":       "simulation.material_balance.v1",
		"status":         StatusSucceeded,
		"summary":        map[string]any{"approval_ready": true},
		"data":           map[string]any{},
		"quality":        map[string]any{"data_quality": "ok", "warnings": []any{}},
		"artifacts":      []any{},
		"risk_findings": []any{
			map[string]any{
				"risk_code":     "new_system_material_balance_checked",
				"severity":      "info",
				"title":         "NewSystem simulation check completed",
				"description":   "The NewSystem approval read path can inspect input, graph, and model run evidence.",
				"evidence_refs": evidenceRefs,
			},
		},
		"runtime_audit": map[string]any{"model_runs": []any{modelRun}, "timings_ms": map[string]any{}, "fallback_used": false},
	}
	if _, err := svc.Complete(ctx, "worker_newsystem", created.Job.JobID, 1, result); err != nil {
		t.Fatal(err)
	}
	resultView, err := svc.Result(ctx, created.Job.JobID)
	if err != nil {
		t.Fatal(err)
	}
	summaryView := mapValue(resultView, "summary")
	riskFindings, ok := summaryView["risk_findings"].([]any)
	if !ok || len(riskFindings) != 1 {
		t.Fatalf("expected NewSystem risk finding in result summary, got %#v", summaryView["risk_findings"])
	}

	resolveRef := func(ref string) EvidenceReferenceResolution {
		t.Helper()
		req := httptest.NewRequest(http.MethodGet, "/api/v1/compute/jobs/"+created.Job.JobID+"/evidence-ref?ref="+ref, nil)
		req.Header.Set("Authorization", "Bearer dev-public-token")
		rec := httptest.NewRecorder()
		server.ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatalf("evidence ref %s failed: %d %s", ref, rec.Code, rec.Body.String())
		}
		var resolution EvidenceReferenceResolution
		if err := json.Unmarshal(rec.Body.Bytes(), &resolution); err != nil {
			t.Fatal(err)
		}
		return resolution
	}

	simulationInputResolution := resolveRef("simulation_input:" + simulationInputID)
	if simulationInputResolution.RefType != "simulation_input" || stringValue(simulationInputResolution.Payload.(map[string]any), "simulation_input_id") != simulationInputID {
		t.Fatalf("unexpected simulation_input resolution: %#v", simulationInputResolution)
	}
	processGraphResolution := resolveRef("process_graph:" + processGraphID)
	if processGraphResolution.RefType != "process_graph" || stringValue(processGraphResolution.Payload.(map[string]any), "process_graph_id") != processGraphID {
		t.Fatalf("unexpected process_graph resolution: %#v", processGraphResolution)
	}
	modelRunResolution := resolveRef("model_run:" + modelRunID)
	if modelRunResolution.RefType != "model_run" || stringValue(modelRunResolution.Payload.(map[string]any), "model_run_id") != modelRunID {
		t.Fatalf("unexpected model_run resolution: %#v", modelRunResolution)
	}
	evidencePackageRef := "evidence_package:evidence_" + safeIDPart(created.Job.JobID)
	evidencePackageResolution := resolveRef(evidencePackageRef)
	if evidencePackageResolution.RefType != "evidence_package" || stringValue(evidencePackageResolution.Payload.(map[string]any), "job_id") != created.Job.JobID {
		t.Fatalf("unexpected evidence_package resolution: %#v", evidencePackageResolution)
	}
	req = httptest.NewRequest(http.MethodGet, "/api/v1/compute/jobs/"+created.Job.JobID+"/production-readiness", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("NewSystem production readiness read failed: %d %s", rec.Code, rec.Body.String())
	}
	var readiness ProductionReadinessReport
	if err := json.Unmarshal(rec.Body.Bytes(), &readiness); err != nil {
		t.Fatal(err)
	}
	if readiness.SchemaVersion != "production_readiness.v1" ||
		readiness.JobID != created.Job.JobID ||
		readiness.ReadinessStatus != "ready_for_external_approval" ||
		!readiness.ProductionReady ||
		!readiness.ExternalApprovalRequired ||
		readiness.AutoPublishAllowed ||
		readiness.EvidencePackageID != stringValue(evidencePackageResolution.Payload.(map[string]any), "evidence_package_id") {
		t.Fatalf("unexpected NewSystem production readiness report: %#v", readiness)
	}
	if readiness.RiskFindingsSummary.Total != 1 ||
		readiness.RiskFindingsSummary.BySeverity["info"] != 1 ||
		len(readiness.BlockingReasons) != 0 {
		t.Fatalf("unexpected NewSystem production readiness risk summary: %#v", readiness.RiskFindingsSummary)
	}
	if readiness.Metadata["source_system"] != "NewSystem" || readiness.Metadata["project_id"] != "project_demo" {
		t.Fatalf("unexpected NewSystem production readiness metadata: %#v", readiness.Metadata)
	}

	explanationBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance.result_explanation.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	explanation := decodeMap(t, explanationBytes)
	explanation["explanation_id"] = "explanation_newsystem_evidence_e2e"
	explanation["job_id"] = created.Job.JobID
	explanation["created_by"] = "agent:new-system-e2e"
	explanation["evidence_refs"] = append(evidenceRefs, evidencePackageRef)
	statements := explanation["statements"].([]any)
	statements[0].(map[string]any)["evidence_refs"] = evidenceRefs
	req = httptest.NewRequest(http.MethodPost, "/api/v1/compute/jobs/"+created.Job.JobID+"/result-explanations", bytes.NewReader(encodeMap(t, explanation)))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("NewSystem result explanation submit failed: %d %s", rec.Code, rec.Body.String())
	}
	var explanationRecord ResultExplanationRecord
	if err := json.Unmarshal(rec.Body.Bytes(), &explanationRecord); err != nil {
		t.Fatal(err)
	}
	if explanationRecord.Status != "submitted" || len(explanationRecord.ResolvedEvidenceRefs) != 4 {
		t.Fatalf("unexpected NewSystem result explanation record: %#v", explanationRecord)
	}
}

func TestProcessGraphEvidenceReference(t *testing.T) {
	svc := testValidatedService(t)
	auth, err := NewAuthenticator("")
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()
	processGraphBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance_3_node.process_graph.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	req := httptest.NewRequest(http.MethodPost, "/api/v1/process-graphs", bytes.NewReader(processGraphBytes))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec := httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("process graph registration failed: %d %s", rec.Code, rec.Body.String())
	}

	processGraphRequestBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance_process_graph.simulation_request.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/simulation-checks", bytes.NewReader(processGraphRequestBytes))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusAccepted {
		t.Fatalf("process graph simulation check create failed: %d %s", rec.Code, rec.Body.String())
	}
	var created JobSnapshot
	if err := json.Unmarshal(rec.Body.Bytes(), &created); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.RegisterWorker(context.Background(), compatibleWorkerRegistration("worker_pg")); err != nil {
		t.Fatal(err)
	}
	claimed, err := svc.Claim(context.Background(), "worker_pg")
	if err != nil {
		t.Fatal(err)
	}
	claimedJob := mapValue(claimed, "job")
	if stringValue(claimedJob, "job_id") != created.Job.JobID {
		t.Fatalf("expected to claim process graph job %s, got %#v", created.Job.JobID, claimed["job"])
	}
	result := map[string]any{
		"schema_version": "compute_result.v1",
		"job_id":         created.Job.JobID,
		"job_type":       "simulation.material_balance.v1",
		"status":         StatusSucceeded,
		"summary":        map[string]any{"converged": true},
		"data":           map[string]any{},
		"quality":        map[string]any{"data_quality": "ok", "warnings": []any{}},
		"artifacts":      []any{},
		"runtime_audit":  map[string]any{"model_runs": []any{}, "timings_ms": map[string]any{}, "fallback_used": false},
	}
	if _, err := svc.Complete(context.Background(), "worker_pg", created.Job.JobID, 1, result); err != nil {
		t.Fatal(err)
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/compute/jobs/"+created.Job.JobID+"/evidence-ref?ref=process_graph:pg_material_balance_minimal", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("process graph evidence ref failed: %d %s", rec.Code, rec.Body.String())
	}
	var resolution EvidenceReferenceResolution
	if err := json.Unmarshal(rec.Body.Bytes(), &resolution); err != nil {
		t.Fatal(err)
	}
	payload, ok := resolution.Payload.(map[string]any)
	if !ok || resolution.RefType != "process_graph" || payload["process_graph_id"] != "pg_material_balance_minimal" {
		t.Fatalf("unexpected process graph evidence ref resolution: %#v", resolution)
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/compute/jobs/"+created.Job.JobID+"/evidence-ref?ref=process_graph:missing", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("missing process graph evidence ref should 404, got %d %s", rec.Code, rec.Body.String())
	}
}
