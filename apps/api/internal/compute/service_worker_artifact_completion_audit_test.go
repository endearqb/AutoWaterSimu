package compute

import (
	"net/http"
	"testing"
)

func TestHTTPWorkerArtifactCompletionMutationAuditEvents(t *testing.T) {
	scenario := newWorkerAuditScenario(t, "worker_artifact_audit")

	rec := serveWithToken(t, scenario.server, http.MethodPost, "/api/v1/workers/worker_artifact_audit/claim", "dev-worker-token", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("worker claim failed: %d %s", rec.Code, rec.Body.String())
	}
	rec = serveWorkerAuditArtifact(t, scenario, "art_worker_audit", []byte(`{"audit":true}`))
	if rec.Code != http.StatusOK {
		t.Fatalf("artifact upload failed: %d %s", rec.Code, rec.Body.String())
	}
	rec = serveWithToken(t, scenario.server, http.MethodPost, "/api/v1/workers/worker_artifact_audit/jobs/"+scenario.jobID+"/succeed", "dev-worker-token", encodeMap(t, map[string]any{
		"attempt":        1,
		"compute_result": workerAuditSuccessResult(),
	}))
	if rec.Code != http.StatusOK {
		t.Fatalf("worker completion failed: %d %s", rec.Code, rec.Body.String())
	}

	events := workerAuditEventsByType(t, scenario)
	artifactAudit := assertWorkerJobAudit(t, events, "artifact.recorded", "POST /api/v1/workers/worker_artifact_audit/jobs/"+scenario.jobID+"/artifact", "Artifact", "art_worker_audit", "artifact.record")
	if after, ok := artifactAudit["after"].(map[string]any); !ok || after["artifact_id"] != "art_worker_audit" || after["job_id"] != scenario.jobID {
		t.Fatalf("artifact audit should include compact artifact state, got %#v", artifactAudit["after"])
	}
	completionAudit := assertWorkerJobAudit(t, events, "job.succeeded", "POST /api/v1/workers/worker_artifact_audit/jobs/"+scenario.jobID+"/succeed", "ComputeJob", scenario.jobID, "job.complete")
	if after, ok := completionAudit["after"].(map[string]any); !ok || after["status"] != StatusSucceeded || after["worker_id"] != "worker_artifact_audit" {
		t.Fatalf("completion audit should include compact terminal state, got %#v", completionAudit["after"])
	}
}
