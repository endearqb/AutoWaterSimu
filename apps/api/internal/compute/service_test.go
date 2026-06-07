package compute

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func testService(t *testing.T) *Service {
	t.Helper()
	artifactStore, err := NewLocalArtifactStore(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	return NewService(NewMemoryStore(), artifactStore, nil)
}

func testServiceWithArchive(t *testing.T) *Service {
	t.Helper()
	artifactStore, err := NewLocalArtifactStore(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	archiveStore, err := NewLocalArtifactStore(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	return NewServiceWithArchive(NewMemoryStore(), artifactStore, archiveStore, nil)
}

func testValidatedService(t *testing.T) *Service {
	t.Helper()
	artifactStore, err := NewLocalArtifactStore(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	validator, err := NewContractValidator(repoRootForTest(t))
	if err != nil {
		t.Fatal(err)
	}
	return NewService(NewMemoryStore(), artifactStore, validator)
}

func compatibleWorkerRegistration(workerID string) map[string]any {
	return map[string]any{
		"worker_id":                   workerID,
		"capabilities":                []any{"material_balance", "ode"},
		"supported_contract_versions": []any{"compute_job.v1", "simulation_input.v1"},
	}
}

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

func scopedProcessGraphBytes(t *testing.T, processGraphID, tenantID, projectID, siteID string) []byte {
	t.Helper()
	processGraphBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance_3_node.process_graph.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	processGraph := decodeMap(t, processGraphBytes)
	processGraph["process_graph_id"] = processGraphID
	processGraph["source_canvas_graph_id"] = "graph_" + processGraphID
	processGraph["metadata"] = map[string]any{
		"source_system": "test",
		"requested_by":  "registry-test",
		"tenant_id":     tenantID,
		"project_id":    projectID,
		"site_id":       siteID,
	}
	return encodeMap(t, processGraph)
}

func scopedSimulationInputBytes(t *testing.T, simulationInputID, processGraphID, tenantID, projectID, siteID string) []byte {
	t.Helper()
	inputBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance_minimal.simulation_input.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	input := decodeMap(t, inputBytes)
	input["simulation_input_id"] = simulationInputID
	input["process_graph_id"] = processGraphID
	input["metadata"] = map[string]any{
		"source_system": "test",
		"requested_by":  "registry-test",
		"tenant_id":     tenantID,
		"project_id":    projectID,
		"site_id":       siteID,
	}
	return encodeMap(t, input)
}

func scopedSimulationCheckBytes(t *testing.T, requestID, simulationInputID, tenantID, projectID, siteID, inputTenantID, inputProjectID, inputSiteID string) []byte {
	t.Helper()
	requestBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "milp_material_balance.simulation_request.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	request := decodeMap(t, requestBytes)
	request["request_id"] = requestID
	metadata := mapValue(request, "metadata")
	if metadata == nil {
		metadata = map[string]any{}
		request["metadata"] = metadata
	}
	metadata["trace_id"] = "trace_" + requestID
	metadata["tenant_id"] = tenantID
	metadata["project_id"] = projectID
	externalRefs := mapValue(request, "external_refs")
	if externalRefs == nil {
		externalRefs = map[string]any{}
		request["external_refs"] = externalRefs
	}
	externalRefs["site_id"] = siteID
	inputRef := mapValue(request, "input_ref")
	inputRef["simulation_input_id"] = simulationInputID
	simulationInput := mapValue(inputRef, "simulation_input")
	simulationInput["simulation_input_id"] = simulationInputID
	simulationInput["process_graph_id"] = "pg_" + simulationInputID
	if inputTenantID != "" || inputProjectID != "" || inputSiteID != "" {
		simulationInput["metadata"] = map[string]any{
			"tenant_id":  inputTenantID,
			"project_id": inputProjectID,
			"site_id":    inputSiteID,
		}
	} else {
		delete(simulationInput, "metadata")
	}
	return encodeMap(t, request)
}

func scopedDraftConfirmationBytes(t *testing.T, fixtureName, confirmationID, tenantID, projectID, siteID string) []byte {
	t.Helper()
	confirmationBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", fixtureName))
	if err != nil {
		t.Fatal(err)
	}
	confirmation := decodeMap(t, confirmationBytes)
	confirmation["confirmation_id"] = confirmationID
	confirmation["decision_reason"] = "scope regression"
	confirmation["metadata"] = map[string]any{
		"source_system": "test",
		"requested_by":  "draft-test",
		"tenant_id":     tenantID,
		"project_id":    projectID,
		"site_id":       siteID,
		"trace_id":      "trace_" + confirmationID,
		"approval_ref":  "approval_" + confirmationID,
	}
	if draft := mapValue(confirmation, "draft"); draft != nil {
		if proposed := mapValue(draft, "proposed_request"); proposed != nil {
			proposed["request_id"] = "sim_req_" + confirmationID
			metadata := mapValue(proposed, "metadata")
			if metadata == nil {
				metadata = map[string]any{}
				proposed["metadata"] = metadata
			}
			metadata["trace_id"] = "trace_" + confirmationID
			metadata["tenant_id"] = tenantID
			metadata["project_id"] = projectID
			metadata["site_id"] = siteID
			externalRefs := mapValue(proposed, "external_refs")
			if externalRefs == nil {
				externalRefs = map[string]any{}
				proposed["external_refs"] = externalRefs
			}
			externalRefs["site_id"] = siteID
		}
	}
	return encodeMap(t, confirmation)
}

func scopedDraftConfirmationBytesWithProposedScope(t *testing.T, fixtureName, confirmationID, tenantID, projectID, siteID, proposedTenantID, proposedProjectID, proposedSiteID string) []byte {
	t.Helper()
	confirmation := decodeMap(t, scopedDraftConfirmationBytes(t, fixtureName, confirmationID, tenantID, projectID, siteID))
	draft := mapValue(confirmation, "draft")
	proposed := mapValue(draft, "proposed_request")
	metadata := mapValue(proposed, "metadata")
	if metadata == nil {
		metadata = map[string]any{}
		proposed["metadata"] = metadata
	}
	metadata["tenant_id"] = proposedTenantID
	metadata["project_id"] = proposedProjectID
	metadata["site_id"] = proposedSiteID
	externalRefs := mapValue(proposed, "external_refs")
	if externalRefs == nil {
		externalRefs = map[string]any{}
		proposed["external_refs"] = externalRefs
	}
	externalRefs["site_id"] = proposedSiteID
	return encodeMap(t, confirmation)
}

func scopedModelCatalogBytes(t *testing.T, generatedAt, tenantID, projectID, siteID string) []byte {
	t.Helper()
	catalogBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance.model_catalog.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	catalog := decodeMap(t, catalogBytes)
	catalog["generated_at"] = generatedAt
	catalog["metadata"] = map[string]any{
		"catalog_id":    "default",
		"source_system": "test",
		"requested_by":  "catalog-test",
		"tenant_id":     tenantID,
		"project_id":    projectID,
		"site_id":       siteID,
	}
	return encodeMap(t, catalog)
}

func scopedModelCatalogBytesWithDefaultParameterSetStatus(t *testing.T, generatedAt, tenantID, projectID, siteID, status string) []byte {
	t.Helper()
	catalog := decodeMap(t, scopedModelCatalogBytes(t, generatedAt, tenantID, projectID, siteID))
	models := catalog["models"].([]any)
	version := models[0].(map[string]any)["versions"].([]any)[0].(map[string]any)
	parameterSet := version["default_parameter_set"].(map[string]any)
	parameterSet["status"] = status
	return encodeMap(t, catalog)
}

func decodeMap(t *testing.T, bytes []byte) map[string]any {
	t.Helper()
	var value map[string]any
	if err := json.Unmarshal(bytes, &value); err != nil {
		t.Fatal(err)
	}
	return value
}

func assertRequiredCapabilities(t *testing.T, jobPayload map[string]any, expected []string) {
	t.Helper()
	execution := mapValue(jobPayload, "execution")
	if execution == nil {
		t.Fatalf("expected job execution payload, got %#v", jobPayload)
	}
	capabilities, ok := execution["required_capabilities"].([]any)
	if !ok {
		t.Fatalf("expected required_capabilities array, got %#v", execution["required_capabilities"])
	}
	if len(capabilities) != len(expected) {
		t.Fatalf("unexpected required_capabilities length: got %#v want %#v", capabilities, expected)
	}
	for index, capability := range expected {
		if capabilities[index] != capability {
			t.Fatalf("unexpected required_capabilities: got %#v want %#v", capabilities, expected)
		}
	}
}

func encodeMap(t *testing.T, value map[string]any) []byte {
	t.Helper()
	bytes, err := json.Marshal(value)
	if err != nil {
		t.Fatal(err)
	}
	return bytes
}

func containsString(values []string, expected string) bool {
	for _, value := range values {
		if value == expected {
			return true
		}
	}
	return false
}

func eventPayloadMap(t *testing.T, event EventRecord) map[string]any {
	t.Helper()
	var payload map[string]any
	if err := json.Unmarshal(event.EventJSON, &payload); err != nil {
		t.Fatal(err)
	}
	return payload
}

func eventAuditMap(t *testing.T, event EventRecord) map[string]any {
	t.Helper()
	payload := eventPayloadMap(t, event)
	audit, ok := payload["audit"].(map[string]any)
	if !ok {
		t.Fatalf("event %s should include audit envelope, got %#v", event.EventType, payload)
	}
	return audit
}

func mutationAuditPayloadMap(t *testing.T, event MutationAuditRecord) map[string]any {
	t.Helper()
	var payload map[string]any
	if err := json.Unmarshal(event.EventJSON, &payload); err != nil {
		t.Fatal(err)
	}
	return payload
}

func mutationAuditMap(t *testing.T, event MutationAuditRecord) map[string]any {
	t.Helper()
	payload := mutationAuditPayloadMap(t, event)
	audit, ok := payload["audit"].(map[string]any)
	if !ok {
		t.Fatalf("mutation audit %s should include audit envelope, got %#v", event.EventType, payload)
	}
	return audit
}

func uploadTestArtifact(t *testing.T, svc *Service, ctx context.Context, workerID, jobID, artifactID string, artifactBytes []byte, retainUntil string) ArtifactRecord {
	t.Helper()
	return uploadTestArtifactWithRetention(t, svc, ctx, workerID, jobID, artifactID, artifactBytes, "ttl", retainUntil)
}

func uploadTestArtifactWithRetention(t *testing.T, svc *Service, ctx context.Context, workerID, jobID, artifactID string, artifactBytes []byte, retentionPolicy, retainUntil string) ArtifactRecord {
	t.Helper()
	artifact := map[string]any{
		"schema_version":   "artifact.v1",
		"artifact_id":      artifactID,
		"job_id":           jobID,
		"artifact_type":    "time_series_json",
		"storage_provider": "local_fs",
		"object_key":       "worker/supplied/path.json",
		"content_type":     "application/json",
		"size_bytes":       len(artifactBytes),
		"checksum":         "sha256:" + SHA256Hex(artifactBytes),
		"created_at":       time.Now().UTC().Format(time.RFC3339),
		"retention_policy": retentionPolicy,
		"retain_until":     retainUntil,
	}
	tempFile, err := os.CreateTemp(t.TempDir(), "artifact-*.json")
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = tempFile.Close() }()
	if _, err := tempFile.Write(artifactBytes); err != nil {
		t.Fatal(err)
	}
	if _, err := tempFile.Seek(0, io.SeekStart); err != nil {
		t.Fatal(err)
	}
	record, err := svc.UploadArtifact(ctx, workerID, jobID, string(encodeMap(t, artifact)), tempFile)
	if err != nil {
		t.Fatal(err)
	}
	return record
}

func TestPayloadHashIgnoresRequestSpecificFields(t *testing.T) {
	baseJob, err := DecodeComputeJob(fixtureJobBytes(t), nil)
	if err != nil {
		t.Fatal(err)
	}
	baseHash, err := PayloadHash(baseJob)
	if err != nil {
		t.Fatal(err)
	}
	modified := baseJob
	modified.JobID = "job_other"
	modified.RequestID = "req_other"
	modified.Context.TraceID = "trace_other"
	modified.CreatedAt = time.Now().UTC().Format(time.RFC3339)
	sameHash, err := PayloadHash(modified)
	if err != nil {
		t.Fatal(err)
	}
	if sameHash != baseHash {
		t.Fatalf("payload hash should ignore request-specific fields")
	}
	modified.Execution = map[string]any{"time_limit_sec": float64(1), "priority": "normal", "required_capabilities": []any{"material_balance"}}
	differentHash, err := PayloadHash(modified)
	if err != nil {
		t.Fatal(err)
	}
	if differentHash == baseHash {
		t.Fatalf("payload hash should include execution")
	}
}

func TestCreateJobIdempotencyDuplicateAndConflict(t *testing.T) {
	svc := testService(t)
	ctx := context.Background()
	created, status, err := svc.CreateJob(ctx, fixtureJobBytes(t), "")
	if err != nil {
		t.Fatal(err)
	}
	if status != http.StatusAccepted || created.Job.Status != StatusQueued {
		t.Fatalf("unexpected create result: %d %#v", status, created.Job)
	}
	if created.Artifacts == nil {
		t.Fatalf("empty artifact list must be encoded as an array, not null")
	}

	duplicate := decodeMap(t, fixtureJobBytes(t))
	duplicate["job_id"] = "job_duplicate_request"
	duplicate["request_id"] = "req_duplicate"
	reused, status, err := svc.CreateJob(ctx, encodeMap(t, duplicate), "")
	if err != nil {
		t.Fatal(err)
	}
	if status != http.StatusOK || reused.Job.JobID != created.Job.JobID {
		t.Fatalf("duplicate idempotency should return existing job")
	}

	conflict := decodeMap(t, fixtureJobBytes(t))
	conflict["execution"].(map[string]any)["time_limit_sec"] = float64(60)
	_, _, err = svc.CreateJob(ctx, encodeMap(t, conflict), "")
	if appErr := ToAppError(err); appErr.ErrorCode != CodeIdempotencyConflict || appErr.Status != http.StatusConflict {
		t.Fatalf("expected idempotency conflict, got %#v", err)
	}
}

func TestWorkerLifecycleArtifactSucceedAndDownload(t *testing.T) {
	svc := testService(t)
	ctx := context.Background()
	if _, _, err := svc.CreateJob(ctx, fixtureJobBytes(t), ""); err != nil {
		t.Fatal(err)
	}
	worker, err := svc.RegisterWorker(ctx, compatibleWorkerRegistration("worker_1"))
	if err != nil {
		t.Fatal(err)
	}
	claim, err := svc.Claim(ctx, worker.WorkerID)
	if err != nil {
		t.Fatal(err)
	}
	if claim["job"] == nil || int(claim["attempt"].(int)) != 1 {
		t.Fatalf("expected claimed job, got %#v", claim)
	}
	heartbeat, err := svc.Heartbeat(ctx, worker.WorkerID, "job_material_balance_minimal")
	if err != nil {
		t.Fatal(err)
	}
	if heartbeat["job_terminal"].(bool) {
		t.Fatalf("running job should not be terminal")
	}

	artifactBytes := []byte(`{"timestamps":[0,1],"values":[1,2]}`)
	artifact := map[string]any{
		"schema_version":   "artifact.v1",
		"artifact_id":      "art_time_series",
		"job_id":           "job_material_balance_minimal",
		"artifact_type":    "time_series_json",
		"storage_provider": "local_fs",
		"object_key":       "worker/supplied/path.json",
		"content_type":     "application/json",
		"size_bytes":       len(artifactBytes),
		"checksum":         "sha256:" + SHA256Hex(artifactBytes),
		"created_at":       time.Now().UTC().Format(time.RFC3339),
		"retention_policy": "ttl",
		"retain_until":     "2026-06-01T00:00:00Z",
	}
	tempFile, err := os.CreateTemp(t.TempDir(), "artifact-*.json")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := tempFile.Write(artifactBytes); err != nil {
		t.Fatal(err)
	}
	if _, err := tempFile.Seek(0, io.SeekStart); err != nil {
		t.Fatal(err)
	}
	record, err := svc.UploadArtifact(ctx, worker.WorkerID, "job_material_balance_minimal", string(encodeMap(t, artifact)), tempFile)
	if err != nil {
		t.Fatal(err)
	}
	_ = tempFile.Close()
	if record.ObjectKey != "jobs/job_material_balance_minimal/art_time_series.json" {
		t.Fatalf("server must generate object_key, got %s", record.ObjectKey)
	}
	if record.RetentionPolicy != "ttl" || record.RetainUntil == nil {
		t.Fatalf("expected artifact retention metadata, got %#v", record)
	}
	result := map[string]any{
		"schema_version": "compute_result.v1",
		"job_id":         "job_material_balance_minimal",
		"job_type":       "simulation.material_balance.v1",
		"status":         StatusSucceeded,
		"summary":        map[string]any{"converged": true},
		"data":           map[string]any{},
		"quality":        map[string]any{"data_quality": "ok", "warnings": []any{}},
		"artifacts":      []any{record},
		"runtime_audit":  map[string]any{"model_runs": []any{}, "timings_ms": map[string]any{}, "fallback_used": false},
	}
	completed, err := svc.Complete(ctx, worker.WorkerID, "job_material_balance_minimal", 1, result)
	if err != nil {
		t.Fatal(err)
	}
	if completed.Job.Status != StatusSucceeded || len(completed.Artifacts) != 1 {
		t.Fatalf("expected succeeded job with artifact, got %#v", completed)
	}
	_, downloaded, err := svc.DownloadArtifact(ctx, "art_time_series")
	if err != nil {
		t.Fatal(err)
	}
	if string(downloaded) != string(artifactBytes) {
		t.Fatalf("downloaded artifact mismatch")
	}
}

func TestArtifactRetentionSweepDeletesOnlyUnreferencedExpiredTTL(t *testing.T) {
	svc := testService(t)
	ctx := context.Background()
	if _, _, err := svc.CreateJob(ctx, fixtureJobBytes(t), ""); err != nil {
		t.Fatal(err)
	}
	worker, err := svc.RegisterWorker(ctx, compatibleWorkerRegistration("worker_retention"))
	if err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Claim(ctx, worker.WorkerID); err != nil {
		t.Fatal(err)
	}
	retainUntil := "2026-06-01T00:00:00Z"
	referenced := uploadTestArtifact(t, svc, ctx, worker.WorkerID, "job_material_balance_minimal", "art_referenced", []byte(`{"referenced":true}`), retainUntil)
	unreferenced := uploadTestArtifact(t, svc, ctx, worker.WorkerID, "job_material_balance_minimal", "art_unreferenced", []byte(`{"referenced":false}`), retainUntil)

	modelRun := map[string]any{
		"schema_version":  "model_run.v1",
		"model_run_id":    "mr_retention_guard",
		"job_id":          "job_material_balance_minimal",
		"model_key":       "material_balance",
		"model_version":   "material_balance.v1",
		"parameter_hash":  "sha256:" + strings.Repeat("a", 64),
		"input_hash":      "sha256:" + strings.Repeat("b", 64),
		"quality_metrics": map[string]any{},
		"warnings":        []any{},
		"evidence_refs":   []any{referenced.ArtifactID},
		"metadata":        map[string]any{},
	}
	result := map[string]any{
		"schema_version": "compute_result.v1",
		"job_id":         "job_material_balance_minimal",
		"job_type":       "simulation.material_balance.v1",
		"status":         StatusSucceeded,
		"summary":        map[string]any{"converged": true},
		"data":           map[string]any{},
		"quality":        map[string]any{"data_quality": "ok", "warnings": []any{}},
		"artifacts":      []any{referenced, unreferenced},
		"runtime_audit":  map[string]any{"model_runs": []any{modelRun}, "timings_ms": map[string]any{}, "fallback_used": false},
	}
	if _, err := svc.Complete(ctx, worker.WorkerID, "job_material_balance_minimal", 1, result); err != nil {
		t.Fatal(err)
	}

	now := time.Date(2026, 6, 2, 0, 0, 0, 0, time.UTC)
	dryRun, err := svc.SweepArtifactRetention(ctx, ArtifactRetentionSweepOptions{DryRun: true, Now: now})
	if err != nil {
		t.Fatal(err)
	}
	if dryRun.Checked != 2 || dryRun.Deleted != 0 || dryRun.Skipped != 1 {
		t.Fatalf("unexpected dry-run retention report: %#v", dryRun)
	}
	if _, _, err := svc.DownloadArtifact(ctx, unreferenced.ArtifactID); err != nil {
		t.Fatalf("dry-run must not delete artifact: %v", err)
	}

	report, err := svc.SweepArtifactRetention(ctx, ArtifactRetentionSweepOptions{Now: now})
	if err != nil {
		t.Fatal(err)
	}
	if report.Checked != 2 || report.Deleted != 1 || report.Skipped != 1 {
		t.Fatalf("unexpected retention report: %#v", report)
	}
	actions := map[string]ArtifactRetentionAction{}
	for _, item := range report.Items {
		actions[item.ArtifactID] = item
	}
	if actions[referenced.ArtifactID].Action != "skipped" || actions[referenced.ArtifactID].Reason != "referenced_by_model_run" {
		t.Fatalf("referenced artifact should be protected, got %#v", actions[referenced.ArtifactID])
	}
	if actions[unreferenced.ArtifactID].Action != "deleted" {
		t.Fatalf("unreferenced expired TTL artifact should be deleted, got %#v", actions[unreferenced.ArtifactID])
	}
	if _, _, err := svc.DownloadArtifact(ctx, referenced.ArtifactID); err != nil {
		t.Fatalf("referenced artifact should remain downloadable: %v", err)
	}
	if _, _, err := svc.DownloadArtifact(ctx, unreferenced.ArtifactID); err == nil || ToAppError(err).ErrorCode != CodeArtifactNotFound {
		t.Fatalf("deleted artifact should no longer resolve, got %#v", err)
	}
	events, err := svc.store.Events(ctx, "job_material_balance_minimal")
	if err != nil {
		t.Fatal(err)
	}
	foundRetentionEvent := false
	for _, event := range events {
		if event.EventType == "artifact.retention_deleted" {
			foundRetentionEvent = true
			break
		}
	}
	if !foundRetentionEvent {
		t.Fatalf("retention deletion should write an audit event")
	}
}

func TestArtifactRetentionSweepSkipsArchiveCandidateWithoutBackend(t *testing.T) {
	svc := testService(t)
	ctx := context.Background()
	if _, _, err := svc.CreateJob(ctx, fixtureJobBytes(t), ""); err != nil {
		t.Fatal(err)
	}
	worker, err := svc.RegisterWorker(ctx, compatibleWorkerRegistration("worker_archive_skip"))
	if err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Claim(ctx, worker.WorkerID); err != nil {
		t.Fatal(err)
	}
	candidate := uploadTestArtifactWithRetention(
		t,
		svc,
		ctx,
		worker.WorkerID,
		"job_material_balance_minimal",
		"art_archive_skip",
		[]byte(`{"archive":false}`),
		"archive_candidate",
		"2026-06-01T00:00:00Z",
	)

	report, err := svc.SweepArtifactRetention(ctx, ArtifactRetentionSweepOptions{
		DryRun: true,
		Now:    time.Date(2026, 6, 2, 0, 0, 0, 0, time.UTC),
	})
	if err != nil {
		t.Fatal(err)
	}
	if report.Checked != 1 || report.Skipped != 1 || report.Items[0].Action != "skipped" || report.Items[0].Reason != "archive_executor_not_configured" {
		t.Fatalf("archive candidate should be blocked when archive backend is not configured: %#v", report)
	}
	if _, _, err := svc.DownloadArtifact(ctx, candidate.ArtifactID); err != nil {
		t.Fatalf("skipped archive candidate should remain hot-downloadable: %v", err)
	}
}

func TestArtifactRetentionSweepArchivesCandidateWithConfiguredBackend(t *testing.T) {
	svc := testServiceWithArchive(t)
	ctx := context.Background()
	if _, _, err := svc.CreateJob(ctx, fixtureJobBytes(t), ""); err != nil {
		t.Fatal(err)
	}
	worker, err := svc.RegisterWorker(ctx, compatibleWorkerRegistration("worker_archive"))
	if err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Claim(ctx, worker.WorkerID); err != nil {
		t.Fatal(err)
	}
	retainUntil := "2026-06-01T00:00:00Z"
	artifactBytes := []byte(`{"archive":true}`)
	candidate := uploadTestArtifactWithRetention(t, svc, ctx, worker.WorkerID, "job_material_balance_minimal", "art_archive_candidate", artifactBytes, "archive_candidate", retainUntil)
	result := map[string]any{
		"schema_version": "compute_result.v1",
		"job_id":         "job_material_balance_minimal",
		"job_type":       "simulation.material_balance.v1",
		"status":         StatusSucceeded,
		"summary":        map[string]any{"converged": true},
		"data":           map[string]any{},
		"quality":        map[string]any{"data_quality": "ok", "warnings": []any{}},
		"artifacts":      []any{candidate},
		"runtime_audit":  map[string]any{"model_runs": []any{}, "timings_ms": map[string]any{}, "fallback_used": false},
	}
	if _, err := svc.Complete(ctx, worker.WorkerID, "job_material_balance_minimal", 1, result); err != nil {
		t.Fatal(err)
	}

	now := time.Date(2026, 6, 2, 0, 0, 0, 0, time.UTC)
	dryRun, err := svc.SweepArtifactRetention(ctx, ArtifactRetentionSweepOptions{DryRun: true, Now: now})
	if err != nil {
		t.Fatal(err)
	}
	if dryRun.Checked != 1 || dryRun.Archived != 0 || dryRun.Skipped != 0 || dryRun.Items[0].Action != "would_archive" {
		t.Fatalf("unexpected archive dry-run report: %#v", dryRun)
	}

	report, err := svc.SweepArtifactRetention(ctx, ArtifactRetentionSweepOptions{Now: now})
	if err != nil {
		t.Fatal(err)
	}
	if report.Checked != 1 || report.Archived != 1 || report.Deleted != 0 || report.Skipped != 0 {
		t.Fatalf("unexpected archive report: %#v", report)
	}
	action := report.Items[0]
	if action.Action != "archived" || action.ArchiveProvider != "local_fs_archive" || action.ArchiveObjectKey == "" {
		t.Fatalf("archive action should include archive metadata, got %#v", action)
	}
	if _, err := svc.artifacts.Read(ctx, candidate.ObjectKey); err == nil || ToAppError(err).ErrorCode != CodeArtifactNotFound {
		t.Fatalf("hot artifact should be removed after archive metadata is recorded, got %#v", err)
	}
	_, downloaded, err := svc.DownloadArtifact(ctx, candidate.ArtifactID)
	if err != nil {
		t.Fatal(err)
	}
	if string(downloaded) != string(artifactBytes) {
		t.Fatalf("downloaded archive artifact mismatch")
	}
	metrics, err := svc.Metrics(ctx)
	if err != nil {
		t.Fatalf("archive metrics failed: %v", err)
	}
	if metrics.ArtifactArchives != 1 || metrics.RetentionCandidates != 0 {
		t.Fatalf("archive metrics should count archived artifacts and clear candidates, got %#v", metrics)
	}
	second, err := svc.SweepArtifactRetention(ctx, ArtifactRetentionSweepOptions{Now: now})
	if err != nil {
		t.Fatal(err)
	}
	if second.Checked != 0 {
		t.Fatalf("archived artifact should no longer be a retention candidate: %#v", second)
	}
	events, err := svc.store.Events(ctx, "job_material_balance_minimal")
	if err != nil {
		t.Fatal(err)
	}
	foundArchiveEvent := false
	for _, event := range events {
		if event.EventType == "artifact.archived" {
			audit := eventAuditMap(t, event)
			if audit["who"] != "system" ||
				audit["where"] != "service:artifact_retention_sweep" ||
				audit["target_object"] != "Artifact" ||
				audit["target_id"] != candidate.ArtifactID ||
				audit["action"] != "artifact.archive" ||
				audit["trace_id"] != "trace_material_balance_minimal" {
				t.Fatalf("unexpected archive audit envelope: %#v", audit)
			}
			before, ok := audit["before"].(map[string]any)
			if !ok || before["artifact_id"] != candidate.ArtifactID || before["retention_policy"] != "archive_candidate" {
				t.Fatalf("archive audit should include artifact before state, got %#v", audit["before"])
			}
			after, ok := audit["after"].(map[string]any)
			if !ok || after["artifact_id"] != candidate.ArtifactID || after["status"] != "archived" {
				t.Fatalf("archive audit should include archive after state, got %#v", audit["after"])
			}
			foundArchiveEvent = true
			break
		}
	}
	if !foundArchiveEvent {
		t.Fatalf("archive should write an audit event")
	}
}

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

func TestArtifactRetentionSchedulerDeletesExpiredTTLWhenEnabled(t *testing.T) {
	svc := testService(t)
	ctx := context.Background()
	if _, _, err := svc.CreateJob(ctx, fixtureJobBytes(t), ""); err != nil {
		t.Fatal(err)
	}
	worker, err := svc.RegisterWorker(ctx, compatibleWorkerRegistration("worker_retention_scheduler"))
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
		"artifact_scheduler_retention_expired",
		[]byte(`{"expired":true}`),
		"2020-01-01T00:00:00Z",
	)
	schedulerCtx, cancel := context.WithCancel(ctx)
	defer cancel()
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	if err := StartArtifactRetentionScheduler(
		schedulerCtx,
		svc,
		ArtifactRetentionSchedulerOptions{Interval: time.Millisecond, DryRun: false, Limit: 10},
		logger,
	); err != nil {
		t.Fatal(err)
	}
	deadline := time.Now().Add(time.Second)
	for time.Now().Before(deadline) {
		_, _, err := svc.DownloadArtifact(ctx, expired.ArtifactID)
		if err != nil && ToAppError(err).Status == http.StatusNotFound {
			return
		}
		time.Sleep(10 * time.Millisecond)
	}
	t.Fatalf("scheduler did not delete expired TTL artifact")
}

func TestWorkerClaimSkipsCapabilityMismatch(t *testing.T) {
	svc := testService(t)
	ctx := context.Background()
	if _, _, err := svc.CreateJob(ctx, fixtureJobBytes(t), ""); err != nil {
		t.Fatal(err)
	}
	worker, err := svc.RegisterWorker(ctx, map[string]any{
		"worker_id":                   "worker_weak",
		"capabilities":                []any{"material_balance"},
		"supported_contract_versions": []any{"compute_job.v1", "simulation_input.v1"},
	})
	if err != nil {
		t.Fatal(err)
	}
	claim, err := svc.Claim(ctx, worker.WorkerID)
	if err != nil {
		t.Fatal(err)
	}
	if claim["job"] != nil {
		t.Fatalf("capability-mismatched worker should not claim job: %#v", claim)
	}
	job, err := svc.GetJob(ctx, "job_material_balance_minimal")
	if err != nil {
		t.Fatal(err)
	}
	if job.Job.Status != StatusQueued {
		t.Fatalf("incompatible claim should leave job queued, got %s", job.Job.Status)
	}
}

func TestWorkerClaimSkipsContractVersionMismatch(t *testing.T) {
	svc := testService(t)
	ctx := context.Background()
	if _, _, err := svc.CreateJob(ctx, fixtureJobBytes(t), ""); err != nil {
		t.Fatal(err)
	}
	worker, err := svc.RegisterWorker(ctx, map[string]any{
		"worker_id":                   "worker_old",
		"capabilities":                []any{"material_balance", "ode"},
		"supported_contract_versions": []any{"compute_job.v1"},
	})
	if err != nil {
		t.Fatal(err)
	}
	claim, err := svc.Claim(ctx, worker.WorkerID)
	if err != nil {
		t.Fatal(err)
	}
	if claim["job"] != nil {
		t.Fatalf("contract-version-mismatched worker should not claim job: %#v", claim)
	}
}

func TestCancelRejectsLateResult(t *testing.T) {
	svc := testService(t)
	ctx := context.Background()
	if _, _, err := svc.CreateJob(ctx, fixtureJobBytes(t), ""); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.RegisterWorker(ctx, compatibleWorkerRegistration("worker_1")); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Claim(ctx, "worker_1"); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.CancelJob(ctx, "job_material_balance_minimal"); err != nil {
		t.Fatal(err)
	}
	_, err := svc.Fail(ctx, "worker_1", "job_material_balance_minimal", 1, "WORKER_FAILED", "late")
	if appErr := ToAppError(err); appErr.ErrorCode != CodeWorkerStale {
		t.Fatalf("expected late worker result rejection, got %#v", err)
	}
	events, err := svc.Events(ctx, "job_material_balance_minimal")
	if err != nil {
		t.Fatal(err)
	}
	if events[len(events)-1].EventType != "late_result_rejected" {
		t.Fatalf("expected late_result_rejected event, got %s", events[len(events)-1].EventType)
	}
}

func TestValidatedWorkerFailPersistsTerminalResult(t *testing.T) {
	svc := testValidatedService(t)
	ctx := context.Background()
	if _, _, err := svc.CreateJob(ctx, fixtureJobBytes(t), ""); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.RegisterWorker(ctx, compatibleWorkerRegistration("worker_1")); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Claim(ctx, "worker_1"); err != nil {
		t.Fatal(err)
	}
	failed, err := svc.Fail(ctx, "worker_1", "job_material_balance_minimal", 1, "WORKER_FAILED", "solver failed")
	if err != nil {
		t.Fatal(err)
	}
	if failed.Job.Status != StatusFailed || failed.Job.ErrorCode != "WORKER_FAILED" || failed.Job.ErrorMessage != "solver failed" {
		t.Fatalf("expected persisted worker failure, got %#v", failed.Job)
	}
}

func TestValidatedCompletePersistsModelRun(t *testing.T) {
	svc := testValidatedService(t)
	ctx := context.Background()
	if _, _, err := svc.CreateJob(ctx, fixtureJobBytes(t), ""); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.RegisterWorker(ctx, compatibleWorkerRegistration("worker_1")); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Claim(ctx, "worker_1"); err != nil {
		t.Fatal(err)
	}
	defaultParameterHash := builtInModelCatalog("2026-05-30T00:00:00Z").Models[0].Versions[0].DefaultParameterSet.ParameterHash
	modelRun := map[string]any{
		"schema_version":  "model_run.v1",
		"model_run_id":    "mr_material_balance_test",
		"job_id":          "job_material_balance_minimal",
		"model_key":       "material_balance",
		"model_version":   "material_balance.v1",
		"parameter_hash":  defaultParameterHash,
		"input_hash":      "sha256:" + strings.Repeat("b", 64),
		"quality_metrics": map[string]any{"convergence_status": "converged"},
		"warnings":        []any{},
		"evidence_refs":   []any{},
	}
	result := map[string]any{
		"schema_version": "compute_result.v1",
		"job_id":         "job_material_balance_minimal",
		"job_type":       "simulation.material_balance.v1",
		"status":         StatusSucceeded,
		"summary":        map[string]any{"converged": true},
		"data":           map[string]any{},
		"quality":        map[string]any{"data_quality": "ok", "warnings": []any{}},
		"artifacts":      []any{},
		"risk_findings": []any{
			map[string]any{
				"risk_code":     "material_balance_smoke_ok",
				"severity":      "info",
				"title":         "Material balance smoke run completed",
				"description":   "The minimal material balance smoke run completed without warnings.",
				"evidence_refs": []any{"model_run:mr_material_balance_test"},
			},
		},
		"runtime_audit": map[string]any{"model_runs": []any{modelRun}, "timings_ms": map[string]any{}, "fallback_used": false},
	}
	completed, err := svc.Complete(ctx, "worker_1", "job_material_balance_minimal", 1, result)
	if err != nil {
		t.Fatal(err)
	}
	if completed.Job.Status != StatusSucceeded {
		t.Fatalf("expected succeeded job, got %s", completed.Job.Status)
	}
	stored, err := svc.GetModelRun(ctx, "mr_material_balance_test")
	if err != nil {
		t.Fatal(err)
	}
	var decoded map[string]any
	if err := json.Unmarshal(stored, &decoded); err != nil {
		t.Fatal(err)
	}
	if decoded["model_run_id"] != "mr_material_balance_test" || decoded["model_key"] != "material_balance" {
		t.Fatalf("unexpected persisted model run: %#v", decoded)
	}
	listed, err := svc.ListModelRuns(ctx, ModelRunFilter{ModelKey: "material_balance", ModelVersion: "material_balance.v1"})
	if err != nil {
		t.Fatal(err)
	}
	if listed.TotalEstimate != 1 || len(listed.Items) != 1 {
		t.Fatalf("expected one listed model run, got %#v", listed)
	}
	filtered, err := svc.ListModelRuns(ctx, ModelRunFilter{ModelKey: "asm1"})
	if err != nil {
		t.Fatal(err)
	}
	if filtered.TotalEstimate != 0 || len(filtered.Items) != 0 {
		t.Fatalf("unexpected model run filter result: %#v", filtered)
	}
	resultView, err := svc.Result(ctx, "job_material_balance_minimal")
	if err != nil {
		t.Fatal(err)
	}
	modelRuns, ok := resultView["model_runs"].([]any)
	if !ok || len(modelRuns) != 1 {
		t.Fatalf("expected result view to include model_runs, got %#v", resultView["model_runs"])
	}
	summaryView, ok := resultView["summary"].(map[string]any)
	if !ok {
		t.Fatalf("expected result summary object, got %#v", resultView["summary"])
	}
	riskFindings, ok := summaryView["risk_findings"].([]any)
	if !ok || len(riskFindings) != 1 {
		t.Fatalf("expected result summary to include risk_findings, got %#v", summaryView["risk_findings"])
	}
	evidence, checksum, err := svc.EvidencePackage(ctx, "job_material_balance_minimal")
	if err != nil {
		t.Fatal(err)
	}
	if evidence["schema_version"] != "evidence_package.v1" || evidence["job_id"] != "job_material_balance_minimal" {
		t.Fatalf("unexpected evidence package: %#v", evidence)
	}
	if checksum == "" || !strings.HasPrefix(checksum, "sha256:") {
		t.Fatalf("expected evidence checksum, got %q", checksum)
	}
	refs, ok := evidence["model_run_refs"].([]any)
	if !ok || len(refs) != 1 || refs[0] != "mr_material_balance_test" {
		t.Fatalf("unexpected model_run_refs: %#v", evidence["model_run_refs"])
	}
	governance, ok := evidence["governance"].(map[string]any)
	if !ok || governance["production_allowed"] != true {
		t.Fatalf("expected production-allowed governance summary, got %#v", evidence["governance"])
	}
	versionRefs, ok := governance["model_version_refs"].([]any)
	if !ok || len(versionRefs) != 1 {
		t.Fatalf("expected one governance model version ref, got %#v", governance["model_version_refs"])
	}
	readiness, err := svc.ProductionReadiness(ctx, "job_material_balance_minimal")
	if err != nil {
		t.Fatal(err)
	}
	if !readiness.ProductionReady ||
		readiness.ReadinessStatus != "ready_for_external_approval" ||
		!readiness.ExternalApprovalRequired ||
		readiness.AutoPublishAllowed ||
		readiness.RiskFindingsSummary.BySeverity["info"] != 1 {
		t.Fatalf("unexpected production readiness report: %#v", readiness)
	}

	auth, _ := NewAuthenticator("")
	server := NewServer(svc, auth, nil).Routes()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/model-runs/mr_material_balance_test", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec := httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("model run endpoint failed: %d %s", rec.Code, rec.Body.String())
	}
	req = httptest.NewRequest(http.MethodGet, "/api/v1/model-runs?model_key=material_balance&model_version=material_balance.v1", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("model run list endpoint failed: %d %s", rec.Code, rec.Body.String())
	}
	var listedResponse map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &listedResponse); err != nil {
		t.Fatal(err)
	}
	if int(listedResponse["total_estimate"].(float64)) != 1 {
		t.Fatalf("unexpected model run list response: %#v", listedResponse)
	}
	req = httptest.NewRequest(http.MethodGet, "/api/v1/compute/jobs/job_material_balance_minimal/evidence", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK || rec.Header().Get("X-Evidence-Checksum") == "" {
		t.Fatalf("evidence endpoint failed: %d checksum=%q body=%s", rec.Code, rec.Header().Get("X-Evidence-Checksum"), rec.Body.String())
	}
	req = httptest.NewRequest(http.MethodGet, "/api/v1/compute/jobs/job_material_balance_minimal/evidence-ref?ref=model_run:mr_material_balance_test", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("evidence ref endpoint failed: %d %s", rec.Code, rec.Body.String())
	}
	var resolution EvidenceReferenceResolution
	if err := json.Unmarshal(rec.Body.Bytes(), &resolution); err != nil {
		t.Fatal(err)
	}
	payload, ok := resolution.Payload.(map[string]any)
	if !ok || resolution.RefType != "model_run" || payload["model_run_id"] != "mr_material_balance_test" {
		t.Fatalf("unexpected evidence ref resolution: %#v", resolution)
	}
	req = httptest.NewRequest(http.MethodGet, "/api/v1/compute/jobs/job_material_balance_minimal/evidence-ref?ref=evidence_package:evidence_job_material_balance_minimal", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("evidence package ref endpoint failed: %d %s", rec.Code, rec.Body.String())
	}
	req = httptest.NewRequest(http.MethodGet, "/api/v1/compute/jobs/job_material_balance_minimal/production-readiness", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("production readiness endpoint failed: %d %s", rec.Code, rec.Body.String())
	}
	var readinessResponse ProductionReadinessReport
	if err := json.Unmarshal(rec.Body.Bytes(), &readinessResponse); err != nil {
		t.Fatal(err)
	}
	if !readinessResponse.ProductionReady ||
		readinessResponse.PolicyVersion != "production_readiness_policy.v1" ||
		readinessResponse.AutoPublishAllowed {
		t.Fatalf("unexpected production readiness endpoint response: %#v", readinessResponse)
	}

	benchmarkRunBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance.benchmark_run.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	benchmarkRun := decodeMap(t, benchmarkRunBytes)
	benchmarkRun["benchmark_run_id"] = "br_material_balance_test"
	benchmarkRun["model_run_id"] = "mr_material_balance_test"
	benchmarkRun["job_id"] = "job_material_balance_minimal"
	benchmarkRun["evidence_refs"] = []any{
		"model_run:mr_material_balance_test",
		"evidence_package:evidence_job_material_balance_minimal",
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/model-catalog/material_balance/versions/material_balance.v1/benchmark-runs", bytes.NewReader(encodeMap(t, benchmarkRun)))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("benchmark run record failed: %d %s", rec.Code, rec.Body.String())
	}
	var benchmarkRecord BenchmarkRunRecord
	if err := json.Unmarshal(rec.Body.Bytes(), &benchmarkRecord); err != nil {
		t.Fatal(err)
	}
	if benchmarkRecord.BenchmarkRunID != "br_material_balance_test" ||
		benchmarkRecord.Status != "passed" ||
		benchmarkRecord.PayloadHash == "" {
		t.Fatalf("unexpected benchmark run record: %#v", benchmarkRecord)
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/model-catalog/material_balance/versions/material_balance.v1/benchmark-runs", bytes.NewReader(encodeMap(t, benchmarkRun)))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("duplicate benchmark run should be idempotent, got %d %s", rec.Code, rec.Body.String())
	}
	req = httptest.NewRequest(http.MethodGet, "/api/v1/model-catalog/material_balance/versions/material_balance.v1/benchmark-runs?benchmark_case_id=bc_material_balance_minimal_v1", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("benchmark run list failed: %d %s", rec.Code, rec.Body.String())
	}
	var benchmarkList ListBenchmarkRunsResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &benchmarkList); err != nil {
		t.Fatal(err)
	}
	if benchmarkList.TotalEstimate != 1 || len(benchmarkList.Items) != 1 {
		t.Fatalf("unexpected benchmark run list: %#v", benchmarkList)
	}
	req = httptest.NewRequest(http.MethodGet, "/api/v1/benchmark-runs/br_material_balance_test", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("benchmark run get failed: %d %s", rec.Code, rec.Body.String())
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/model-catalog/material_balance/versions/material_balance.v1/benchmark-runs", bytes.NewReader(encodeMap(t, benchmarkRun)))
	req.Header.Set("Authorization", "Bearer dev-worker-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("worker token should not record benchmark runs, got %d %s", rec.Code, rec.Body.String())
	}

	explanationBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance.result_explanation.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	explanation := decodeMap(t, explanationBytes)
	explanation["evidence_refs"] = []any{"evidence_package:evidence_job_material_balance_minimal", "model_run:mr_material_balance_test"}
	statements := explanation["statements"].([]any)
	statements[0].(map[string]any)["evidence_refs"] = []any{"model_run:mr_material_balance_test"}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/compute/jobs/job_material_balance_minimal/result-explanations", bytes.NewReader(encodeMap(t, explanation)))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("result explanation submit failed: %d %s", rec.Code, rec.Body.String())
	}
	var explanationRecord ResultExplanationRecord
	if err := json.Unmarshal(rec.Body.Bytes(), &explanationRecord); err != nil {
		t.Fatal(err)
	}
	if explanationRecord.Status != "submitted" ||
		explanationRecord.ExplanationID != "explanation_material_balance_minimal" ||
		len(explanationRecord.ResolvedEvidenceRefs) != 2 {
		t.Fatalf("unexpected submitted result explanation: %#v", explanationRecord)
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/compute/jobs/job_material_balance_minimal/result-explanations", bytes.NewReader(encodeMap(t, explanation)))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("duplicate result explanation should be idempotent, got %d %s", rec.Code, rec.Body.String())
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/compute/jobs/job_material_balance_minimal/result-explanations/explanation_material_balance_minimal/publish", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusConflict {
		t.Fatalf("unreviewed result explanation should not publish, got %d %s", rec.Code, rec.Body.String())
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/compute/jobs/job_material_balance_minimal/result-explanations/explanation_material_balance_minimal/review", strings.NewReader(`{"decision":"approved","reason":"evidence refs verified"}`))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("result explanation review failed: %d %s", rec.Code, rec.Body.String())
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &explanationRecord); err != nil {
		t.Fatal(err)
	}
	if explanationRecord.Status != "approved" || explanationRecord.ReviewedBy != "dev-public" {
		t.Fatalf("unexpected reviewed result explanation: %#v", explanationRecord)
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/compute/jobs/job_material_balance_minimal/result-explanations/explanation_material_balance_minimal/publish", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("result explanation publish failed: %d %s", rec.Code, rec.Body.String())
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &explanationRecord); err != nil {
		t.Fatal(err)
	}
	if explanationRecord.Status != "published" || explanationRecord.PublishedBy != "dev-public" {
		t.Fatalf("unexpected published result explanation: %#v", explanationRecord)
	}
	req = httptest.NewRequest(http.MethodGet, "/api/v1/compute/jobs/job_material_balance_minimal/result-explanations/explanation_material_balance_minimal", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("result explanation read failed: %d %s", rec.Code, rec.Body.String())
	}
	badExplanation := decodeMap(t, encodeMap(t, explanation))
	badExplanation["explanation_id"] = "explanation_unresolved_ref"
	badExplanation["evidence_refs"] = []any{"model_run:missing"}
	badStatements := badExplanation["statements"].([]any)
	badStatements[0].(map[string]any)["evidence_refs"] = []any{"model_run:missing"}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/compute/jobs/job_material_balance_minimal/result-explanations", bytes.NewReader(encodeMap(t, badExplanation)))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("unresolved evidence ref should reject explanation, got %d %s", rec.Code, rec.Body.String())
	}
	req = httptest.NewRequest(http.MethodGet, "/api/v1/compute/jobs/job_material_balance_minimal/evidence-ref?ref=model_run:missing", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("missing evidence ref should return 404, got %d %s", rec.Code, rec.Body.String())
	}
	req = httptest.NewRequest(http.MethodGet, "/api/v1/compute/jobs/job_material_balance_minimal/evidence", nil)
	req.Header.Set("Authorization", "Bearer dev-worker-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("worker token should not read evidence, got %d %s", rec.Code, rec.Body.String())
	}
	req = httptest.NewRequest(http.MethodGet, "/api/v1/compute/jobs/job_material_balance_minimal/evidence-ref?ref=model_run:mr_material_balance_test", nil)
	req.Header.Set("Authorization", "Bearer dev-worker-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("worker token should not dereference evidence, got %d %s", rec.Code, rec.Body.String())
	}
}

func TestProductionReadinessBlocksHighRiskFindings(t *testing.T) {
	svc := testValidatedService(t)
	ctx := context.Background()
	job := decodeMap(t, fixtureJobBytes(t))
	job["job_id"] = "job_material_balance_high_risk"
	job["request_id"] = "req_material_balance_high_risk"
	job["idempotency_key"] = "idem_material_balance_high_risk"
	payload := job["payload"].(map[string]any)
	payload["simulation_input_id"] = "si_material_balance_high_risk"
	payload["process_graph_id"] = "pg_material_balance_high_risk"
	contextMap := job["context"].(map[string]any)
	contextMap["trace_id"] = "trace_material_balance_high_risk"
	if _, _, err := svc.CreateJob(ctx, encodeMap(t, job), ""); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.RegisterWorker(ctx, compatibleWorkerRegistration("worker_high_risk")); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Claim(ctx, "worker_high_risk"); err != nil {
		t.Fatal(err)
	}
	defaultParameterHash := builtInModelCatalog("2026-05-30T00:00:00Z").Models[0].Versions[0].DefaultParameterSet.ParameterHash
	modelRun := map[string]any{
		"schema_version":  "model_run.v1",
		"model_run_id":    "mr_material_balance_high_risk",
		"job_id":          "job_material_balance_high_risk",
		"model_key":       "material_balance",
		"model_version":   "material_balance.v1",
		"parameter_hash":  defaultParameterHash,
		"input_hash":      "sha256:" + strings.Repeat("c", 64),
		"quality_metrics": map[string]any{"convergence_status": "converged"},
		"warnings":        []any{},
		"evidence_refs":   []any{},
	}
	result := map[string]any{
		"schema_version": "compute_result.v1",
		"job_id":         "job_material_balance_high_risk",
		"job_type":       "simulation.material_balance.v1",
		"status":         StatusSucceeded,
		"summary":        map[string]any{"converged": true},
		"data":           map[string]any{},
		"quality":        map[string]any{"data_quality": "ok", "warnings": []any{}},
		"artifacts":      []any{},
		"risk_findings": []any{
			map[string]any{
				"risk_code":     "effluent_limit_exceeded",
				"severity":      "high",
				"title":         "Effluent limit exceeded",
				"description":   "The simulated effluent concentration exceeds the review threshold.",
				"evidence_refs": []any{"model_run:mr_material_balance_high_risk"},
			},
		},
		"runtime_audit": map[string]any{"model_runs": []any{modelRun}, "timings_ms": map[string]any{}, "fallback_used": false},
	}
	if _, err := svc.Complete(ctx, "worker_high_risk", "job_material_balance_high_risk", 1, result); err != nil {
		t.Fatal(err)
	}
	readiness, err := svc.ProductionReadiness(ctx, "job_material_balance_high_risk")
	if err != nil {
		t.Fatal(err)
	}
	if readiness.ProductionReady ||
		readiness.ReadinessStatus != "blocked" ||
		readiness.RiskFindingsSummary.BySeverity["high"] != 1 ||
		len(readiness.RiskFindingsSummary.Blocking) != 1 ||
		readiness.RiskFindingsSummary.Blocking[0] != "effluent_limit_exceeded" {
		t.Fatalf("expected high risk finding to block production readiness, got %#v", readiness)
	}
	foundBlockingCheck := false
	for _, check := range readiness.Checks {
		if check.CheckID == "risk_findings_no_high_or_critical" && check.Status == "failed" {
			foundBlockingCheck = true
		}
	}
	if !foundBlockingCheck {
		t.Fatalf("expected failed risk finding check, got %#v", readiness.Checks)
	}
}

func TestTimeoutSweepAndPagination(t *testing.T) {
	svc := testService(t)
	ctx := context.Background()
	if _, _, err := svc.CreateJob(ctx, fixtureJobBytes(t), ""); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.RegisterWorker(ctx, compatibleWorkerRegistration("worker_1")); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Claim(ctx, "worker_1"); err != nil {
		t.Fatal(err)
	}
	svc.now = func() time.Time { return time.Now().UTC().Add(DefaultLeaseSeconds*time.Second + time.Second) }
	timedOut, err := svc.TimeoutSweep(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if len(timedOut) != 1 || timedOut[0].Status != StatusTimedOut {
		t.Fatalf("expected one timed out job, got %#v", timedOut)
	}
	listed, err := svc.ListJobs(ctx, ListFilter{Limit: 1})
	if err != nil {
		t.Fatal(err)
	}
	if listed.TotalEstimate != 1 || len(listed.Items) != 1 {
		t.Fatalf("unexpected list response: %#v", listed)
	}
	if listed.Items[0].Artifacts == nil {
		t.Fatalf("listed jobs should expose an empty artifact array")
	}
}

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

func TestHTTPMutationAuditEventEnvelopeForJobCreate(t *testing.T) {
	svc := testService(t)
	auth, err := NewAuthenticator(`{"tokens":[
		{"name":"audit-user","token":"audit-token","scopes":["job:create","job:read"]}
	]}`)
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()

	req := httptest.NewRequest(http.MethodPost, "/api/v1/compute/jobs", bytes.NewReader(fixtureJobBytes(t)))
	req.Header.Set("Authorization", "Bearer audit-token")
	rec := httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusAccepted {
		t.Fatalf("job create failed: %d %s", rec.Code, rec.Body.String())
	}

	events, err := svc.Events(context.Background(), "job_material_balance_minimal")
	if err != nil {
		t.Fatal(err)
	}
	seen := map[string]bool{}
	assertAudit := func(event EventRecord, action, status string) {
		t.Helper()
		payload := eventPayloadMap(t, event)
		if payload["status"] != status {
			t.Fatalf("%s event should keep status payload, got %#v", event.EventType, payload)
		}
		audit := eventAuditMap(t, event)
		if audit["who"] != "audit-user" ||
			audit["where"] != "POST /api/v1/compute/jobs" ||
			audit["target_object"] != "ComputeJob" ||
			audit["target_id"] != "job_material_balance_minimal" ||
			audit["action"] != action ||
			audit["trace_id"] != "trace_material_balance_minimal" {
			t.Fatalf("unexpected audit envelope for %s: %#v", event.EventType, audit)
		}
		if audit["when"] == "" {
			t.Fatalf("audit envelope should include when: %#v", audit)
		}
		after, ok := audit["after"].(map[string]any)
		if !ok || after["status"] != status {
			t.Fatalf("audit envelope should include after status %s, got %#v", status, audit["after"])
		}
	}
	for _, event := range events {
		switch event.EventType {
		case "job.created":
			assertAudit(event, "job.create", StatusCreated)
			seen[event.EventType] = true
		case "job.queued":
			assertAudit(event, "job.queue", StatusQueued)
			seen[event.EventType] = true
		}
	}
	if !seen["job.created"] || !seen["job.queued"] {
		t.Fatalf("expected job create and queue audit events, got %#v", events)
	}
}

func TestHTTPWorkerJobMutationAuditEvents(t *testing.T) {
	svc := testService(t)
	ctx := context.Background()
	if _, _, err := svc.CreateJob(ctx, fixtureJobBytes(t), ""); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.RegisterWorker(ctx, compatibleWorkerRegistration("worker_audit")); err != nil {
		t.Fatal(err)
	}
	auth, err := NewAuthenticator("")
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()

	req := httptest.NewRequest(http.MethodPost, "/api/v1/workers/worker_audit/claim", nil)
	req.Header.Set("Authorization", "Bearer dev-worker-token")
	rec := httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("worker claim failed: %d %s", rec.Code, rec.Body.String())
	}

	artifactBody := &bytes.Buffer{}
	writer := multipart.NewWriter(artifactBody)
	artifactBytes := []byte(`{"audit":true}`)
	metadata := map[string]any{
		"schema_version":   "artifact.v1",
		"artifact_id":      "art_worker_audit",
		"job_id":           "job_material_balance_minimal",
		"artifact_type":    "time_series_json",
		"storage_provider": "local_fs",
		"object_key":       "ignored.json",
		"content_type":     "application/json",
		"size_bytes":       len(artifactBytes),
		"checksum":         "sha256:" + SHA256Hex(artifactBytes),
		"created_at":       time.Now().UTC().Format(time.RFC3339),
	}
	_ = writer.WriteField("metadata", string(encodeMap(t, metadata)))
	part, _ := writer.CreateFormFile("file", "artifact.json")
	_, _ = part.Write(artifactBytes)
	_ = writer.Close()
	req = httptest.NewRequest(http.MethodPost, "/api/v1/workers/worker_audit/jobs/job_material_balance_minimal/artifact", artifactBody)
	req.Header.Set("Authorization", "Bearer dev-worker-token")
	req.Header.Set("Content-Type", writer.FormDataContentType())
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("artifact upload failed: %d %s", rec.Code, rec.Body.String())
	}

	result := map[string]any{
		"schema_version": "compute_result.v1",
		"job_id":         "job_material_balance_minimal",
		"job_type":       "simulation.material_balance.v1",
		"status":         StatusSucceeded,
		"summary":        map[string]any{"converged": true},
		"data":           map[string]any{},
		"quality":        map[string]any{"data_quality": "ok", "warnings": []any{}},
		"artifacts":      []any{},
		"runtime_audit":  map[string]any{"model_runs": []any{}, "timings_ms": map[string]any{}, "fallback_used": false},
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/workers/worker_audit/jobs/job_material_balance_minimal/succeed", bytes.NewReader(encodeMap(t, map[string]any{
		"attempt":        1,
		"compute_result": result,
	})))
	req.Header.Set("Authorization", "Bearer dev-worker-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("worker completion failed: %d %s", rec.Code, rec.Body.String())
	}

	events, err := svc.Events(ctx, "job_material_balance_minimal")
	if err != nil {
		t.Fatal(err)
	}
	byType := map[string]EventRecord{}
	for _, event := range events {
		byType[event.EventType] = event
	}
	assertWorkerAudit := func(eventType, where, targetObject, targetID, action string) map[string]any {
		t.Helper()
		event, ok := byType[eventType]
		if !ok {
			t.Fatalf("expected %s audit event, got %#v", eventType, events)
		}
		audit := eventAuditMap(t, event)
		if audit["who"] != "dev-worker" ||
			audit["where"] != where ||
			audit["target_object"] != targetObject ||
			audit["target_id"] != targetID ||
			audit["action"] != action ||
			audit["trace_id"] != "trace_material_balance_minimal" {
			t.Fatalf("unexpected %s audit envelope: %#v", eventType, audit)
		}
		if audit["when"] == "" {
			t.Fatalf("%s audit envelope should include when: %#v", eventType, audit)
		}
		return audit
	}
	claimAudit := assertWorkerAudit("job.running", "POST /api/v1/workers/worker_audit/claim", "ComputeJob", "job_material_balance_minimal", "job.claim")
	if after, ok := claimAudit["after"].(map[string]any); !ok || after["status"] != StatusRunning || after["worker_id"] != "worker_audit" {
		t.Fatalf("claim audit should include compact running state, got %#v", claimAudit["after"])
	}
	artifactAudit := assertWorkerAudit("artifact.recorded", "POST /api/v1/workers/worker_audit/jobs/job_material_balance_minimal/artifact", "Artifact", "art_worker_audit", "artifact.record")
	if after, ok := artifactAudit["after"].(map[string]any); !ok || after["artifact_id"] != "art_worker_audit" || after["job_id"] != "job_material_balance_minimal" {
		t.Fatalf("artifact audit should include compact artifact state, got %#v", artifactAudit["after"])
	}
	completionAudit := assertWorkerAudit("job.succeeded", "POST /api/v1/workers/worker_audit/jobs/job_material_balance_minimal/succeed", "ComputeJob", "job_material_balance_minimal", "job.complete")
	if after, ok := completionAudit["after"].(map[string]any); !ok || after["status"] != StatusSucceeded || after["worker_id"] != "worker_audit" {
		t.Fatalf("completion audit should include compact terminal state, got %#v", completionAudit["after"])
	}
}

func TestHTTPResultExplanationAuditEvents(t *testing.T) {
	svc := testValidatedService(t)
	ctx := context.Background()
	if _, _, err := svc.CreateJob(ctx, fixtureJobBytes(t), ""); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.RegisterWorker(ctx, compatibleWorkerRegistration("worker_result_audit")); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Claim(ctx, "worker_result_audit"); err != nil {
		t.Fatal(err)
	}
	defaultParameterHash := builtInModelCatalog("2026-05-30T00:00:00Z").Models[0].Versions[0].DefaultParameterSet.ParameterHash
	modelRun := map[string]any{
		"schema_version":  "model_run.v1",
		"model_run_id":    "mr_material_balance_minimal",
		"job_id":          "job_material_balance_minimal",
		"model_key":       "material_balance",
		"model_version":   "material_balance.v1",
		"parameter_hash":  defaultParameterHash,
		"input_hash":      "sha256:" + strings.Repeat("b", 64),
		"quality_metrics": map[string]any{"convergence_status": "converged"},
		"warnings":        []any{},
		"evidence_refs":   []any{},
	}
	result := map[string]any{
		"schema_version": "compute_result.v1",
		"job_id":         "job_material_balance_minimal",
		"job_type":       "simulation.material_balance.v1",
		"status":         StatusSucceeded,
		"summary":        map[string]any{"converged": true},
		"data":           map[string]any{},
		"quality":        map[string]any{"data_quality": "ok", "warnings": []any{}},
		"artifacts":      []any{},
		"runtime_audit":  map[string]any{"model_runs": []any{modelRun}, "timings_ms": map[string]any{}, "fallback_used": false},
	}
	if _, err := svc.Complete(ctx, "worker_result_audit", "job_material_balance_minimal", 1, result); err != nil {
		t.Fatal(err)
	}

	auth, err := NewAuthenticator(`{"tokens":[
		{"name":"result-auditor","token":"result-audit-token","scopes":["job:read","explanation:write"]}
	]}`)
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()
	explanationBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance.result_explanation.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	explanationID := "explanation_material_balance_minimal"
	req := httptest.NewRequest(http.MethodPost, "/api/v1/compute/jobs/job_material_balance_minimal/result-explanations", bytes.NewReader(explanationBytes))
	req.Header.Set("Authorization", "Bearer result-audit-token")
	rec := httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("result explanation submit failed: %d %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/compute/jobs/job_material_balance_minimal/result-explanations", bytes.NewReader(explanationBytes))
	req.Header.Set("Authorization", "Bearer result-audit-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("duplicate submit should be idempotent: %d %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/compute/jobs/job_material_balance_minimal/result-explanations/"+explanationID+"/review", strings.NewReader(`{"decision":"approved","reason":"evidence refs verified"}`))
	req.Header.Set("Authorization", "Bearer result-audit-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("result explanation review failed: %d %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/compute/jobs/job_material_balance_minimal/result-explanations/"+explanationID+"/publish", nil)
	req.Header.Set("Authorization", "Bearer result-audit-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("result explanation publish failed: %d %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/compute/jobs/job_material_balance_minimal/result-explanations/"+explanationID+"/publish", nil)
	req.Header.Set("Authorization", "Bearer result-audit-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("duplicate publish should be idempotent: %d %s", rec.Code, rec.Body.String())
	}

	events, err := svc.Events(context.Background(), "job_material_balance_minimal")
	if err != nil {
		t.Fatal(err)
	}
	counts := map[string]int{}
	byType := map[string]EventRecord{}
	for _, event := range events {
		if strings.HasPrefix(event.EventType, "result_explanation.") {
			counts[event.EventType]++
			byType[event.EventType] = event
		}
	}
	if counts["result_explanation.submitted"] != 1 ||
		counts["result_explanation.reviewed"] != 1 ||
		counts["result_explanation.published"] != 1 {
		t.Fatalf("expected one audit event per result explanation mutation, got counts=%#v events=%#v", counts, events)
	}

	assertResultExplanationAudit := func(eventType, action, path, status string) map[string]any {
		t.Helper()
		event := byType[eventType]
		payload := eventPayloadMap(t, event)
		if payload["explanation_id"] != explanationID || payload["status"] != status {
			t.Fatalf("unexpected %s payload: %#v", eventType, payload)
		}
		if _, ok := payload["payload"]; ok {
			t.Fatalf("%s audit payload must not include full explanation payload: %#v", eventType, payload)
		}
		audit := eventAuditMap(t, event)
		if audit["who"] != "result-auditor" ||
			audit["where"] != path ||
			audit["target_object"] != "ResultExplanation" ||
			audit["target_id"] != explanationID ||
			audit["action"] != action ||
			audit["trace_id"] != "trace_material_balance_minimal" {
			t.Fatalf("unexpected audit envelope for %s: %#v", eventType, audit)
		}
		if audit["when"] == "" {
			t.Fatalf("%s audit envelope should include when: %#v", eventType, audit)
		}
		return audit
	}
	submittedAudit := assertResultExplanationAudit(
		"result_explanation.submitted",
		"result_explanation.submit",
		"POST /api/v1/compute/jobs/job_material_balance_minimal/result-explanations",
		"submitted",
	)
	if submittedAudit["before"] != nil {
		t.Fatalf("submit audit should not have before state: %#v", submittedAudit["before"])
	}
	submittedAfter, ok := submittedAudit["after"].(map[string]any)
	if !ok || submittedAfter["payload_hash"] == "" || submittedAfter["resolved_evidence_ref_count"].(float64) != 2 {
		t.Fatalf("submit audit should include compact after state: %#v", submittedAudit["after"])
	}

	reviewedAudit := assertResultExplanationAudit(
		"result_explanation.reviewed",
		"result_explanation.review",
		"POST /api/v1/compute/jobs/job_material_balance_minimal/result-explanations/"+explanationID+"/review",
		"approved",
	)
	reviewBefore, ok := reviewedAudit["before"].(map[string]any)
	if !ok || reviewBefore["status"] != "submitted" {
		t.Fatalf("review audit should include submitted before state: %#v", reviewedAudit["before"])
	}
	reviewAfter, ok := reviewedAudit["after"].(map[string]any)
	if !ok || reviewAfter["status"] != "approved" || reviewAfter["review_decision"] != "approved" {
		t.Fatalf("review audit should include approved after state: %#v", reviewedAudit["after"])
	}
	if reviewedAudit["reason"] != "evidence refs verified" {
		t.Fatalf("review audit should preserve reason, got %#v", reviewedAudit)
	}

	publishedAudit := assertResultExplanationAudit(
		"result_explanation.published",
		"result_explanation.publish",
		"POST /api/v1/compute/jobs/job_material_balance_minimal/result-explanations/"+explanationID+"/publish",
		"published",
	)
	publishBefore, ok := publishedAudit["before"].(map[string]any)
	if !ok || publishBefore["status"] != "approved" {
		t.Fatalf("publish audit should include approved before state: %#v", publishedAudit["before"])
	}
	publishAfter, ok := publishedAudit["after"].(map[string]any)
	if !ok || publishAfter["status"] != "published" || publishAfter["published_by"] != "result-auditor" {
		t.Fatalf("publish audit should include published after state: %#v", publishedAudit["after"])
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

func TestHTTPSimulationRegistryTenantProjectSiteScope(t *testing.T) {
	svc := testValidatedService(t)
	auth, err := NewAuthenticator(`{"tokens":[
		{"name":"scope-a","token":"scope-a-token","scopes":["job:create","job:read"],"tenant_id":"tenant_a","project_id":"project_a","site_id":"site_a"},
		{"name":"global","token":"global-token","scopes":["job:create","job:read"]}
	]}`)
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()

	post := func(path string, body []byte) *httptest.ResponseRecorder {
		t.Helper()
		req := httptest.NewRequest(http.MethodPost, path, bytes.NewReader(body))
		req.Header.Set("Authorization", "Bearer global-token")
		rec := httptest.NewRecorder()
		server.ServeHTTP(rec, req)
		if rec.Code != http.StatusCreated {
			t.Fatalf("register %s failed: %d %s", path, rec.Code, rec.Body.String())
		}
		return rec
	}
	get := func(path, token string) *httptest.ResponseRecorder {
		t.Helper()
		req := httptest.NewRequest(http.MethodGet, path, nil)
		req.Header.Set("Authorization", "Bearer "+token)
		rec := httptest.NewRecorder()
		server.ServeHTTP(rec, req)
		return rec
	}

	rec := post("/api/v1/process-graphs", scopedProcessGraphBytes(t, "pg_scope_alpha", "tenant_a", "project_a", "site_a"))
	var processGraph ProcessGraphRecord
	if err := json.Unmarshal(rec.Body.Bytes(), &processGraph); err != nil {
		t.Fatal(err)
	}
	if processGraph.TenantID != "tenant_a" || processGraph.ProjectID != "project_a" || processGraph.SiteID != "site_a" {
		t.Fatalf("process graph should persist tenant/project/site metadata, got %#v", processGraph)
	}
	post("/api/v1/process-graphs", scopedProcessGraphBytes(t, "pg_scope_cross_site", "tenant_a", "project_a", "site_b"))

	rec = get("/api/v1/process-graphs/pg_scope_alpha?version=1", "scope-a-token")
	if rec.Code != http.StatusOK {
		t.Fatalf("scope-matching process graph read should pass: %d %s", rec.Code, rec.Body.String())
	}
	rec = get("/api/v1/process-graphs/pg_scope_cross_site?version=1", "scope-a-token")
	if rec.Code != http.StatusForbidden {
		t.Fatalf("cross-site process graph read should be denied, got %d %s", rec.Code, rec.Body.String())
	}
	rec = get("/api/v1/process-graphs/pg_scope_cross_site?version=1", "global-token")
	if rec.Code != http.StatusOK {
		t.Fatalf("global process graph read should pass: %d %s", rec.Code, rec.Body.String())
	}

	rec = post("/api/v1/simulation-inputs", scopedSimulationInputBytes(t, "si_scope_alpha", "pg_scope_alpha", "tenant_a", "project_a", "site_a"))
	var simulationInput SimulationInputRecord
	if err := json.Unmarshal(rec.Body.Bytes(), &simulationInput); err != nil {
		t.Fatal(err)
	}
	if simulationInput.TenantID != "tenant_a" || simulationInput.ProjectID != "project_a" || simulationInput.SiteID != "site_a" {
		t.Fatalf("simulation input should persist tenant/project/site metadata, got %#v", simulationInput)
	}
	post("/api/v1/simulation-inputs", scopedSimulationInputBytes(t, "si_scope_cross_project", "pg_scope_alpha", "tenant_a", "project_b", "site_a"))

	rec = get("/api/v1/simulation-inputs/si_scope_alpha", "scope-a-token")
	if rec.Code != http.StatusOK {
		t.Fatalf("scope-matching simulation input read should pass: %d %s", rec.Code, rec.Body.String())
	}
	rec = get("/api/v1/simulation-inputs/si_scope_cross_project", "scope-a-token")
	if rec.Code != http.StatusForbidden {
		t.Fatalf("cross-project simulation input read should be denied, got %d %s", rec.Code, rec.Body.String())
	}
	rec = get("/api/v1/simulation-inputs/si_scope_cross_project", "global-token")
	if rec.Code != http.StatusOK {
		t.Fatalf("global simulation input read should pass: %d %s", rec.Code, rec.Body.String())
	}
}

func TestHTTPSimulationRegistryMutationTenantProjectSiteScope(t *testing.T) {
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

	post := func(path string, body []byte, token string, expectedStatus int) *httptest.ResponseRecorder {
		t.Helper()
		req := httptest.NewRequest(http.MethodPost, path, bytes.NewReader(body))
		req.Header.Set("Authorization", "Bearer "+token)
		rec := httptest.NewRecorder()
		server.ServeHTTP(rec, req)
		if rec.Code != expectedStatus {
			t.Fatalf("registry mutation %s with %s got %d want %d: %s", path, token, rec.Code, expectedStatus, rec.Body.String())
		}
		return rec
	}

	rec := post("/api/v1/process-graphs", scopedProcessGraphBytes(t, "pg_registry_mutation_alpha", "tenant_a", "project_a", "site_a"), "scope-a-token", http.StatusCreated)
	var processGraph ProcessGraphRecord
	if err := json.Unmarshal(rec.Body.Bytes(), &processGraph); err != nil {
		t.Fatal(err)
	}
	if processGraph.TenantID != "tenant_a" || processGraph.ProjectID != "project_a" || processGraph.SiteID != "site_a" {
		t.Fatalf("scope-matching process graph should persist tenant/project/site metadata, got %#v", processGraph)
	}

	post("/api/v1/process-graphs", scopedProcessGraphBytes(t, "pg_registry_mutation_cross_site", "tenant_a", "project_a", "site_b"), "scope-a-token", http.StatusForbidden)
	if _, err := svc.GetProcessGraph(ctx, "pg_registry_mutation_cross_site", 1); err == nil {
		t.Fatalf("cross-scope denied process graph registration must not write a record")
	}

	rec = post("/api/v1/simulation-inputs", scopedSimulationInputBytes(t, "si_registry_mutation_alpha", "pg_registry_mutation_alpha", "tenant_a", "project_a", "site_a"), "scope-a-token", http.StatusCreated)
	var simulationInput SimulationInputRecord
	if err := json.Unmarshal(rec.Body.Bytes(), &simulationInput); err != nil {
		t.Fatal(err)
	}
	if simulationInput.TenantID != "tenant_a" || simulationInput.ProjectID != "project_a" || simulationInput.SiteID != "site_a" {
		t.Fatalf("scope-matching simulation input should persist tenant/project/site metadata, got %#v", simulationInput)
	}

	post("/api/v1/simulation-inputs", scopedSimulationInputBytes(t, "si_registry_mutation_cross_project", "pg_registry_mutation_alpha", "tenant_a", "project_b", "site_a"), "scope-a-token", http.StatusForbidden)
	if _, err := svc.GetSimulationInput(ctx, "si_registry_mutation_cross_project"); err == nil {
		t.Fatalf("cross-scope denied simulation input registration must not write a record")
	}

	processGraphAudit, _, processGraphAuditTotal, err := svc.store.ListMutationAuditEvents(ctx, MutationAuditFilter{TargetObject: "ProcessGraph", Limit: 10})
	if err != nil {
		t.Fatal(err)
	}
	if processGraphAuditTotal != 1 || len(processGraphAudit) != 1 || processGraphAudit[0].TargetID != "pg_registry_mutation_alpha" {
		t.Fatalf("cross-scope denied process graph registration must not write audit events, total=%d events=%#v", processGraphAuditTotal, processGraphAudit)
	}

	simulationInputAudit, _, simulationInputAuditTotal, err := svc.store.ListMutationAuditEvents(ctx, MutationAuditFilter{TargetObject: "SimulationInput", Limit: 10})
	if err != nil {
		t.Fatal(err)
	}
	if simulationInputAuditTotal != 1 || len(simulationInputAudit) != 1 || simulationInputAudit[0].TargetID != "si_registry_mutation_alpha" {
		t.Fatalf("cross-scope denied simulation input registration must not write audit events, total=%d events=%#v", simulationInputAuditTotal, simulationInputAudit)
	}
}

func TestHTTPSimulationCheckMutationTenantProjectSiteScope(t *testing.T) {
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
	postSimulationCheck := func(body []byte, token string, expectedStatus int) *httptest.ResponseRecorder {
		t.Helper()
		req := httptest.NewRequest(http.MethodPost, "/api/v1/simulation-checks", bytes.NewReader(body))
		req.Header.Set("Authorization", "Bearer "+token)
		rec := httptest.NewRecorder()
		server.ServeHTTP(rec, req)
		if rec.Code != expectedStatus {
			t.Fatalf("simulation check with %s got %d want %d: %s", token, rec.Code, expectedStatus, rec.Body.String())
		}
		return rec
	}

	rec := postSimulationCheck(scopedSimulationCheckBytes(t, "sim_req_check_scope_alpha", "si_check_scope_alpha", "tenant_a", "project_a", "site_a", "", "", ""), "scope-a-token", http.StatusAccepted)
	var snapshot JobSnapshot
	if err := json.Unmarshal(rec.Body.Bytes(), &snapshot); err != nil {
		t.Fatal(err)
	}
	if snapshot.Job.JobID != "job_simcheck_sim_req_check_scope_alpha" ||
		snapshot.Job.TenantID != "tenant_a" ||
		snapshot.Job.ProjectID != "project_a" ||
		snapshot.Job.SiteID != "site_a" {
		t.Fatalf("scope-matching simulation check should create scoped job, got %#v", snapshot.Job)
	}
	record, err := svc.GetSimulationInput(ctx, "si_check_scope_alpha")
	if err != nil {
		t.Fatal(err)
	}
	if record.TenantID != "tenant_a" || record.ProjectID != "project_a" || record.SiteID != "site_a" {
		t.Fatalf("embedded simulation_input should inherit simulation request scope before registry write, got %#v", record)
	}

	postSimulationCheck(scopedSimulationCheckBytes(t, "sim_req_check_scope_cross_site", "si_check_scope_cross_site", "tenant_a", "project_a", "site_b", "", "", ""), "scope-a-token", http.StatusForbidden)
	if _, err := svc.GetJob(ctx, "job_simcheck_sim_req_check_scope_cross_site"); err == nil {
		t.Fatalf("cross-scope denied simulation check must not write a job")
	}
	if _, err := svc.GetSimulationInput(ctx, "si_check_scope_cross_site"); err == nil {
		t.Fatalf("cross-scope denied simulation check must not auto-write simulation input")
	}

	postSimulationCheck(scopedSimulationCheckBytes(t, "sim_req_check_scope_input_cross", "si_check_scope_input_cross", "tenant_a", "project_a", "site_a", "tenant_a", "project_b", "site_a"), "scope-a-token", http.StatusForbidden)
	if _, err := svc.GetJob(ctx, "job_simcheck_sim_req_check_scope_input_cross"); err == nil {
		t.Fatalf("cross-scope embedded input must not write a job")
	}
	if _, err := svc.GetSimulationInput(ctx, "si_check_scope_input_cross"); err == nil {
		t.Fatalf("cross-scope embedded input must not write a simulation input")
	}

	auditEvents, _, auditTotal, err := svc.store.ListMutationAuditEvents(ctx, MutationAuditFilter{TargetObject: "SimulationInput", Limit: 10})
	if err != nil {
		t.Fatal(err)
	}
	if auditTotal != 1 || len(auditEvents) != 1 || auditEvents[0].TargetID != "si_check_scope_alpha" {
		t.Fatalf("denied simulation checks must not write simulation input audit events, total=%d events=%#v", auditTotal, auditEvents)
	}
}

func TestHTTPSimulationRegistryMutationAuditEvents(t *testing.T) {
	svc := testValidatedService(t)
	auth, err := NewAuthenticator(`{"tokens":[
		{"name":"registry-auditor","token":"registry-audit-token","scopes":["job:create","job:read"]}
	]}`)
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()

	post := func(path string, body []byte, expectedStatus int) *httptest.ResponseRecorder {
		t.Helper()
		req := httptest.NewRequest(http.MethodPost, path, bytes.NewReader(body))
		req.Header.Set("Authorization", "Bearer registry-audit-token")
		rec := httptest.NewRecorder()
		server.ServeHTTP(rec, req)
		if rec.Code != expectedStatus {
			t.Fatalf("register %s expected %d, got %d %s", path, expectedStatus, rec.Code, rec.Body.String())
		}
		return rec
	}

	processGraphBytes := scopedProcessGraphBytes(t, "pg_audit_alpha", "tenant_audit", "project_audit", "site_audit")
	rec := post("/api/v1/process-graphs", processGraphBytes, http.StatusCreated)
	var processGraph ProcessGraphRecord
	if err := json.Unmarshal(rec.Body.Bytes(), &processGraph); err != nil {
		t.Fatal(err)
	}
	post("/api/v1/process-graphs", processGraphBytes, http.StatusOK)

	simulationInputBytes := scopedSimulationInputBytes(t, "si_audit_alpha", "pg_audit_alpha", "tenant_audit", "project_audit", "site_audit")
	rec = post("/api/v1/simulation-inputs", simulationInputBytes, http.StatusCreated)
	var simulationInput SimulationInputRecord
	if err := json.Unmarshal(rec.Body.Bytes(), &simulationInput); err != nil {
		t.Fatal(err)
	}
	post("/api/v1/simulation-inputs", simulationInputBytes, http.StatusOK)

	auditEvents, _, auditTotal, err := svc.store.ListMutationAuditEvents(context.Background(), MutationAuditFilter{Limit: 10})
	if err != nil {
		t.Fatal(err)
	}
	if auditTotal != 2 || len(auditEvents) != 2 {
		t.Fatalf("expected process graph and simulation input audit events only, total=%d events=%#v", auditTotal, auditEvents)
	}
	auditByType := map[string]MutationAuditRecord{}
	for _, event := range auditEvents {
		auditByType[event.EventType] = event
	}
	processGraphEvent, ok := auditByType[processGraphRegisteredEvent]
	if !ok {
		t.Fatalf("process graph registered audit missing: %#v", auditEvents)
	}
	processPayload := mutationAuditPayloadMap(t, processGraphEvent)
	if _, ok := processPayload["payload"]; ok {
		t.Fatalf("process graph audit must not include full payload: %#v", processPayload)
	}
	processAudit := mutationAuditMap(t, processGraphEvent)
	if processAudit["who"] != "registry-auditor" ||
		processAudit["where"] != "POST /api/v1/process-graphs" ||
		processAudit["target_object"] != "ProcessGraph" ||
		processAudit["target_id"] != "pg_audit_alpha" ||
		processAudit["action"] != "process_graph.register" {
		t.Fatalf("unexpected process graph audit envelope: %#v", processAudit)
	}
	processAfter, ok := processAudit["after"].(map[string]any)
	if !ok ||
		processAfter["payload_hash"] != processGraph.PayloadHash ||
		processAfter["tenant_id"] != "tenant_audit" ||
		processAfter["project_id"] != "project_audit" ||
		processAfter["site_id"] != "site_audit" ||
		processAfter["version"] != float64(1) {
		t.Fatalf("process graph audit should include compact after state, got %#v", processAudit["after"])
	}

	inputEvent, ok := auditByType[simulationInputRegisteredEvent]
	if !ok {
		t.Fatalf("simulation input registered audit missing: %#v", auditEvents)
	}
	inputPayload := mutationAuditPayloadMap(t, inputEvent)
	if _, ok := inputPayload["payload"]; ok {
		t.Fatalf("simulation input audit must not include full payload: %#v", inputPayload)
	}
	inputAudit := mutationAuditMap(t, inputEvent)
	if inputAudit["who"] != "registry-auditor" ||
		inputAudit["where"] != "POST /api/v1/simulation-inputs" ||
		inputAudit["target_object"] != "SimulationInput" ||
		inputAudit["target_id"] != "si_audit_alpha" ||
		inputAudit["action"] != "simulation_input.register" {
		t.Fatalf("unexpected simulation input audit envelope: %#v", inputAudit)
	}
	inputAfter, ok := inputAudit["after"].(map[string]any)
	if !ok ||
		inputAfter["payload_hash"] != simulationInput.PayloadHash ||
		inputAfter["job_type"] != "simulation.material_balance.v1" ||
		inputAfter["process_graph_id"] != "pg_audit_alpha" ||
		inputAfter["tenant_id"] != "tenant_audit" ||
		inputAfter["project_id"] != "project_audit" ||
		inputAfter["site_id"] != "site_audit" {
		t.Fatalf("simulation input audit should include compact after state, got %#v", inputAudit["after"])
	}

	processGraphRequestBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance_process_graph.simulation_request.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	processGraphRequest := decodeMap(t, processGraphRequestBytes)
	processGraphRequest["request_id"] = "sim_req_registry_audit_process_graph"
	inputRef := mapValue(processGraphRequest, "input_ref")
	inputRef["process_graph_id"] = "pg_audit_alpha"
	inputRef["process_graph_version"] = 1
	post("/api/v1/simulation-checks", encodeMap(t, processGraphRequest), http.StatusAccepted)

	auditEvents, _, auditTotal, err = svc.store.ListMutationAuditEvents(context.Background(), MutationAuditFilter{Limit: 10})
	if err != nil {
		t.Fatal(err)
	}
	if auditTotal != 3 || len(auditEvents) != 3 {
		t.Fatalf("expected simulation-check generated input to add one registry audit event, total=%d events=%#v", auditTotal, auditEvents)
	}
	var generatedInputEvent *MutationAuditRecord
	for _, event := range auditEvents {
		if event.EventType == simulationInputRegisteredEvent && event.TargetID == "si_pg_audit_alpha" {
			copied := event
			generatedInputEvent = &copied
			break
		}
	}
	if generatedInputEvent == nil {
		t.Fatalf("simulation-check generated simulation input audit missing: %#v", auditEvents)
	}
	generatedInputAudit := mutationAuditMap(t, *generatedInputEvent)
	if generatedInputAudit["who"] != "registry-auditor" ||
		generatedInputAudit["where"] != "POST /api/v1/simulation-checks" ||
		generatedInputAudit["target_object"] != "SimulationInput" ||
		generatedInputAudit["target_id"] != "si_pg_audit_alpha" ||
		generatedInputAudit["action"] != "simulation_input.register" {
		t.Fatalf("unexpected generated simulation input audit envelope: %#v", generatedInputAudit)
	}
}

func TestHTTPDraftConfirmationTenantProjectSiteScope(t *testing.T) {
	svc := testValidatedService(t)
	auth, err := NewAuthenticator(`{"tokens":[
		{"name":"scope-a","token":"scope-a-token","scopes":["job:create","job:read"],"tenant_id":"tenant_a","project_id":"project_a","site_id":"site_a"},
		{"name":"global","token":"global-token","scopes":["job:create","job:read"]}
	]}`)
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()
	ctx := context.Background()

	postConfirmation := func(body []byte, token string) ContractValidationResponse {
		t.Helper()
		req := httptest.NewRequest(http.MethodPost, "/api/v1/contracts/confirm-draft", bytes.NewReader(body))
		req.Header.Set("Authorization", "Bearer "+token)
		rec := httptest.NewRecorder()
		server.ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatalf("confirm draft failed: %d %s", rec.Code, rec.Body.String())
		}
		var response ContractValidationResponse
		if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
			t.Fatal(err)
		}
		if !response.Valid || response.ConfirmationRecord == nil {
			t.Fatalf("unexpected confirmation response: %#v", response)
		}
		return response
	}
	request := func(method, path, token string) *httptest.ResponseRecorder {
		t.Helper()
		req := httptest.NewRequest(method, path, nil)
		req.Header.Set("Authorization", "Bearer "+token)
		rec := httptest.NewRecorder()
		server.ServeHTTP(rec, req)
		return rec
	}

	agentAlpha := postConfirmation(scopedDraftConfirmationBytes(t, "material_balance_promotable.draft_confirmation.v1.json", "confirm_scope_alpha", "tenant_a", "project_a", "site_a"), "global-token")
	if agentAlpha.ConfirmationRecord.TenantID != "tenant_a" ||
		agentAlpha.ConfirmationRecord.ProjectID != "project_a" ||
		agentAlpha.ConfirmationRecord.SiteID != "site_a" {
		t.Fatalf("draft confirmation should persist tenant/project/site metadata, got %#v", agentAlpha.ConfirmationRecord)
	}
	postConfirmation(scopedDraftConfirmationBytes(t, "material_balance_promotable.draft_confirmation.v1.json", "confirm_scope_cross_site", "tenant_a", "project_a", "site_b"), "global-token")
	postConfirmation(scopedDraftConfirmationBytesWithProposedScope(t, "material_balance_promotable.draft_confirmation.v1.json", "confirm_scope_proposed_cross", "tenant_a", "project_a", "site_a", "tenant_a", "project_a", "site_b"), "global-token")
	postConfirmation(scopedDraftConfirmationBytes(t, "material_balance_constraint.draft_confirmation.v1.json", "confirm_scope_constraint_alpha", "tenant_a", "project_a", "site_a"), "global-token")
	postConfirmation(scopedDraftConfirmationBytes(t, "material_balance_constraint.draft_confirmation.v1.json", "confirm_scope_constraint_cross_project", "tenant_a", "project_b", "site_a"), "global-token")

	rec := request(http.MethodGet, "/api/v1/contracts/confirmations/confirm_scope_alpha", "scope-a-token")
	if rec.Code != http.StatusOK {
		t.Fatalf("scope-matching draft confirmation read should pass: %d %s", rec.Code, rec.Body.String())
	}
	rec = request(http.MethodGet, "/api/v1/contracts/confirmations/confirm_scope_cross_site", "scope-a-token")
	if rec.Code != http.StatusForbidden {
		t.Fatalf("cross-site draft confirmation read should be denied, got %d %s", rec.Code, rec.Body.String())
	}
	rec = request(http.MethodGet, "/api/v1/contracts/confirmations/confirm_scope_cross_site", "global-token")
	if rec.Code != http.StatusOK {
		t.Fatalf("global draft confirmation read should pass: %d %s", rec.Code, rec.Body.String())
	}

	rec = request(http.MethodGet, "/api/v1/contracts/confirmations/confirm_scope_constraint_alpha/constraint-application-plan", "scope-a-token")
	if rec.Code != http.StatusOK {
		t.Fatalf("scope-matching constraint plan should pass: %d %s", rec.Code, rec.Body.String())
	}
	rec = request(http.MethodGet, "/api/v1/contracts/confirmations/confirm_scope_constraint_cross_project/constraint-application-plan", "scope-a-token")
	if rec.Code != http.StatusForbidden {
		t.Fatalf("cross-project constraint plan should be denied, got %d %s", rec.Code, rec.Body.String())
	}

	rec = request(http.MethodPost, "/api/v1/contracts/confirmations/confirm_scope_alpha/promote-simulation-check", "scope-a-token")
	if rec.Code != http.StatusAccepted {
		t.Fatalf("scope-matching draft promotion should pass: %d %s", rec.Code, rec.Body.String())
	}
	var promoted JobSnapshot
	if err := json.Unmarshal(rec.Body.Bytes(), &promoted); err != nil {
		t.Fatal(err)
	}
	if promoted.Job.TenantID != "tenant_a" || promoted.Job.ProjectID != "project_a" || promoted.Job.SiteID != "site_a" {
		t.Fatalf("promoted job should keep scoped metadata, got %#v", promoted.Job)
	}
	rec = request(http.MethodPost, "/api/v1/contracts/confirmations/confirm_scope_cross_site/promote-simulation-check", "scope-a-token")
	if rec.Code != http.StatusForbidden {
		t.Fatalf("cross-site draft promotion should be denied, got %d %s", rec.Code, rec.Body.String())
	}
	rec = request(http.MethodPost, "/api/v1/contracts/confirmations/confirm_scope_proposed_cross/promote-simulation-check", "scope-a-token")
	if rec.Code != http.StatusForbidden {
		t.Fatalf("draft promotion with cross-scope proposed request should be denied, got %d %s", rec.Code, rec.Body.String())
	}
	if _, err := svc.GetJob(ctx, "job_simcheck_sim_req_confirm_scope_proposed_cross"); err == nil {
		t.Fatalf("cross-scope proposed request promotion must not write a job")
	}
}

func TestHTTPDraftConfirmationMutationAuditEvents(t *testing.T) {
	svc := testValidatedService(t)
	auth, err := NewAuthenticator(`{"tokens":[
		{"name":"draft-auditor","token":"draft-audit-token","scopes":["job:create","job:read"]}
	]}`)
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()
	confirmationBytes := scopedDraftConfirmationBytes(t, "material_balance_promotable.draft_confirmation.v1.json", "confirm_audit_alpha", "tenant_audit", "project_audit", "site_audit")

	post := func(expectedStatus int) ContractValidationResponse {
		t.Helper()
		req := httptest.NewRequest(http.MethodPost, "/api/v1/contracts/confirm-draft", bytes.NewReader(confirmationBytes))
		req.Header.Set("Authorization", "Bearer draft-audit-token")
		rec := httptest.NewRecorder()
		server.ServeHTTP(rec, req)
		if rec.Code != expectedStatus {
			t.Fatalf("confirm draft expected %d, got %d %s", expectedStatus, rec.Code, rec.Body.String())
		}
		var response ContractValidationResponse
		if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
			t.Fatal(err)
		}
		if !response.Valid || response.ConfirmationRecord == nil {
			t.Fatalf("unexpected confirmation response: %#v", response)
		}
		return response
	}
	response := post(http.StatusOK)
	post(http.StatusOK)

	auditEvents, _, auditTotal, err := svc.store.ListMutationAuditEvents(context.Background(), MutationAuditFilter{Limit: 10})
	if err != nil {
		t.Fatal(err)
	}
	if auditTotal != 1 || len(auditEvents) != 1 {
		t.Fatalf("expected one draft confirmation audit event, total=%d events=%#v", auditTotal, auditEvents)
	}
	event := auditEvents[0]
	if event.EventType != draftConfirmationRecordedEvent ||
		event.TargetObject != "DraftConfirmation" ||
		event.TargetID != "confirm_audit_alpha" {
		t.Fatalf("unexpected draft confirmation audit record: %#v", event)
	}
	payload := mutationAuditPayloadMap(t, event)
	if _, ok := payload["payload"]; ok {
		t.Fatalf("draft confirmation audit must not include full payload: %#v", payload)
	}
	audit := mutationAuditMap(t, event)
	if audit["who"] != "draft-auditor" ||
		audit["where"] != "POST /api/v1/contracts/confirm-draft" ||
		audit["target_object"] != "DraftConfirmation" ||
		audit["target_id"] != "confirm_audit_alpha" ||
		audit["action"] != "draft_confirmation.record" ||
		audit["reason"] != "scope regression" ||
		audit["trace_id"] != "trace_confirm_audit_alpha" ||
		audit["approval_ref"] != "approval_confirm_audit_alpha" {
		t.Fatalf("unexpected draft confirmation audit envelope: %#v", audit)
	}
	after, ok := audit["after"].(map[string]any)
	if !ok ||
		after["confirmation_id"] != "confirm_audit_alpha" ||
		after["payload_hash"] != response.ConfirmationRecord.PayloadHash ||
		after["draft_schema_version"] != "agent_scenario_draft.v1" ||
		after["decision"] != "approved" ||
		after["decision_reason"] != "scope regression" ||
		after["tenant_id"] != "tenant_audit" ||
		after["project_id"] != "project_audit" ||
		after["site_id"] != "site_audit" {
		t.Fatalf("draft confirmation audit should include compact after state, got %#v", audit["after"])
	}
}

func TestHTTPModelRunTenantProjectSiteScope(t *testing.T) {
	svc := testService(t)
	ctx := context.Background()
	if _, _, err := svc.CreateJob(ctx, scopedFixtureJobBytes(t, "job_scope_alpha", "tenant_a", "project_a", "site_a"), ""); err != nil {
		t.Fatal(err)
	}
	if _, _, err := svc.CreateJob(ctx, scopedFixtureJobBytes(t, "job_scope_beta", "tenant_b", "project_b", "site_b"), ""); err != nil {
		t.Fatal(err)
	}
	modelRun := func(modelRunID, jobID string) json.RawMessage {
		return mustJSON(map[string]any{
			"schema_version":   "model_run.v1",
			"model_run_id":     modelRunID,
			"job_id":           jobID,
			"model_key":        "material_balance",
			"model_version":    "material_balance.v1",
			"parameter_hash":   "sha256:" + strings.Repeat("a", 64),
			"input_hash":       "sha256:" + strings.Repeat("b", 64),
			"quality_metrics":  map[string]any{"convergence_status": "converged"},
			"warnings":         []any{},
			"evidence_refs":    []any{},
			"parameter_set_id": "default",
		})
	}
	if err := svc.store.InsertModelRuns(ctx, "job_scope_alpha", []json.RawMessage{modelRun("mr_scope_alpha", "job_scope_alpha")}, time.Now().UTC()); err != nil {
		t.Fatal(err)
	}
	if err := svc.store.InsertModelRuns(ctx, "job_scope_beta", []json.RawMessage{modelRun("mr_scope_beta", "job_scope_beta")}, time.Now().UTC()); err != nil {
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

	req := httptest.NewRequest(http.MethodGet, "/api/v1/model-runs/mr_scope_alpha", nil)
	req.Header.Set("Authorization", "Bearer tenant-a-token")
	rec := httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("tenant scoped model run get should pass: %d %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/model-runs/mr_scope_beta", nil)
	req.Header.Set("Authorization", "Bearer tenant-a-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("tenant scoped model run get should reject cross-scope job, got %d %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/model-runs?job_id=job_scope_alpha", nil)
	req.Header.Set("Authorization", "Bearer tenant-a-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("tenant scoped model run list by matching job should pass: %d %s", rec.Code, rec.Body.String())
	}
	var scopedList ListModelRunsResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &scopedList); err != nil {
		t.Fatal(err)
	}
	if scopedList.TotalEstimate != 1 || len(scopedList.Items) != 1 {
		t.Fatalf("tenant scoped model run list should include only matching job, got %#v", scopedList)
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/model-runs?job_id=job_scope_beta", nil)
	req.Header.Set("Authorization", "Bearer tenant-a-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("tenant scoped model run list should reject cross-scope job, got %d %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/model-runs", nil)
	req.Header.Set("Authorization", "Bearer tenant-a-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("tenant scoped model run list should require job_id to avoid cross-scope leakage, got %d %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/model-runs", nil)
	req.Header.Set("Authorization", "Bearer global-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("global model run list should pass: %d %s", rec.Code, rec.Body.String())
	}
	var globalList ListModelRunsResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &globalList); err != nil {
		t.Fatal(err)
	}
	if globalList.TotalEstimate != 2 || len(globalList.Items) != 2 {
		t.Fatalf("global token should see all model runs, got %#v", globalList)
	}
}

func TestHTTPBenchmarkRunTenantProjectSiteScope(t *testing.T) {
	svc := testService(t)
	ctx := context.Background()
	if _, _, err := svc.CreateJob(ctx, scopedFixtureJobBytes(t, "job_benchmark_scope_alpha", "tenant_a", "project_a", "site_a"), ""); err != nil {
		t.Fatal(err)
	}
	if _, _, err := svc.CreateJob(ctx, scopedFixtureJobBytes(t, "job_benchmark_scope_beta", "tenant_b", "project_b", "site_b"), ""); err != nil {
		t.Fatal(err)
	}
	benchmarkRun := func(benchmarkRunID, jobID string, executedAt time.Time) BenchmarkRunRecord {
		return BenchmarkRunRecord{
			BenchmarkRunID:  benchmarkRunID,
			SchemaVersion:   "benchmark_run.v1",
			ModelKey:        "material_balance",
			ModelVersion:    "material_balance.v1",
			BenchmarkCaseID: "bc_material_balance_minimal",
			ParameterSetID:  "ps_material_balance_default_v1",
			ModelRunID:      "mr_" + benchmarkRunID,
			JobID:           jobID,
			Status:          "passed",
			PayloadHash:     "sha256:" + strings.Repeat("a", 64),
			Payload:         mustJSON(map[string]any{"benchmark_run_id": benchmarkRunID, "job_id": jobID}),
			SourceSystem:    "test",
			RequestedBy:     "tester",
			Metadata:        mustJSON(map[string]any{}),
			ExecutedAt:      executedAt,
			CreatedAt:       executedAt,
		}
	}
	now := time.Now().UTC()
	if _, _, err := svc.store.UpsertBenchmarkRun(ctx, benchmarkRun("br_scope_alpha", "job_benchmark_scope_alpha", now.Add(-time.Minute)), nil); err != nil {
		t.Fatal(err)
	}
	if _, _, err := svc.store.UpsertBenchmarkRun(ctx, benchmarkRun("br_scope_beta", "job_benchmark_scope_beta", now), nil); err != nil {
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
	listPath := "/api/v1/model-catalog/material_balance/versions/material_balance.v1/benchmark-runs"

	req := httptest.NewRequest(http.MethodGet, "/api/v1/benchmark-runs/br_scope_alpha", nil)
	req.Header.Set("Authorization", "Bearer tenant-a-token")
	rec := httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("tenant scoped benchmark_run get should pass: %d %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/benchmark-runs/br_scope_beta", nil)
	req.Header.Set("Authorization", "Bearer tenant-a-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("tenant scoped benchmark_run get should reject cross-scope job, got %d %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, listPath+"?job_id=job_benchmark_scope_alpha", nil)
	req.Header.Set("Authorization", "Bearer tenant-a-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("tenant scoped benchmark_run list by matching job should pass: %d %s", rec.Code, rec.Body.String())
	}
	var scopedList ListBenchmarkRunsResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &scopedList); err != nil {
		t.Fatal(err)
	}
	if scopedList.TotalEstimate != 1 || len(scopedList.Items) != 1 || scopedList.Items[0].BenchmarkRunID != "br_scope_alpha" {
		t.Fatalf("tenant scoped benchmark_run list should include only matching job, got %#v", scopedList)
	}

	req = httptest.NewRequest(http.MethodGet, listPath+"?job_id=job_benchmark_scope_beta", nil)
	req.Header.Set("Authorization", "Bearer tenant-a-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("tenant scoped benchmark_run list should reject cross-scope job, got %d %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, listPath, nil)
	req.Header.Set("Authorization", "Bearer tenant-a-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("tenant scoped benchmark_run list should require job_id to avoid cross-scope leakage, got %d %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, listPath, nil)
	req.Header.Set("Authorization", "Bearer global-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("global benchmark_run list should pass: %d %s", rec.Code, rec.Body.String())
	}
	var globalList ListBenchmarkRunsResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &globalList); err != nil {
		t.Fatal(err)
	}
	if globalList.TotalEstimate != 2 || len(globalList.Items) != 2 {
		t.Fatalf("global token should see all benchmark runs, got %#v", globalList)
	}
}

func TestHTTPBenchmarkRunMutationTenantProjectSiteScope(t *testing.T) {
	svc := testValidatedService(t)
	ctx := context.Background()
	defaultParameterHash := builtInModelCatalog("2026-05-30T00:00:00Z").Models[0].Versions[0].DefaultParameterSet.ParameterHash
	completeJob := func(jobID, workerID, modelRunID, tenantID, projectID, siteID string) {
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
		modelRun := map[string]any{
			"schema_version":  "model_run.v1",
			"model_run_id":    modelRunID,
			"job_id":          jobID,
			"model_key":       "material_balance",
			"model_version":   "material_balance.v1",
			"parameter_hash":  defaultParameterHash,
			"input_hash":      "sha256:" + strings.Repeat("c", 64),
			"quality_metrics": map[string]any{"convergence_status": "converged"},
			"warnings":        []any{},
			"evidence_refs":   []any{},
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
			"runtime_audit":  map[string]any{"model_runs": []any{modelRun}, "timings_ms": map[string]any{}, "fallback_used": false},
		}
		if _, err := svc.Complete(ctx, workerID, jobID, 1, result); err != nil {
			t.Fatal(err)
		}
	}
	completeJob("job_benchmark_mutation_alpha", "worker_benchmark_mutation_alpha", "mr_benchmark_mutation_alpha", "tenant_a", "project_a", "site_a")
	completeJob("job_benchmark_mutation_beta", "worker_benchmark_mutation_beta", "mr_benchmark_mutation_beta", "tenant_b", "project_b", "site_b")

	auth, err := NewAuthenticator(`{"tokens":[
		{"name":"scope-a","token":"scope-a-token","scopes":["model:write"],"tenant_id":"tenant_a","project_id":"project_a","site_id":"site_a"},
		{"name":"global","token":"global-token","scopes":["model:write"]}
	]}`)
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()
	benchmarkRunBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance.benchmark_run.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	benchmarkRunBody := func(benchmarkRunID, jobID, modelRunID string) []byte {
		t.Helper()
		benchmarkRun := decodeMap(t, benchmarkRunBytes)
		benchmarkRun["benchmark_run_id"] = benchmarkRunID
		benchmarkRun["job_id"] = jobID
		benchmarkRun["model_run_id"] = modelRunID
		benchmarkRun["evidence_refs"] = []any{"model_run:" + modelRunID}
		benchmarkRun["executed_at"] = "2026-06-07T00:00:00Z"
		return encodeMap(t, benchmarkRun)
	}
	postBenchmarkRun := func(body []byte, token string) *httptest.ResponseRecorder {
		t.Helper()
		req := httptest.NewRequest(http.MethodPost, "/api/v1/model-catalog/material_balance/versions/material_balance.v1/benchmark-runs", bytes.NewReader(body))
		req.Header.Set("Authorization", "Bearer "+token)
		rec := httptest.NewRecorder()
		server.ServeHTTP(rec, req)
		return rec
	}

	rec := postBenchmarkRun(benchmarkRunBody("br_benchmark_mutation_alpha", "job_benchmark_mutation_alpha", "mr_benchmark_mutation_alpha"), "scope-a-token")
	if rec.Code != http.StatusCreated {
		t.Fatalf("scope-matching benchmark_run registration should pass, got %d %s", rec.Code, rec.Body.String())
	}
	var record BenchmarkRunRecord
	if err := json.Unmarshal(rec.Body.Bytes(), &record); err != nil {
		t.Fatal(err)
	}
	if record.BenchmarkRunID != "br_benchmark_mutation_alpha" || record.JobID != "job_benchmark_mutation_alpha" {
		t.Fatalf("unexpected scoped benchmark_run record: %#v", record)
	}

	rec = postBenchmarkRun(benchmarkRunBody("br_benchmark_mutation_beta_denied", "job_benchmark_mutation_beta", "mr_benchmark_mutation_beta"), "scope-a-token")
	if rec.Code != http.StatusForbidden {
		t.Fatalf("cross-scope benchmark_run registration should be denied, got %d %s", rec.Code, rec.Body.String())
	}
	if _, err := svc.GetBenchmarkRun(ctx, "br_benchmark_mutation_beta_denied"); err == nil {
		t.Fatalf("cross-scope denied benchmark_run registration must not write a record")
	}
	auditEvents, _, auditTotal, err := svc.store.ListMutationAuditEvents(ctx, MutationAuditFilter{TargetObject: "BenchmarkRun", Limit: 10})
	if err != nil {
		t.Fatal(err)
	}
	if auditTotal != 1 || len(auditEvents) != 1 || auditEvents[0].TargetID != "br_benchmark_mutation_alpha" {
		t.Fatalf("cross-scope denied benchmark_run registration must not write audit events, total=%d events=%#v", auditTotal, auditEvents)
	}
}

func TestHTTPArtifactDownloadTenantProjectSiteScope(t *testing.T) {
	svc := testService(t)
	ctx := context.Background()
	if _, _, err := svc.CreateJob(ctx, scopedFixtureJobBytes(t, "job_artifact_scope_beta", "tenant_b", "project_b", "site_b"), ""); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.RegisterWorker(ctx, compatibleWorkerRegistration("worker_artifact_scope")); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Claim(ctx, "worker_artifact_scope"); err != nil {
		t.Fatal(err)
	}
	artifactBytes := []byte(`{"scope":"tenant_b"}`)
	artifact := uploadTestArtifact(t, svc, ctx, "worker_artifact_scope", "job_artifact_scope_beta", "art_scope_beta", artifactBytes, "")
	auth, err := NewAuthenticator(`{"tokens":[
		{"name":"tenant-b-wrong-site-artifact-reader","token":"wrong-site-artifact-token","scopes":["artifact:read"],"tenant_id":"tenant_b","project_id":"project_b","site_id":"site_a"},
		{"name":"tenant-b-artifact-reader","token":"tenant-b-artifact-token","scopes":["artifact:read"],"tenant_id":"tenant_b","project_id":"project_b","site_id":"site_b"}
	]}`)
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()

	req := httptest.NewRequest(http.MethodGet, "/api/v1/artifacts/"+artifact.ArtifactID, nil)
	req.Header.Set("Authorization", "Bearer wrong-site-artifact-token")
	rec := httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("cross-site artifact download should be denied, got %d %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/artifacts/"+artifact.ArtifactID, nil)
	req.Header.Set("Authorization", "Bearer tenant-b-artifact-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK || rec.Body.String() != string(artifactBytes) {
		t.Fatalf("matching artifact download should pass, got %d %s", rec.Code, rec.Body.String())
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

func TestModelCatalogEndpoint(t *testing.T) {
	svc := testValidatedService(t)
	auth, err := NewAuthenticator("")
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()

	catalog, err := svc.ModelCatalog(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if catalog.SchemaVersion != "model_catalog.v1" || len(catalog.Models) != 5 {
		t.Fatalf("unexpected model catalog: %#v", catalog)
	}
	modelsByKey := map[string]ModelCatalogModel{}
	for _, model := range catalog.Models {
		modelsByKey[model.ModelKey] = model
	}
	materialModel, ok := modelsByKey["material_balance"]
	if !ok {
		t.Fatalf("expected material_balance catalog entry, got %#v", catalog.Models)
	}
	if materialModel.Versions[0].DefaultParameterSet == nil ||
		materialModel.Versions[0].DefaultParameterSet.Status != "approved" {
		t.Fatalf("expected approved default parameter set: %#v", materialModel.Versions[0])
	}
	if len(materialModel.Versions[0].BenchmarkCases) != 1 ||
		materialModel.Versions[0].BenchmarkCases[0].Status != "validated" {
		t.Fatalf("expected validated benchmark case: %#v", materialModel.Versions[0].BenchmarkCases)
	}
	for _, modelKey := range []string{"asm1slim", "asm1", "asm3", "udm"} {
		model, ok := modelsByKey[modelKey]
		if !ok {
			t.Fatalf("expected %s catalog entry, got %#v", modelKey, catalog.Models)
		}
		if len(model.Versions) != 1 || model.Versions[0].Status != "active" {
			t.Fatalf("expected active %s model version, got %#v", modelKey, model.Versions)
		}
		if model.Versions[0].DefaultParameterSet != nil {
			t.Fatalf("ASM/UDM built-in catalog entries should not define default parameter sets yet: %#v", model.Versions[0])
		}
		if len(model.Versions[0].BenchmarkCases) != 1 || model.Versions[0].BenchmarkCases[0].Status != "validated" {
			t.Fatalf("expected validated %s benchmark case, got %#v", modelKey, model.Versions[0].BenchmarkCases)
		}
	}

	req := httptest.NewRequest(http.MethodGet, "/api/v1/model-catalog", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec := httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("model catalog endpoint failed: %d %s", rec.Code, rec.Body.String())
	}
	var response ModelCatalogResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatal(err)
	}
	if response.SchemaVersion != "model_catalog.v1" || len(response.Models) != 5 {
		t.Fatalf("unexpected model catalog response: %#v", response)
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/model-catalog/asm1", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("built-in asm1 model catalog by key failed: %d %s", rec.Code, rec.Body.String())
	}
	var builtinModel ModelCatalogModel
	if err := json.Unmarshal(rec.Body.Bytes(), &builtinModel); err != nil {
		t.Fatal(err)
	}
	if builtinModel.ModelKey != "asm1" || len(builtinModel.Versions) != 1 {
		t.Fatalf("unexpected built-in asm1 model response: %#v", builtinModel)
	}

	catalogBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance.model_catalog.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/model-catalog", bytes.NewReader(catalogBytes))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("model catalog registration failed: %d %s", rec.Code, rec.Body.String())
	}
	var record ModelCatalogRecord
	if err := json.Unmarshal(rec.Body.Bytes(), &record); err != nil {
		t.Fatal(err)
	}
	if record.CatalogID != "default" || record.SchemaVersion != "model_catalog.v1" || record.PayloadHash == "" {
		t.Fatalf("unexpected model catalog record: %#v", record)
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/model-catalog", bytes.NewReader(catalogBytes))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("duplicate model catalog registration should be idempotent, got %d %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/model-catalog", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("persisted model catalog endpoint failed: %d %s", rec.Code, rec.Body.String())
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatal(err)
	}
	if response.GeneratedAt != "2026-05-30T00:00:00Z" ||
		response.Models[0].Versions[0].DefaultParameterSet == nil ||
		response.Models[0].Versions[0].DefaultParameterSet.ParameterHash != "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" {
		t.Fatalf("expected persisted model catalog response, got %#v", response)
	}

	transitionBody := `{"parameter_set_id":"ps_material_balance_default_v1","from_status":"approved","to_status":"retired","reason":"regression test"}`
	req = httptest.NewRequest(http.MethodPost, "/api/v1/model-catalog/material_balance/versions/material_balance.v1/default-parameter-set/status", strings.NewReader(transitionBody))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("parameter set status transition failed: %d %s", rec.Code, rec.Body.String())
	}
	var transition ModelParameterSetTransitionResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &transition); err != nil {
		t.Fatal(err)
	}
	if !transition.CreatedSnapshot || transition.FromStatus != "approved" || transition.ToStatus != "retired" ||
		transition.Catalog.Models[0].Versions[0].DefaultParameterSet.Status != "retired" {
		t.Fatalf("unexpected parameter set transition response: %#v", transition)
	}
	req = httptest.NewRequest(http.MethodGet, "/api/v1/model-catalog/snapshots?limit=1", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("model catalog snapshot list failed: %d %s", rec.Code, rec.Body.String())
	}
	var snapshotList ListModelCatalogSnapshotsResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &snapshotList); err != nil {
		t.Fatal(err)
	}
	if snapshotList.TotalEstimate != 2 || len(snapshotList.Items) != 1 || snapshotList.NextCursor == "" {
		t.Fatalf("expected first page of two catalog snapshots, got %#v", snapshotList)
	}
	if snapshotList.Items[0].PayloadHash != transition.CatalogPayloadHash {
		t.Fatalf("newest snapshot should be the transition snapshot, got %#v", snapshotList.Items[0])
	}
	req = httptest.NewRequest(http.MethodGet, "/api/v1/model-catalog/snapshots?cursor="+url.QueryEscape(snapshotList.NextCursor), nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("model catalog snapshot second page failed: %d %s", rec.Code, rec.Body.String())
	}
	snapshotList = ListModelCatalogSnapshotsResponse{}
	if err := json.Unmarshal(rec.Body.Bytes(), &snapshotList); err != nil {
		t.Fatal(err)
	}
	if snapshotList.TotalEstimate != 2 || len(snapshotList.Items) != 1 || snapshotList.NextCursor != "" {
		t.Fatalf("expected second page of catalog snapshots, got %#v", snapshotList)
	}

	auditEvents, _, auditTotal, err := svc.store.ListMutationAuditEvents(context.Background(), MutationAuditFilter{Limit: 10})
	if err != nil {
		t.Fatal(err)
	}
	if auditTotal != 2 || len(auditEvents) != 2 {
		t.Fatalf("expected catalog register and status mutation audit events only, total=%d events=%#v", auditTotal, auditEvents)
	}
	auditByType := map[string]MutationAuditRecord{}
	for _, event := range auditEvents {
		auditByType[event.EventType] = event
	}
	catalogAudit := mutationAuditMap(t, auditByType[modelCatalogRegisteredEvent])
	if catalogAudit["who"] != "dev-public" ||
		catalogAudit["where"] != "POST /api/v1/model-catalog" ||
		catalogAudit["target_object"] != "ModelCatalog" ||
		catalogAudit["target_id"] != "default" ||
		catalogAudit["action"] != "model.catalog.register" {
		t.Fatalf("unexpected model catalog audit envelope: %#v", catalogAudit)
	}
	catalogAfter, ok := catalogAudit["after"].(map[string]any)
	if !ok || catalogAfter["payload_hash"] != record.PayloadHash {
		t.Fatalf("catalog audit should include compact after hash, got %#v", catalogAudit["after"])
	}
	statusAudit := mutationAuditMap(t, auditByType[modelParameterSetStatusChangedEvent])
	if statusAudit["who"] != "dev-public" ||
		statusAudit["where"] != "POST /api/v1/model-catalog/material_balance/versions/material_balance.v1/default-parameter-set/status" ||
		statusAudit["target_object"] != "ModelParameterSet" ||
		statusAudit["target_id"] != "material_balance:material_balance.v1:ps_material_balance_default_v1" ||
		statusAudit["action"] != "model.parameter_set.status_update" ||
		statusAudit["reason"] != "regression test" {
		t.Fatalf("unexpected parameter set status audit envelope: %#v", statusAudit)
	}
	statusBefore, ok := statusAudit["before"].(map[string]any)
	if !ok || statusBefore["status"] != "approved" {
		t.Fatalf("status audit should include approved before state, got %#v", statusAudit["before"])
	}
	statusAfter, ok := statusAudit["after"].(map[string]any)
	if !ok || statusAfter["status"] != "retired" || statusAfter["catalog_payload_hash"] != transition.CatalogPayloadHash {
		t.Fatalf("status audit should include retired after state, got %#v", statusAudit["after"])
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/model-catalog/material_balance/versions/material_balance.v1/default-parameter-set/status", strings.NewReader(`{"from_status":"retired","to_status":"approved"}`))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusConflict {
		t.Fatalf("invalid parameter set transition should conflict, got %d %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/model-catalog/material_balance/versions/material_balance.v1/default-parameter-set/status", strings.NewReader(`{"to_status":"retired"}`))
	req.Header.Set("Authorization", "Bearer dev-worker-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("worker token should not update parameter set status, got %d %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/model-catalog/material_balance", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("model catalog by key failed: %d %s", rec.Code, rec.Body.String())
	}
	var model ModelCatalogModel
	if err := json.Unmarshal(rec.Body.Bytes(), &model); err != nil {
		t.Fatal(err)
	}
	if model.ModelKey != "material_balance" {
		t.Fatalf("unexpected model response: %#v", model)
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/model-catalog/asm1", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("missing model should return 404, got %d %s", rec.Code, rec.Body.String())
	}
	req = httptest.NewRequest(http.MethodGet, "/api/v1/model-catalog", nil)
	req.Header.Set("Authorization", "Bearer dev-worker-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("worker token should not read model catalog, got %d %s", rec.Code, rec.Body.String())
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/model-catalog", bytes.NewReader(catalogBytes))
	req.Header.Set("Authorization", "Bearer dev-worker-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("worker token should not write model catalog, got %d %s", rec.Code, rec.Body.String())
	}
}

func TestHTTPModelCatalogTenantProjectSiteScope(t *testing.T) {
	svc := testValidatedService(t)
	auth, err := NewAuthenticator(`{"tokens":[
		{"name":"scope-a","token":"scope-a-token","scopes":["job:read"],"tenant_id":"tenant_a","project_id":"project_a","site_id":"site_a"},
		{"name":"global","token":"global-token","scopes":["job:read","model:write"]}
	]}`)
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()

	postCatalog := func(body []byte) ModelCatalogRecord {
		t.Helper()
		req := httptest.NewRequest(http.MethodPost, "/api/v1/model-catalog", bytes.NewReader(body))
		req.Header.Set("Authorization", "Bearer global-token")
		rec := httptest.NewRecorder()
		server.ServeHTTP(rec, req)
		if rec.Code != http.StatusCreated {
			t.Fatalf("model catalog registration failed: %d %s", rec.Code, rec.Body.String())
		}
		var record ModelCatalogRecord
		if err := json.Unmarshal(rec.Body.Bytes(), &record); err != nil {
			t.Fatal(err)
		}
		return record
	}
	request := func(method, path, token string) *httptest.ResponseRecorder {
		t.Helper()
		req := httptest.NewRequest(method, path, nil)
		req.Header.Set("Authorization", "Bearer "+token)
		rec := httptest.NewRecorder()
		server.ServeHTTP(rec, req)
		return rec
	}

	alpha := postCatalog(scopedModelCatalogBytes(t, "2026-05-30T00:00:00Z", "tenant_a", "project_a", "site_a"))
	if alpha.TenantID != "tenant_a" || alpha.ProjectID != "project_a" || alpha.SiteID != "site_a" {
		t.Fatalf("model catalog should persist tenant/project/site metadata, got %#v", alpha)
	}
	postCatalog(scopedModelCatalogBytes(t, "2026-05-30T00:01:00Z", "tenant_a", "project_a", "site_b"))
	postCatalog(scopedModelCatalogBytes(t, "2026-05-30T00:02:00Z", "tenant_b", "project_b", "site_b"))

	rec := request(http.MethodGet, "/api/v1/model-catalog", "scope-a-token")
	if rec.Code != http.StatusOK {
		t.Fatalf("scope-matching model catalog read should pass: %d %s", rec.Code, rec.Body.String())
	}
	var catalog ModelCatalogResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &catalog); err != nil {
		t.Fatal(err)
	}
	if catalog.Metadata["tenant_id"] != "tenant_a" ||
		catalog.Metadata["project_id"] != "project_a" ||
		catalog.Metadata["site_id"] != "site_a" {
		t.Fatalf("scoped catalog read should use the matching persisted snapshot, got %#v", catalog.Metadata)
	}

	rec = request(http.MethodGet, "/api/v1/model-catalog", "global-token")
	if rec.Code != http.StatusOK {
		t.Fatalf("global model catalog read should pass: %d %s", rec.Code, rec.Body.String())
	}
	catalog = ModelCatalogResponse{}
	if err := json.Unmarshal(rec.Body.Bytes(), &catalog); err != nil {
		t.Fatal(err)
	}
	if catalog.Metadata["site_id"] != "site_b" || catalog.Metadata["tenant_id"] != "tenant_b" {
		t.Fatalf("global catalog read should still see the latest persisted snapshot, got %#v", catalog.Metadata)
	}

	rec = request(http.MethodGet, "/api/v1/model-catalog/snapshots", "scope-a-token")
	if rec.Code != http.StatusOK {
		t.Fatalf("scope-matching model catalog snapshot list should pass: %d %s", rec.Code, rec.Body.String())
	}
	var snapshots ListModelCatalogSnapshotsResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &snapshots); err != nil {
		t.Fatal(err)
	}
	if snapshots.TotalEstimate != 1 ||
		len(snapshots.Items) != 1 ||
		snapshots.Items[0].TenantID != "tenant_a" ||
		snapshots.Items[0].ProjectID != "project_a" ||
		snapshots.Items[0].SiteID != "site_a" {
		t.Fatalf("scoped snapshot list should not expose cross-scope records, got %#v", snapshots)
	}

	rec = request(http.MethodGet, "/api/v1/model-catalog/material_balance", "scope-a-token")
	if rec.Code != http.StatusOK {
		t.Fatalf("scope-matching model catalog model read should pass: %d %s", rec.Code, rec.Body.String())
	}
	var model ModelCatalogModel
	if err := json.Unmarshal(rec.Body.Bytes(), &model); err != nil {
		t.Fatal(err)
	}
	if model.ModelKey != "material_balance" {
		t.Fatalf("unexpected scoped model catalog entry: %#v", model)
	}

	rec = request(http.MethodGet, "/api/v1/model-catalog/material_balance/versions/material_balance.v1/default-parameter-set/promotion-plan", "scope-a-token")
	if rec.Code != http.StatusForbidden {
		t.Fatalf("scoped promotion plan without job_id should be denied, got %d %s", rec.Code, rec.Body.String())
	}
}

func TestHTTPModelCatalogMutationTenantProjectSiteScope(t *testing.T) {
	svc := testValidatedService(t)
	auth, err := NewAuthenticator(`{"tokens":[
		{"name":"scope-a","token":"scope-a-token","scopes":["job:read","model:write"],"tenant_id":"tenant_a","project_id":"project_a","site_id":"site_a"},
		{"name":"scope-miss","token":"scope-miss-token","scopes":["model:write"],"tenant_id":"tenant_x","project_id":"project_x","site_id":"site_x"},
		{"name":"global","token":"global-token","scopes":["job:read","model:write"]}
	]}`)
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()
	ctx := context.Background()

	postCatalog := func(body []byte, token string, expectedStatus int) ModelCatalogRecord {
		t.Helper()
		req := httptest.NewRequest(http.MethodPost, "/api/v1/model-catalog", bytes.NewReader(body))
		req.Header.Set("Authorization", "Bearer "+token)
		rec := httptest.NewRecorder()
		server.ServeHTTP(rec, req)
		if rec.Code != expectedStatus {
			t.Fatalf("model catalog registration with %s got %d want %d: %s", token, rec.Code, expectedStatus, rec.Body.String())
		}
		if expectedStatus != http.StatusCreated && expectedStatus != http.StatusOK {
			return ModelCatalogRecord{}
		}
		var record ModelCatalogRecord
		if err := json.Unmarshal(rec.Body.Bytes(), &record); err != nil {
			t.Fatal(err)
		}
		return record
	}
	request := func(method, path, token, body string) *httptest.ResponseRecorder {
		t.Helper()
		req := httptest.NewRequest(method, path, strings.NewReader(body))
		req.Header.Set("Authorization", "Bearer "+token)
		rec := httptest.NewRecorder()
		server.ServeHTTP(rec, req)
		return rec
	}

	alpha := postCatalog(scopedModelCatalogBytes(t, "2026-05-30T00:00:00Z", "tenant_a", "project_a", "site_a"), "scope-a-token", http.StatusCreated)
	if alpha.TenantID != "tenant_a" || alpha.ProjectID != "project_a" || alpha.SiteID != "site_a" {
		t.Fatalf("scope-matching catalog should persist tenant/project/site metadata, got %#v", alpha)
	}
	siteBBytes := scopedModelCatalogBytes(t, "2026-05-30T00:01:00Z", "tenant_a", "project_a", "site_b")
	postCatalog(siteBBytes, "scope-a-token", http.StatusForbidden)
	snapshots, err := svc.ListModelCatalogSnapshots(ctx, ModelCatalogSnapshotFilter{CatalogID: "default", Limit: 10})
	if err != nil {
		t.Fatal(err)
	}
	if snapshots.TotalEstimate != 1 || len(snapshots.Items) != 1 || snapshots.Items[0].SiteID != "site_a" {
		t.Fatalf("cross-scope denied registration must not write a snapshot, got %#v", snapshots)
	}
	postCatalog(siteBBytes, "global-token", http.StatusCreated)

	statusPath := "/api/v1/model-catalog/material_balance/versions/material_balance.v1/default-parameter-set/status"
	statusBody := `{"parameter_set_id":"ps_material_balance_default_v1","from_status":"approved","to_status":"retired","reason":"scope regression"}`
	rec := request(http.MethodPost, statusPath, "scope-miss-token", statusBody)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("scoped status mutation without matching persisted catalog should be denied, got %d %s", rec.Code, rec.Body.String())
	}
	rec = request(http.MethodPost, statusPath, "scope-a-token", statusBody)
	if rec.Code != http.StatusCreated {
		t.Fatalf("scope-matching status mutation should pass, got %d %s", rec.Code, rec.Body.String())
	}
	var transition ModelParameterSetTransitionResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &transition); err != nil {
		t.Fatal(err)
	}
	if !transition.CreatedSnapshot || transition.FromStatus != "approved" || transition.ToStatus != "retired" {
		t.Fatalf("unexpected scoped status transition: %#v", transition)
	}
	if transition.Catalog.Metadata["tenant_id"] != "tenant_a" ||
		transition.Catalog.Metadata["project_id"] != "project_a" ||
		transition.Catalog.Metadata["site_id"] != "site_a" ||
		transition.Catalog.Models[0].Versions[0].DefaultParameterSet.Status != "retired" {
		t.Fatalf("scoped status mutation should use the matching persisted catalog, got metadata=%#v parameter_set=%#v", transition.Catalog.Metadata, transition.Catalog.Models[0].Versions[0].DefaultParameterSet)
	}

	promotionPath := "/api/v1/model-catalog/material_balance/versions/material_balance.v1/default-parameter-set/promote-approved"
	rec = request(http.MethodPost, promotionPath, "scope-a-token", `{}`)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("scoped promote-approved without job_id should be denied, got %d %s", rec.Code, rec.Body.String())
	}
}

func TestHTTPModelCatalogPromotionTenantProjectSiteScope(t *testing.T) {
	svc := testValidatedService(t)
	auth, err := NewAuthenticator(`{"tokens":[
		{"name":"scope-a","token":"scope-a-token","scopes":["job:read","model:write"],"tenant_id":"tenant_a","project_id":"project_a","site_id":"site_a"},
		{"name":"global","token":"global-token","scopes":["job:create","job:read","model:write"]}
	]}`)
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()
	ctx := context.Background()
	promotionPlanPath := "/api/v1/model-catalog/material_balance/versions/material_balance.v1/default-parameter-set/promotion-plan"
	promotionPath := "/api/v1/model-catalog/material_balance/versions/material_balance.v1/default-parameter-set/promote-approved"
	request := func(method, path, token, body string) *httptest.ResponseRecorder {
		t.Helper()
		req := httptest.NewRequest(method, path, strings.NewReader(body))
		req.Header.Set("Authorization", "Bearer "+token)
		rec := httptest.NewRecorder()
		server.ServeHTTP(rec, req)
		return rec
	}
	postCatalog := func(body []byte, token string, expectedStatus int) ModelCatalogRecord {
		t.Helper()
		rec := request(http.MethodPost, "/api/v1/model-catalog", token, string(body))
		if rec.Code != expectedStatus {
			t.Fatalf("catalog registration with %s got %d want %d: %s", token, rec.Code, expectedStatus, rec.Body.String())
		}
		var record ModelCatalogRecord
		if err := json.Unmarshal(rec.Body.Bytes(), &record); err != nil {
			t.Fatal(err)
		}
		return record
	}

	catalogBytes := scopedModelCatalogBytesWithDefaultParameterSetStatus(t, "2026-05-30T00:00:00Z", "tenant_a", "project_a", "site_a", "validated")
	alphaCatalog := postCatalog(catalogBytes, "scope-a-token", http.StatusCreated)
	if alphaCatalog.TenantID != "tenant_a" || alphaCatalog.ProjectID != "project_a" || alphaCatalog.SiteID != "site_a" {
		t.Fatalf("scope-matching catalog should persist tenant/project/site metadata, got %#v", alphaCatalog)
	}
	catalog := decodeMap(t, catalogBytes)
	models := catalog["models"].([]any)
	version := models[0].(map[string]any)["versions"].([]any)[0].(map[string]any)
	parameterSet := version["default_parameter_set"].(map[string]any)
	parameterHash := parameterSet["parameter_hash"].(string)

	if _, _, err := svc.CreateJob(ctx, scopedFixtureJobBytes(t, "job_promotion_scope_alpha", "tenant_a", "project_a", "site_a"), ""); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.RegisterWorker(ctx, compatibleWorkerRegistration("worker_promotion_scope_alpha")); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Claim(ctx, "worker_promotion_scope_alpha"); err != nil {
		t.Fatal(err)
	}
	modelRun := map[string]any{
		"schema_version":  "model_run.v1",
		"model_run_id":    "mr_promotion_scope_alpha",
		"job_id":          "job_promotion_scope_alpha",
		"model_key":       "material_balance",
		"model_version":   "material_balance.v1",
		"parameter_hash":  parameterHash,
		"input_hash":      "sha256:" + strings.Repeat("c", 64),
		"quality_metrics": map[string]any{"convergence_status": "converged"},
		"warnings":        []any{},
		"evidence_refs":   []any{},
	}
	result := map[string]any{
		"schema_version": "compute_result.v1",
		"job_id":         "job_promotion_scope_alpha",
		"job_type":       "simulation.material_balance.v1",
		"status":         StatusSucceeded,
		"summary":        map[string]any{"converged": true},
		"data":           map[string]any{},
		"quality":        map[string]any{"data_quality": "ok", "warnings": []any{}},
		"artifacts":      []any{},
		"runtime_audit":  map[string]any{"model_runs": []any{modelRun}, "timings_ms": map[string]any{}, "fallback_used": false},
	}
	if _, err := svc.Complete(ctx, "worker_promotion_scope_alpha", "job_promotion_scope_alpha", 1, result); err != nil {
		t.Fatal(err)
	}
	if _, _, err := svc.CreateJob(ctx, scopedFixtureJobBytes(t, "job_promotion_scope_beta", "tenant_b", "project_b", "site_b"), ""); err != nil {
		t.Fatal(err)
	}

	benchmarkRunBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance.benchmark_run.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	benchmarkRun := decodeMap(t, benchmarkRunBytes)
	benchmarkRun["benchmark_run_id"] = "br_promotion_scope_alpha"
	benchmarkRun["model_run_id"] = "mr_promotion_scope_alpha"
	benchmarkRun["job_id"] = "job_promotion_scope_alpha"
	benchmarkRun["evidence_refs"] = []any{"model_run:mr_promotion_scope_alpha"}
	benchmarkRun["executed_at"] = "2026-05-31T00:00:00Z"
	rec := request(http.MethodPost, "/api/v1/model-catalog/material_balance/versions/material_balance.v1/benchmark-runs", "scope-a-token", string(encodeMap(t, benchmarkRun)))
	if rec.Code != http.StatusCreated {
		t.Fatalf("scope-matching benchmark_run registration should pass, got %d %s", rec.Code, rec.Body.String())
	}

	rec = request(http.MethodGet, promotionPlanPath, "scope-a-token", "")
	if rec.Code != http.StatusForbidden {
		t.Fatalf("scoped promotion plan without job_id should be denied, got %d %s", rec.Code, rec.Body.String())
	}
	rec = request(http.MethodGet, promotionPlanPath+"?job_id=job_promotion_scope_beta", "scope-a-token", "")
	if rec.Code != http.StatusForbidden {
		t.Fatalf("scoped promotion plan with cross-scope job_id should be denied, got %d %s", rec.Code, rec.Body.String())
	}
	rec = request(http.MethodGet, promotionPlanPath+"?job_id=job_promotion_scope_alpha", "scope-a-token", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("scoped promotion plan with authorized job_id should pass, got %d %s", rec.Code, rec.Body.String())
	}
	var plan ModelParameterSetPromotionPlan
	if err := json.Unmarshal(rec.Body.Bytes(), &plan); err != nil {
		t.Fatal(err)
	}
	if !plan.CanPromoteToApproved || plan.BenchmarkCasesPassed != 1 || len(plan.CaseResults) != 1 ||
		plan.CaseResults[0].JobID != "job_promotion_scope_alpha" || !plan.CaseResults[0].Ready {
		t.Fatalf("expected scoped promotable plan from authorized job evidence only, got %#v", plan)
	}

	promotionBody := `{"parameter_set_id":"ps_material_balance_default_v1","reason":"scoped evidence promotion","metadata":{"release_ticket":"PROMO-SCOPE"}}`
	rec = request(http.MethodPost, promotionPath, "scope-a-token", promotionBody)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("scoped promote-approved without job_id should be denied, got %d %s", rec.Code, rec.Body.String())
	}
	rec = request(http.MethodPost, promotionPath+"?job_id=job_promotion_scope_beta", "scope-a-token", promotionBody)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("scoped promote-approved with cross-scope job_id should be denied, got %d %s", rec.Code, rec.Body.String())
	}
	rec = request(http.MethodPost, promotionPath+"?job_id=job_promotion_scope_alpha", "scope-a-token", promotionBody)
	if rec.Code != http.StatusCreated {
		t.Fatalf("scoped promote-approved with authorized job_id should pass, got %d %s", rec.Code, rec.Body.String())
	}
	var transition ModelParameterSetTransitionResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &transition); err != nil {
		t.Fatal(err)
	}
	if transition.FromStatus != "validated" || transition.ToStatus != "approved" ||
		transition.Catalog.Metadata["tenant_id"] != "tenant_a" ||
		transition.Catalog.Metadata["project_id"] != "project_a" ||
		transition.Catalog.Metadata["site_id"] != "site_a" ||
		transition.Catalog.Models[0].Versions[0].DefaultParameterSet.Status != "approved" {
		t.Fatalf("scoped promotion should update only matching persisted catalog, got %#v", transition)
	}
}

func TestDefaultParameterSetPromotionPlanEndpoint(t *testing.T) {
	svc := testValidatedService(t)
	auth, err := NewAuthenticator("")
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()
	catalogBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance.model_catalog.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	catalog := decodeMap(t, catalogBytes)
	models := catalog["models"].([]any)
	version := models[0].(map[string]any)["versions"].([]any)[0].(map[string]any)
	parameterSet := version["default_parameter_set"].(map[string]any)
	parameterSet["status"] = "validated"
	parameterHash := parameterSet["parameter_hash"].(string)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/model-catalog", bytes.NewReader(encodeMap(t, catalog)))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec := httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("model catalog registration failed: %d %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/model-catalog/material_balance/versions/material_balance.v1/default-parameter-set/promotion-plan", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("promotion plan before benchmark failed: %d %s", rec.Code, rec.Body.String())
	}
	var plan ModelParameterSetPromotionPlan
	if err := json.Unmarshal(rec.Body.Bytes(), &plan); err != nil {
		t.Fatal(err)
	}
	if plan.CanPromoteToApproved || plan.CurrentStatus != "validated" || plan.BenchmarkCasesChecked != 1 ||
		!containsString(plan.BlockingReasons, "benchmark_run_missing_for_parameter_set") {
		t.Fatalf("expected missing benchmark blocker, got %#v", plan)
	}

	ctx := context.Background()
	promotionPath := "/api/v1/model-catalog/material_balance/versions/material_balance.v1/default-parameter-set/promote-approved"
	promotionBody := `{"parameter_set_id":"ps_material_balance_default_v1","reason":"regression evidence gate","metadata":{"release_ticket":"PROMO-1"}}`
	req = httptest.NewRequest(http.MethodPost, promotionPath, strings.NewReader(promotionBody))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusConflict {
		t.Fatalf("promotion without benchmark evidence should conflict, got %d %s", rec.Code, rec.Body.String())
	}
	var appErr AppError
	if err := json.Unmarshal(rec.Body.Bytes(), &appErr); err != nil {
		t.Fatal(err)
	}
	blockingReasons, ok := appErr.Details["blocking_reasons"].([]any)
	if appErr.ErrorCode != CodeParameterSetTransitionFailed || !ok || len(blockingReasons) != 1 ||
		blockingReasons[0] != "benchmark_run_missing_for_parameter_set" {
		t.Fatalf("expected benchmark promotion blocker, got %#v", appErr)
	}
	blockedCatalog, err := svc.ModelCatalog(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if blockedCatalog.Models[0].Versions[0].DefaultParameterSet.Status != "validated" {
		t.Fatalf("blocked promotion should not mutate catalog: %#v", blockedCatalog.Models[0].Versions[0].DefaultParameterSet)
	}
	req = httptest.NewRequest(http.MethodPost, promotionPath, strings.NewReader(promotionBody))
	req.Header.Set("Authorization", "Bearer dev-worker-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("worker token should not promote parameter set, got %d %s", rec.Code, rec.Body.String())
	}

	if _, _, err := svc.CreateJob(ctx, fixtureJobBytes(t), ""); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.RegisterWorker(ctx, compatibleWorkerRegistration("worker_promotion")); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Claim(ctx, "worker_promotion"); err != nil {
		t.Fatal(err)
	}
	modelRun := map[string]any{
		"schema_version":  "model_run.v1",
		"model_run_id":    "mr_material_balance_promotion",
		"job_id":          "job_material_balance_minimal",
		"model_key":       "material_balance",
		"model_version":   "material_balance.v1",
		"parameter_hash":  parameterHash,
		"input_hash":      "sha256:" + strings.Repeat("c", 64),
		"quality_metrics": map[string]any{"convergence_status": "converged"},
		"warnings":        []any{},
		"evidence_refs":   []any{},
	}
	result := map[string]any{
		"schema_version": "compute_result.v1",
		"job_id":         "job_material_balance_minimal",
		"job_type":       "simulation.material_balance.v1",
		"status":         StatusSucceeded,
		"summary":        map[string]any{"converged": true},
		"data":           map[string]any{},
		"quality":        map[string]any{"data_quality": "ok", "warnings": []any{}},
		"artifacts":      []any{},
		"runtime_audit":  map[string]any{"model_runs": []any{modelRun}, "timings_ms": map[string]any{}, "fallback_used": false},
	}
	if _, err := svc.Complete(ctx, "worker_promotion", "job_material_balance_minimal", 1, result); err != nil {
		t.Fatal(err)
	}

	benchmarkRunBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance.benchmark_run.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	benchmarkRun := decodeMap(t, benchmarkRunBytes)
	benchmarkRun["benchmark_run_id"] = "br_material_balance_promotion"
	benchmarkRun["model_run_id"] = "mr_material_balance_promotion"
	benchmarkRun["job_id"] = "job_material_balance_minimal"
	benchmarkRun["evidence_refs"] = []any{"model_run:mr_material_balance_promotion"}
	benchmarkRun["executed_at"] = "2026-05-31T00:00:00Z"
	req = httptest.NewRequest(http.MethodPost, "/api/v1/model-catalog/material_balance/versions/material_balance.v1/benchmark-runs", bytes.NewReader(encodeMap(t, benchmarkRun)))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("benchmark run record failed: %d %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/model-catalog/material_balance/versions/material_balance.v1/default-parameter-set/promotion-plan", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("promotion plan after benchmark failed: %d %s", rec.Code, rec.Body.String())
	}
	plan = ModelParameterSetPromotionPlan{}
	if err := json.Unmarshal(rec.Body.Bytes(), &plan); err != nil {
		t.Fatal(err)
	}
	if !plan.CanPromoteToApproved || plan.WouldModifyCatalog || plan.BenchmarkCasesPassed != 1 ||
		len(plan.BlockingReasons) != 0 || len(plan.CaseResults) != 1 || !plan.CaseResults[0].Ready {
		t.Fatalf("expected promotable advisory plan without mutation, got %#v", plan)
	}

	req = httptest.NewRequest(http.MethodPost, promotionPath, strings.NewReader(promotionBody))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("benchmark-backed promotion failed: %d %s", rec.Code, rec.Body.String())
	}
	var transition ModelParameterSetTransitionResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &transition); err != nil {
		t.Fatal(err)
	}
	promotedParameterSet := transition.Catalog.Models[0].Versions[0].DefaultParameterSet
	if !transition.CreatedSnapshot || transition.FromStatus != "validated" || transition.ToStatus != "approved" ||
		transition.ParameterSetID != "ps_material_balance_default_v1" || promotedParameterSet == nil ||
		promotedParameterSet.Status != "approved" {
		t.Fatalf("unexpected benchmark-backed transition response: %#v", transition)
	}
	lastTransition, ok := promotedParameterSet.Metadata["last_status_transition"].(map[string]any)
	if !ok {
		t.Fatalf("expected last_status_transition metadata, got %#v", promotedParameterSet.Metadata)
	}
	transitionMetadata, ok := lastTransition["metadata"].(map[string]any)
	if !ok || transitionMetadata["release_ticket"] != "PROMO-1" ||
		transitionMetadata["promotion_source"] != "default_parameter_set_promotion_plan" ||
		transitionMetadata["benchmark_cases_checked"] != float64(1) ||
		transitionMetadata["benchmark_cases_passed"] != float64(1) {
		t.Fatalf("unexpected promotion transition metadata: %#v", lastTransition)
	}
	promotedCatalog, err := svc.ModelCatalog(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if promotedCatalog.Models[0].Versions[0].DefaultParameterSet.Status != "approved" {
		t.Fatalf("promotion should persist approved status: %#v", promotedCatalog.Models[0].Versions[0].DefaultParameterSet)
	}
	auditEvents, _, auditTotal, err := svc.store.ListMutationAuditEvents(ctx, MutationAuditFilter{Limit: 10})
	if err != nil {
		t.Fatal(err)
	}
	if auditTotal != 3 || len(auditEvents) != 3 {
		t.Fatalf("expected catalog register, benchmark run, and promotion audit events only, total=%d events=%#v", auditTotal, auditEvents)
	}
	auditByType := map[string]MutationAuditRecord{}
	for _, event := range auditEvents {
		auditByType[event.EventType] = event
	}
	benchmarkAudit := mutationAuditMap(t, auditByType[benchmarkRunRegisteredEvent])
	if benchmarkAudit["who"] != "dev-public" ||
		benchmarkAudit["where"] != "POST /api/v1/model-catalog/material_balance/versions/material_balance.v1/benchmark-runs" ||
		benchmarkAudit["target_object"] != "BenchmarkRun" ||
		benchmarkAudit["target_id"] != "br_material_balance_promotion" ||
		benchmarkAudit["action"] != "model.benchmark_run.register" {
		t.Fatalf("unexpected benchmark run audit envelope: %#v", benchmarkAudit)
	}
	benchmarkAfter, ok := benchmarkAudit["after"].(map[string]any)
	if !ok || benchmarkAfter["status"] != "passed" || benchmarkAfter["job_id"] != "job_material_balance_minimal" || benchmarkAfter["evidence_ref_count"] != float64(1) {
		t.Fatalf("benchmark run audit should include compact after state, got %#v", benchmarkAudit["after"])
	}
	promotionAudit := mutationAuditMap(t, auditByType[modelParameterSetPromotedApprovedEvent])
	if promotionAudit["who"] != "dev-public" ||
		promotionAudit["where"] != "POST "+promotionPath ||
		promotionAudit["target_object"] != "ModelParameterSet" ||
		promotionAudit["target_id"] != "material_balance:material_balance.v1:ps_material_balance_default_v1" ||
		promotionAudit["action"] != "model.parameter_set.promote_approved" ||
		promotionAudit["reason"] != "regression evidence gate" {
		t.Fatalf("unexpected parameter set promotion audit envelope: %#v", promotionAudit)
	}
	promotionBefore, ok := promotionAudit["before"].(map[string]any)
	if !ok || promotionBefore["status"] != "validated" {
		t.Fatalf("promotion audit should include validated before state, got %#v", promotionAudit["before"])
	}
	promotionAfter, ok := promotionAudit["after"].(map[string]any)
	if !ok || promotionAfter["status"] != "approved" || promotionAfter["created_snapshot"] != true || promotionAfter["catalog_payload_hash"] != transition.CatalogPayloadHash {
		t.Fatalf("promotion audit should include approved after state, got %#v", promotionAudit["after"])
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/model-catalog/material_balance/versions/material_balance.v1/default-parameter-set/promotion-plan", nil)
	req.Header.Set("Authorization", "Bearer dev-worker-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("worker token should not read promotion plan, got %d %s", rec.Code, rec.Body.String())
	}
}

func TestBenchmarkCaseScheduleRunEndpoint(t *testing.T) {
	svc := testValidatedService(t)
	auth, err := NewAuthenticator("")
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()

	inputBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance_minimal.simulation_input.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	req := httptest.NewRequest(http.MethodPost, "/api/v1/simulation-inputs", bytes.NewReader(inputBytes))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec := httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("simulation input register failed: %d %s", rec.Code, rec.Body.String())
	}

	requestBody := `{"request_id":"bench_req_material_balance_minimal","metadata":{"project_id":"project_benchmark"}}`
	path := "/api/v1/model-catalog/material_balance/versions/material_balance.v1/benchmark-cases/bc_material_balance_minimal_v1/schedule-run"
	req = httptest.NewRequest(http.MethodPost, path, strings.NewReader(requestBody))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusAccepted {
		t.Fatalf("benchmark case schedule-run failed: %d %s", rec.Code, rec.Body.String())
	}
	var snapshot JobSnapshot
	if err := json.Unmarshal(rec.Body.Bytes(), &snapshot); err != nil {
		t.Fatal(err)
	}
	if snapshot.Job.Status != StatusQueued ||
		snapshot.Job.JobID != "job_benchmark_bench_req_material_balance_minimal" ||
		snapshot.Job.JobType != "simulation.material_balance.v1" ||
		snapshot.Job.RequestID != "bench_req_material_balance_minimal" ||
		snapshot.Job.ProjectID != "project_benchmark" {
		t.Fatalf("unexpected scheduled benchmark job: %#v", snapshot.Job)
	}
	var jobPayload map[string]any
	if err := json.Unmarshal(snapshot.Job.InputJSON, &jobPayload); err != nil {
		t.Fatal(err)
	}
	if payload := mapValue(jobPayload, "payload"); stringValue(payload, "simulation_input_id") != "si_material_balance_minimal" {
		t.Fatalf("scheduled benchmark should use registered simulation input payload, got %#v", jobPayload["payload"])
	}
	assertRequiredCapabilities(t, jobPayload, []string{"material_balance", "ode"})
	metadata := mapValue(jobPayload, "metadata")
	if metadata["source"] != "model_catalog_benchmark_case" ||
		metadata["benchmark_case_id"] != "bc_material_balance_minimal_v1" ||
		metadata["parameter_set_id"] != "ps_material_balance_default_v1" ||
		metadata["benchmark_run_required"] != true {
		t.Fatalf("unexpected benchmark job metadata: %#v", metadata)
	}

	benchmarkRuns, err := svc.ListBenchmarkRuns(context.Background(), BenchmarkRunFilter{
		ModelKey:     "material_balance",
		ModelVersion: "material_balance.v1",
		Limit:        10,
	})
	if err != nil {
		t.Fatal(err)
	}
	if benchmarkRuns.TotalEstimate != 0 || len(benchmarkRuns.Items) != 0 {
		t.Fatalf("schedule-run must not record benchmark_run history, got %#v", benchmarkRuns)
	}
	scheduledEvents, err := svc.Events(context.Background(), snapshot.Job.JobID)
	if err != nil {
		t.Fatal(err)
	}
	scheduleAuditCounts := map[string]int{}
	for _, event := range scheduledEvents {
		if event.EventType != "job.created" && event.EventType != "job.queued" {
			continue
		}
		scheduleAuditCounts[event.EventType]++
		audit := eventAuditMap(t, event)
		if audit["who"] != "dev-public" ||
			audit["where"] != "POST "+path ||
			audit["target_object"] != "ComputeJob" ||
			audit["target_id"] != snapshot.Job.JobID {
			t.Fatalf("unexpected benchmark schedule job audit envelope for %s: %#v", event.EventType, audit)
		}
	}
	if scheduleAuditCounts["job.created"] != 1 || scheduleAuditCounts["job.queued"] != 1 {
		t.Fatalf("benchmark schedule-run should write one create and one queue audit event, got counts=%#v events=%#v", scheduleAuditCounts, scheduledEvents)
	}

	req = httptest.NewRequest(http.MethodPost, path, strings.NewReader(requestBody))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("duplicate benchmark schedule-run should be idempotent, got %d %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodPost, path, strings.NewReader(requestBody))
	req.Header.Set("Authorization", "Bearer dev-worker-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("worker token should not schedule benchmark runs, got %d %s", rec.Code, rec.Body.String())
	}

	asmPath := "/api/v1/model-catalog/asm1/versions/asm1.v1/benchmark-cases/bc_asm1_independent_v1/schedule-run"
	req = httptest.NewRequest(http.MethodPost, asmPath, strings.NewReader(`{"request_id":"bench_req_asm1"}`))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("ASM benchmark without default parameter set should not schedule, got %d %s", rec.Code, rec.Body.String())
	}
}

func TestHTTPBenchmarkScheduleRunMutationTenantProjectSiteScope(t *testing.T) {
	path := "/api/v1/model-catalog/material_balance/versions/material_balance.v1/benchmark-cases/bc_material_balance_minimal_v1/schedule-run"
	ctx := context.Background()
	newScopedServer := func(inputTenantID, inputProjectID, inputSiteID string) (*Service, http.Handler) {
		t.Helper()
		svc := testValidatedService(t)
		auth, err := NewAuthenticator(`{"tokens":[
			{"name":"scope-a","token":"scope-a-token","scopes":["job:create"],"tenant_id":"tenant_a","project_id":"project_a","site_id":"site_a"},
			{"name":"global","token":"global-token","scopes":["job:create"]}
		]}`)
		if err != nil {
			t.Fatal(err)
		}
		server := NewServer(svc, auth, nil).Routes()
		req := httptest.NewRequest(http.MethodPost, "/api/v1/simulation-inputs", bytes.NewReader(scopedSimulationInputBytes(t, "si_material_balance_minimal", "pg_benchmark_scope_"+inputSiteID, inputTenantID, inputProjectID, inputSiteID)))
		req.Header.Set("Authorization", "Bearer global-token")
		rec := httptest.NewRecorder()
		server.ServeHTTP(rec, req)
		if rec.Code != http.StatusCreated {
			t.Fatalf("scoped benchmark simulation input register failed: %d %s", rec.Code, rec.Body.String())
		}
		return svc, server
	}
	schedule := func(server http.Handler, body string, expectedStatus int) *httptest.ResponseRecorder {
		t.Helper()
		req := httptest.NewRequest(http.MethodPost, path, strings.NewReader(body))
		req.Header.Set("Authorization", "Bearer scope-a-token")
		rec := httptest.NewRecorder()
		server.ServeHTTP(rec, req)
		if rec.Code != expectedStatus {
			t.Fatalf("benchmark schedule-run got %d want %d: %s", rec.Code, expectedStatus, rec.Body.String())
		}
		return rec
	}

	svc, server := newScopedServer("tenant_a", "project_a", "site_a")
	rec := schedule(server, `{"request_id":"bench_req_scope_alpha","metadata":{"tenant_id":"tenant_a","project_id":"project_a","site_id":"site_a"}}`, http.StatusAccepted)
	var snapshot JobSnapshot
	if err := json.Unmarshal(rec.Body.Bytes(), &snapshot); err != nil {
		t.Fatal(err)
	}
	if snapshot.Job.JobID != "job_benchmark_bench_req_scope_alpha" ||
		snapshot.Job.TenantID != "tenant_a" ||
		snapshot.Job.ProjectID != "project_a" ||
		snapshot.Job.SiteID != "site_a" {
		t.Fatalf("scoped benchmark schedule-run should create scoped job, got %#v", snapshot.Job)
	}
	schedule(server, `{"request_id":"bench_req_scope_cross_job","metadata":{"tenant_id":"tenant_a","project_id":"project_a","site_id":"site_b"}}`, http.StatusForbidden)
	if _, err := svc.GetJob(ctx, "job_benchmark_bench_req_scope_cross_job"); err == nil {
		t.Fatalf("cross-scope benchmark schedule-run job metadata must not write a job")
	}

	svcInput, serverInput := newScopedServer("tenant_b", "project_b", "site_b")
	schedule(serverInput, `{"request_id":"bench_req_scope_cross_input","metadata":{"tenant_id":"tenant_a","project_id":"project_a","site_id":"site_a"}}`, http.StatusForbidden)
	if _, err := svcInput.GetJob(ctx, "job_benchmark_bench_req_scope_cross_input"); err == nil {
		t.Fatalf("cross-scope benchmark schedule-run input_ref must not write a job")
	}
}

func TestContractValidationEndpoint(t *testing.T) {
	svc := testValidatedService(t)
	auth, err := NewAuthenticator("")
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()
	validBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance.simulation_request.v1.json"))
	if err != nil {
		t.Fatal(err)
	}

	req := httptest.NewRequest(http.MethodPost, "/api/v1/contracts/validate", bytes.NewReader(validBytes))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec := httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("validation endpoint failed: %d %s", rec.Code, rec.Body.String())
	}
	var validResponse ContractValidationResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &validResponse); err != nil {
		t.Fatal(err)
	}
	if !validResponse.Valid || validResponse.ContractSchema != "simulation_request.v1.json" || len(validResponse.Errors) != 0 {
		t.Fatalf("unexpected valid contract response: %#v", validResponse)
	}

	constraintBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance.constraint_draft.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/contracts/validate", bytes.NewReader(constraintBytes))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("constraint draft validation endpoint failed: %d %s", rec.Code, rec.Body.String())
	}
	var constraintResponse ContractValidationResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &constraintResponse); err != nil {
		t.Fatal(err)
	}
	if !constraintResponse.Valid || constraintResponse.ContractSchema != "constraint_draft.v1.json" || len(constraintResponse.Errors) != 0 {
		t.Fatalf("unexpected constraint draft validation response: %#v", constraintResponse)
	}

	explanationBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance.result_explanation.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/contracts/validate", bytes.NewReader(explanationBytes))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("result explanation validation endpoint failed: %d %s", rec.Code, rec.Body.String())
	}
	var explanationResponse ContractValidationResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &explanationResponse); err != nil {
		t.Fatal(err)
	}
	if !explanationResponse.Valid || explanationResponse.ContractSchema != "result_explanation.v1.json" || len(explanationResponse.Errors) != 0 {
		t.Fatalf("unexpected result explanation validation response: %#v", explanationResponse)
	}

	confirmationBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance.draft_confirmation.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/contracts/confirm-draft", bytes.NewReader(confirmationBytes))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("draft confirmation endpoint failed: %d %s", rec.Code, rec.Body.String())
	}
	var confirmationResponse ContractValidationResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &confirmationResponse); err != nil {
		t.Fatal(err)
	}
	if !confirmationResponse.Valid || confirmationResponse.ContractSchema != "draft_confirmation.v1.json" || len(confirmationResponse.Errors) != 0 || len(confirmationResponse.Warnings) == 0 {
		t.Fatalf("unexpected draft confirmation response: %#v", confirmationResponse)
	}
	if confirmationResponse.ConfirmationRecord == nil ||
		confirmationResponse.ConfirmationRecord.ConfirmationID != "confirm_draft_material_balance_minimal" ||
		confirmationResponse.ConfirmationRecord.PayloadHash == "" {
		t.Fatalf("draft confirmation should persist an audit record: %#v", confirmationResponse.ConfirmationRecord)
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/contracts/confirmations/confirm_draft_material_balance_minimal", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("draft confirmation read endpoint failed: %d %s", rec.Code, rec.Body.String())
	}
	var storedConfirmation DraftConfirmationRecord
	if err := json.Unmarshal(rec.Body.Bytes(), &storedConfirmation); err != nil {
		t.Fatal(err)
	}
	if storedConfirmation.ConfirmationID != "confirm_draft_material_balance_minimal" ||
		storedConfirmation.DraftID != "draft_material_balance_minimal" ||
		storedConfirmation.PayloadHash != confirmationResponse.ConfirmationRecord.PayloadHash {
		t.Fatalf("unexpected stored draft confirmation: %#v", storedConfirmation)
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/contracts/confirm-draft", bytes.NewReader(confirmationBytes))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("duplicate draft confirmation should be idempotent, got %d %s", rec.Code, rec.Body.String())
	}
	var duplicateConfirmation ContractValidationResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &duplicateConfirmation); err != nil {
		t.Fatal(err)
	}
	if !duplicateConfirmation.Valid || duplicateConfirmation.ConfirmationRecord == nil ||
		duplicateConfirmation.ConfirmationRecord.PayloadHash != confirmationResponse.ConfirmationRecord.PayloadHash {
		t.Fatalf("unexpected duplicate draft confirmation response: %#v", duplicateConfirmation)
	}

	constraintConfirmationBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance_constraint.draft_confirmation.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/contracts/confirm-draft", bytes.NewReader(constraintConfirmationBytes))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("constraint draft confirmation endpoint failed: %d %s", rec.Code, rec.Body.String())
	}
	var constraintConfirmationResponse ContractValidationResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &constraintConfirmationResponse); err != nil {
		t.Fatal(err)
	}
	if !constraintConfirmationResponse.Valid || constraintConfirmationResponse.ContractSchema != "draft_confirmation.v1.json" ||
		constraintConfirmationResponse.ConfirmationRecord == nil ||
		constraintConfirmationResponse.ConfirmationRecord.DraftSchemaVersion != "constraint_draft.v1" {
		t.Fatalf("unexpected constraint confirmation response: %#v", constraintConfirmationResponse)
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/contracts/confirmations/confirm_constraint_material_balance_cod_limit/constraint-application-plan", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("constraint application plan endpoint failed: %d %s", rec.Code, rec.Body.String())
	}
	var constraintPlan ConstraintApplicationPlan
	if err := json.Unmarshal(rec.Body.Bytes(), &constraintPlan); err != nil {
		t.Fatal(err)
	}
	if constraintPlan.SchemaVersion != "constraint_application_plan.v1" ||
		constraintPlan.ConstraintID != "constraint_material_balance_cod_limit" ||
		constraintPlan.ApplicationMode != "advisory_only" ||
		constraintPlan.WouldCreateJob ||
		constraintPlan.WouldModifyTarget ||
		!constraintPlan.ProductionApprovalRequired ||
		len(constraintPlan.Constraints) != 1 {
		t.Fatalf("unexpected constraint application plan: %#v", constraintPlan)
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/contracts/confirmations/confirm_draft_material_balance_minimal/constraint-application-plan", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("agent draft confirmation should not produce a constraint plan, got %d %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/contracts/confirmations/confirm_constraint_material_balance_cod_limit/constraint-application-plan", nil)
	req.Header.Set("Authorization", "Bearer dev-worker-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("worker token should not read constraint application plan, got %d %s", rec.Code, rec.Body.String())
	}

	promotableConfirmationBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance_promotable.draft_confirmation.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/contracts/confirm-draft", bytes.NewReader(promotableConfirmationBytes))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("promotable draft confirmation endpoint failed: %d %s", rec.Code, rec.Body.String())
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/contracts/confirmations/confirm_promote_material_balance_minimal/promote-simulation-check", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusAccepted {
		t.Fatalf("promote confirmed draft failed: %d %s", rec.Code, rec.Body.String())
	}
	var promoted JobSnapshot
	if err := json.Unmarshal(rec.Body.Bytes(), &promoted); err != nil {
		t.Fatal(err)
	}
	if promoted.Job.JobID != "job_simcheck_sim_req_promoted_material_balance_minimal" ||
		promoted.Job.RequestID != "sim_req_promoted_material_balance_minimal" ||
		promoted.Job.Status != StatusQueued {
		t.Fatalf("unexpected promoted job: %#v", promoted.Job)
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/contracts/confirmations/confirm_promote_material_balance_minimal/promote-simulation-check", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("duplicate promotion should be idempotent, got %d %s", rec.Code, rec.Body.String())
	}
	promotionEvents, err := svc.Events(context.Background(), promoted.Job.JobID)
	if err != nil {
		t.Fatal(err)
	}
	promotionAuditCounts := map[string]int{}
	for _, event := range promotionEvents {
		if event.EventType != "job.created" && event.EventType != "job.queued" {
			continue
		}
		promotionAuditCounts[event.EventType]++
		audit := eventAuditMap(t, event)
		if audit["who"] != "dev-public" ||
			audit["where"] != "POST /api/v1/contracts/confirmations/confirm_promote_material_balance_minimal/promote-simulation-check" ||
			audit["target_object"] != "ComputeJob" ||
			audit["target_id"] != promoted.Job.JobID ||
			audit["trace_id"] != "trace_promoted_material_balance_minimal" {
			t.Fatalf("unexpected draft promotion job audit envelope for %s: %#v", event.EventType, audit)
		}
	}
	if promotionAuditCounts["job.created"] != 1 || promotionAuditCounts["job.queued"] != 1 {
		t.Fatalf("draft promotion should write one create and one queue audit event, got counts=%#v events=%#v", promotionAuditCounts, promotionEvents)
	}

	mismatchedConfirmation := strings.Replace(string(confirmationBytes), `"draft_schema_version": "agent_scenario_draft.v1"`, `"draft_schema_version": "constraint_draft.v1"`, 1)
	req = httptest.NewRequest(http.MethodPost, "/api/v1/contracts/confirm-draft", strings.NewReader(mismatchedConfirmation))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("mismatched confirmation should return validation response, got %d %s", rec.Code, rec.Body.String())
	}
	var mismatchResponse ContractValidationResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &mismatchResponse); err != nil {
		t.Fatal(err)
	}
	if mismatchResponse.Valid || len(mismatchResponse.Errors) == 0 {
		t.Fatalf("mismatched draft confirmation should be invalid: %#v", mismatchResponse)
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/contracts/validate", strings.NewReader(`{"schema_version":"simulation_request.v1","request_id":""}`))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("invalid contract should return validation response, got %d %s", rec.Code, rec.Body.String())
	}
	var invalidResponse ContractValidationResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &invalidResponse); err != nil {
		t.Fatal(err)
	}
	if invalidResponse.Valid || invalidResponse.ContractSchema != "simulation_request.v1.json" || len(invalidResponse.Errors) == 0 {
		t.Fatalf("unexpected invalid contract response: %#v", invalidResponse)
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/contracts/validate", strings.NewReader(`{"schema_version":"future_draft.v1"}`))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("unknown contract should return validation response, got %d %s", rec.Code, rec.Body.String())
	}
	var unknownResponse ContractValidationResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &unknownResponse); err != nil {
		t.Fatal(err)
	}
	if unknownResponse.Valid || len(unknownResponse.Errors) == 0 {
		t.Fatalf("unsupported schema should be invalid: %#v", unknownResponse)
	}

	modelCatalogBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance.model_catalog.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/contracts/validate", bytes.NewReader(modelCatalogBytes))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("model catalog validation endpoint failed: %d %s", rec.Code, rec.Body.String())
	}
	var catalogResponse ContractValidationResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &catalogResponse); err != nil {
		t.Fatal(err)
	}
	if !catalogResponse.Valid || catalogResponse.ContractSchema != "model_catalog.v1.json" {
		t.Fatalf("unexpected model catalog validation response: %#v", catalogResponse)
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/contracts/validate", bytes.NewReader(validBytes))
	req.Header.Set("Authorization", "Bearer dev-worker-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("worker token should not validate contracts, got %d %s", rec.Code, rec.Body.String())
	}
}

func TestSimulationCheckEndpointCreatesComputeJob(t *testing.T) {
	svc := testValidatedService(t)
	auth, err := NewAuthenticator("")
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()
	assertRequiredCapabilities := func(jobPayload map[string]any, expected []string) {
		t.Helper()
		execution := mapValue(jobPayload, "execution")
		if execution == nil {
			t.Fatalf("expected job execution payload, got %#v", jobPayload)
		}
		capabilities, ok := execution["required_capabilities"].([]any)
		if !ok {
			t.Fatalf("expected required_capabilities array, got %#v", execution["required_capabilities"])
		}
		if len(capabilities) != len(expected) {
			t.Fatalf("unexpected required_capabilities length: got %#v want %#v", capabilities, expected)
		}
		for index, capability := range expected {
			if capabilities[index] != capability {
				t.Fatalf("unexpected required_capabilities: got %#v want %#v", capabilities, expected)
			}
		}
	}
	validBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "milp_material_balance.simulation_request.v1.json"))
	if err != nil {
		t.Fatal(err)
	}

	req := httptest.NewRequest(http.MethodPost, "/api/v1/simulation-checks", bytes.NewReader(validBytes))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec := httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusAccepted {
		t.Fatalf("simulation check create failed: %d %s", rec.Code, rec.Body.String())
	}
	var created JobSnapshot
	if err := json.Unmarshal(rec.Body.Bytes(), &created); err != nil {
		t.Fatal(err)
	}
	if created.Job.JobID != "job_simcheck_sim_req_milp_material_balance_minimal" ||
		created.Job.RequestID != "sim_req_milp_material_balance_minimal" ||
		created.Job.SourceSystem != "milp" ||
		created.Job.ProjectID != "project_demo" ||
		created.Job.Status != StatusQueued {
		t.Fatalf("unexpected simulation check job: %#v", created.Job)
	}
	var jobPayload map[string]any
	if err := json.Unmarshal(created.Job.InputJSON, &jobPayload); err != nil {
		t.Fatal(err)
	}
	if asRecord := mapValue(jobPayload, "payload"); stringValue(asRecord, "schema_version") != "simulation_input.v1" {
		t.Fatalf("simulation check job should embed simulation_input payload, got %#v", jobPayload["payload"])
	}
	contextValue := mapValue(jobPayload, "context")
	externalRefs := mapValue(contextValue, "external_refs")
	if stringValue(externalRefs, "plan_id") != "plan_milp_minimal" {
		t.Fatalf("expected plan id in job context external_refs, got %#v", externalRefs)
	}
	assertRequiredCapabilities(jobPayload, []string{"material_balance", "ode"})

	req = httptest.NewRequest(http.MethodPost, "/api/v1/simulation-checks", bytes.NewReader(validBytes))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("duplicate simulation check should be idempotent, got %d %s", rec.Code, rec.Body.String())
	}
	var duplicate JobSnapshot
	if err := json.Unmarshal(rec.Body.Bytes(), &duplicate); err != nil {
		t.Fatal(err)
	}
	if duplicate.Job.JobID != created.Job.JobID {
		t.Fatalf("duplicate simulation check returned a different job: %#v", duplicate.Job)
	}

	referenceOnlyBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance.simulation_request.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/simulation-checks", bytes.NewReader(referenceOnlyBytes))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusNotFound || !strings.Contains(rec.Body.String(), "simulation input not found") {
		t.Fatalf("unregistered reference-only simulation check should be rejected, got %d %s", rec.Code, rec.Body.String())
	}

	processGraphRequestBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance_process_graph.simulation_request.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/simulation-checks", bytes.NewReader(processGraphRequestBytes))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusNotFound || !strings.Contains(rec.Body.String(), "process graph not found") {
		t.Fatalf("unregistered process_graph simulation check should be rejected, got %d %s", rec.Code, rec.Body.String())
	}

	processGraphBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance_3_node.process_graph.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/process-graphs", bytes.NewReader(processGraphBytes))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("process graph register failed: %d %s", rec.Code, rec.Body.String())
	}
	var processGraphRecord ProcessGraphRecord
	if err := json.Unmarshal(rec.Body.Bytes(), &processGraphRecord); err != nil {
		t.Fatal(err)
	}
	if processGraphRecord.ProcessGraphID != "pg_material_balance_minimal" ||
		processGraphRecord.Version != 1 ||
		processGraphRecord.PayloadHash == "" ||
		processGraphRecord.RequestedBy != "dev-public" {
		t.Fatalf("unexpected process graph record: %#v", processGraphRecord)
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/process-graphs", bytes.NewReader(processGraphBytes))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("duplicate process graph register should be idempotent, got %d %s", rec.Code, rec.Body.String())
	}
	req = httptest.NewRequest(http.MethodGet, "/api/v1/process-graphs/pg_material_balance_minimal?version=1", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("process graph get failed: %d %s", rec.Code, rec.Body.String())
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/simulation-checks", bytes.NewReader(processGraphRequestBytes))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusAccepted {
		t.Fatalf("registered process_graph simulation check should create a job, got %d %s", rec.Code, rec.Body.String())
	}
	var processGraphJob JobSnapshot
	if err := json.Unmarshal(rec.Body.Bytes(), &processGraphJob); err != nil {
		t.Fatal(err)
	}
	if processGraphJob.Job.JobID != "job_simcheck_sim_req_process_graph_material_balance_minimal" ||
		processGraphJob.Job.RequestID != "sim_req_process_graph_material_balance_minimal" {
		t.Fatalf("unexpected process graph simulation check job: %#v", processGraphJob.Job)
	}
	var processGraphPayload map[string]any
	if err := json.Unmarshal(processGraphJob.Job.InputJSON, &processGraphPayload); err != nil {
		t.Fatal(err)
	}
	generatedPayload := mapValue(processGraphPayload, "payload")
	if stringValue(generatedPayload, "simulation_input_id") != "si_pg_material_balance_minimal" ||
		stringValue(generatedPayload, "process_graph_id") != "pg_material_balance_minimal" {
		t.Fatalf("process graph simulation check should generate simulation_input payload, got %#v", processGraphPayload["payload"])
	}
	asmProcessGraphRequest := decodeMap(t, processGraphRequestBytes)
	asmProcessGraphRequest["request_id"] = "sim_req_process_graph_asm1_unsupported"
	asmProcessGraphRequest["job_type"] = "simulation.asm1.v1"
	req = httptest.NewRequest(http.MethodPost, "/api/v1/simulation-checks", bytes.NewReader(encodeMap(t, asmProcessGraphRequest)))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusBadRequest || !strings.Contains(rec.Body.String(), "process_graph lookup only supports simulation.material_balance.v1") {
		t.Fatalf("ASM/UDM process_graph simulation check should stay unsupported, got %d %s", rec.Code, rec.Body.String())
	}

	modelRunRequestBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance_model_run.simulation_request.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/simulation-checks", bytes.NewReader(modelRunRequestBytes))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusNotFound || !strings.Contains(rec.Body.String(), "model run not found") {
		t.Fatalf("unregistered model_run simulation check should be rejected, got %d %s", rec.Code, rec.Body.String())
	}
	replayModelRun := map[string]any{
		"schema_version":  "model_run.v1",
		"model_run_id":    "mr_replay_source_material_balance",
		"job_id":          created.Job.JobID,
		"model_key":       "material_balance",
		"model_version":   "material_balance.v1",
		"parameter_hash":  "sha256:" + strings.Repeat("a", 64),
		"input_hash":      "sha256:" + strings.Repeat("b", 64),
		"quality_metrics": map[string]any{"convergence_status": "completed"},
		"warnings":        []any{},
		"evidence_refs":   []any{"job:" + created.Job.JobID},
	}
	if err := svc.store.InsertModelRuns(context.Background(), created.Job.JobID, []json.RawMessage{mustJSON(replayModelRun)}, time.Now().UTC()); err != nil {
		t.Fatal(err)
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/simulation-checks", bytes.NewReader(modelRunRequestBytes))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusAccepted {
		t.Fatalf("registered model_run simulation check should create a job, got %d %s", rec.Code, rec.Body.String())
	}
	var modelRunReplayJob JobSnapshot
	if err := json.Unmarshal(rec.Body.Bytes(), &modelRunReplayJob); err != nil {
		t.Fatal(err)
	}
	if modelRunReplayJob.Job.JobID != "job_simcheck_sim_req_model_run_material_balance_minimal" ||
		modelRunReplayJob.Job.RequestID != "sim_req_model_run_material_balance_minimal" {
		t.Fatalf("unexpected model_run replay simulation check job: %#v", modelRunReplayJob.Job)
	}
	var modelRunReplayPayload map[string]any
	if err := json.Unmarshal(modelRunReplayJob.Job.InputJSON, &modelRunReplayPayload); err != nil {
		t.Fatal(err)
	}
	if payload := mapValue(modelRunReplayPayload, "payload"); stringValue(payload, "simulation_input_id") != "si_milp_material_balance_minimal" {
		t.Fatalf("model_run replay should reuse source job simulation_input payload, got %#v", modelRunReplayPayload["payload"])
	}

	inputBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance_minimal.simulation_input.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/simulation-inputs", bytes.NewReader(inputBytes))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("simulation input register failed: %d %s", rec.Code, rec.Body.String())
	}
	var inputRecord SimulationInputRecord
	if err := json.Unmarshal(rec.Body.Bytes(), &inputRecord); err != nil {
		t.Fatal(err)
	}
	if inputRecord.SimulationInputID != "si_material_balance_minimal" ||
		inputRecord.PayloadHash == "" ||
		inputRecord.SourceSystem != "compute-api" ||
		inputRecord.RequestedBy != "dev-public" {
		t.Fatalf("unexpected simulation input record: %#v", inputRecord)
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/simulation-inputs", bytes.NewReader(inputBytes))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("duplicate simulation input register should be idempotent, got %d %s", rec.Code, rec.Body.String())
	}
	req = httptest.NewRequest(http.MethodGet, "/api/v1/simulation-inputs/si_material_balance_minimal", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("simulation input get failed: %d %s", rec.Code, rec.Body.String())
	}
	req = httptest.NewRequest(http.MethodPost, "/api/v1/simulation-checks", bytes.NewReader(referenceOnlyBytes))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusAccepted {
		t.Fatalf("registered reference-only simulation check should create a job, got %d %s", rec.Code, rec.Body.String())
	}
	var referenceJob JobSnapshot
	if err := json.Unmarshal(rec.Body.Bytes(), &referenceJob); err != nil {
		t.Fatal(err)
	}
	if referenceJob.Job.JobID != "job_simcheck_sim_req_material_balance_minimal" ||
		referenceJob.Job.RequestID != "sim_req_material_balance_minimal" {
		t.Fatalf("unexpected reference simulation check job: %#v", referenceJob.Job)
	}
	var referencePayload map[string]any
	if err := json.Unmarshal(referenceJob.Job.InputJSON, &referencePayload); err != nil {
		t.Fatal(err)
	}
	if payload := mapValue(referencePayload, "payload"); stringValue(payload, "simulation_input_id") != "si_material_balance_minimal" {
		t.Fatalf("reference simulation check should use registered payload, got %#v", referencePayload["payload"])
	}
	assertRequiredCapabilities(referencePayload, []string{"material_balance", "ode"})

	for _, tc := range []struct {
		name           string
		inputFixture   string
		requestFixture string
		jobID          string
		requestID      string
		inputID        string
		jobType        string
		capabilities   []string
	}{
		{
			name:           "asm1slim",
			inputFixture:   "asm1slim_independent.simulation_input.v1.json",
			requestFixture: "asm1slim_independent.simulation_request.v1.json",
			jobID:          "job_simcheck_sim_req_asm1slim_independent",
			requestID:      "sim_req_asm1slim_independent",
			inputID:        "si_asm1slim_independent",
			jobType:        "simulation.asm1slim.v1",
			capabilities:   []string{"asm1slim", "ode"},
		},
		{
			name:           "asm1",
			inputFixture:   "asm1_independent.simulation_input.v1.json",
			requestFixture: "asm1_independent.simulation_request.v1.json",
			jobID:          "job_simcheck_sim_req_asm1_independent",
			requestID:      "sim_req_asm1_independent",
			inputID:        "si_asm1_independent",
			jobType:        "simulation.asm1.v1",
			capabilities:   []string{"asm1", "ode"},
		},
		{
			name:           "asm3",
			inputFixture:   "asm3_independent.simulation_input.v1.json",
			requestFixture: "asm3_independent.simulation_request.v1.json",
			jobID:          "job_simcheck_sim_req_asm3_independent",
			requestID:      "sim_req_asm3_independent",
			inputID:        "si_asm3_independent",
			jobType:        "simulation.asm3.v1",
			capabilities:   []string{"asm3", "ode"},
		},
		{
			name:           "udm",
			inputFixture:   "udm_independent.simulation_input.v1.json",
			requestFixture: "udm_independent.simulation_request.v1.json",
			jobID:          "job_simcheck_sim_req_udm_independent",
			requestID:      "sim_req_udm_independent",
			inputID:        "si_udm_independent",
			jobType:        "simulation.udm.v1",
			capabilities:   []string{"udm", "ode"},
		},
	} {
		t.Run("reference-only "+tc.name, func(t *testing.T) {
			caseInputBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", tc.inputFixture))
			if err != nil {
				t.Fatal(err)
			}
			req := httptest.NewRequest(http.MethodPost, "/api/v1/simulation-inputs", bytes.NewReader(caseInputBytes))
			req.Header.Set("Authorization", "Bearer dev-public-token")
			rec := httptest.NewRecorder()
			server.ServeHTTP(rec, req)
			if rec.Code != http.StatusCreated {
				t.Fatalf("simulation input register failed: %d %s", rec.Code, rec.Body.String())
			}

			requestBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", tc.requestFixture))
			if err != nil {
				t.Fatal(err)
			}
			req = httptest.NewRequest(http.MethodPost, "/api/v1/simulation-checks", bytes.NewReader(requestBytes))
			req.Header.Set("Authorization", "Bearer dev-public-token")
			rec = httptest.NewRecorder()
			server.ServeHTTP(rec, req)
			if rec.Code != http.StatusAccepted {
				t.Fatalf("registered %s simulation check should create a job, got %d %s", tc.name, rec.Code, rec.Body.String())
			}
			var modelJob JobSnapshot
			if err := json.Unmarshal(rec.Body.Bytes(), &modelJob); err != nil {
				t.Fatal(err)
			}
			if modelJob.Job.JobID != tc.jobID ||
				modelJob.Job.RequestID != tc.requestID ||
				modelJob.Job.JobType != tc.jobType {
				t.Fatalf("unexpected %s simulation check job: %#v", tc.name, modelJob.Job)
			}
			var modelPayload map[string]any
			if err := json.Unmarshal(modelJob.Job.InputJSON, &modelPayload); err != nil {
				t.Fatal(err)
			}
			payload := mapValue(modelPayload, "payload")
			if stringValue(payload, "simulation_input_id") != tc.inputID ||
				stringValue(payload, "job_type") != tc.jobType {
				t.Fatalf("%s simulation check should use registered payload, got %#v", tc.name, modelPayload["payload"])
			}
			assertRequiredCapabilities(modelPayload, tc.capabilities)
		})
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/simulation-checks", bytes.NewReader(validBytes))
	req.Header.Set("Authorization", "Bearer dev-worker-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("worker token should not create simulation checks, got %d %s", rec.Code, rec.Body.String())
	}
}

func TestNewSystemEvidenceReferenceE2E(t *testing.T) {
	svc := testValidatedService(t)
	auth, err := NewAuthenticator("")
	if err != nil {
		t.Fatal(err)
	}
	server := NewServer(svc, auth, nil).Routes()
	ctx := context.Background()

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
	processGraphRequest := decodeMap(t, processGraphRequestBytes)
	processGraphRequest["request_id"] = "sim_req_newsystem_evidence_e2e"
	processGraphRequest["source_system"] = "NewSystem"
	processGraphRequest["requested_by"] = "new-system:approval"
	processGraphRequest["external_refs"] = map[string]any{
		"approval_id": "approval_newsystem_evidence_e2e",
		"site_id":     "site_demo",
	}
	metadata := mapValue(processGraphRequest, "metadata")
	metadata["trace_id"] = "trace_newsystem_evidence_e2e"
	metadata["project_id"] = "project_demo"

	req = httptest.NewRequest(http.MethodPost, "/api/v1/simulation-checks", bytes.NewReader(encodeMap(t, processGraphRequest)))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusAccepted {
		t.Fatalf("NewSystem simulation check create failed: %d %s", rec.Code, rec.Body.String())
	}
	var created JobSnapshot
	if err := json.Unmarshal(rec.Body.Bytes(), &created); err != nil {
		t.Fatal(err)
	}
	if created.Job.SourceSystem != "NewSystem" || created.Job.ProjectID != "project_demo" || created.Job.SiteID != "site_demo" {
		t.Fatalf("unexpected NewSystem simulation check job metadata: %#v", created.Job)
	}

	if _, err := svc.RegisterWorker(ctx, compatibleWorkerRegistration("worker_newsystem")); err != nil {
		t.Fatal(err)
	}
	claimed, err := svc.Claim(ctx, "worker_newsystem")
	if err != nil {
		t.Fatal(err)
	}
	claimedJob := mapValue(claimed, "job")
	if stringValue(claimedJob, "job_id") != created.Job.JobID {
		t.Fatalf("expected to claim NewSystem job %s, got %#v", created.Job.JobID, claimed["job"])
	}

	processGraphID := "pg_material_balance_minimal"
	simulationInputID := "si_pg_material_balance_minimal"
	modelRunID := "mr_newsystem_evidence_e2e"
	defaultParameterHash := builtInModelCatalog("2026-05-30T00:00:00Z").Models[0].Versions[0].DefaultParameterSet.ParameterHash
	modelRun := map[string]any{
		"schema_version":  "model_run.v1",
		"model_run_id":    modelRunID,
		"job_id":          created.Job.JobID,
		"model_key":       "material_balance",
		"model_version":   "material_balance.v1",
		"parameter_hash":  defaultParameterHash,
		"input_hash":      "sha256:" + strings.Repeat("c", 64),
		"quality_metrics": map[string]any{"convergence_status": "converged"},
		"warnings":        []any{},
		"evidence_refs": []any{
			"simulation_input:" + simulationInputID,
			"process_graph:" + processGraphID,
		},
	}
	evidenceRefs := []any{
		"simulation_input:" + simulationInputID,
		"process_graph:" + processGraphID,
		"model_run:" + modelRunID,
	}
	result := map[string]any{
		"schema_version": "compute_result.v1",
		"job_id":         created.Job.JobID,
		"job_type":       "simulation.material_balance.v1",
		"status":         StatusSucceeded,
		"summary":        map[string]any{"approval_ready": true},
		"data":           map[string]any{},
		"quality":        map[string]any{"data_quality": "ok", "warnings": []any{}},
		"artifacts":      []any{},
		"risk_findings": []any{
			map[string]any{
				"risk_code":     "new_system_material_balance_checked",
				"severity":      "info",
				"title":         "NewSystem simulation check completed",
				"description":   "The NewSystem approval read path can inspect input, graph, and model run evidence.",
				"evidence_refs": evidenceRefs,
			},
		},
		"runtime_audit": map[string]any{"model_runs": []any{modelRun}, "timings_ms": map[string]any{}, "fallback_used": false},
	}
	if _, err := svc.Complete(ctx, "worker_newsystem", created.Job.JobID, 1, result); err != nil {
		t.Fatal(err)
	}
	resultView, err := svc.Result(ctx, created.Job.JobID)
	if err != nil {
		t.Fatal(err)
	}
	summaryView := mapValue(resultView, "summary")
	riskFindings, ok := summaryView["risk_findings"].([]any)
	if !ok || len(riskFindings) != 1 {
		t.Fatalf("expected NewSystem risk finding in result summary, got %#v", summaryView["risk_findings"])
	}

	resolveRef := func(ref string) EvidenceReferenceResolution {
		t.Helper()
		req := httptest.NewRequest(http.MethodGet, "/api/v1/compute/jobs/"+created.Job.JobID+"/evidence-ref?ref="+ref, nil)
		req.Header.Set("Authorization", "Bearer dev-public-token")
		rec := httptest.NewRecorder()
		server.ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatalf("evidence ref %s failed: %d %s", ref, rec.Code, rec.Body.String())
		}
		var resolution EvidenceReferenceResolution
		if err := json.Unmarshal(rec.Body.Bytes(), &resolution); err != nil {
			t.Fatal(err)
		}
		return resolution
	}

	simulationInputResolution := resolveRef("simulation_input:" + simulationInputID)
	if simulationInputResolution.RefType != "simulation_input" || stringValue(simulationInputResolution.Payload.(map[string]any), "simulation_input_id") != simulationInputID {
		t.Fatalf("unexpected simulation_input resolution: %#v", simulationInputResolution)
	}
	processGraphResolution := resolveRef("process_graph:" + processGraphID)
	if processGraphResolution.RefType != "process_graph" || stringValue(processGraphResolution.Payload.(map[string]any), "process_graph_id") != processGraphID {
		t.Fatalf("unexpected process_graph resolution: %#v", processGraphResolution)
	}
	modelRunResolution := resolveRef("model_run:" + modelRunID)
	if modelRunResolution.RefType != "model_run" || stringValue(modelRunResolution.Payload.(map[string]any), "model_run_id") != modelRunID {
		t.Fatalf("unexpected model_run resolution: %#v", modelRunResolution)
	}
	evidencePackageRef := "evidence_package:evidence_" + safeIDPart(created.Job.JobID)
	evidencePackageResolution := resolveRef(evidencePackageRef)
	if evidencePackageResolution.RefType != "evidence_package" || stringValue(evidencePackageResolution.Payload.(map[string]any), "job_id") != created.Job.JobID {
		t.Fatalf("unexpected evidence_package resolution: %#v", evidencePackageResolution)
	}
	req = httptest.NewRequest(http.MethodGet, "/api/v1/compute/jobs/"+created.Job.JobID+"/production-readiness", nil)
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("NewSystem production readiness read failed: %d %s", rec.Code, rec.Body.String())
	}
	var readiness ProductionReadinessReport
	if err := json.Unmarshal(rec.Body.Bytes(), &readiness); err != nil {
		t.Fatal(err)
	}
	if readiness.SchemaVersion != "production_readiness.v1" ||
		readiness.JobID != created.Job.JobID ||
		readiness.ReadinessStatus != "ready_for_external_approval" ||
		!readiness.ProductionReady ||
		!readiness.ExternalApprovalRequired ||
		readiness.AutoPublishAllowed ||
		readiness.EvidencePackageID != stringValue(evidencePackageResolution.Payload.(map[string]any), "evidence_package_id") {
		t.Fatalf("unexpected NewSystem production readiness report: %#v", readiness)
	}
	if readiness.RiskFindingsSummary.Total != 1 ||
		readiness.RiskFindingsSummary.BySeverity["info"] != 1 ||
		len(readiness.BlockingReasons) != 0 {
		t.Fatalf("unexpected NewSystem production readiness risk summary: %#v", readiness.RiskFindingsSummary)
	}
	if readiness.Metadata["source_system"] != "NewSystem" || readiness.Metadata["project_id"] != "project_demo" {
		t.Fatalf("unexpected NewSystem production readiness metadata: %#v", readiness.Metadata)
	}

	explanationBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance.result_explanation.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	explanation := decodeMap(t, explanationBytes)
	explanation["explanation_id"] = "explanation_newsystem_evidence_e2e"
	explanation["job_id"] = created.Job.JobID
	explanation["created_by"] = "agent:new-system-e2e"
	explanation["evidence_refs"] = append(evidenceRefs, evidencePackageRef)
	statements := explanation["statements"].([]any)
	statements[0].(map[string]any)["evidence_refs"] = evidenceRefs
	req = httptest.NewRequest(http.MethodPost, "/api/v1/compute/jobs/"+created.Job.JobID+"/result-explanations", bytes.NewReader(encodeMap(t, explanation)))
	req.Header.Set("Authorization", "Bearer dev-public-token")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("NewSystem result explanation submit failed: %d %s", rec.Code, rec.Body.String())
	}
	var explanationRecord ResultExplanationRecord
	if err := json.Unmarshal(rec.Body.Bytes(), &explanationRecord); err != nil {
		t.Fatal(err)
	}
	if explanationRecord.Status != "submitted" || len(explanationRecord.ResolvedEvidenceRefs) != 4 {
		t.Fatalf("unexpected NewSystem result explanation record: %#v", explanationRecord)
	}
}

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

func TestHTTPArtifactUploadMultipart(t *testing.T) {
	svc := testService(t)
	ctx := context.Background()
	if _, _, err := svc.CreateJob(ctx, fixtureJobBytes(t), ""); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.RegisterWorker(ctx, compatibleWorkerRegistration("worker_1")); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Claim(ctx, "worker_1"); err != nil {
		t.Fatal(err)
	}
	auth, _ := NewAuthenticator("")
	server := NewServer(svc, auth, nil).Routes()

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	content := []byte(`{"ok":true}`)
	metadata := map[string]any{
		"schema_version":   "artifact.v1",
		"artifact_id":      "art_http",
		"job_id":           "job_material_balance_minimal",
		"artifact_type":    "time_series_json",
		"storage_provider": "local_fs",
		"object_key":       "ignored.json",
		"content_type":     "application/json",
		"size_bytes":       len(content),
		"checksum":         "sha256:" + SHA256Hex(content),
		"created_at":       time.Now().UTC().Format(time.RFC3339),
	}
	_ = writer.WriteField("metadata", string(encodeMap(t, metadata)))
	part, _ := writer.CreateFormFile("file", "artifact.json")
	_, _ = part.Write(content)
	_ = writer.Close()

	req := httptest.NewRequest(http.MethodPost, "/api/v1/workers/worker_1/jobs/job_material_balance_minimal/artifact", body)
	req.Header.Set("Authorization", "Bearer dev-worker-token")
	req.Header.Set("Content-Type", writer.FormDataContentType())
	rec := httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("artifact upload failed: %d %s", rec.Code, rec.Body.String())
	}
}

func repoRootForTest(t *testing.T) string {
	t.Helper()
	wd, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	for {
		if _, err := os.Stat(filepath.Join(wd, "contracts", "compute_job.v1.json")); err == nil {
			return wd
		}
		next := filepath.Dir(wd)
		if next == wd {
			t.Fatal("repo root not found")
		}
		wd = next
	}
}
