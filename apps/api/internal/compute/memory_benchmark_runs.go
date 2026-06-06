package compute

import (
	"context"
	"encoding/json"
	"sort"
)

func (store *MemoryStore) UpsertBenchmarkRun(_ context.Context, record BenchmarkRunRecord, audit *MutationAuditRecord) (BenchmarkRunRecord, bool, error) {
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
	if audit != nil {
		store.appendMutationAuditLocked(*audit)
	}
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
