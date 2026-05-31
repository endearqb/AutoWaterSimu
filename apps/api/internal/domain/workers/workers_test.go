package workers

import (
	"context"
	"encoding/json"
	"testing"
	"time"
)

type fakeStore struct {
	worker       Record
	upserted     bool
	claimJob     *ClaimedJob
	heartbeatJob *HeartbeatJob
}

func (store *fakeStore) UpsertWorker(_ context.Context, worker Record) error {
	store.worker = worker
	store.upserted = true
	return nil
}

func (store *fakeStore) FindWorkerByID(_ context.Context, workerID string) (*Record, error) {
	if workerID == "" || store.worker.WorkerID != workerID {
		return nil, validationError("worker is not registered")
	}
	return &store.worker, nil
}

func (store *fakeStore) ClaimNext(_ context.Context, _ Record, _ time.Time) (*ClaimedJob, error) {
	return store.claimJob, nil
}

func (store *fakeStore) Heartbeat(_ context.Context, _, _ string, _ time.Time) (*HeartbeatJob, error) {
	return store.heartbeatJob, nil
}

func TestRegisterWorkerNormalizesOptionalArrays(t *testing.T) {
	now := time.Date(2026, 6, 1, 2, 50, 0, 0, time.UTC)
	store := &fakeStore{}
	service := NewWorkerLifecycleService(store, func() time.Time { return now }, 90*time.Second)

	worker, err := service.RegisterWorker(context.Background(), map[string]any{
		"worker_id":       " worker-1 ",
		"runtime_version": "v1",
	})
	if err != nil {
		t.Fatalf("RegisterWorker returned error: %v", err)
	}
	if !store.upserted {
		t.Fatalf("expected worker to be upserted")
	}
	if worker.WorkerID != "worker-1" || worker.RuntimeVersion != "v1" || !worker.RegisteredAt.Equal(now) {
		t.Fatalf("unexpected worker record: %#v", worker)
	}
	var capabilities []string
	if err := json.Unmarshal(worker.Capabilities, &capabilities); err != nil {
		t.Fatalf("capabilities should be JSON array: %v", err)
	}
	if len(capabilities) != 0 {
		t.Fatalf("expected empty default capabilities, got %#v", capabilities)
	}
	var versions []string
	if err := json.Unmarshal(worker.SupportedContractVersions, &versions); err != nil {
		t.Fatalf("versions should be JSON array: %v", err)
	}
	if len(versions) != 0 {
		t.Fatalf("expected empty default versions, got %#v", versions)
	}
}

func TestClaimReturnsNilJobWhenNoCompatibleJob(t *testing.T) {
	now := time.Date(2026, 6, 1, 2, 51, 0, 0, time.UTC)
	store := &fakeStore{worker: Record{WorkerID: "worker-1"}}
	service := NewWorkerLifecycleService(store, func() time.Time { return now }, 90*time.Second)

	claim, err := service.Claim(context.Background(), "worker-1")
	if err != nil {
		t.Fatalf("Claim returned error: %v", err)
	}
	if claim["job"] != nil {
		t.Fatalf("expected nil job claim, got %#v", claim)
	}
	if !claim["server_time"].(time.Time).Equal(now) {
		t.Fatalf("unexpected server time: %#v", claim["server_time"])
	}
}

func TestClaimReturnsJobPayloadAndLease(t *testing.T) {
	now := time.Date(2026, 6, 1, 2, 52, 0, 0, time.UTC)
	store := &fakeStore{
		worker:   Record{WorkerID: "worker-1"},
		claimJob: &ClaimedJob{InputJSON: json.RawMessage(`{"job_id":"job-1"}`), Attempt: 2},
	}
	service := NewWorkerLifecycleService(store, func() time.Time { return now }, 45*time.Second)

	claim, err := service.Claim(context.Background(), "worker-1")
	if err != nil {
		t.Fatalf("Claim returned error: %v", err)
	}
	job, ok := claim["job"].(map[string]any)
	if !ok || job["job_id"] != "job-1" {
		t.Fatalf("unexpected job payload: %#v", claim["job"])
	}
	if claim["attempt"] != 2 {
		t.Fatalf("unexpected attempt: %#v", claim["attempt"])
	}
	if !claim["lease_expires_at"].(time.Time).Equal(now.Add(45 * time.Second)) {
		t.Fatalf("unexpected lease: %#v", claim["lease_expires_at"])
	}
}

func TestHeartbeatReturnsProjectedJobState(t *testing.T) {
	now := time.Date(2026, 6, 1, 2, 53, 0, 0, time.UTC)
	store := &fakeStore{
		heartbeatJob: &HeartbeatJob{
			JobID:           "job-1",
			CancelRequested: true,
			Terminal:        true,
			Status:          "cancelled",
		},
	}
	service := NewWorkerLifecycleService(store, func() time.Time { return now }, 30*time.Second)

	heartbeat, err := service.Heartbeat(context.Background(), "worker-1", "job-1")
	if err != nil {
		t.Fatalf("Heartbeat returned error: %v", err)
	}
	if heartbeat["job_id"] != "job-1" || heartbeat["status"] != "cancelled" {
		t.Fatalf("unexpected heartbeat response: %#v", heartbeat)
	}
	if heartbeat["cancel_requested"] != true || heartbeat["job_terminal"] != true {
		t.Fatalf("unexpected heartbeat flags: %#v", heartbeat)
	}
}

func TestClaimRequiresWorkerID(t *testing.T) {
	service := NewWorkerLifecycleService(&fakeStore{}, nil, 0)

	_, err := service.Claim(context.Background(), " ")
	var workerErr *Error
	if err == nil {
		t.Fatalf("expected validation error")
	}
	workerErr, ok := err.(*Error)
	if !ok {
		t.Fatalf("expected worker error, got %T", err)
	}
	if workerErr.Code != CodeValidationFailed {
		t.Fatalf("unexpected error code: %s", workerErr.Code)
	}
}
