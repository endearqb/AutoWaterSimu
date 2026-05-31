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
