package compute

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

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

func TestProcessGraphEvidenceReferenceHonorsJobObjectScope(t *testing.T) {
	svc := testValidatedService(t)
	ctx := context.Background()
	auth, err := NewAuthenticator(`{"tokens":[
		{"name":"scope-a","token":"scope-a-token","scopes":["job:read","evidence:read"],"tenant_id":"tenant_a","project_id":"project_a","site_id":"site_a"},
		{"name":"global","token":"global-token","scopes":["job:read","evidence:read"]}
	]}`)
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()

	if _, _, err := svc.RegisterProcessGraph(ctx, scopedProcessGraphBytes(t, "pg_evidence_ref_scope_beta", "tenant_b", "project_b", "site_b"), "compute-api", "test"); err != nil {
		t.Fatal(err)
	}
	betaJob := decodeMap(t, scopedFixtureJobBytes(t, "job_evidence_ref_scope_alpha_to_beta", "tenant_a", "project_a", "site_a"))
	betaPayload := mapValue(betaJob, "payload")
	betaPayload["process_graph_id"] = "pg_evidence_ref_scope_beta"
	betaPayload["process_graph_version"] = float64(1)
	createdBeta, _, err := svc.CreateJob(ctx, encodeMap(t, betaJob), "")
	if err != nil {
		t.Fatal(err)
	}
	completeEvidenceRefJob(t, svc, ctx, createdBeta.Job.JobID, "worker_evidence_ref_beta")

	assertEvidenceRefStatus := func(jobID, ref, token string, expectedStatus int) *httptest.ResponseRecorder {
		t.Helper()
		req := httptest.NewRequest(http.MethodGet, "/api/v1/compute/jobs/"+jobID+"/evidence-ref?ref="+ref, nil)
		req.Header.Set("Authorization", "Bearer "+token)
		rec := httptest.NewRecorder()
		server.ServeHTTP(rec, req)
		if rec.Code != expectedStatus {
			t.Fatalf("evidence ref %s with %s got %d want %d: %s", ref, token, rec.Code, expectedStatus, rec.Body.String())
		}
		return rec
	}

	assertEvidenceRefStatus(createdBeta.Job.JobID, "process_graph:pg_evidence_ref_scope_beta", "scope-a-token", http.StatusNotFound)
	assertEvidenceRefStatus(createdBeta.Job.JobID, "process_graph:pg_evidence_ref_scope_beta", "global-token", http.StatusNotFound)

	if _, _, err := svc.RegisterProcessGraph(ctx, scopedProcessGraphBytes(t, "pg_evidence_ref_scope_alpha", "tenant_a", "project_a", "site_a"), "compute-api", "test"); err != nil {
		t.Fatal(err)
	}
	alphaJob := decodeMap(t, scopedFixtureJobBytes(t, "job_evidence_ref_scope_alpha", "tenant_a", "project_a", "site_a"))
	alphaPayload := mapValue(alphaJob, "payload")
	alphaPayload["process_graph_id"] = "pg_evidence_ref_scope_alpha"
	alphaPayload["process_graph_version"] = float64(1)
	createdAlpha, _, err := svc.CreateJob(ctx, encodeMap(t, alphaJob), "")
	if err != nil {
		t.Fatal(err)
	}
	completeEvidenceRefJob(t, svc, ctx, createdAlpha.Job.JobID, "worker_evidence_ref_alpha")

	rec := assertEvidenceRefStatus(createdAlpha.Job.JobID, "process_graph:pg_evidence_ref_scope_alpha", "scope-a-token", http.StatusOK)
	var resolution EvidenceReferenceResolution
	if err := json.Unmarshal(rec.Body.Bytes(), &resolution); err != nil {
		t.Fatal(err)
	}
	payload, ok := resolution.Payload.(map[string]any)
	if !ok || payload["process_graph_id"] != "pg_evidence_ref_scope_alpha" {
		t.Fatalf("same-scope process graph evidence ref should resolve alpha payload, got %#v", resolution)
	}
}

func completeEvidenceRefJob(t *testing.T, svc *Service, ctx context.Context, jobID, workerID string) {
	t.Helper()
	if _, err := svc.RegisterWorker(ctx, compatibleWorkerRegistration(workerID)); err != nil {
		t.Fatal(err)
	}
	claimed, err := svc.Claim(ctx, workerID)
	if err != nil {
		t.Fatal(err)
	}
	claimedJob := mapValue(claimed, "job")
	if stringValue(claimedJob, "job_id") != jobID {
		t.Fatalf("expected worker %s to claim %s, got %#v", workerID, jobID, claimed["job"])
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
		"runtime_audit":  map[string]any{"model_runs": []any{}, "timings_ms": map[string]any{}, "fallback_used": false},
	}
	if _, err := svc.Complete(ctx, workerID, jobID, 1, result); err != nil {
		t.Fatal(err)
	}
}
