package compute

import (
	"encoding/json"
	"net/http"
	"testing"
)

func TestNewSystemEvidenceReferenceE2E(t *testing.T) {
	scenario := newCompletedNewSystemEvidenceScenario(t)

	resultView, err := scenario.svc.Result(scenario.ctx, scenario.jobID)
	if err != nil {
		t.Fatal(err)
	}
	summaryView := mapValue(resultView, "summary")
	riskFindings, ok := summaryView["risk_findings"].([]any)
	if !ok || len(riskFindings) != 1 {
		t.Fatalf("expected NewSystem risk finding in result summary, got %#v", summaryView["risk_findings"])
	}

	simulationInputResolution := scenario.resolveRef(t, "simulation_input:"+scenario.simulationInputID)
	if simulationInputResolution.RefType != "simulation_input" || stringValue(simulationInputResolution.Payload.(map[string]any), "simulation_input_id") != scenario.simulationInputID {
		t.Fatalf("unexpected simulation_input resolution: %#v", simulationInputResolution)
	}
	processGraphResolution := scenario.resolveRef(t, "process_graph:"+scenario.processGraphID)
	if processGraphResolution.RefType != "process_graph" || stringValue(processGraphResolution.Payload.(map[string]any), "process_graph_id") != scenario.processGraphID {
		t.Fatalf("unexpected process_graph resolution: %#v", processGraphResolution)
	}
	modelRunResolution := scenario.resolveRef(t, "model_run:"+scenario.modelRunID)
	if modelRunResolution.RefType != "model_run" || stringValue(modelRunResolution.Payload.(map[string]any), "model_run_id") != scenario.modelRunID {
		t.Fatalf("unexpected model_run resolution: %#v", modelRunResolution)
	}
	evidencePackageResolution := scenario.resolveRef(t, scenario.evidencePackageRef)
	if evidencePackageResolution.RefType != "evidence_package" || stringValue(evidencePackageResolution.Payload.(map[string]any), "job_id") != scenario.jobID {
		t.Fatalf("unexpected evidence_package resolution: %#v", evidencePackageResolution)
	}
	rec := serveWithToken(t, scenario.server, http.MethodGet, "/api/v1/compute/jobs/"+scenario.jobID+"/production-readiness", "dev-public-token", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("NewSystem production readiness read failed: %d %s", rec.Code, rec.Body.String())
	}
	var readiness ProductionReadinessReport
	if err := json.Unmarshal(rec.Body.Bytes(), &readiness); err != nil {
		t.Fatal(err)
	}
	if readiness.SchemaVersion != "production_readiness.v1" ||
		readiness.JobID != scenario.jobID ||
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
}
