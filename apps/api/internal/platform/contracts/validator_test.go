package contracts

import (
	"path/filepath"
	"testing"
)

func repoRootForTest(t *testing.T) string {
	t.Helper()
	root, err := filepath.Abs(filepath.Join("..", "..", "..", "..", ".."))
	if err != nil {
		t.Fatalf("resolve repo root: %v", err)
	}
	return root
}

func TestSchemaNameMapsKnownContract(t *testing.T) {
	schemaName, ok := SchemaName("simulation_request.v1")
	if !ok {
		t.Fatalf("expected simulation_request.v1 schema mapping")
	}
	if schemaName != "simulation_request.v1.json" {
		t.Fatalf("unexpected schema name: %s", schemaName)
	}
}

func TestValidatorRejectsUnknownSchema(t *testing.T) {
	validator, err := NewValidator(repoRootForTest(t))
	if err != nil {
		t.Fatalf("NewValidator returned error: %v", err)
	}

	err = validator.Validate("unknown.v1.json", map[string]any{})
	if err == nil {
		t.Fatalf("expected unknown schema validation error")
	}
	validationErr, ok := err.(*Error)
	if !ok {
		t.Fatalf("expected platform contracts error, got %T", err)
	}
	if validationErr.Code != CodeValidationFailed {
		t.Fatalf("unexpected error code: %s", validationErr.Code)
	}
}

func TestValidatorAcceptsMinimalContractError(t *testing.T) {
	validator, err := NewValidator(repoRootForTest(t))
	if err != nil {
		t.Fatalf("NewValidator returned error: %v", err)
	}

	payload := map[string]any{
		"schema_version": "contract_error.v1",
		"error_code":     "VALIDATION_FAILED",
		"message":        "invalid payload",
		"details":        map[string]any{},
		"retryable":      false,
		"trace_id":       "trace-test",
	}
	if err := validator.Validate("contract_error.v1.json", payload); err != nil {
		t.Fatalf("expected valid contract_error payload: %v", err)
	}
}

func TestValidateDocumentMissingSchemaVersion(t *testing.T) {
	validator, err := NewValidator(repoRootForTest(t))
	if err != nil {
		t.Fatalf("NewValidator returned error: %v", err)
	}

	response, err := ValidateDocument([]byte(`{"request_id":"req_missing_schema"}`), validator)
	if err != nil {
		t.Fatalf("ValidateDocument returned error: %v", err)
	}
	if response.Valid {
		t.Fatalf("expected missing schema_version to be invalid")
	}
	if len(response.Errors) != 1 || response.Errors[0].Path != "/schema_version" {
		t.Fatalf("unexpected errors: %#v", response.Errors)
	}
}

func TestValidateDocumentUnsupportedSchemaVersion(t *testing.T) {
	validator, err := NewValidator(repoRootForTest(t))
	if err != nil {
		t.Fatalf("NewValidator returned error: %v", err)
	}

	response, err := ValidateDocument([]byte(`{"schema_version":"future_contract.v1"}`), validator)
	if err != nil {
		t.Fatalf("ValidateDocument returned error: %v", err)
	}
	if response.Valid || response.ContractSchema != "" {
		t.Fatalf("expected unsupported schema to be invalid without contract schema: %#v", response)
	}
	if len(response.Errors) != 1 || response.Errors[0].Path != "/schema_version" {
		t.Fatalf("unexpected errors: %#v", response.Errors)
	}
}

func TestValidateDocumentInvalidKnownSchema(t *testing.T) {
	validator, err := NewValidator(repoRootForTest(t))
	if err != nil {
		t.Fatalf("NewValidator returned error: %v", err)
	}

	response, err := ValidateDocument([]byte(`{"schema_version":"simulation_request.v1"}`), validator)
	if err != nil {
		t.Fatalf("ValidateDocument returned error: %v", err)
	}
	if response.Valid || response.ContractSchema != "simulation_request.v1.json" || len(response.Errors) == 0 {
		t.Fatalf("expected known schema validation error, got: %#v", response)
	}
}

func TestValidateDocumentValidContractError(t *testing.T) {
	validator, err := NewValidator(repoRootForTest(t))
	if err != nil {
		t.Fatalf("NewValidator returned error: %v", err)
	}

	response, err := ValidateDocument([]byte(`{
		"schema_version":"contract_error.v1",
		"error_code":"VALIDATION_FAILED",
		"message":"invalid payload",
		"details":{},
		"retryable":false,
		"trace_id":"trace-test"
	}`), validator)
	if err != nil {
		t.Fatalf("ValidateDocument returned error: %v", err)
	}
	if !response.Valid || response.ContractSchema != "contract_error.v1.json" || len(response.Errors) != 0 {
		t.Fatalf("expected valid contract_error document, got: %#v", response)
	}
}
