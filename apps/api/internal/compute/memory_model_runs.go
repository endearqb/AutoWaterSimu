package compute

import (
	domainmodels "autowatersimu/apps/api/internal/domain/models"
	"context"
	"encoding/json"
	"sort"
	"time"
)

func (store *MemoryStore) InsertModelRuns(_ context.Context, jobID string, modelRuns []json.RawMessage, _ time.Time) error {
	store.mu.Lock()
	defer store.mu.Unlock()
	if _, ok := store.jobs[jobID]; !ok {
		return NotFound(CodeJobNotFound, "job not found")
	}
	for _, modelRun := range modelRuns {
		modelRunID := domainmodels.RunIDFromRaw(modelRun)
		if modelRunID == "" {
			return ValidationError("model_run_id is required")
		}
		store.modelRuns[modelRunID] = append(json.RawMessage(nil), modelRun...)
	}
	return nil
}

func (store *MemoryStore) FindModelRun(_ context.Context, modelRunID string) (json.RawMessage, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	modelRun, ok := store.modelRuns[modelRunID]
	if !ok {
		return nil, NotFound(CodeModelRunNotFound, "model run not found")
	}
	return append(json.RawMessage(nil), modelRun...), nil
}

func (store *MemoryStore) ListModelRuns(_ context.Context, filter ModelRunFilter) ([]json.RawMessage, string, int, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	var modelRuns []json.RawMessage
	for _, modelRun := range store.modelRuns {
		modelRunID, jobID, modelKey, modelVersion, _, err := domainmodels.RunFieldsFromRaw(modelRun)
		if err != nil || modelRunID == "" {
			continue
		}
		if filter.JobID != "" && jobID != filter.JobID {
			continue
		}
		if filter.ModelKey != "" && modelKey != filter.ModelKey {
			continue
		}
		if filter.ModelVersion != "" && modelVersion != filter.ModelVersion {
			continue
		}
		modelRuns = append(modelRuns, append(json.RawMessage(nil), modelRun...))
	}
	sort.Slice(modelRuns, func(i, j int) bool {
		leftID := domainmodels.RunIDFromRaw(modelRuns[i])
		rightID := domainmodels.RunIDFromRaw(modelRuns[j])
		return leftID > rightID
	})
	total := len(modelRuns)
	offset := decodeCursor(filter.Cursor)
	if offset > len(modelRuns) {
		offset = len(modelRuns)
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
	if end < len(modelRuns) {
		next = encodeCursor(end)
	} else {
		end = len(modelRuns)
	}
	return modelRuns[offset:end], next, total, nil
}

func (store *MemoryStore) ModelRuns(_ context.Context, jobID string) ([]json.RawMessage, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	if _, ok := store.jobs[jobID]; !ok {
		return nil, NotFound(CodeJobNotFound, "job not found")
	}
	var modelRuns []json.RawMessage
	for _, modelRun := range store.modelRuns {
		_, modelRunJobID, _, _, _, err := domainmodels.RunFieldsFromRaw(modelRun)
		if err == nil && modelRunJobID == jobID {
			modelRuns = append(modelRuns, append(json.RawMessage(nil), modelRun...))
		}
	}
	sort.Slice(modelRuns, func(i, j int) bool {
		return domainmodels.RunIDFromRaw(modelRuns[i]) < domainmodels.RunIDFromRaw(modelRuns[j])
	})
	return modelRuns, nil
}
