package compute

import (
	domainjobs "autowatersimu/apps/api/internal/domain/jobs"
	"errors"
	"net/http"

	domainworkers "autowatersimu/apps/api/internal/domain/workers"
	platformauth "autowatersimu/apps/api/internal/platform/auth"
	platformcontracts "autowatersimu/apps/api/internal/platform/contracts"
	"autowatersimu/apps/api/internal/platform/httpx"
)

const (
	CodeValidationFailed              = "VALIDATION_FAILED"
	CodeIdempotencyConflict           = "IDEMPOTENCY_CONFLICT"
	CodeUnauthorized                  = "UNAUTHORIZED"
	CodeForbidden                     = "FORBIDDEN"
	CodeJobNotFound                   = "JOB_NOT_FOUND"
	CodeArtifactNotFound              = "ARTIFACT_NOT_FOUND"
	CodeModelRunNotFound              = "MODEL_RUN_NOT_FOUND"
	CodeModelCatalogNotFound          = "MODEL_CATALOG_NOT_FOUND"
	CodeBenchmarkRunNotFound          = "BENCHMARK_RUN_NOT_FOUND"
	CodeParameterSetNotFound          = "PARAMETER_SET_NOT_FOUND"
	CodeParameterSetTransitionFailed  = "PARAMETER_SET_TRANSITION_FAILED"
	CodeProcessGraphNotFound          = "PROCESS_GRAPH_NOT_FOUND"
	CodeSimulationInputNotFound       = "SIMULATION_INPUT_NOT_FOUND"
	CodeDraftConfirmationNotFound     = "DRAFT_CONFIRMATION_NOT_FOUND"
	CodeDraftConfirmationNotApproved  = "DRAFT_CONFIRMATION_NOT_APPROVED"
	CodeResultExplanationNotFound     = "RESULT_EXPLANATION_NOT_FOUND"
	CodeResultExplanationInvalidState = "RESULT_EXPLANATION_INVALID_STATE"
	CodeEvidenceUnavailable           = "EVIDENCE_UNAVAILABLE"
	CodeEvidenceRefNotFound           = "EVIDENCE_REF_NOT_FOUND"
	CodeJobAlreadyTerminal            = "JOB_ALREADY_TERMINAL"
	CodeWorkerStale                   = "WORKER_STALE"
	CodeTimeout                       = domainjobs.TimeoutErrorCode
	CodeInternal                      = "INTERNAL_ERROR"
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
	var authErr *platformauth.Error
	if errors.As(err, &authErr) {
		return NewAppError(authErr.Status, authErr.Code, authErr.Message, authErr.Retryable, authErr.Details)
	}
	var contractErr *platformcontracts.Error
	if errors.As(err, &contractErr) {
		return NewAppError(contractErr.Status, contractErr.Code, contractErr.Message, contractErr.Retryable, contractErr.Details)
	}
	var jobErr *domainjobs.Error
	if errors.As(err, &jobErr) {
		return NewAppError(jobErr.Status, jobErr.Code, jobErr.Message, jobErr.Retryable, jobErr.Details)
	}
	var workerErr *domainworkers.Error
	if errors.As(err, &workerErr) {
		return NewAppError(workerErr.Status, workerErr.Code, workerErr.Message, workerErr.Retryable, workerErr.Details)
	}
	return NewAppError(http.StatusInternalServerError, CodeInternal, err.Error(), true, nil)
}

func WriteJSON(w http.ResponseWriter, status int, value any) {
	httpx.WriteJSON(w, status, value)
}

func WriteError(w http.ResponseWriter, err error) {
	appErr := ToAppError(err)
	WriteJSON(w, appErr.Status, appErr)
}
