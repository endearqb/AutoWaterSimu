package compute

import (
	domainjobs "autowatersimu/apps/api/internal/domain/jobs"
	"context"
	"encoding/base64"
	"encoding/json"
	"sort"
	"strings"
	"time"
)

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
		if filter.TenantID != "" && job.TenantID != filter.TenantID {
			continue
		}
		if filter.ProjectID != "" && job.ProjectID != filter.ProjectID {
			continue
		}
		if filter.SiteID != "" && job.SiteID != filter.SiteID {
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
	return domainjobs.IsTerminal(status)
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

func normalizeListLimit(limit int) int {
	if limit <= 0 {
		return 50
	}
	if limit > 200 {
		return 200
	}
	return limit
}

func stringsFromAny(value any) []string {
	items, ok := value.([]any)
	if !ok {
		return nil
	}
	var result []string
	for _, item := range items {
		if text, ok := item.(string); ok && strings.TrimSpace(text) != "" {
			result = append(result, strings.TrimSpace(text))
		}
	}
	return result
}
