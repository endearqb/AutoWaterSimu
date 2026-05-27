package compute

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"sort"
	"strings"
	"sync"
	"time"
)

type Store interface {
	FindJobByID(ctx context.Context, jobID string) (*JobRecord, error)
	FindJobByIdempotency(ctx context.Context, sourceSystem, requestedBy, key string) (*JobRecord, error)
	InsertJob(ctx context.Context, job JobRecord, events []EventRecord) error
	ListJobs(ctx context.Context, filter ListFilter) ([]JobRecord, string, int, error)
	Events(ctx context.Context, jobID string) ([]EventRecord, error)
	Artifacts(ctx context.Context, jobID string) ([]ArtifactRecord, error)
	FindArtifact(ctx context.Context, artifactID string) (*ArtifactRecord, error)
	InsertArtifact(ctx context.Context, artifact ArtifactRecord, event EventRecord) error
	UpsertWorker(ctx context.Context, worker WorkerRecord) error
	ClaimNext(ctx context.Context, workerID string, leaseExpiresAt time.Time) (*JobRecord, error)
	Heartbeat(ctx context.Context, workerID, jobID string, leaseExpiresAt time.Time) (*JobRecord, error)
	CancelJob(ctx context.Context, jobID string, now time.Time) (*JobRecord, error)
	CompleteJob(ctx context.Context, jobID, workerID string, attempt int, status string, summary json.RawMessage, resultHash, errorCode, errorMessage string, now time.Time) (*JobRecord, error)
	TimeoutExpired(ctx context.Context, now time.Time) ([]JobRecord, error)
}

type ListFilter struct {
	Limit         int
	Cursor        string
	Status        string
	JobType       string
	CreatedAfter  *time.Time
	CreatedBefore *time.Time
}

type MemoryStore struct {
	mu        sync.Mutex
	jobs      map[string]JobRecord
	events    map[string][]EventRecord
	artifacts map[string]ArtifactRecord
	workers   map[string]WorkerRecord
	nextEvent int64
}

func NewMemoryStore() *MemoryStore {
	return &MemoryStore{
		jobs:      map[string]JobRecord{},
		events:    map[string][]EventRecord{},
		artifacts: map[string]ArtifactRecord{},
		workers:   map[string]WorkerRecord{},
	}
}

func (store *MemoryStore) FindJobByID(_ context.Context, jobID string) (*JobRecord, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	job, ok := store.jobs[jobID]
	if !ok {
		return nil, NotFound(CodeJobNotFound, "job not found")
	}
	return &job, nil
}

func (store *MemoryStore) FindJobByIdempotency(_ context.Context, sourceSystem, requestedBy, key string) (*JobRecord, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	for _, job := range store.jobs {
		if job.SourceSystem == sourceSystem && job.RequestedBy == requestedBy && job.IdempotencyKey == key {
			copy := job
			return &copy, nil
		}
	}
	return nil, nil
}

func (store *MemoryStore) InsertJob(_ context.Context, job JobRecord, events []EventRecord) error {
	store.mu.Lock()
	defer store.mu.Unlock()
	if _, ok := store.jobs[job.JobID]; ok {
		return Conflict(CodeIdempotencyConflict, "job already exists")
	}
	store.jobs[job.JobID] = job
	for _, event := range events {
		store.appendEventLocked(event)
	}
	return nil
}

func (store *MemoryStore) ListJobs(_ context.Context, filter ListFilter) ([]JobRecord, string, int, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	var jobs []JobRecord
	for _, job := range store.jobs {
		if filter.Status != "" && job.Status != filter.Status {
			continue
		}
		if filter.JobType != "" && job.JobType != filter.JobType {
			continue
		}
		if filter.CreatedAfter != nil && !job.CreatedAt.After(*filter.CreatedAfter) {
			continue
		}
		if filter.CreatedBefore != nil && !job.CreatedAt.Before(*filter.CreatedBefore) {
			continue
		}
		jobs = append(jobs, job)
	}
	sort.Slice(jobs, func(i, j int) bool {
		if jobs[i].CreatedAt.Equal(jobs[j].CreatedAt) {
			return jobs[i].JobID > jobs[j].JobID
		}
		return jobs[i].CreatedAt.After(jobs[j].CreatedAt)
	})
	total := len(jobs)
	offset := decodeCursor(filter.Cursor)
	if offset > len(jobs) {
		offset = len(jobs)
	}
	limit := filter.Limit
	if limit <= 0 {
		limit = 50
	}
	if limit > 200 {
		limit = 200
	}
	end := offset + limit
	next := ""
	if end < len(jobs) {
		next = encodeCursor(end)
	} else {
		end = len(jobs)
	}
	return jobs[offset:end], next, total, nil
}

func (store *MemoryStore) Events(_ context.Context, jobID string) ([]EventRecord, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	if _, ok := store.jobs[jobID]; !ok {
		return nil, NotFound(CodeJobNotFound, "job not found")
	}
	events := append([]EventRecord(nil), store.events[jobID]...)
	return events, nil
}

func (store *MemoryStore) Artifacts(_ context.Context, jobID string) ([]ArtifactRecord, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	if _, ok := store.jobs[jobID]; !ok {
		return nil, NotFound(CodeJobNotFound, "job not found")
	}
	var artifacts []ArtifactRecord
	for _, artifact := range store.artifacts {
		if artifact.JobID == jobID {
			artifacts = append(artifacts, artifact)
		}
	}
	sort.Slice(artifacts, func(i, j int) bool {
		if artifacts[i].CreatedAt.Equal(artifacts[j].CreatedAt) {
			return artifacts[i].ArtifactID < artifacts[j].ArtifactID
		}
		return artifacts[i].CreatedAt.Before(artifacts[j].CreatedAt)
	})
	return artifacts, nil
}

func (store *MemoryStore) FindArtifact(_ context.Context, artifactID string) (*ArtifactRecord, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	artifact, ok := store.artifacts[artifactID]
	if !ok {
		return nil, NotFound(CodeArtifactNotFound, "artifact not found")
	}
	return &artifact, nil
}

func (store *MemoryStore) InsertArtifact(_ context.Context, artifact ArtifactRecord, event EventRecord) error {
	store.mu.Lock()
	defer store.mu.Unlock()
	job, ok := store.jobs[artifact.JobID]
	if !ok {
		return NotFound(CodeJobNotFound, "job not found")
	}
	if job.Status != StatusRunning {
		store.appendEventLocked(EventRecord{
			JobID: artifact.JobID, EventType: "late_result_rejected",
			EventJSON: mustJSON(map[string]any{"artifact_id": artifact.ArtifactID, "status": job.Status}),
			CreatedAt: time.Now().UTC(),
		})
		return Conflict(CodeWorkerStale, "job is terminal or not running")
	}
	store.artifacts[artifact.ArtifactID] = artifact
	store.appendEventLocked(event)
	return nil
}

func (store *MemoryStore) UpsertWorker(_ context.Context, worker WorkerRecord) error {
	store.mu.Lock()
	defer store.mu.Unlock()
	store.workers[worker.WorkerID] = worker
	return nil
}

func (store *MemoryStore) ClaimNext(_ context.Context, workerID string, leaseExpiresAt time.Time) (*JobRecord, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	var selected *JobRecord
	for _, job := range store.jobs {
		if job.Status != StatusQueued || job.CancelRequested {
			continue
		}
		if selected == nil || job.CreatedAt.Before(selected.CreatedAt) || (job.CreatedAt.Equal(selected.CreatedAt) && job.JobID < selected.JobID) {
			copy := job
			selected = &copy
		}
	}
	if selected == nil {
		return nil, nil
	}
	now := time.Now().UTC()
	selected.Status = StatusRunning
	selected.WorkerID = workerID
	selected.Attempt++
	selected.ClaimedAt = &now
	selected.StartedAt = &now
	selected.LeaseExpiresAt = &leaseExpiresAt
	store.jobs[selected.JobID] = *selected
	store.appendEventLocked(EventRecord{JobID: selected.JobID, EventType: "job.running", EventJSON: mustJSON(map[string]any{"worker_id": workerID, "attempt": selected.Attempt}), CreatedAt: now})
	return selected, nil
}

func (store *MemoryStore) Heartbeat(_ context.Context, workerID, jobID string, leaseExpiresAt time.Time) (*JobRecord, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	job, ok := store.jobs[jobID]
	if !ok {
		return nil, NotFound(CodeJobNotFound, "job not found")
	}
	now := time.Now().UTC()
	worker := store.workers[workerID]
	worker.WorkerID = workerID
	worker.CurrentJobID = jobID
	worker.HeartbeatAt = &now
	store.workers[workerID] = worker
	if job.Status == StatusRunning && job.WorkerID == workerID {
		job.LeaseExpiresAt = &leaseExpiresAt
		store.jobs[jobID] = job
	}
	return &job, nil
}

func (store *MemoryStore) CancelJob(_ context.Context, jobID string, now time.Time) (*JobRecord, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	job, ok := store.jobs[jobID]
	if !ok {
		return nil, NotFound(CodeJobNotFound, "job not found")
	}
	if isTerminal(job.Status) {
		return nil, Conflict(CodeJobAlreadyTerminal, "job is already terminal")
	}
	job.Status = StatusCancelled
	job.CancelRequested = true
	job.FinishedAt = &now
	store.jobs[jobID] = job
	store.appendEventLocked(EventRecord{JobID: jobID, EventType: "job.cancelled", EventJSON: mustJSON(map[string]any{"status": StatusCancelled}), CreatedAt: now})
	return &job, nil
}

func (store *MemoryStore) CompleteJob(_ context.Context, jobID, workerID string, attempt int, status string, summary json.RawMessage, resultHash, errorCode, errorMessage string, now time.Time) (*JobRecord, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	job, ok := store.jobs[jobID]
	if !ok {
		return nil, NotFound(CodeJobNotFound, "job not found")
	}
	if job.Status != StatusRunning || job.WorkerID != workerID || job.Attempt != attempt || (job.LeaseExpiresAt != nil && job.LeaseExpiresAt.Before(now)) {
		store.appendEventLocked(EventRecord{JobID: jobID, EventType: "late_result_rejected", EventJSON: mustJSON(map[string]any{"worker_id": workerID, "attempt": attempt, "status": job.Status}), CreatedAt: now})
		return nil, Conflict(CodeWorkerStale, "worker result is stale")
	}
	job.Status = status
	job.Summary = summary
	job.ResultHash = resultHash
	job.ErrorCode = errorCode
	job.ErrorMessage = errorMessage
	job.FinishedAt = &now
	store.jobs[jobID] = job
	store.appendEventLocked(EventRecord{JobID: jobID, EventType: "job." + status, EventJSON: mustJSON(map[string]any{"status": status, "error_code": errorCode, "error_message": errorMessage}), CreatedAt: now})
	return &job, nil
}

func (store *MemoryStore) TimeoutExpired(_ context.Context, now time.Time) ([]JobRecord, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	var timedOut []JobRecord
	for id, job := range store.jobs {
		if job.Status == StatusRunning && job.LeaseExpiresAt != nil && job.LeaseExpiresAt.Before(now) {
			job.Status = StatusTimedOut
			job.ErrorCode = CodeTimeout
			job.ErrorMessage = "worker lease expired"
			job.FinishedAt = &now
			store.jobs[id] = job
			store.appendEventLocked(EventRecord{JobID: id, EventType: "job.timed_out", EventJSON: mustJSON(map[string]any{"status": StatusTimedOut, "error_code": CodeTimeout}), CreatedAt: now})
			timedOut = append(timedOut, job)
		}
	}
	return timedOut, nil
}

func (store *MemoryStore) appendEventLocked(event EventRecord) {
	store.nextEvent++
	event.ID = store.nextEvent
	if event.CreatedAt.IsZero() {
		event.CreatedAt = time.Now().UTC()
	}
	if len(event.EventJSON) == 0 {
		event.EventJSON = mustJSON(map[string]any{})
	}
	store.events[event.JobID] = append(store.events[event.JobID], event)
}

func isTerminal(status string) bool {
	return status == StatusSucceeded || status == StatusFailed || status == StatusCancelled || status == StatusTimedOut
}

func mustJSON(value any) json.RawMessage {
	bytes, _ := json.Marshal(value)
	return bytes
}

func encodeCursor(offset int) string {
	bytes, _ := json.Marshal(map[string]int{"offset": offset})
	return base64.RawURLEncoding.EncodeToString(bytes)
}

func decodeCursor(cursor string) int {
	if strings.TrimSpace(cursor) == "" {
		return 0
	}
	bytes, err := base64.RawURLEncoding.DecodeString(cursor)
	if err != nil {
		return 0
	}
	var value map[string]int
	if err := json.Unmarshal(bytes, &value); err != nil {
		return 0
	}
	return value["offset"]
}
