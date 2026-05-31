package compute

import "encoding/json"

func validateContractDocument(bytes []byte, validator *ContractValidator) (ContractValidationResponse, error) {
	response := ContractValidationResponse{
		SchemaVersion: "contract_validation.v1",
		Errors:        []ContractValidationIssue{},
		Warnings:      []string{},
	}
	var document map[string]any
	if err := json.Unmarshal(bytes, &document); err != nil {
		return response, ValidationError("contract document JSON is invalid")
	}
	schemaVersion := stringValue(document, "schema_version")
	response.DocumentSchemaVersion = schemaVersion
	if schemaVersion == "" {
		response.Errors = append(response.Errors, ContractValidationIssue{
			Path:    "/schema_version",
			Message: "schema_version is required",
		})
		return response, nil
	}
	schemaName, ok := ContractSchemaName(schemaVersion)
	if !ok {
		response.Errors = append(response.Errors, ContractValidationIssue{
			Path:    "/schema_version",
			Message: "unsupported schema_version: " + schemaVersion,
		})
		return response, nil
	}
	response.ContractSchema = schemaName
	if validator == nil {
		return response, NewAppError(500, CodeInternal, "contract validator is not configured", true, nil)
	}
	if err := validator.Validate(schemaName, document); err != nil {
		response.Errors = append(response.Errors, ContractValidationIssue{
			Path:    "/",
			Message: err.Error(),
		})
		return response, nil
	}
	response.Valid = true
	return response, nil
}
