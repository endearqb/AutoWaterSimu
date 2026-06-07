package compute

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestHTTPAuthScopeAndMetrics(t *testing.T) {
	svc := testService(t)
	ctx := context.Background()
	if _, _, err := svc.CreateJob(ctx, fixtureJobBytes(t), ""); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.RegisterWorker(ctx, compatibleWorkerRegistration("worker_metrics")); err != nil {
		t.Fatal(err)
	}
	auth, err := NewAuthenticator("")
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/metrics", nil)
	server.ServeHTTP(rec, req)
	metrics := rec.Body.String()
	if rec.Code != http.StatusOK || !strings.Contains(metrics, "autowatersimu_compute_api_up") {
		t.Fatalf("metrics should be public, got %d %s", rec.Code, metrics)
	}
	if !strings.Contains(metrics, `autowatersimu_compute_jobs_total{status="queued"} 1`) {
		t.Fatalf("metrics should expose job status counts, got %s", metrics)
	}
	if !strings.Contains(metrics, "autowatersimu_compute_workers_registered_total 1") {
		t.Fatalf("metrics should expose registered worker count, got %s", metrics)
	}
	if !strings.Contains(metrics, "autowatersimu_compute_artifact_archives_total 0") {
		t.Fatalf("metrics should expose archived artifact count, got %s", metrics)
	}

	rec = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodPost, "/api/v1/workers/register", strings.NewReader(`{}`))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected scope denial, got %d %s", rec.Code, rec.Body.String())
	}
}

func TestStaticTokenRevocation(t *testing.T) {
	auth, err := NewAuthenticator(`{"tokens":[
		{"name":"active","token":"active-token","scopes":["job:create"]},
		{"name":"old","token":"old-token","scopes":["job:create"],"revoked":true}
	]}`)
	if err != nil {
		t.Fatal(err)
	}
	req := httptest.NewRequest(http.MethodPost, "/api/v1/compute/jobs", nil)
	req.Header.Set("Authorization", "Bearer active-token")
	if principal, err := auth.Principal(req, "job:create"); err != nil || principal.Name != "active" {
		t.Fatalf("active token should authenticate, principal=%#v err=%v", principal, err)
	}
	req.Header.Set("Authorization", "Bearer old-token")
	if _, err := auth.Principal(req, "job:create"); ToAppError(err).Status != http.StatusUnauthorized {
		t.Fatalf("revoked token should be rejected as unauthorized, got %#v", err)
	}
	if _, err := NewAuthenticator(`{"tokens":[
		{"name":"one","token":"same-token","scopes":["job:create"]},
		{"name":"two","token":"same-token","scopes":["job:read"]}
	]}`); err == nil {
		t.Fatalf("duplicate token values should be rejected")
	}
}

func TestHTTPLocalCORSPreflight(t *testing.T) {
	svc := testService(t)
	auth, err := NewAuthenticator("")
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()

	req := httptest.NewRequest(http.MethodOptions, "/api/v1/compute/jobs", nil)
	req.Header.Set("Origin", "http://127.0.0.1:5173")
	req.Header.Set("Access-Control-Request-Headers", "Authorization, Content-Type, Idempotency-Key")
	rec := httptest.NewRecorder()
	server.ServeHTTP(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Fatalf("expected local CORS preflight to pass, got %d %s", rec.Code, rec.Body.String())
	}
	if rec.Header().Get("Access-Control-Allow-Origin") != "http://127.0.0.1:5173" {
		t.Fatalf("unexpected allow origin: %q", rec.Header().Get("Access-Control-Allow-Origin"))
	}
	if !strings.Contains(rec.Header().Get("Access-Control-Allow-Methods"), http.MethodPost) {
		t.Fatalf("expected POST in allowed methods, got %q", rec.Header().Get("Access-Control-Allow-Methods"))
	}
	if !strings.Contains(rec.Header().Get("Access-Control-Allow-Headers"), "Idempotency-Key") {
		t.Fatalf("expected Idempotency-Key in allowed headers, got %q", rec.Header().Get("Access-Control-Allow-Headers"))
	}
	if !strings.Contains(rec.Header().Get("Access-Control-Expose-Headers"), "X-Evidence-Checksum") {
		t.Fatalf("expected evidence checksum to be exposed, got %q", rec.Header().Get("Access-Control-Expose-Headers"))
	}
}
