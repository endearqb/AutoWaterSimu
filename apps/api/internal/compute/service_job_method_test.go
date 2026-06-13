package compute

import (
	"bytes"
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHTTPJobCollectionRequiresDeclaredMethods(t *testing.T) {
	svc := testService(t)
	auth, err := NewAuthenticator("")
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()

	req := httptest.NewRequest(http.MethodPut, "/api/v1/compute/jobs", bytes.NewReader(fixtureJobBytes(t)))
	rec := httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusMethodNotAllowed {
		t.Fatalf("PUT /api/v1/compute/jobs got %d want %d: %s", rec.Code, http.StatusMethodNotAllowed, rec.Body.String())
	}

	jobs, err := svc.ListJobs(context.Background(), ListFilter{Limit: 10})
	if err != nil {
		t.Fatal(err)
	}
	if jobs.TotalEstimate != 0 || len(jobs.Items) != 0 {
		t.Fatalf("method-mismatched job collection route must not create jobs, got %#v", jobs)
	}
	events, _, total, err := svc.store.ListMutationAuditEvents(context.Background(), MutationAuditFilter{Limit: 10})
	if err != nil {
		t.Fatal(err)
	}
	if total != 0 || len(events) != 0 {
		t.Fatalf("method-mismatched job collection route must not write mutation audit events, total=%d events=%#v", total, events)
	}
}

func TestHTTPJobRoutesRequireDeclaredMethods(t *testing.T) {
	svc := testService(t)
	ctx := context.Background()
	if _, _, err := svc.CreateJob(ctx, fixtureJobBytes(t), ""); err != nil {
		t.Fatal(err)
	}
	auth, err := NewAuthenticator("")
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()
	jobPath := "/api/v1/compute/jobs/job_material_balance_minimal"

	eventsBefore, err := svc.Events(ctx, "job_material_balance_minimal")
	if err != nil {
		t.Fatal(err)
	}
	cases := []struct {
		method string
		path   string
	}{
		{method: http.MethodPost, path: jobPath},
		{method: http.MethodPost, path: jobPath + "/events"},
		{method: http.MethodPost, path: jobPath + "/result"},
		{method: http.MethodPost, path: jobPath + "/evidence"},
		{method: http.MethodPost, path: jobPath + "/production-readiness"},
		{method: http.MethodPost, path: jobPath + "/evidence-ref?ref=job:job_material_balance_minimal"},
		{method: http.MethodGet, path: jobPath + "/cancel"},
		{method: http.MethodGet, path: jobPath + "/result-explanations"},
		{method: http.MethodPost, path: jobPath + "/result-explanations/explanation_missing"},
		{method: http.MethodGet, path: jobPath + "/result-explanations/explanation_missing/review"},
		{method: http.MethodGet, path: jobPath + "/result-explanations/explanation_missing/publish"},
	}
	for _, tc := range cases {
		rec := serveWithToken(t, server, tc.method, tc.path, "dev-public-token", nil)
		if rec.Code != http.StatusMethodNotAllowed {
			t.Fatalf("%s %s got %d want %d: %s", tc.method, tc.path, rec.Code, http.StatusMethodNotAllowed, rec.Body.String())
		}
	}

	snapshot, err := svc.GetJob(ctx, "job_material_balance_minimal")
	if err != nil {
		t.Fatal(err)
	}
	if snapshot.Job.Status != StatusQueued || snapshot.Job.CancelRequested {
		t.Fatalf("method-mismatched job routes must not mutate job state, got %#v", snapshot.Job)
	}
	eventsAfter, err := svc.Events(ctx, "job_material_balance_minimal")
	if err != nil {
		t.Fatal(err)
	}
	if len(eventsAfter) != len(eventsBefore) {
		t.Fatalf("method-mismatched job routes must not append events, before=%#v after=%#v", eventsBefore, eventsAfter)
	}
}
