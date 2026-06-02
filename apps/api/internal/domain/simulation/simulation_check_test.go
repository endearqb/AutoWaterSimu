package simulation

import (
	"reflect"
	"testing"
)

func TestBuildSimulationCheckJobDocumentDefaults(t *testing.T) {
	simulationInput := map[string]any{
		"schema_version":      "simulation_input.v1",
		"simulation_input_id": "si_minimal",
		"job_type":            JobTypeMaterialBalance,
	}
	inlineInput := map[string]any{"simulation_input_id": "inline"}
	externalRefs := map[string]any{
		"plan_id": "plan_demo",
		"site_id": "site_external",
	}

	document := BuildSimulationCheckJobDocument(SimulationCheckJobInput{
		RequestID:       "sim req/1",
		JobType:         JobTypeMaterialBalance,
		SourceSystem:    "milp",
		RequestedBy:     "planner",
		InputRef:        map[string]any{"simulation_input": inlineInput, "process_graph_id": "pg_minimal", "process_graph_version": 1.0},
		SimulationInput: simulationInput,
		ExternalRefs:    externalRefs,
		CreatedAt:       "2026-06-02T00:00:00Z",
	})

	if document.IdempotencyKey != "simcheck:sim req/1" {
		t.Fatalf("unexpected idempotency key: %s", document.IdempotencyKey)
	}
	job := document.Job
	if job["schema_version"] != "compute_job.v1" ||
		job["job_id"] != "job_simcheck_sim_req_1" ||
		job["job_type"] != JobTypeMaterialBalance ||
		job["queue"] != "simulation" ||
		job["request_id"] != "sim req/1" ||
		job["idempotency_key"] != "simcheck:sim req/1" ||
		job["created_at"] != "2026-06-02T00:00:00Z" {
		t.Fatalf("unexpected job identity fields: %#v", job)
	}
	if !reflect.DeepEqual(job["payload"], simulationInput) {
		t.Fatalf("unexpected payload: %#v", job["payload"])
	}
	context := job["context"].(map[string]any)
	if context["source_system"] != "milp" ||
		context["requested_by"] != "planner" ||
		context["trace_id"] != "trace_simcheck_sim_req_1" ||
		context["site_id"] != "site_external" ||
		!reflect.DeepEqual(context["external_refs"], externalRefs) {
		t.Fatalf("unexpected job context: %#v", context)
	}
	metadata := job["metadata"].(map[string]any)
	inputRefMetadata := metadata["input_ref"].(map[string]any)
	if metadata["source"] != "simulation_check_api" ||
		metadata["simulation_request_id"] != "sim req/1" ||
		!reflect.DeepEqual(metadata["external_refs"], externalRefs) ||
		inputRefMetadata["process_graph_id"] != "pg_minimal" ||
		inputRefMetadata["process_graph_version"] != 1.0 {
		t.Fatalf("unexpected metadata: %#v", metadata)
	}
	if _, ok := inputRefMetadata["simulation_input"]; ok {
		t.Fatalf("metadata input_ref must not copy inline simulation_input: %#v", inputRefMetadata)
	}
	execution := job["execution"].(map[string]any)
	wantCapabilities := []any{"material_balance", "ode"}
	if !reflect.DeepEqual(execution["required_capabilities"], wantCapabilities) {
		t.Fatalf("unexpected execution profile: %#v", execution)
	}
}

func TestBuildSimulationCheckJobDocumentMetadataOverrides(t *testing.T) {
	externalRefs := map[string]any{"site_id": "site_external"}
	document := BuildSimulationCheckJobDocument(SimulationCheckJobInput{
		RequestID:       "sim_req_override",
		JobType:         JobTypeUDM,
		SourceSystem:    "agent",
		RequestedBy:     "operator",
		InputRef:        map[string]any{"simulation_input_id": "si_udm"},
		SimulationInput: map[string]any{"simulation_input_id": "si_udm", "job_type": JobTypeUDM},
		Metadata: map[string]any{
			"trace_id":        "trace_custom",
			"job_id":          "job_custom",
			"idempotency_key": "idem_custom",
			"tenant_id":       "tenant_demo",
			"project_id":      "project_demo",
			"site_id":         "site_metadata",
		},
		ExternalRefs: externalRefs,
		CreatedAt:    "2026-06-02T01:00:00Z",
	})

	if document.IdempotencyKey != "idem_custom" {
		t.Fatalf("unexpected idempotency key: %s", document.IdempotencyKey)
	}
	job := document.Job
	if job["job_id"] != "job_custom" || job["idempotency_key"] != "idem_custom" {
		t.Fatalf("metadata overrides were not applied: %#v", job)
	}
	context := job["context"].(map[string]any)
	if context["trace_id"] != "trace_custom" ||
		context["tenant_id"] != "tenant_demo" ||
		context["project_id"] != "project_demo" ||
		context["site_id"] != "site_metadata" ||
		!reflect.DeepEqual(context["external_refs"], externalRefs) {
		t.Fatalf("unexpected context overrides: %#v", context)
	}
	execution := job["execution"].(map[string]any)
	wantCapabilities := []any{"udm", "ode"}
	if !reflect.DeepEqual(execution["required_capabilities"], wantCapabilities) {
		t.Fatalf("unexpected execution profile: %#v", execution)
	}
}
