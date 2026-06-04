package compute

import (
	"context"
	"encoding/json"
	"sort"
)

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
