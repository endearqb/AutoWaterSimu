package jobs

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"
)

const (
	CodeValidationFailed = "VALIDATION_FAILED"

	TimeoutErrorCode    = "TIMEOUT"
	TimeoutErrorMessage = "worker lease expired"

	EventJobCancelled = "job.cancelled"
	EventJobTimedOut  = "job.timed_out"
)

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

type StateMutation struct {
	Status             string
	FinishedAt         time.Time
	SetCancelRequested bool
	CancelRequested    bool
	ErrorCode          string
	ErrorMessage       string
	EventType          string
	EventJSON          json.RawMessage
}

type StateRecord struct {
	JobID        string
	Status       string
	ErrorCode    string
	ErrorMessage string
	FinishedAt   *time.Time
}

type JobStateStore interface {
	CancelJob(ctx context.Context, jobID string, mutation StateMutation) (*StateRecord, error)
	TimeoutExpired(ctx context.Context, mutation StateMutation) ([]StateRecord, error)
}

type JobStateService struct {
	jobs JobStateStore
	now  func() time.Time
}

func NewJobStateService(jobs JobStateStore, now func() time.Time) *JobStateService {
	if now == nil {
		now = func() time.Time { return time.Now().UTC() }
	}
	return &JobStateService{
		jobs: jobs,
		now:  now,
	}
}

func (svc *JobStateService) CancelJob(ctx context.Context, jobID string) (StateRecord, error) {
	jobID, err := required(jobID, "job_id")
	if err != nil {
		return StateRecord{}, err
	}
	record, err := svc.jobs.CancelJob(ctx, jobID, CancelMutation(svc.now()))
	if err != nil {
		return StateRecord{}, err
	}
	if record == nil {
		return StateRecord{}, nil
	}
	return *record, nil
}

func (svc *JobStateService) TimeoutSweep(ctx context.Context) ([]StateRecord, error) {
	return svc.jobs.TimeoutExpired(ctx, TimeoutMutation(svc.now()))
}

func CancelMutation(now time.Time) StateMutation {
	return StateMutation{
		Status:             StatusCancelled,
		FinishedAt:         now,
		SetCancelRequested: true,
		CancelRequested:    true,
		EventType:          EventJobCancelled,
		EventJSON:          stateEventJSON(map[string]any{"status": StatusCancelled}),
	}
}

func TimeoutMutation(now time.Time) StateMutation {
	return StateMutation{
		Status:       StatusTimedOut,
		FinishedAt:   now,
		ErrorCode:    TimeoutErrorCode,
		ErrorMessage: TimeoutErrorMessage,
		EventType:    EventJobTimedOut,
		EventJSON:    stateEventJSON(map[string]any{"status": StatusTimedOut, "error_code": TimeoutErrorCode}),
	}
}

func required(value string, name string) (string, error) {
	if strings.TrimSpace(value) == "" {
		return "", validationError(name + " is required")
	}
	return strings.TrimSpace(value), nil
}

func stateEventJSON(value map[string]any) json.RawMessage {
	bytes, _ := json.Marshal(value)
	return bytes
}
