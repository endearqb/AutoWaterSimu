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
