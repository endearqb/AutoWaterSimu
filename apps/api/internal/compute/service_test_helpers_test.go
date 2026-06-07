package compute

import (
	"context"
	"encoding/json"
	"io"
	"os"
	"path/filepath"
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
