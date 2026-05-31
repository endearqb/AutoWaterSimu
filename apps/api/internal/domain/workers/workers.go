package workers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
)

const CodeValidationFailed = "VALIDATION_FAILED"

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

type Record struct {
	WorkerID                  string          `json:"worker_id"`
	Capabilities              json.RawMessage `json:"capabilities"`
	SupportedContractVersions json.RawMessage `json:"supported_contract_versions"`
	RuntimeVersion            string          `json:"runtime_version,omitempty"`
	CurrentJobID              string          `json:"current_job_id,omitempty"`
	HeartbeatAt               *time.Time      `json:"heartbeat_at,omitempty"`
	RegisteredAt              time.Time       `json:"registered_at"`
}

type ClaimedJob struct {
	InputJSON json.RawMessage
	Attempt   int
}

type HeartbeatJob struct {
	JobID           string
	CancelRequested bool
	Terminal        bool
	Status          string
}

type WorkerStore interface {
	UpsertWorker(ctx context.Context, worker Record) error
	FindWorkerByID(ctx context.Context, workerID string) (*Record, error)
	ClaimNext(ctx context.Context, worker Record, leaseExpiresAt time.Time) (*ClaimedJob, error)
	Heartbeat(ctx context.Context, workerID, jobID string, leaseExpiresAt time.Time) (*HeartbeatJob, error)
}

type WorkerLifecycleService struct {
	workers       WorkerStore
	now           func() time.Time
	leaseDuration time.Duration
}

func NewWorkerLifecycleService(workers WorkerStore, now func() time.Time, leaseDuration time.Duration) *WorkerLifecycleService {
	if now == nil {
		now = func() time.Time { return time.Now().UTC() }
	}
	if leaseDuration <= 0 {
		leaseDuration = 90 * time.Second
	}
	return &WorkerLifecycleService{
		workers:       workers,
		now:           now,
		leaseDuration: leaseDuration,
	}
}

func (svc *WorkerLifecycleService) RegisterWorker(ctx context.Context, request map[string]any) (Record, error) {
	workerID := stringValue(request, "worker_id")
	if workerID == "" {
		workerID = fmt.Sprintf("worker_%d", svc.now().UnixNano())
	}
	capabilities := mustJSON(request["capabilities"])
	if string(capabilities) == "null" {
		capabilities = mustJSON([]string{})
	}
	versions := mustJSON(request["supported_contract_versions"])
	if string(versions) == "null" {
		versions = mustJSON([]string{})
	}
	now := svc.now()
	worker := Record{
		WorkerID:                  workerID,
		Capabilities:              capabilities,
		SupportedContractVersions: versions,
		RuntimeVersion:            stringValue(request, "runtime_version"),
		RegisteredAt:              now,
	}
	if err := svc.workers.UpsertWorker(ctx, worker); err != nil {
		return Record{}, err
	}
	return worker, nil
}

func (svc *WorkerLifecycleService) Claim(ctx context.Context, workerID string) (map[string]any, error) {
	workerID, err := required(workerID, "worker_id")
	if err != nil {
		return nil, err
	}
	worker, err := svc.workers.FindWorkerByID(ctx, workerID)
	if err != nil {
		return nil, err
	}
	lease := svc.now().Add(svc.leaseDuration)
	job, err := svc.workers.ClaimNext(ctx, *worker, lease)
	if err != nil {
		return nil, err
	}
	if job == nil {
		return map[string]any{"job": nil, "server_time": svc.now()}, nil
	}
	var input any
	_ = json.Unmarshal(job.InputJSON, &input)
	return map[string]any{"job": input, "attempt": job.Attempt, "lease_expires_at": lease, "server_time": svc.now()}, nil
}

func (svc *WorkerLifecycleService) Heartbeat(ctx context.Context, workerID, jobID string) (map[string]any, error) {
	workerID, err := required(workerID, "worker_id")
	if err != nil {
		return nil, err
	}
	jobID, err = required(jobID, "job_id")
	if err != nil {
		return nil, err
	}
	lease := svc.now().Add(svc.leaseDuration)
	job, err := svc.workers.Heartbeat(ctx, workerID, jobID, lease)
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"job_id":           job.JobID,
		"cancel_requested": job.CancelRequested,
		"job_terminal":     job.Terminal,
		"status":           job.Status,
		"lease_expires_at": lease,
		"server_time":      svc.now(),
	}, nil
}

func required(value string, name string) (string, error) {
	if strings.TrimSpace(value) == "" {
		return "", validationError(name + " is required")
	}
	return strings.TrimSpace(value), nil
}

func stringValue(value map[string]any, key string) string {
	raw, ok := value[key]
	if !ok || raw == nil {
		return ""
	}
	if text, ok := raw.(string); ok {
		return strings.TrimSpace(text)
	}
	return ""
}

func mustJSON(value any) json.RawMessage {
	bytes, _ := json.Marshal(value)
	return bytes
}
