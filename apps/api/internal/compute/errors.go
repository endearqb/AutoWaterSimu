package compute

import (
	"encoding/json"
	"errors"
	"net/http"
)

const (
	CodeValidationFailed             = "VALIDATION_FAILED"
	CodeIdempotencyConflict          = "IDEMPOTENCY_CONFLICT"
	CodeUnauthorized                 = "UNAUTHORIZED"
	CodeForbidden                    = "FORBIDDEN"
	CodeJobNotFound                  = "JOB_NOT_FOUND"
	CodeArtifactNotFound             = "ARTIFACT_NOT_FOUND"
	CodeModelRunNotFound             = "MODEL_RUN_NOT_FOUND"
	CodeModelCatalogNotFound         = "MODEL_CATALOG_NOT_FOUND"
	CodeProcessGraphNotFound         = "PROCESS_GRAPH_NOT_FOUND"
	CodeSimulationInputNotFound      = "SIMULATION_INPUT_NOT_FOUND"
	CodeDraftConfirmationNotFound    = "DRAFT_CONFIRMATION_NOT_FOUND"
	CodeDraftConfirmationNotApproved = "DRAFT_CONFIRMATION_NOT_APPROVED"
	CodeEvidenceUnavailable          = "EVIDENCE_UNAVAILABLE"
	CodeJobAlreadyTerminal           = "JOB_ALREADY_TERMINAL"
	CodeWorkerStale                  = "WORKER_STALE"
	CodeTimeout                      = "TIMEOUT"
	CodeInternal                     = "INTERNAL_ERROR"
)

type AppError struct {
	Status      int            `json:"-"`
	ErrorSchema string         `json:"schema_version"`
	ErrorCode   string         `json:"error_code"`
	Message     string         `json:"message"`
	Retryable   bool           `json:"retryable"`
	Details     map[string]any `json:"details,omitempty"`
}

func (err *AppError) Error() string {
	return err.Message
}

func NewAppError(status int, code, message string, retryable bool, details map[string]any) *AppError {
	return &AppError{
		Status:      status,
		ErrorSchema: "contract_error.v1",
		ErrorCode:   code,
		Message:     message,
		Retryable:   retryable,
		Details:     details,
	}
}

func ValidationError(message string) *AppError {
	return NewAppError(http.StatusBadRequest, CodeValidationFailed, message, false, nil)
}

func NotFound(code, message string) *AppError {
	return NewAppError(http.StatusNotFound, code, message, false, nil)
}

func Conflict(code, message string) *AppError {
	return NewAppError(http.StatusConflict, code, message, false, nil)
}

func ToAppError(err error) *AppError {
	if err == nil {
		return nil
	}
	var appErr *AppError
	if errors.As(err, &appErr) {
		return appErr
	}
	return NewAppError(http.StatusInternalServerError, CodeInternal, err.Error(), true, nil)
}

func WriteJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}

func WriteError(w http.ResponseWriter, err error) {
	appErr := ToAppError(err)
	WriteJSON(w, appErr.Status, appErr)
}
