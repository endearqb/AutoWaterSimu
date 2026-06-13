package compute

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHTTPJobCreateMutationTenantProjectSiteScope(t *testing.T) {
	svc := testValidatedService(t)
	auth, err := NewAuthenticator(`{"tokens":[
		{"name":"scope-a","token":"scope-a-token","scopes":["job:create"],"tenant_id":"tenant_a","project_id":"project_a","site_id":"site_a"},
		{"name":"global","token":"global-token","scopes":["job:create"]}
	]}`)
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()
	ctx := context.Background()
	postJob := func(body []byte, token string, expectedStatus int) *httptest.ResponseRecorder {
		t.Helper()
		req := httptest.NewRequest(http.MethodPost, "/api/v1/compute/jobs", bytes.NewReader(body))
		req.Header.Set("Authorization", "Bearer "+token)
		rec := httptest.NewRecorder()
		server.ServeHTTP(rec, req)
		if rec.Code != expectedStatus {
			t.Fatalf("job create with %s got %d want %d: %s", token, rec.Code, expectedStatus, rec.Body.String())
		}
		return rec
	}

	rec := postJob(scopedFixtureJobBytes(t, "job_create_mutation_alpha", "tenant_a", "project_a", "site_a"), "scope-a-token", http.StatusAccepted)
	var snapshot JobSnapshot
	if err := json.Unmarshal(rec.Body.Bytes(), &snapshot); err != nil {
		t.Fatal(err)
	}
	if snapshot.Job.JobID != "job_create_mutation_alpha" || snapshot.Job.SiteID != "site_a" {
		t.Fatalf("unexpected scoped job create snapshot: %#v", snapshot.Job)
	}

	postJob(scopedFixtureJobBytes(t, "job_create_mutation_cross_site", "tenant_a", "project_a", "site_b"), "scope-a-token", http.StatusForbidden)
	if _, err := svc.GetJob(ctx, "job_create_mutation_cross_site"); err == nil {
		t.Fatalf("cross-scope denied job create must not write a job")
	}
	jobs, err := svc.ListJobs(ctx, ListFilter{Limit: 10})
	if err != nil {
		t.Fatal(err)
	}
	if jobs.TotalEstimate != 1 || len(jobs.Items) != 1 || jobs.Items[0].Job.JobID != "job_create_mutation_alpha" {
		t.Fatalf("cross-scope denied job create must not write job/events, got %#v", jobs)
	}
}
