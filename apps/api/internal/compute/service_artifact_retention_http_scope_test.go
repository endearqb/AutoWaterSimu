package compute

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestHTTPArtifactRetentionSweepTenantProjectSiteScope(t *testing.T) {
	svc := testService(t)
	ctx := context.Background()
	createScopedArtifact := func(jobID, workerID, artifactID, tenantID, projectID, siteID string) ArtifactRecord {
		t.Helper()
		if _, _, err := svc.CreateJob(ctx, scopedFixtureJobBytes(t, jobID, tenantID, projectID, siteID), ""); err != nil {
			t.Fatal(err)
		}
		if _, err := svc.RegisterWorker(ctx, compatibleWorkerRegistration(workerID)); err != nil {
			t.Fatal(err)
		}
		if _, err := svc.Claim(ctx, workerID); err != nil {
			t.Fatal(err)
		}
		return uploadTestArtifact(
			t,
			svc,
			ctx,
			workerID,
			jobID,
			artifactID,
			[]byte(`{"artifact_id":"`+artifactID+`"}`),
			"2020-01-01T00:00:00Z",
		)
	}
	alpha := createScopedArtifact("job_retention_scope_alpha", "worker_retention_scope_alpha", "artifact_retention_scope_alpha", "tenant_a", "project_a", "site_a")
	beta := createScopedArtifact("job_retention_scope_beta", "worker_retention_scope_beta", "artifact_retention_scope_beta", "tenant_b", "project_b", "site_b")

	auth, err := NewAuthenticator(`{"tokens":[
		{"name":"scope-a-admin","token":"scope-a-admin-token","scopes":["artifact:admin"],"tenant_id":"tenant_a","project_id":"project_a","site_id":"site_a"},
		{"name":"global-admin","token":"global-admin-token","scopes":["artifact:admin"]}
	]}`)
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()

	req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/artifacts/retention-sweep", strings.NewReader(`{"dry_run":false,"limit":10}`))
	req.Header.Set("Authorization", "Bearer scope-a-admin-token")
	rec := httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("scope-matching retention sweep should pass: %d %s", rec.Code, rec.Body.String())
	}
	var report ArtifactRetentionSweepReport
	if err := json.NewDecoder(rec.Body).Decode(&report); err != nil {
		t.Fatal(err)
	}
	if report.Checked != 1 || report.Deleted != 1 || len(report.Items) != 1 ||
		report.Items[0].ArtifactID != alpha.ArtifactID || report.Items[0].Action != "deleted" {
		t.Fatalf("scoped sweep should only delete matching artifact without leaking cross-scope candidates, got %#v", report)
	}
	if _, _, err := svc.DownloadArtifact(ctx, alpha.ArtifactID); err == nil || ToAppError(err).Status != http.StatusNotFound {
		t.Fatalf("matching scoped artifact should be deleted, got %#v", err)
	}
	if _, _, err := svc.DownloadArtifact(ctx, beta.ArtifactID); err != nil {
		t.Fatalf("cross-scope artifact must remain downloadable after scoped sweep: %v", err)
	}
	events, err := svc.Events(ctx, "job_retention_scope_beta")
	if err != nil {
		t.Fatal(err)
	}
	for _, event := range events {
		if event.EventType == "artifact.retention_deleted" {
			t.Fatalf("cross-scope artifact must not receive retention deletion audit event: %#v", event)
		}
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/admin/artifacts/retention-sweep", strings.NewReader(`{"dry_run":true,"limit":10}`))
	req.Header.Set("Authorization", "Bearer global-admin-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("global retention sweep should still see remaining candidates: %d %s", rec.Code, rec.Body.String())
	}
	report = ArtifactRetentionSweepReport{}
	if err := json.NewDecoder(rec.Body).Decode(&report); err != nil {
		t.Fatal(err)
	}
	if !report.DryRun || report.Checked != 1 || len(report.Items) != 1 || report.Items[0].ArtifactID != beta.ArtifactID {
		t.Fatalf("global dry-run should see the remaining cross-scope candidate, got %#v", report)
	}
}

func TestHTTPArtifactRetentionSweepArchiveTenantProjectSiteScope(t *testing.T) {
	svc := testServiceWithArchive(t)
	ctx := context.Background()
	createScopedArchiveArtifact := func(jobID, workerID, artifactID, tenantID, projectID, siteID string) ArtifactRecord {
		t.Helper()
		if _, _, err := svc.CreateJob(ctx, scopedFixtureJobBytes(t, jobID, tenantID, projectID, siteID), ""); err != nil {
			t.Fatal(err)
		}
		worker, err := svc.RegisterWorker(ctx, compatibleWorkerRegistration(workerID))
		if err != nil {
			t.Fatal(err)
		}
		if _, err := svc.Claim(ctx, worker.WorkerID); err != nil {
			t.Fatal(err)
		}
		artifact := uploadTestArtifactWithRetention(
			t,
			svc,
			ctx,
			worker.WorkerID,
			jobID,
			artifactID,
			[]byte(`{"artifact_id":"`+artifactID+`"}`),
			"archive_candidate",
			"2026-06-01T00:00:00Z",
		)
		result := map[string]any{
			"schema_version": "compute_result.v1",
			"job_id":         jobID,
			"job_type":       "simulation.material_balance.v1",
			"status":         StatusSucceeded,
			"summary":        map[string]any{"converged": true},
			"data":           map[string]any{},
			"quality":        map[string]any{"data_quality": "ok", "warnings": []any{}},
			"artifacts":      []any{artifact},
			"runtime_audit":  map[string]any{"model_runs": []any{}, "timings_ms": map[string]any{}, "fallback_used": false},
		}
		if _, err := svc.Complete(ctx, worker.WorkerID, jobID, 1, result); err != nil {
			t.Fatal(err)
		}
		return artifact
	}
	alpha := createScopedArchiveArtifact("job_archive_scope_alpha", "worker_archive_scope_alpha", "artifact_archive_scope_alpha", "tenant_a", "project_a", "site_a")
	beta := createScopedArchiveArtifact("job_archive_scope_beta", "worker_archive_scope_beta", "artifact_archive_scope_beta", "tenant_b", "project_b", "site_b")

	auth, err := NewAuthenticator(`{"tokens":[
		{"name":"scope-a-admin","token":"scope-a-admin-token","scopes":["artifact:admin"],"tenant_id":"tenant_a","project_id":"project_a","site_id":"site_a"}
	]}`)
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()

	req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/artifacts/retention-sweep", strings.NewReader(`{"dry_run":false,"limit":10}`))
	req.Header.Set("Authorization", "Bearer scope-a-admin-token")
	rec := httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("scope-matching archive sweep should pass: %d %s", rec.Code, rec.Body.String())
	}
	var report ArtifactRetentionSweepReport
	if err := json.NewDecoder(rec.Body).Decode(&report); err != nil {
		t.Fatal(err)
	}
	if report.Checked != 1 || report.Archived != 1 || len(report.Items) != 1 ||
		report.Items[0].ArtifactID != alpha.ArtifactID || report.Items[0].Action != "archived" {
		t.Fatalf("scoped archive sweep should only archive matching artifact, got %#v", report)
	}
	if _, err := svc.artifacts.Read(ctx, alpha.ObjectKey); err == nil || ToAppError(err).Status != http.StatusNotFound {
		t.Fatalf("matching scoped archive candidate should be removed from hot storage, got %#v", err)
	}
	if _, _, err := svc.DownloadArtifact(ctx, alpha.ArtifactID); err != nil {
		t.Fatalf("matching scoped archive candidate should remain downloadable from archive: %v", err)
	}
	if _, err := svc.artifacts.Read(ctx, beta.ObjectKey); err != nil {
		t.Fatalf("cross-scope archive candidate must remain hot-downloadable after scoped sweep: %v", err)
	}
	if _, err := svc.store.FindArtifactArchive(ctx, beta.ArtifactID); err == nil {
		t.Fatalf("cross-scope archive candidate must not receive archive metadata")
	}
	events, err := svc.Events(ctx, "job_archive_scope_beta")
	if err != nil {
		t.Fatal(err)
	}
	for _, event := range events {
		if event.EventType == "artifact.archived" {
			t.Fatalf("cross-scope artifact must not receive archive audit event: %#v", event)
		}
	}
}
