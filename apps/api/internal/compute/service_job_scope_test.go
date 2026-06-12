package compute

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHTTPJobCancelMutationTenantProjectSiteScope(t *testing.T) {
	svc := testService(t)
	ctx := context.Background()
	if _, _, err := svc.CreateJob(ctx, scopedFixtureJobBytes(t, "job_cancel_scope_alpha", "tenant_a", "project_a", "site_a"), ""); err != nil {
		t.Fatal(err)
	}
	if _, _, err := svc.CreateJob(ctx, scopedFixtureJobBytes(t, "job_cancel_scope_beta", "tenant_b", "project_b", "site_b"), ""); err != nil {
		t.Fatal(err)
	}
	auth, err := NewAuthenticator(`{"tokens":[
		{"name":"scope-a","token":"scope-a-token","scopes":["job:read","job:create"],"tenant_id":"tenant_a","project_id":"project_a","site_id":"site_a"},
		{"name":"global","token":"global-token","scopes":["job:read","job:create"]}
	]}`)
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()
	cancelJob := func(jobID string, token string, expectedStatus int) {
		t.Helper()
		req := httptest.NewRequest(http.MethodPost, "/api/v1/compute/jobs/"+jobID+"/cancel", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		rec := httptest.NewRecorder()
		server.ServeHTTP(rec, req)
		if rec.Code != expectedStatus {
			t.Fatalf("cancel %s with %s got %d want %d: %s", jobID, token, rec.Code, expectedStatus, rec.Body.String())
		}
	}

	cancelJob("job_cancel_scope_beta", "scope-a-token", http.StatusForbidden)
	beta, err := svc.GetJob(ctx, "job_cancel_scope_beta")
	if err != nil {
		t.Fatal(err)
	}
	if beta.Job.Status != StatusQueued || beta.Job.CancelRequested {
		t.Fatalf("cross-scope cancel must not mutate target job, got %#v", beta.Job)
	}
	betaEvents, err := svc.Events(ctx, "job_cancel_scope_beta")
	if err != nil {
		t.Fatal(err)
	}
	for _, event := range betaEvents {
		if event.EventType == "job.cancelled" {
			t.Fatalf("cross-scope cancel must not write job.cancelled event: %#v", betaEvents)
		}
	}

	cancelJob("job_cancel_scope_alpha", "scope-a-token", http.StatusOK)
	alpha, err := svc.GetJob(ctx, "job_cancel_scope_alpha")
	if err != nil {
		t.Fatal(err)
	}
	if alpha.Job.Status != StatusCancelled || !alpha.Job.CancelRequested {
		t.Fatalf("same-scope cancel should mutate target job, got %#v", alpha.Job)
	}
	alphaEvents, err := svc.Events(ctx, "job_cancel_scope_alpha")
	if err != nil {
		t.Fatal(err)
	}
	var alphaCancelEvent *EventRecord
	for _, event := range alphaEvents {
		if event.EventType == "job.cancelled" {
			copy := event
			alphaCancelEvent = &copy
			break
		}
	}
	if alphaCancelEvent == nil {
		t.Fatalf("same-scope cancel should write job.cancelled event: %#v", alphaEvents)
	}
	audit := eventAuditMap(t, *alphaCancelEvent)
	if audit["who"] != "scope-a" ||
		audit["where"] != "POST /api/v1/compute/jobs/job_cancel_scope_alpha/cancel" ||
		audit["target_id"] != "job_cancel_scope_alpha" ||
		audit["action"] != "job.cancel" {
		t.Fatalf("unexpected scoped cancel audit envelope: %#v", audit)
	}

	cancelJob("job_cancel_scope_beta", "global-token", http.StatusOK)
	beta, err = svc.GetJob(ctx, "job_cancel_scope_beta")
	if err != nil {
		t.Fatal(err)
	}
	if beta.Job.Status != StatusCancelled || !beta.Job.CancelRequested {
		t.Fatalf("global cancel should mutate target job, got %#v", beta.Job)
	}
}

func TestHTTPJobReadTenantProjectSiteScope(t *testing.T) {
	svc := testService(t)
	ctx := context.Background()
	if _, _, err := svc.CreateJob(ctx, scopedFixtureJobBytes(t, "job_scope_alpha", "tenant_a", "project_a", "site_a"), ""); err != nil {
		t.Fatal(err)
	}
	if _, _, err := svc.CreateJob(ctx, scopedFixtureJobBytes(t, "job_scope_beta", "tenant_b", "project_b", "site_b"), ""); err != nil {
		t.Fatal(err)
	}
	if _, _, err := svc.CreateJob(ctx, scopedFixtureJobBytes(t, "job_scope_gamma", "tenant_a", "project_a", "site_b"), ""); err != nil {
		t.Fatal(err)
	}
	auth, err := NewAuthenticator(`{"tokens":[
		{"name":"tenant-a-reader","token":"tenant-a-token","scopes":["job:read"],"tenant_id":"tenant_a","project_id":"project_a","site_id":"site_a"},
		{"name":"global-reader","token":"global-token","scopes":["job:read"]}
	]}`)
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()

	req := httptest.NewRequest(http.MethodGet, "/api/v1/compute/jobs", nil)
	req.Header.Set("Authorization", "Bearer tenant-a-token")
	rec := httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("tenant scoped list failed: %d %s", rec.Code, rec.Body.String())
	}
	var list ListJobsResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &list); err != nil {
		t.Fatal(err)
	}
	if list.TotalEstimate != 1 || len(list.Items) != 1 || list.Items[0].Job.JobID != "job_scope_alpha" {
		t.Fatalf("tenant/project/site scoped list should include only matching job, got %#v", list)
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/compute/jobs/job_scope_alpha", nil)
	req.Header.Set("Authorization", "Bearer tenant-a-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("tenant scoped job get should pass: %d %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/compute/jobs/job_scope_beta", nil)
	req.Header.Set("Authorization", "Bearer tenant-a-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("cross-tenant job get should be denied, got %d %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/compute/jobs/job_scope_gamma", nil)
	req.Header.Set("Authorization", "Bearer tenant-a-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("cross-site job get should be denied, got %d %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/compute/jobs", nil)
	req.Header.Set("Authorization", "Bearer global-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("global list failed: %d %s", rec.Code, rec.Body.String())
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &list); err != nil {
		t.Fatal(err)
	}
	if list.TotalEstimate != 3 {
		t.Fatalf("global token should see all jobs, got %#v", list)
	}
}

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
