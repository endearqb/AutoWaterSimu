package compute

import (
	"encoding/json"
	"net/http"
	"strings"
	"testing"
)

func TestModelRunEvidencePackageAndReadiness(t *testing.T) {
	scenario := newCompletedModelRunScenario(t)

	evidence, checksum, err := scenario.svc.EvidencePackage(scenario.ctx, scenario.jobID)
	if err != nil {
		t.Fatal(err)
	}
	if evidence["schema_version"] != "evidence_package.v1" || evidence["job_id"] != scenario.jobID {
		t.Fatalf("unexpected evidence package: %#v", evidence)
	}
	if checksum == "" || !strings.HasPrefix(checksum, "sha256:") {
		t.Fatalf("expected evidence checksum, got %q", checksum)
	}
	refs, ok := evidence["model_run_refs"].([]any)
	if !ok || len(refs) != 1 || refs[0] != scenario.modelRunID {
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
	readiness, err := scenario.svc.ProductionReadiness(scenario.ctx, scenario.jobID)
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
}

func TestHTTPModelRunEvidenceAndReadinessEndpoints(t *testing.T) {
	scenario := newCompletedModelRunScenario(t)

	rec := serveWithToken(t, scenario.server, http.MethodGet, "/api/v1/compute/jobs/"+scenario.jobID+"/evidence", "dev-public-token", nil)
	if rec.Code != http.StatusOK || rec.Header().Get("X-Evidence-Checksum") == "" {
		t.Fatalf("evidence endpoint failed: %d checksum=%q body=%s", rec.Code, rec.Header().Get("X-Evidence-Checksum"), rec.Body.String())
	}

	rec = serveWithToken(t, scenario.server, http.MethodGet, "/api/v1/compute/jobs/"+scenario.jobID+"/evidence-ref?ref=model_run:"+scenario.modelRunID, "dev-public-token", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("evidence ref endpoint failed: %d %s", rec.Code, rec.Body.String())
	}
	var resolution EvidenceReferenceResolution
	if err := json.Unmarshal(rec.Body.Bytes(), &resolution); err != nil {
		t.Fatal(err)
	}
	payload, ok := resolution.Payload.(map[string]any)
	if !ok || resolution.RefType != "model_run" || payload["model_run_id"] != scenario.modelRunID {
		t.Fatalf("unexpected evidence ref resolution: %#v", resolution)
	}

	rec = serveWithToken(t, scenario.server, http.MethodGet, "/api/v1/compute/jobs/"+scenario.jobID+"/evidence-ref?ref=evidence_package:evidence_"+scenario.jobID, "dev-public-token", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("evidence package ref endpoint failed: %d %s", rec.Code, rec.Body.String())
	}

	rec = serveWithToken(t, scenario.server, http.MethodGet, "/api/v1/compute/jobs/"+scenario.jobID+"/production-readiness", "dev-public-token", nil)
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
}

func TestHTTPModelRunEvidenceEndpointsRejectWorkerToken(t *testing.T) {
	scenario := newCompletedModelRunScenario(t)

	rec := serveWithToken(t, scenario.server, http.MethodGet, "/api/v1/compute/jobs/"+scenario.jobID+"/evidence", "dev-worker-token", nil)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("worker token should not read evidence, got %d %s", rec.Code, rec.Body.String())
	}
	rec = serveWithToken(t, scenario.server, http.MethodGet, "/api/v1/compute/jobs/"+scenario.jobID+"/evidence-ref?ref=model_run:"+scenario.modelRunID, "dev-worker-token", nil)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("worker token should not dereference evidence, got %d %s", rec.Code, rec.Body.String())
	}
}
