package compute

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestHTTPArtifactRetentionSweepRequiresAdminScope(t *testing.T) {
	svc := testService(t)
	ctx := context.Background()
	if _, _, err := svc.CreateJob(ctx, fixtureJobBytes(t), ""); err != nil {
		t.Fatal(err)
	}
	worker, err := svc.RegisterWorker(ctx, compatibleWorkerRegistration("worker_retention_http"))
	if err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Claim(ctx, worker.WorkerID); err != nil {
		t.Fatal(err)
	}
	expired := uploadTestArtifact(
		t,
		svc,
		ctx,
		worker.WorkerID,
		"job_material_balance_minimal",
		"artifact_http_retention_expired",
		[]byte(`{"expired":true}`),
		"2020-01-01T00:00:00Z",
	)
	auth, err := NewAuthenticator(`{"tokens":[
		{"name":"reader","token":"reader-token","scopes":["job:read","artifact:read"]},
		{"name":"admin","token":"admin-token","scopes":["artifact:admin"]}
	]}`)
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()

	req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/artifacts/retention-sweep", strings.NewReader(`{"dry_run":true}`))
	req.Header.Set("Authorization", "Bearer reader-token")
	rec := httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("reader token should not run retention sweep, got %d %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/admin/artifacts/retention-sweep", nil)
	req.Header.Set("Authorization", "Bearer admin-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("default dry-run sweep failed: %d %s", rec.Code, rec.Body.String())
	}
	var dryRun ArtifactRetentionSweepReport
	if err := json.NewDecoder(rec.Body).Decode(&dryRun); err != nil {
		t.Fatal(err)
	}
	if !dryRun.DryRun || dryRun.Deleted != 0 || len(dryRun.Items) != 1 || dryRun.Items[0].Action != "would_delete" {
		t.Fatalf("expected safe default dry-run report, got %#v", dryRun)
	}
	if _, _, err := svc.DownloadArtifact(ctx, expired.ArtifactID); err != nil {
		t.Fatalf("dry-run must not delete artifact: %v", err)
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/admin/artifacts/retention-sweep", strings.NewReader(`{"dry_run":false,"limit":5}`))
	req.Header.Set("Authorization", "Bearer admin-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("actual retention sweep failed: %d %s", rec.Code, rec.Body.String())
	}
	var report ArtifactRetentionSweepReport
	if err := json.NewDecoder(rec.Body).Decode(&report); err != nil {
		t.Fatal(err)
	}
	if report.DryRun || report.Deleted != 1 || report.Items[0].Action != "deleted" {
		t.Fatalf("expected deletion report, got %#v", report)
	}
	if _, _, err := svc.DownloadArtifact(ctx, expired.ArtifactID); ToAppError(err).Status != http.StatusNotFound {
		t.Fatalf("deleted artifact should no longer resolve, got %#v", err)
	}
	events, err := svc.Events(ctx, "job_material_balance_minimal")
	if err != nil {
		t.Fatal(err)
	}
	foundAudit := false
	for _, event := range events {
		if event.EventType != "artifact.retention_deleted" {
			continue
		}
		audit := eventAuditMap(t, event)
		if audit["who"] != "admin" ||
			audit["where"] != "POST /api/v1/admin/artifacts/retention-sweep" ||
			audit["target_object"] != "Artifact" ||
			audit["target_id"] != expired.ArtifactID ||
			audit["action"] != "artifact.retention_delete" ||
			audit["trace_id"] != "trace_material_balance_minimal" {
			t.Fatalf("unexpected retention audit envelope: %#v", audit)
		}
		before, ok := audit["before"].(map[string]any)
		if !ok || before["artifact_id"] != expired.ArtifactID || before["retention_policy"] != "ttl" {
			t.Fatalf("retention audit should include artifact before state, got %#v", audit["before"])
		}
		after, ok := audit["after"].(map[string]any)
		if !ok || after["deleted"] != true {
			t.Fatalf("retention audit should include delete after state, got %#v", audit["after"])
		}
		foundAudit = true
	}
	if !foundAudit {
		t.Fatalf("retention deletion should write an audit envelope")
	}
}

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
