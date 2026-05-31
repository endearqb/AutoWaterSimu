package contracts

import (
	"fmt"
	"net/http"
	"path/filepath"

	"github.com/santhosh-tekuri/jsonschema/v6"
)

const CodeValidationFailed = "VALIDATION_FAILED"

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

type Validator struct {
	schemas map[string]*jsonschema.Schema
}

func NewValidator(repoRoot string) (*Validator, error) {
	contractsDir := filepath.Join(repoRoot, "contracts")
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

func fileURL(path string) string {
	slashPath := filepath.ToSlash(path)
	if len(slashPath) >= 2 && slashPath[1] == ':' {
		return "file:///" + slashPath
	}
	return "file://" + slashPath
}
