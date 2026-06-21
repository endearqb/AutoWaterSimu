package compute

import (
	"encoding/json"

	platformcontracts "autowatersimu/apps/api/internal/platform/contracts"
)

type ContractValidator = platformcontracts.Validator

var NewContractValidator = platformcontracts.NewValidator
var NewContractValidatorFromDir = platformcontracts.NewValidatorFromDir

func ContractSchemaName(schemaVersion string) (string, bool) {
	return platformcontracts.SchemaName(schemaVersion)
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
