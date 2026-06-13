package compute

import (
	"net/http"
	"testing"
)

func TestHTTPWorkerJobMutationAuditEvents(t *testing.T) {
	scenario := newWorkerAuditScenario(t, "worker_audit")

	rec := serveWithToken(t, scenario.server, http.MethodPost, "/api/v1/workers/worker_audit/claim", "dev-worker-token", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("worker claim failed: %d %s", rec.Code, rec.Body.String())
	}
	rec = serveWithToken(t, scenario.server, http.MethodPost, "/api/v1/workers/worker_audit/heartbeat", "dev-worker-token", encodeMap(t, map[string]any{
		"job_id": scenario.jobID,
	}))
	if rec.Code != http.StatusOK {
		t.Fatalf("worker heartbeat failed: %d %s", rec.Code, rec.Body.String())
	}

	events := workerAuditEventsByType(t, scenario)
	claimAudit := assertWorkerJobAudit(t, events, "job.running", "POST /api/v1/workers/worker_audit/claim", "ComputeJob", scenario.jobID, "job.claim")
	if after, ok := claimAudit["after"].(map[string]any); !ok || after["status"] != StatusRunning || after["worker_id"] != "worker_audit" {
		t.Fatalf("claim audit should include compact running state, got %#v", claimAudit["after"])
	}
	heartbeatAudit := assertWorkerJobAudit(t, events, "job.heartbeat", "POST /api/v1/workers/worker_audit/heartbeat", "ComputeJob", scenario.jobID, "job.heartbeat")
	heartbeatBefore, ok := heartbeatAudit["before"].(map[string]any)
	if !ok || heartbeatBefore["status"] != StatusRunning || heartbeatBefore["lease_expires_at"] == "" {
		t.Fatalf("heartbeat audit should include compact before lease state, got %#v", heartbeatAudit["before"])
	}
	heartbeatAfter, ok := heartbeatAudit["after"].(map[string]any)
	if !ok || heartbeatAfter["status"] != StatusRunning || heartbeatAfter["worker_id"] != "worker_audit" || heartbeatAfter["lease_expires_at"] == "" {
		t.Fatalf("heartbeat audit should include compact after lease state, got %#v", heartbeatAudit["after"])
	}
}
