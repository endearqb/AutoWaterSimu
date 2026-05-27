package compute

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"github.com/santhosh-tekuri/jsonschema/v6"
)

type ContractValidator struct {
	schemas map[string]*jsonschema.Schema
}

func NewContractValidator(repoRoot string) (*ContractValidator, error) {
	contractsDir := filepath.Join(repoRoot, "contracts")
	compiler := jsonschema.NewCompiler()
	for _, name := range []string{"compute_job.v1.json", "compute_result.v1.json", "artifact.v1.json", "contract_error.v1.json"} {
		path := filepath.Join(contractsDir, name)
		file, err := os.Open(path)
		if err != nil {
			return nil, fmt.Errorf("open contract schema %s failed: %w", name, err)
		}
		if err := compiler.AddResource(name, file); err != nil {
			_ = file.Close()
			return nil, fmt.Errorf("add contract schema %s failed: %w", name, err)
		}
		_ = file.Close()
	}
	schemas := map[string]*jsonschema.Schema{}
	for _, name := range []string{"compute_job.v1.json", "compute_result.v1.json", "artifact.v1.json", "contract_error.v1.json"} {
		schema, err := compiler.Compile(name)
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
