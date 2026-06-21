package contracts

import (
	"encoding/json"
	"fmt"
	"net/http"
	"path/filepath"
	"strings"

	"github.com/santhosh-tekuri/jsonschema/v6"
)

const CodeValidationFailed = "VALIDATION_FAILED"
const CodeInternal = "INTERNAL_ERROR"

var schemaFiles = []string{
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

var schemaByVersion = map[string]string{
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

type Error struct {
	Status    int
	Code      string
	Message   string
	Retryable bool
	Details   map[string]any
}

type ValidationIssue struct {
	Path    string `json:"path"`
	Message string `json:"message"`
}

type DocumentValidationResponse struct {
	SchemaVersion         string            `json:"schema_version"`
	DocumentSchemaVersion string            `json:"document_schema_version,omitempty"`
	ContractSchema        string            `json:"contract_schema,omitempty"`
	Valid                 bool              `json:"valid"`
	Errors                []ValidationIssue `json:"errors"`
	Warnings              []string          `json:"warnings"`
}

func (err *Error) Error() string {
	return err.Message
}

func validationError(message string) *Error {
	return &Error{
		Status:  http.StatusBadRequest,
		Code:    CodeValidationFailed,
		Message: message,
	}
}

func internalError(message string) *Error {
	return &Error{
		Status:    http.StatusInternalServerError,
		Code:      CodeInternal,
		Message:   message,
		Retryable: true,
	}
}

type Validator struct {
	schemas map[string]*jsonschema.Schema
}

func NewValidator(repoRoot string) (*Validator, error) {
	return NewValidatorFromDir(filepath.Join(repoRoot, "contracts"))
}

func NewValidatorFromDir(contractsDir string) (*Validator, error) {
	if strings.TrimSpace(contractsDir) == "" {
		return nil, fmt.Errorf("contracts dir is required")
	}
	compiler := jsonschema.NewCompiler()
	compiler.DefaultDraft(jsonschema.Draft2020)
	schemas := map[string]*jsonschema.Schema{}
	for _, name := range schemaFiles {
		schema, err := compiler.Compile(fileURL(filepath.Join(contractsDir, name)))
		if err != nil {
			return nil, fmt.Errorf("compile contract schema %s failed: %w", name, err)
		}
		schemas[name] = schema
	}
	return &Validator{schemas: schemas}, nil
}

func (validator *Validator) Validate(schemaName string, value any) error {
	schema, ok := validator.schemas[schemaName]
	if !ok {
		return validationError("unknown schema: " + schemaName)
	}
	if err := schema.Validate(value); err != nil {
		return validationError(err.Error())
	}
	return nil
}

func SchemaName(schemaVersion string) (string, bool) {
	schemaName, ok := schemaByVersion[schemaVersion]
	return schemaName, ok
}

func ValidateDocument(bytes []byte, validator *Validator) (DocumentValidationResponse, error) {
	response := DocumentValidationResponse{
		SchemaVersion: "contract_validation.v1",
		Errors:        []ValidationIssue{},
		Warnings:      []string{},
	}
	var document map[string]any
	if err := json.Unmarshal(bytes, &document); err != nil {
		return response, validationError("contract document JSON is invalid")
	}
	schemaVersion := stringValue(document, "schema_version")
	response.DocumentSchemaVersion = schemaVersion
	if schemaVersion == "" {
		response.Errors = append(response.Errors, ValidationIssue{
			Path:    "/schema_version",
			Message: "schema_version is required",
		})
		return response, nil
	}
	schemaName, ok := SchemaName(schemaVersion)
	if !ok {
		response.Errors = append(response.Errors, ValidationIssue{
			Path:    "/schema_version",
			Message: "unsupported schema_version: " + schemaVersion,
		})
		return response, nil
	}
	response.ContractSchema = schemaName
	if validator == nil {
		return response, internalError("contract validator is not configured")
	}
	if err := validator.Validate(schemaName, document); err != nil {
		response.Errors = append(response.Errors, ValidationIssue{
			Path:    "/",
			Message: err.Error(),
		})
		return response, nil
	}
	response.Valid = true
	return response, nil
}

func stringValue(value map[string]any, key string) string {
	if value == nil {
		return ""
	}
	raw, ok := value[key]
	if !ok || raw == nil {
		return ""
	}
	text, _ := raw.(string)
	return text
}

func fileURL(path string) string {
	slashPath := filepath.ToSlash(path)
	if len(slashPath) >= 2 && slashPath[1] == ':' {
		return "file:///" + slashPath
	}
	return "file://" + slashPath
}
