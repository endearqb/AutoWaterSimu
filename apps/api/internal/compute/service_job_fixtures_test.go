package compute

import (
	"os"
	"path/filepath"
	"testing"
)

func fixtureJobBytes(t *testing.T) []byte {
	t.Helper()
	path := filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance_minimal.compute_job.v1.json")
	bytes, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	return bytes
}

func scopedFixtureJobBytes(t *testing.T, jobID, tenantID, projectID, siteID string) []byte {
	t.Helper()
	job := decodeMap(t, fixtureJobBytes(t))
	job["job_id"] = jobID
	job["request_id"] = "req_" + jobID
	job["idempotency_key"] = "idem_" + jobID
	contextMap := job["context"].(map[string]any)
	contextMap["trace_id"] = "trace_" + jobID
	contextMap["tenant_id"] = tenantID
	contextMap["project_id"] = projectID
	contextMap["site_id"] = siteID
	payload := job["payload"].(map[string]any)
	payload["simulation_input_id"] = "si_" + jobID
	payload["process_graph_id"] = "pg_" + jobID
	return encodeMap(t, job)
}
