package compute

import (
	"context"
	"encoding/json"
	"fmt"
	"time"
)

type WorkerLifecycleService struct {
	workers WorkerStore
	now     func() time.Time
}

func NewWorkerLifecycleService(workers WorkerStore, now func() time.Time) *WorkerLifecycleService {
	if now == nil {
		now = func() time.Time { return time.Now().UTC() }
	}
	return &WorkerLifecycleService{
		workers: workers,
		now:     now,
	}
}

func (svc *WorkerLifecycleService) RegisterWorker(ctx context.Context, request map[string]any) (WorkerRecord, error) {
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
	worker := WorkerRecord{
		WorkerID:                  workerID,
		Capabilities:              capabilities,
		SupportedContractVersions: versions,
		RuntimeVersion:            stringValue(request, "runtime_version"),
		RegisteredAt:              now,
	}
	if err := svc.workers.UpsertWorker(ctx, worker); err != nil {
		return WorkerRecord{}, err
	}
	return worker, nil
}

func (svc *WorkerLifecycleService) Claim(ctx context.Context, workerID string) (map[string]any, error) {
	worker, err := svc.workers.FindWorkerByID(ctx, required(workerID, "worker_id"))
	if err != nil {
		return nil, err
	}
	lease := svc.now().Add(DefaultLeaseSeconds * time.Second)
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
	lease := svc.now().Add(DefaultLeaseSeconds * time.Second)
	job, err := svc.workers.Heartbeat(ctx, required(workerID, "worker_id"), required(jobID, "job_id"), lease)
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"job_id":           job.JobID,
		"cancel_requested": job.CancelRequested || job.Status == StatusCancelled,
		"job_terminal":     isTerminal(job.Status),
		"status":           job.Status,
		"lease_expires_at": lease,
		"server_time":      svc.now(),
	}, nil
}
