package compute

import (
	"context"
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
