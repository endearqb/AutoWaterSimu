package compute

import (
	"encoding/json"
	"fmt"
	"path/filepath"

	"github.com/santhosh-tekuri/jsonschema/v6"
)

var contractSchemaFiles = []string{
	"compute_job.v1.json",
	"compute_result.v1.json",
	"artifact.v1.json",
	"model_run.v1.json",
	"model_catalog.v1.json",
	"benchmark_run.v1.json",
	"evidence_package.v1.json",
	"production_readiness.v1.json",
	"simulation_request.v1.json",
	"agent_scenario_draft.v1.json",
	"constraint_draft.v1.json",
	"draft_confirmation.v1.json",
	"result_explanation.v1.json",
	"process_graph.v1.json",
	"simulation_input.v1.json",
	"contract_error.v1.json",
}

var contractSchemaByVersion = map[string]string{
	"compute_job.v1":          "compute_job.v1.json",
	"compute_result.v1":       "compute_result.v1.json",
	"artifact.v1":             "artifact.v1.json",
	"model_run.v1":            "model_run.v1.json",
	"model_catalog.v1":        "model_catalog.v1.json",
	"benchmark_run.v1":        "benchmark_run.v1.json",
	"evidence_package.v1":     "evidence_package.v1.json",
	"production_readiness.v1": "production_readiness.v1.json",
	"simulation_request.v1":   "simulation_request.v1.json",
	"agent_scenario_draft.v1": "agent_scenario_draft.v1.json",
	"constraint_draft.v1":     "constraint_draft.v1.json",
	"draft_confirmation.v1":   "draft_confirmation.v1.json",
	"result_explanation.v1":   "result_explanation.v1.json",
	"process_graph.v1":        "process_graph.v1.json",
	"simulation_input.v1":     "simulation_input.v1.json",
	"contract_error.v1":       "contract_error.v1.json",
}

type ContractValidator struct {
	schemas map[string]*jsonschema.Schema
}

func NewContractValidator(repoRoot string) (*ContractValidator, error) {
	contractsDir := filepath.Join(repoRoot, "contracts")
	compiler := jsonschema.NewCompiler()
	compiler.DefaultDraft(jsonschema.Draft2020)
	schemas := map[string]*jsonschema.Schema{}
	for _, name := range contractSchemaFiles {
		schema, err := compiler.Compile(fileURL(filepath.Join(contractsDir, name)))
		if err != nil {
			return nil, fmt.Errorf("compile contract schema %s failed: %w", name, err)
		}
		schemas[name] = schema
	}
	return &ContractValidator{schemas: schemas}, nil
}

func (validator *ContractValidator) Validate(schemaName string, value any) error {
	schema, ok := validator.schemas[schemaName]
	if !ok {
		return ValidationError("unknown schema: " + schemaName)
	}
	if err := schema.Validate(value); err != nil {
		return ValidationError(err.Error())
	}
	return nil
}

func ContractSchemaName(schemaVersion string) (string, bool) {
	schemaName, ok := contractSchemaByVersion[schemaVersion]
	return schemaName, ok
}

func DecodeComputeJob(bytes []byte, validator *ContractValidator) (ComputeJob, error) {
	var raw map[string]any
	if err := json.Unmarshal(bytes, &raw); err != nil {
		return ComputeJob{}, ValidationError("compute_job JSON is invalid")
	}
	if validator != nil {
		if err := validator.Validate("compute_job.v1.json", raw); err != nil {
			return ComputeJob{}, err
		}
	}
	var job ComputeJob
	if err := json.Unmarshal(bytes, &job); err != nil {
		return ComputeJob{}, ValidationError("compute_job JSON shape is invalid")
	}
	job.Raw = raw
	return job, nil
}

func fileURL(path string) string {
	slashPath := filepath.ToSlash(path)
	if len(slashPath) >= 2 && slashPath[1] == ':' {
		return "file:///" + slashPath
	}
	return "file://" + slashPath
}

func DecodeArtifactMetadata(text string, validator *ContractValidator) (map[string]any, error) {
	var raw map[string]any
	if err := json.Unmarshal([]byte(text), &raw); err != nil {
		return nil, ValidationError("artifact metadata JSON is invalid")
	}
	if validator != nil {
		if err := validator.Validate("artifact.v1.json", raw); err != nil {
			return nil, err
		}
	}
	return raw, nil
}
