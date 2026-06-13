package compute

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"testing"
)

type newSystemEvidenceScenario struct {
	ctx                context.Context
	svc                *Service
	server             http.Handler
	jobID              string
	processGraphID     string
	simulationInputID  string
	modelRunID         string
	evidenceRefs       []any
	evidencePackageRef string
}

func newCompletedNewSystemEvidenceScenario(t *testing.T) newSystemEvidenceScenario {
	t.Helper()

	svc := testValidatedService(t)
	auth, err := NewAuthenticator("")
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()
	ctx := context.Background()

	rec := serveWithToken(t, server, http.MethodPost, "/api/v1/process-graphs", "dev-public-token", validContractFixture(t, "material_balance_3_node.process_graph.v1.json"))
	if rec.Code != http.StatusCreated {
		t.Fatalf("process graph registration failed: %d %s", rec.Code, rec.Body.String())
	}

	processGraphRequest := decodeMap(t, validContractFixture(t, "material_balance_process_graph.simulation_request.v1.json"))
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

	rec = serveWithToken(t, server, http.MethodPost, "/api/v1/simulation-checks", "dev-public-token", encodeMap(t, processGraphRequest))
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
	evidenceRefs := []any{
		"simulation_input:" + simulationInputID,
		"process_graph:" + processGraphID,
		"model_run:" + modelRunID,
	}
	result := newSystemEvidenceResult(created.Job.JobID, processGraphID, simulationInputID, modelRunID, evidenceRefs)
	if _, err := svc.Complete(ctx, "worker_newsystem", created.Job.JobID, 1, result); err != nil {
		t.Fatal(err)
	}

	return newSystemEvidenceScenario{
		ctx:                ctx,
		svc:                svc,
		server:             server,
		jobID:              created.Job.JobID,
		processGraphID:     processGraphID,
		simulationInputID:  simulationInputID,
		modelRunID:         modelRunID,
		evidenceRefs:       evidenceRefs,
		evidencePackageRef: "evidence_package:evidence_" + safeIDPart(created.Job.JobID),
	}
}

func newSystemEvidenceResult(jobID, processGraphID, simulationInputID, modelRunID string, evidenceRefs []any) map[string]any {
	defaultParameterHash := builtInModelCatalog("2026-05-30T00:00:00Z").Models[0].Versions[0].DefaultParameterSet.ParameterHash
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
		"evidence_refs": []any{
			"simulation_input:" + simulationInputID,
			"process_graph:" + processGraphID,
		},
	}
	return map[string]any{
		"schema_version": "compute_result.v1",
		"job_id":         jobID,
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
}

func (scenario newSystemEvidenceScenario) resolveRef(t *testing.T, ref string) EvidenceReferenceResolution {
	t.Helper()

	rec := serveWithToken(t, scenario.server, http.MethodGet, "/api/v1/compute/jobs/"+scenario.jobID+"/evidence-ref?ref="+ref, "dev-public-token", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("evidence ref %s failed: %d %s", ref, rec.Code, rec.Body.String())
	}
	var resolution EvidenceReferenceResolution
	if err := json.Unmarshal(rec.Body.Bytes(), &resolution); err != nil {
		t.Fatal(err)
	}
	return resolution
}

func (scenario newSystemEvidenceScenario) resultExplanationDocument(t *testing.T) map[string]any {
	t.Helper()

	explanation := decodeMap(t, validContractFixture(t, "material_balance.result_explanation.v1.json"))
	explanation["explanation_id"] = "explanation_newsystem_evidence_e2e"
	explanation["job_id"] = scenario.jobID
	explanation["created_by"] = "agent:new-system-e2e"
	explanation["evidence_refs"] = append(scenario.evidenceRefs, scenario.evidencePackageRef)
	statements := explanation["statements"].([]any)
	statements[0].(map[string]any)["evidence_refs"] = scenario.evidenceRefs
	return explanation
}
