package models

import (
	"encoding/json"
	"reflect"
	"testing"
)

func TestBuiltInModelCatalogDocument(t *testing.T) {
	catalog := BuiltInModelCatalogDocument("2026-06-02T00:00:00Z", "sha256:test")
	if catalog["schema_version"] != "model_catalog.v1" {
		t.Fatalf("unexpected schema version: %#v", catalog["schema_version"])
	}
	if catalog["generated_at"] != "2026-06-02T00:00:00Z" {
		t.Fatalf("unexpected generated_at: %#v", catalog["generated_at"])
	}
	metadata := testMap(t, catalog, "metadata")
	if metadata["source"] != BuiltInModelCatalogSource {
		t.Fatalf("unexpected metadata source: %#v", metadata["source"])
	}

	models := testSlice(t, catalog, "models")
	if len(models) != 5 {
		t.Fatalf("expected 5 built-in models, got %d", len(models))
	}

	material := testModelByKey(t, models, "material_balance")
	materialVersion := testFirstVersion(t, material)
	if materialVersion["status"] != ModelVersionStatusActive || materialVersion["model_version"] != "material_balance.v1" {
		t.Fatalf("unexpected material balance version: %#v", materialVersion)
	}
	defaultParameterSet := testMap(t, materialVersion, "default_parameter_set")
	if defaultParameterSet["status"] != ParameterSetStatusApproved {
		t.Fatalf("unexpected default parameter set status: %#v", defaultParameterSet["status"])
	}
	if defaultParameterSet["parameter_hash"] != "sha256:test" {
		t.Fatalf("unexpected default parameter hash: %#v", defaultParameterSet["parameter_hash"])
	}
	parameters := testMap(t, defaultParameterSet, "parameters")
	if parameters["hours"] != 4 || parameters["steps_per_hour"] != 60 {
		t.Fatalf("unexpected default parameters: %#v", parameters)
	}
	materialCase := testFirstBenchmarkCase(t, materialVersion)
	if materialCase["benchmark_case_id"] != "bc_material_balance_minimal_v1" || materialCase["status"] != BenchmarkCaseStatusValidated {
		t.Fatalf("unexpected material benchmark case: %#v", materialCase)
	}
	materialInputRef := testMap(t, materialCase, "input_ref")
	if materialInputRef["fixture"] != "contracts/examples/valid/material_balance_minimal.simulation_input.v1.json" {
		t.Fatalf("unexpected material fixture: %#v", materialInputRef["fixture"])
	}

	workerCases := map[string]struct {
		jobType    string
		fixture    string
		modelRunID string
		hours      float64
	}{
		"asm1slim": {
			jobType:    "simulation.asm1slim.v1",
			fixture:    "contracts/examples/valid/asm1slim_independent.simulation_input.v1.json",
			modelRunID: "mr_job_asm1slim_independent_asm1slim",
			hours:      1.0,
		},
		"asm1": {
			jobType:    "simulation.asm1.v1",
			fixture:    "contracts/examples/valid/asm1_independent.simulation_input.v1.json",
			modelRunID: "mr_job_asm1_independent_asm1",
			hours:      0.5,
		},
		"asm3": {
			jobType:    "simulation.asm3.v1",
			fixture:    "contracts/examples/valid/asm3_independent.simulation_input.v1.json",
			modelRunID: "mr_job_asm3_independent_asm3",
			hours:      0.5,
		},
		"udm": {
			jobType:    "simulation.udm.v1",
			fixture:    "contracts/examples/valid/udm_independent.simulation_input.v1.json",
			modelRunID: "mr_job_udm_independent_udm",
			hours:      0.5,
		},
	}
	for modelKey, expected := range workerCases {
		model := testModelByKey(t, models, modelKey)
		version := testFirstVersion(t, model)
		if version["status"] != ModelVersionStatusActive || version["model_version"] != modelKey+".v1" {
			t.Fatalf("unexpected %s version: %#v", modelKey, version)
		}
		if _, ok := version["default_parameter_set"]; ok {
			t.Fatalf("worker model %s should not define default_parameter_set: %#v", modelKey, version["default_parameter_set"])
		}
		templates := testSlice(t, version, "parameter_templates")
		hoursTemplate := testParameterTemplateByKey(t, templates, "hours")
		if hoursTemplate["default_value"] != expected.hours {
			t.Fatalf("unexpected %s hours template: %#v", modelKey, hoursTemplate)
		}
		metadata := testMap(t, version, "metadata")
		if metadata["default_parameter_set"] != "not_defined" || metadata["parameter_hash_source"] != "worker_model_parameter_payload" {
			t.Fatalf("unexpected %s metadata: %#v", modelKey, metadata)
		}
		benchmarkCase := testFirstBenchmarkCase(t, version)
		if benchmarkCase["benchmark_case_id"] != "bc_"+modelKey+"_independent_v1" || benchmarkCase["job_type"] != expected.jobType {
			t.Fatalf("unexpected %s benchmark case: %#v", modelKey, benchmarkCase)
		}
		if benchmarkCase["status"] != BenchmarkCaseStatusValidated || benchmarkCase["source"] != "worker_cli_smoke" {
			t.Fatalf("unexpected %s benchmark status/source: %#v", modelKey, benchmarkCase)
		}
		inputRef := testMap(t, benchmarkCase, "input_ref")
		if inputRef["fixture"] != expected.fixture {
			t.Fatalf("unexpected %s fixture: %#v", modelKey, inputRef["fixture"])
		}
		evidenceRefs := testSlice(t, benchmarkCase, "evidence_refs")
		if len(evidenceRefs) != 1 || evidenceRefs[0] != "model_run:"+expected.modelRunID {
			t.Fatalf("unexpected %s evidence refs: %#v", modelKey, evidenceRefs)
		}
	}
}

func TestBuildBenchmarkCaseRunJobDocument(t *testing.T) {
	metadata := map[string]any{
		"project_id": "project_benchmark",
		"note":       "keep",
	}
	simulationInput := map[string]any{
		"schema_version":        "simulation_input.v1",
		"simulation_input_id":   "si_material_balance_minimal",
		"job_type":              "simulation.material_balance.v1",
		"resolved_from_fixture": true,
	}
	execution := map[string]any{
		"required_capabilities": []any{"material_balance", "ode"},
	}
	expectedMetrics := map[string]any{
		"warning_count": 0,
	}
	tolerance := map[string]any{
		"relative": 0.000001,
	}
	inputRef := map[string]any{
		"simulation_input_id": "si_material_balance_minimal",
	}

	document := BuildBenchmarkCaseRunJobDocument(BenchmarkCaseRunJobDocumentInput{
		ModelKey:           "material_balance",
		ModelVersion:       "material_balance.v1",
		BenchmarkCaseID:    "bc_material_balance_minimal_v1",
		JobType:            "simulation.material_balance.v1",
		RequestID:          "bench_req_material_balance_minimal",
		SourceSystem:       "compute-api",
		RequestedBy:        "tester",
		CreatedAt:          "2026-06-02T20:45:00Z",
		Metadata:           metadata,
		SimulationInput:    simulationInput,
		Execution:          execution,
		ParameterSetID:     "ps_material_balance_default_v1",
		ParameterHash:      "sha256:abc",
		ParameterSetStatus: ParameterSetStatusApproved,
		ExpectedMetrics:    expectedMetrics,
		Tolerance:          tolerance,
		InputRef:           inputRef,
	})

	if document.IdempotencyKey != "benchmark:bench_req_material_balance_minimal" {
		t.Fatalf("unexpected idempotency key: %q", document.IdempotencyKey)
	}
	job := document.Job
	if job["schema_version"] != "compute_job.v1" ||
		job["job_id"] != "job_benchmark_bench_req_material_balance_minimal" ||
		job["job_type"] != "simulation.material_balance.v1" ||
		job["queue"] != "simulation" ||
		job["request_id"] != "bench_req_material_balance_minimal" ||
		job["idempotency_key"] != document.IdempotencyKey ||
		job["created_at"] != "2026-06-02T20:45:00Z" {
		t.Fatalf("unexpected benchmark job document: %#v", job)
	}
	if payload := testMap(t, job, "payload"); payload["simulation_input_id"] != "si_material_balance_minimal" {
		t.Fatalf("unexpected payload: %#v", payload)
	}
	jobExecution := testMap(t, job, "execution")
	if !reflect.DeepEqual(jobExecution["required_capabilities"], []any{"material_balance", "ode"}) {
		t.Fatalf("unexpected execution profile: %#v", jobExecution)
	}
	context := testMap(t, job, "context")
	if context["source_system"] != "compute-api" ||
		context["requested_by"] != "tester" ||
		context["trace_id"] != "trace_benchmark_bench_req_material_balance_minimal" ||
		context["project_id"] != "project_benchmark" {
		t.Fatalf("unexpected job context: %#v", context)
	}
	jobMetadata := testMap(t, job, "metadata")
	if jobMetadata["note"] != "keep" ||
		jobMetadata["source"] != "model_catalog_benchmark_case" ||
		jobMetadata["model_key"] != "material_balance" ||
		jobMetadata["model_version"] != "material_balance.v1" ||
		jobMetadata["benchmark_case_id"] != "bc_material_balance_minimal_v1" ||
		jobMetadata["parameter_set_id"] != "ps_material_balance_default_v1" ||
		jobMetadata["parameter_hash"] != "sha256:abc" ||
		jobMetadata["parameter_set_status"] != ParameterSetStatusApproved ||
		jobMetadata["benchmark_run_required"] != true {
		t.Fatalf("unexpected benchmark metadata: %#v", jobMetadata)
	}
	if !reflect.DeepEqual(jobMetadata["expected_metrics"], expectedMetrics) ||
		!reflect.DeepEqual(jobMetadata["tolerance"], tolerance) ||
		!reflect.DeepEqual(jobMetadata["input_ref"], inputRef) {
		t.Fatalf("unexpected benchmark metadata refs: %#v", jobMetadata)
	}
	if _, ok := metadata["source"]; ok {
		t.Fatalf("input metadata should not be mutated: %#v", metadata)
	}
}

func TestBuildBenchmarkCaseRunJobDocumentDefaultsSanitizedIDs(t *testing.T) {
	document := BuildBenchmarkCaseRunJobDocument(BenchmarkCaseRunJobDocumentInput{
		ModelKey:        " material balance ",
		ModelVersion:    "model/version v1",
		BenchmarkCaseID: "bc:demo/v1",
		JobType:         "simulation.material_balance.v1",
		SourceSystem:    "compute-api",
		RequestedBy:     "tester",
		TimestampID:     "20260602204530",
		CreatedAt:       "2026-06-02T20:45:30Z",
		Metadata: map[string]any{
			"tenant_id":  "tenant_a",
			"site_id":    "site_1",
			"project_id": "project_1",
		},
		SimulationInput: map[string]any{"simulation_input_id": "si_1"},
		Execution:       map[string]any{"required_capabilities": []any{"material_balance"}},
	})

	expectedRequestID := "bench_req_material_balance_model_version_v1_bc_demo_v1_20260602204530"
	job := document.Job
	if job["request_id"] != expectedRequestID ||
		job["job_id"] != "job_benchmark_"+expectedRequestID ||
		job["idempotency_key"] != "benchmark:"+expectedRequestID ||
		document.IdempotencyKey != "benchmark:"+expectedRequestID {
		t.Fatalf("unexpected default ids: %#v", job)
	}
	context := testMap(t, job, "context")
	if context["trace_id"] != "trace_benchmark_"+expectedRequestID ||
		context["tenant_id"] != "tenant_a" ||
		context["site_id"] != "site_1" ||
		context["project_id"] != "project_1" {
		t.Fatalf("unexpected default context: %#v", context)
	}
}

func testMap(t *testing.T, value map[string]any, key string) map[string]any {
	t.Helper()
	raw, ok := value[key].(map[string]any)
	if !ok {
		t.Fatalf("expected %s to be object, got %#v", key, value[key])
	}
	return raw
}

func testSlice(t *testing.T, value map[string]any, key string) []any {
	t.Helper()
	raw, ok := value[key].([]any)
	if !ok {
		t.Fatalf("expected %s to be array, got %#v", key, value[key])
	}
	return raw
}

func testModelByKey(t *testing.T, models []any, modelKey string) map[string]any {
	t.Helper()
	for _, item := range models {
		model, ok := item.(map[string]any)
		if !ok {
			t.Fatalf("expected model to be object, got %#v", item)
		}
		if model["model_key"] == modelKey {
			return model
		}
	}
	t.Fatalf("model %q not found in %#v", modelKey, models)
	return nil
}

func testFirstVersion(t *testing.T, model map[string]any) map[string]any {
	t.Helper()
	versions := testSlice(t, model, "versions")
	if len(versions) != 1 {
		t.Fatalf("expected one version, got %#v", versions)
	}
	version, ok := versions[0].(map[string]any)
	if !ok {
		t.Fatalf("expected version object, got %#v", versions[0])
	}
	return version
}

func testFirstBenchmarkCase(t *testing.T, version map[string]any) map[string]any {
	t.Helper()
	cases := testSlice(t, version, "benchmark_cases")
	if len(cases) != 1 {
		t.Fatalf("expected one benchmark case, got %#v", cases)
	}
	benchmarkCase, ok := cases[0].(map[string]any)
	if !ok {
		t.Fatalf("expected benchmark case object, got %#v", cases[0])
	}
	return benchmarkCase
}

func testParameterTemplateByKey(t *testing.T, templates []any, parameterKey string) map[string]any {
	t.Helper()
	for _, item := range templates {
		template, ok := item.(map[string]any)
		if !ok {
			t.Fatalf("expected parameter template object, got %#v", item)
		}
		if template["parameter_key"] == parameterKey {
			return template
		}
	}
	t.Fatalf("parameter template %q not found in %#v", parameterKey, templates)
	return nil
}

func TestRunFieldsFromRaw(t *testing.T) {
	raw := json.RawMessage(`{
		"model_run_id": " mr_1 ",
		"job_id": " job_1 ",
		"model_key": " material_balance ",
		"model_version": " 1.0.0 ",
		"metadata": {"parameter_set_id": " ps_default "}
	}`)
	modelRunID, jobID, modelKey, modelVersion, parameterSetID, err := RunFieldsFromRaw(raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if modelRunID != "mr_1" || jobID != "job_1" || modelKey != "material_balance" || modelVersion != "1.0.0" || parameterSetID != "ps_default" {
		t.Fatalf("unexpected fields: %q %q %q %q %q", modelRunID, jobID, modelKey, modelVersion, parameterSetID)
	}
	identity, err := RunIdentityFromRaw(raw)
	if err != nil {
		t.Fatalf("unexpected identity error: %v", err)
	}
	if identity.ModelRunID != "mr_1" || identity.JobID != "job_1" || identity.ModelKey != "material_balance" || identity.ModelVersion != "1.0.0" || identity.ParameterSetID != "ps_default" {
		t.Fatalf("unexpected identity: %#v", identity)
	}
	if RunIDFromRaw(raw) != "mr_1" {
		t.Fatalf("unexpected model run id: %q", RunIDFromRaw(raw))
	}
}

func TestRunIdentityFromRawIncludesParameterHash(t *testing.T) {
	raw := json.RawMessage(`{
		"model_run_id": "mr_1",
		"job_id": "job_1",
		"model_key": "material_balance",
		"model_version": "material_balance.v1",
		"parameter_hash": " sha256:abc "
	}`)
	identity, err := RunIdentityFromRaw(raw)
	if err != nil {
		t.Fatalf("unexpected identity error: %v", err)
	}
	if identity.ParameterHash != "sha256:abc" {
		t.Fatalf("unexpected parameter hash: %q", identity.ParameterHash)
	}
}

func TestCheckRunIdentity(t *testing.T) {
	identity := RunIdentity{
		JobID:         "job_1",
		ModelKey:      "material_balance",
		ModelVersion:  "material_balance.v1",
		ParameterHash: "sha256:abc",
	}
	check := CheckRunIdentity(identity, RunIdentityExpectation{
		JobID:         " job_1 ",
		ModelKey:      " material_balance ",
		ModelVersion:  " material_balance.v1 ",
		ParameterHash: " sha256:abc ",
	})
	if !check.IdentityMatches || !check.ParameterHashMatches {
		t.Fatalf("expected identity and hash match: %#v", check)
	}
	if len(check.BlockingReasons) != 0 {
		t.Fatalf("expected no blocking reasons, got %#v", check.BlockingReasons)
	}

	check = CheckRunIdentity(identity, RunIdentityExpectation{
		JobID:         "job_other",
		ModelKey:      "material_balance",
		ModelVersion:  "material_balance.v1",
		ParameterHash: "sha256:abc",
	})
	if check.IdentityMatches || !check.ParameterHashMatches {
		t.Fatalf("expected only identity mismatch: %#v", check)
	}
	if got, want := check.BlockingReasons, []string{PromotionBlockModelRunIdentityMismatch}; !reflect.DeepEqual(got, want) {
		t.Fatalf("blocking reasons mismatch: got %#v want %#v", got, want)
	}

	check = CheckRunIdentity(identity, RunIdentityExpectation{
		JobID:         "job_1",
		ModelKey:      "material_balance",
		ModelVersion:  "material_balance.v1",
		ParameterHash: "sha256:other",
	})
	if !check.IdentityMatches || check.ParameterHashMatches {
		t.Fatalf("expected only parameter hash mismatch: %#v", check)
	}
	if got, want := check.BlockingReasons, []string{PromotionBlockModelRunParameterHashMismatch}; !reflect.DeepEqual(got, want) {
		t.Fatalf("blocking reasons mismatch: got %#v want %#v", got, want)
	}

	check = CheckRunIdentity(identity, RunIdentityExpectation{
		JobID:         "job_other",
		ModelKey:      "material_balance",
		ModelVersion:  "material_balance.v2",
		ParameterHash: "sha256:other",
	})
	want := []string{
		PromotionBlockModelRunIdentityMismatch,
		PromotionBlockModelRunParameterHashMismatch,
	}
	if check.IdentityMatches || check.ParameterHashMatches {
		t.Fatalf("expected identity and hash mismatch: %#v", check)
	}
	if !reflect.DeepEqual(check.BlockingReasons, want) {
		t.Fatalf("blocking reasons mismatch: got %#v want %#v", check.BlockingReasons, want)
	}
}

func TestRunRefsAndWarningsFromRaw(t *testing.T) {
	raw := json.RawMessage(`{
		"evidence_refs": ["artifact:a1", " model_run:m1 ", "", 42],
		"warnings": [" warn-1 ", "", "warn-2"]
	}`)
	if got, want := RunEvidenceRefsFromRaw(raw), []string{"artifact:a1", "model_run:m1"}; !reflect.DeepEqual(got, want) {
		t.Fatalf("evidence refs mismatch: got %#v want %#v", got, want)
	}
	if got, want := RunWarningsFromRaw(raw), []string{"warn-1", "warn-2"}; !reflect.DeepEqual(got, want) {
		t.Fatalf("warnings mismatch: got %#v want %#v", got, want)
	}
}

func TestModelRunDocumentsFromComputeResult(t *testing.T) {
	result := map[string]any{
		"runtime_audit": map[string]any{
			"model_runs": []any{
				map[string]any{
					"model_run_id": "mr_1",
					"job_id":       " job_1 ",
				},
				map[string]any{
					"model_run_id": "mr_2",
				},
			},
		},
	}
	modelRuns, err := ModelRunDocumentsFromComputeResult(result, "job_1")
	if err != nil {
		t.Fatalf("unexpected extraction error: %v", err)
	}
	if len(modelRuns) != 2 {
		t.Fatalf("expected 2 model runs, got %d", len(modelRuns))
	}
	if modelRuns[0]["model_run_id"] != "mr_1" || modelRuns[1]["model_run_id"] != "mr_2" {
		t.Fatalf("unexpected model runs: %#v", modelRuns)
	}
}

func TestModelRunDocumentsFromComputeResultMissingRuntimeAudit(t *testing.T) {
	modelRuns, err := ModelRunDocumentsFromComputeResult(map[string]any{}, "job_1")
	if err != nil {
		t.Fatalf("unexpected extraction error: %v", err)
	}
	if modelRuns != nil {
		t.Fatalf("expected nil model runs for missing runtime_audit, got %#v", modelRuns)
	}
}

func TestModelRunDocumentsFromComputeResultRejectsInvalidItems(t *testing.T) {
	result := map[string]any{
		"runtime_audit": map[string]any{
			"model_runs": []any{"not_an_object"},
		},
	}
	_, err := ModelRunDocumentsFromComputeResult(result, "job_1")
	if err == nil || err.Error() != "runtime_audit.model_runs items must be objects" {
		t.Fatalf("unexpected extraction error: %v", err)
	}
}

func TestModelRunDocumentsFromComputeResultRejectsJobIDMismatch(t *testing.T) {
	result := map[string]any{
		"runtime_audit": map[string]any{
			"model_runs": []any{
				map[string]any{
					"model_run_id": "mr_1",
					"job_id":       "job_other",
				},
			},
		},
	}
	_, err := ModelRunDocumentsFromComputeResult(result, "job_1")
	if err == nil || err.Error() != "model_run job_id does not match completed job" {
		t.Fatalf("unexpected extraction error: %v", err)
	}
}

func TestBenchmarkRunEvidenceRefs(t *testing.T) {
	document := map[string]any{
		"evidence_refs": []any{" model_run:mr_1 ", "", 42, "artifact:a1"},
	}
	if got, want := BenchmarkRunEvidenceRefs(document), []string{"model_run:mr_1", "artifact:a1"}; !reflect.DeepEqual(got, want) {
		t.Fatalf("benchmark evidence refs mismatch: got %#v want %#v", got, want)
	}
	raw := json.RawMessage(`{"evidence_refs":[" job:j1 ","",false]}`)
	if got, want := BenchmarkRunEvidenceRefsFromRaw(raw), []string{"job:j1"}; !reflect.DeepEqual(got, want) {
		t.Fatalf("benchmark raw evidence refs mismatch: got %#v want %#v", got, want)
	}
	if refs := BenchmarkRunEvidenceRefsFromRaw(json.RawMessage(`{`)); refs != nil {
		t.Fatalf("expected nil refs for invalid benchmark raw, got %#v", refs)
	}
}

func TestParameterSetStatuses(t *testing.T) {
	valid := []string{
		ParameterSetStatusDraft,
		ParameterSetStatusCandidate,
		ParameterSetStatusValidated,
		ParameterSetStatusApproved,
		ParameterSetStatusRetired,
	}
	for _, status := range valid {
		if !IsParameterSetStatus(status) {
			t.Fatalf("expected %q to be valid", status)
		}
	}
	for _, status := range []string{"", "unknown", " draft "} {
		if IsParameterSetStatus(status) {
			t.Fatalf("expected %q to be invalid", status)
		}
	}
}

func TestCanTransitionParameterSetStatus(t *testing.T) {
	allowed := [][2]string{
		{ParameterSetStatusDraft, ParameterSetStatusCandidate},
		{ParameterSetStatusCandidate, ParameterSetStatusValidated},
		{ParameterSetStatusValidated, ParameterSetStatusApproved},
		{ParameterSetStatusDraft, ParameterSetStatusRetired},
		{ParameterSetStatusApproved, ParameterSetStatusRetired},
	}
	for _, transition := range allowed {
		if !CanTransitionParameterSetStatus(transition[0], transition[1]) {
			t.Fatalf("expected transition %q -> %q to be allowed", transition[0], transition[1])
		}
	}

	blocked := [][2]string{
		{ParameterSetStatusDraft, ParameterSetStatusValidated},
		{ParameterSetStatusApproved, ParameterSetStatusValidated},
		{ParameterSetStatusRetired, ParameterSetStatusApproved},
		{"unknown", ParameterSetStatusCandidate},
		{ParameterSetStatusCandidate, "unknown"},
	}
	for _, transition := range blocked {
		if CanTransitionParameterSetStatus(transition[0], transition[1]) {
			t.Fatalf("expected transition %q -> %q to be blocked", transition[0], transition[1])
		}
	}
}

func TestEvaluateBenchmarkCaseRunGateReady(t *testing.T) {
	gate := EvaluateBenchmarkCaseRunGate(BenchmarkCaseRunGateInput{
		ModelVersionStatus:     ModelVersionStatusActive,
		BenchmarkCaseFound:     true,
		BenchmarkCaseStatus:    BenchmarkCaseStatusValidated,
		HasDefaultParameterSet: true,
		ParameterSetStatus:     ParameterSetStatusValidated,
	})
	if !gate.CanSchedule {
		t.Fatalf("expected benchmark case to be schedulable: %#v", gate)
	}
	if !gate.ModelVersionActive || !gate.BenchmarkCaseFound || !gate.BenchmarkCaseValidated || !gate.HasDefaultParameterSet || gate.ParameterSetRetired {
		t.Fatalf("unexpected gate fields: %#v", gate)
	}
	if len(gate.BlockingReasons) != 0 {
		t.Fatalf("expected no blockers, got %#v", gate.BlockingReasons)
	}
}

func TestEvaluateBenchmarkCaseRunGateBlocksInvalidInputs(t *testing.T) {
	gate := EvaluateBenchmarkCaseRunGate(BenchmarkCaseRunGateInput{
		ModelVersionStatus:     "deprecated",
		BenchmarkCaseFound:     true,
		BenchmarkCaseStatus:    "draft",
		HasDefaultParameterSet: true,
		ParameterSetStatus:     ParameterSetStatusRetired,
	})
	want := []string{
		BenchmarkWorkflowBlockBenchmarkCaseNotValid,
		BenchmarkWorkflowBlockModelVersionNotActive,
		BenchmarkWorkflowBlockParameterSetRetired,
	}
	if gate.CanSchedule {
		t.Fatalf("expected benchmark case scheduling to be blocked")
	}
	if !reflect.DeepEqual(gate.BlockingReasons, want) {
		t.Fatalf("blocking reasons mismatch: got %#v want %#v", gate.BlockingReasons, want)
	}
}

func TestEvaluateBenchmarkCaseRunGateBlocksMissingCaseAndParameterSet(t *testing.T) {
	gate := EvaluateBenchmarkCaseRunGate(BenchmarkCaseRunGateInput{
		ModelVersionStatus:     ModelVersionStatusActive,
		BenchmarkCaseFound:     false,
		BenchmarkCaseStatus:    BenchmarkCaseStatusValidated,
		HasDefaultParameterSet: false,
	})
	want := []string{
		BenchmarkWorkflowBlockBenchmarkCaseNotFound,
		BenchmarkWorkflowBlockDefaultParameterSetMiss,
	}
	if gate.CanSchedule {
		t.Fatalf("expected benchmark case scheduling to be blocked")
	}
	if !reflect.DeepEqual(gate.BlockingReasons, want) {
		t.Fatalf("blocking reasons mismatch: got %#v want %#v", gate.BlockingReasons, want)
	}
}

func TestEvaluateBenchmarkRunAdmissionReady(t *testing.T) {
	admission := EvaluateBenchmarkRunAdmission(BenchmarkRunAdmissionInput{
		BenchmarkCaseFound:    true,
		BenchmarkCaseStatus:   BenchmarkCaseStatusValidated,
		DefaultParameterSetID: " ps_default ",
		RequestedParameterSet: "ps_default",
	})
	if !admission.CanRecord {
		t.Fatalf("expected benchmark run to be recordable: %#v", admission)
	}
	if !admission.BenchmarkCaseFound || !admission.BenchmarkCaseValidated || !admission.ParameterSetMatches {
		t.Fatalf("unexpected admission fields: %#v", admission)
	}
	if len(admission.BlockingReasons) != 0 {
		t.Fatalf("expected no blockers, got %#v", admission.BlockingReasons)
	}
}

func TestEvaluateBenchmarkRunAdmissionBlocksCaseAndParameterSet(t *testing.T) {
	admission := EvaluateBenchmarkRunAdmission(BenchmarkRunAdmissionInput{
		BenchmarkCaseFound:    true,
		BenchmarkCaseStatus:   "draft",
		DefaultParameterSetID: "ps_default",
		RequestedParameterSet: "ps_other",
	})
	want := []string{
		BenchmarkWorkflowBlockBenchmarkCaseNotValid,
		BenchmarkWorkflowBlockParameterSetMismatch,
	}
	if admission.CanRecord {
		t.Fatalf("expected benchmark run admission to be blocked")
	}
	if !reflect.DeepEqual(admission.BlockingReasons, want) {
		t.Fatalf("blocking reasons mismatch: got %#v want %#v", admission.BlockingReasons, want)
	}
}

func TestEvaluateBenchmarkRunAdmissionBlocksMissingCaseAndDefaultParameterSet(t *testing.T) {
	admission := EvaluateBenchmarkRunAdmission(BenchmarkRunAdmissionInput{
		BenchmarkCaseFound:    false,
		BenchmarkCaseStatus:   BenchmarkCaseStatusValidated,
		DefaultParameterSetID: "",
		RequestedParameterSet: "ps_default",
	})
	want := []string{
		BenchmarkWorkflowBlockBenchmarkCaseNotFound,
		BenchmarkWorkflowBlockParameterSetMismatch,
	}
	if admission.CanRecord {
		t.Fatalf("expected benchmark run admission to be blocked")
	}
	if !reflect.DeepEqual(admission.BlockingReasons, want) {
		t.Fatalf("blocking reasons mismatch: got %#v want %#v", admission.BlockingReasons, want)
	}
}

func TestEvaluateBenchmarkCasePromotionReadinessReady(t *testing.T) {
	readiness := EvaluateBenchmarkCasePromotionReadiness(BenchmarkCasePromotionReadinessInput{
		BenchmarkRunStatus:   BenchmarkRunStatusPassed,
		ParameterHashMatches: true,
	})
	if !readiness.Ready {
		t.Fatalf("expected benchmark case to be ready: %#v", readiness)
	}
	if len(readiness.BlockingReasons) != 0 {
		t.Fatalf("expected no blocking reasons, got %#v", readiness.BlockingReasons)
	}
}

func TestEvaluateBenchmarkCasePromotionReadinessBlocksRunStatusAndHash(t *testing.T) {
	readiness := EvaluateBenchmarkCasePromotionReadiness(BenchmarkCasePromotionReadinessInput{
		BenchmarkRunStatus:   "failed",
		ParameterHashMatches: false,
		BlockingReasons: []string{
			" custom_blocker ",
			PromotionBlockLatestBenchmarkRunNotPassed,
			"",
		},
	})
	want := []string{
		"custom_blocker",
		PromotionBlockLatestBenchmarkRunNotPassed,
		PromotionBlockModelRunParameterHashMismatch,
	}
	if readiness.Ready {
		t.Fatalf("expected benchmark case to be blocked")
	}
	if !reflect.DeepEqual(readiness.BlockingReasons, want) {
		t.Fatalf("blocking reasons mismatch: got %#v want %#v", readiness.BlockingReasons, want)
	}
}

func TestEvaluateBenchmarkCasePromotionReadinessPreservesExistingBlockers(t *testing.T) {
	readiness := EvaluateBenchmarkCasePromotionReadiness(BenchmarkCasePromotionReadinessInput{
		BenchmarkRunStatus:   BenchmarkRunStatusPassed,
		ParameterHashMatches: true,
		BlockingReasons: []string{
			PromotionBlockModelRunNotFound,
			" " + PromotionBlockModelRunNotFound + " ",
		},
	})
	want := []string{PromotionBlockModelRunNotFound}
	if readiness.Ready {
		t.Fatalf("expected existing blocker to keep benchmark case blocked")
	}
	if !reflect.DeepEqual(readiness.BlockingReasons, want) {
		t.Fatalf("blocking reasons mismatch: got %#v want %#v", readiness.BlockingReasons, want)
	}
}

func TestEvaluateParameterSetPromotionGateReady(t *testing.T) {
	gate := EvaluateParameterSetPromotionGate(ParameterSetPromotionGateInput{
		ModelVersionStatus:    ModelVersionStatusActive,
		ParameterSetStatus:    ParameterSetStatusValidated,
		BenchmarkCasesChecked: 2,
		BenchmarkCasesPassed:  2,
	})
	if !gate.CanPromoteToApproved {
		t.Fatalf("expected promotion to be allowed: %#v", gate)
	}
	if len(gate.BlockingReasons) != 0 {
		t.Fatalf("expected no blocking reasons, got %#v", gate.BlockingReasons)
	}
}

func TestEvaluateParameterSetPromotionGateBlocksVersionStatusParameterStatusAndCases(t *testing.T) {
	gate := EvaluateParameterSetPromotionGate(ParameterSetPromotionGateInput{
		ModelVersionStatus:    "deprecated",
		ParameterSetStatus:    ParameterSetStatusApproved,
		BenchmarkCasesChecked: 0,
		BenchmarkCasesPassed:  0,
		BlockingReasons: []string{
			" latest_benchmark_run_not_passed ",
			PromotionBlockModelVersionNotActive,
			"",
		},
	})
	want := []string{
		"latest_benchmark_run_not_passed",
		PromotionBlockModelVersionNotActive,
		PromotionBlockNoValidatedBenchmarkCases,
		PromotionBlockParameterSetAlreadyApproved,
	}
	if gate.CanPromoteToApproved {
		t.Fatalf("expected promotion to be blocked")
	}
	if !reflect.DeepEqual(gate.BlockingReasons, want) {
		t.Fatalf("blocking reasons mismatch: got %#v want %#v", gate.BlockingReasons, want)
	}
}

func TestEvaluateParameterSetPromotionGateRequiresValidatedParameterSet(t *testing.T) {
	gate := EvaluateParameterSetPromotionGate(ParameterSetPromotionGateInput{
		ModelVersionStatus:    ModelVersionStatusActive,
		ParameterSetStatus:    ParameterSetStatusDraft,
		BenchmarkCasesChecked: 1,
		BenchmarkCasesPassed:  1,
	})
	want := []string{PromotionBlockParameterSetStatusMustBeValidated}
	if gate.CanPromoteToApproved {
		t.Fatalf("expected promotion to be blocked")
	}
	if !reflect.DeepEqual(gate.BlockingReasons, want) {
		t.Fatalf("blocking reasons mismatch: got %#v want %#v", gate.BlockingReasons, want)
	}
}

func TestEvaluateParameterSetPromotionGatePreservesCaseBlockingReasons(t *testing.T) {
	gate := EvaluateParameterSetPromotionGate(ParameterSetPromotionGateInput{
		ModelVersionStatus:    ModelVersionStatusActive,
		ParameterSetStatus:    ParameterSetStatusValidated,
		BenchmarkCasesChecked: 2,
		BenchmarkCasesPassed:  1,
		BlockingReasons: []string{
			"latest_benchmark_run_not_passed",
			" latest_benchmark_run_not_passed ",
		},
	})
	want := []string{"latest_benchmark_run_not_passed"}
	if gate.CanPromoteToApproved {
		t.Fatalf("expected promotion to be blocked")
	}
	if !reflect.DeepEqual(gate.BlockingReasons, want) {
		t.Fatalf("blocking reasons mismatch: got %#v want %#v", gate.BlockingReasons, want)
	}
}

func TestEvaluateModelRunProductionGate(t *testing.T) {
	gate := EvaluateModelRunProductionGate(ModelRunProductionGateInput{
		ModelVersionStatus: " " + ModelVersionStatusActive + " ",
		ParameterSetStatus: " " + ParameterSetStatusApproved + " ",
	})
	if !gate.ModelVersionActive || !gate.ParameterSetApproved || !gate.ProductionAllowed {
		t.Fatalf("expected active approved model run to be production allowed: %#v", gate)
	}

	for _, input := range []ModelRunProductionGateInput{
		{ModelVersionStatus: "retired", ParameterSetStatus: ParameterSetStatusApproved},
		{ModelVersionStatus: ModelVersionStatusActive, ParameterSetStatus: ParameterSetStatusValidated},
		{ModelVersionStatus: "", ParameterSetStatus: ""},
	} {
		gate := EvaluateModelRunProductionGate(input)
		if gate.ProductionAllowed {
			t.Fatalf("expected production gate to block %#v, got %#v", input, gate)
		}
		if gate.ModelVersionActive != (input.ModelVersionStatus == ModelVersionStatusActive) {
			t.Fatalf("unexpected model active flag for %#v: %#v", input, gate)
		}
		if gate.ParameterSetApproved != (input.ParameterSetStatus == ParameterSetStatusApproved) {
			t.Fatalf("unexpected parameter approved flag for %#v: %#v", input, gate)
		}
	}
}

func TestInvalidRawReturnsEmptyValues(t *testing.T) {
	raw := json.RawMessage(`{`)
	if id := RunIDFromRaw(raw); id != "" {
		t.Fatalf("expected empty id for invalid raw, got %q", id)
	}
	if refs := RunEvidenceRefsFromRaw(raw); refs != nil {
		t.Fatalf("expected nil refs for invalid raw, got %#v", refs)
	}
	if warnings := RunWarningsFromRaw(raw); warnings != nil {
		t.Fatalf("expected nil warnings for invalid raw, got %#v", warnings)
	}
	if _, _, _, _, _, err := RunFieldsFromRaw(raw); err == nil {
		t.Fatal("expected error for invalid raw")
	}
	if _, err := RunIdentityFromRaw(raw); err == nil {
		t.Fatal("expected identity error for invalid raw")
	}
}
