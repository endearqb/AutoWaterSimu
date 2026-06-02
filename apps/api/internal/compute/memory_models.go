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

func (store *MemoryStore) UpsertBenchmarkRun(_ context.Context, record BenchmarkRunRecord) (BenchmarkRunRecord, bool, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	existing, ok := store.benchmarkRuns[record.BenchmarkRunID]
	if ok {
		if existing.PayloadHash != record.PayloadHash {
			return BenchmarkRunRecord{}, false, Conflict(CodeIdempotencyConflict, "benchmark_run_id was reused with a different payload")
		}
		return cloneBenchmarkRunRecord(existing), false, nil
	}
	store.benchmarkRuns[record.BenchmarkRunID] = cloneBenchmarkRunRecord(record)
	return cloneBenchmarkRunRecord(record), true, nil
}

func (store *MemoryStore) FindBenchmarkRun(_ context.Context, benchmarkRunID string) (*BenchmarkRunRecord, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	record, ok := store.benchmarkRuns[benchmarkRunID]
	if !ok {
		return nil, NotFound(CodeBenchmarkRunNotFound, "benchmark run not found")
	}
	record = cloneBenchmarkRunRecord(record)
	return &record, nil
}

func (store *MemoryStore) ListBenchmarkRuns(_ context.Context, filter BenchmarkRunFilter) ([]BenchmarkRunRecord, string, int, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	var records []BenchmarkRunRecord
	for _, record := range store.benchmarkRuns {
		if filter.ModelKey != "" && record.ModelKey != filter.ModelKey {
			continue
		}
		if filter.ModelVersion != "" && record.ModelVersion != filter.ModelVersion {
			continue
		}
		if filter.BenchmarkCaseID != "" && record.BenchmarkCaseID != filter.BenchmarkCaseID {
			continue
		}
		if filter.ParameterSetID != "" && record.ParameterSetID != filter.ParameterSetID {
			continue
		}
		records = append(records, cloneBenchmarkRunRecord(record))
	}
	sort.Slice(records, func(i, j int) bool {
		if records[i].ExecutedAt.Equal(records[j].ExecutedAt) {
			return records[i].BenchmarkRunID > records[j].BenchmarkRunID
		}
		return records[i].ExecutedAt.After(records[j].ExecutedAt)
	})
	total := len(records)
	offset := decodeCursor(filter.Cursor)
	if offset > len(records) {
		offset = len(records)
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
	if end < len(records) {
		next = encodeCursor(end)
	} else {
		end = len(records)
	}
	return records[offset:end], next, total, nil
}

func cloneBenchmarkRunRecord(record BenchmarkRunRecord) BenchmarkRunRecord {
	record.Payload = append(json.RawMessage(nil), record.Payload...)
	record.Metadata = append(json.RawMessage(nil), record.Metadata...)
	return record
}

func (store *MemoryStore) UpsertModelCatalog(_ context.Context, record ModelCatalogRecord) (ModelCatalogRecord, bool, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	snapshots := store.modelCatalogs[record.CatalogID]
	for _, existing := range snapshots {
		if existing.PayloadHash == record.PayloadHash {
			return cloneModelCatalogRecord(existing), false, nil
		}
	}
	record = cloneModelCatalogRecord(record)
	store.modelCatalogs[record.CatalogID] = append(snapshots, record)
	return cloneModelCatalogRecord(record), true, nil
}

func (store *MemoryStore) LatestModelCatalog(_ context.Context, catalogID string) (*ModelCatalogRecord, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	snapshots := store.modelCatalogs[catalogID]
	if len(snapshots) == 0 {
		return nil, NotFound(CodeModelCatalogNotFound, "model catalog not found")
	}
	record := cloneModelCatalogRecord(snapshots[len(snapshots)-1])
	return &record, nil
}

func (store *MemoryStore) ListModelCatalogSnapshots(_ context.Context, filter ModelCatalogSnapshotFilter) ([]ModelCatalogRecord, string, int, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	catalogID := defaultString(filter.CatalogID, "default")
	snapshots := append([]ModelCatalogRecord(nil), store.modelCatalogs[catalogID]...)
	type indexedModelCatalogRecord struct {
		index  int
		record ModelCatalogRecord
	}
	indexed := make([]indexedModelCatalogRecord, 0, len(snapshots))
	for index, snapshot := range snapshots {
		indexed = append(indexed, indexedModelCatalogRecord{
			index:  index,
			record: cloneModelCatalogRecord(snapshot),
		})
	}
	sort.Slice(indexed, func(i, j int) bool {
		if indexed[i].record.CreatedAt.Equal(indexed[j].record.CreatedAt) {
			return indexed[i].index > indexed[j].index
		}
		return indexed[i].record.CreatedAt.After(indexed[j].record.CreatedAt)
	})
	records := make([]ModelCatalogRecord, 0, len(indexed))
	for _, snapshot := range indexed {
		records = append(records, snapshot.record)
	}
	total := len(records)
	offset := decodeCursor(filter.Cursor)
	if offset > len(records) {
		offset = len(records)
	}
	limit := normalizeListLimit(filter.Limit)
	end := offset + limit
	next := ""
	if end < len(records) {
		next = encodeCursor(end)
	} else {
		end = len(records)
	}
	return records[offset:end], next, total, nil
}

func cloneModelCatalogRecord(record ModelCatalogRecord) ModelCatalogRecord {
	record.Payload = append(json.RawMessage(nil), record.Payload...)
	record.Metadata = append(json.RawMessage(nil), record.Metadata...)
	return record
}
