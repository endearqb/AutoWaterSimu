package compute

import (
	"context"
	"encoding/json"
	"sort"
)

func (store *MemoryStore) ListMutationAuditEvents(_ context.Context, filter MutationAuditFilter) ([]MutationAuditRecord, string, int, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	records := make([]MutationAuditRecord, 0, len(store.mutationAudits))
	for _, record := range store.mutationAudits {
		if filter.EventType != "" && record.EventType != filter.EventType {
			continue
		}
		if filter.TargetObject != "" && record.TargetObject != filter.TargetObject {
			continue
		}
		if filter.TargetID != "" && record.TargetID != filter.TargetID {
			continue
		}
		records = append(records, cloneMutationAuditRecord(record))
	}
	sort.Slice(records, func(i, j int) bool {
		if records[i].CreatedAt.Equal(records[j].CreatedAt) {
			return records[i].ID > records[j].ID
		}
		return records[i].CreatedAt.After(records[j].CreatedAt)
	})
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

func (store *MemoryStore) appendMutationAuditLocked(record MutationAuditRecord) {
	store.nextMutationAudit++
	record.ID = store.nextMutationAudit
	if len(record.EventJSON) == 0 {
		record.EventJSON = mustJSON(map[string]any{})
	}
	store.mutationAudits = append(store.mutationAudits, cloneMutationAuditRecord(record))
}

func cloneMutationAuditRecord(record MutationAuditRecord) MutationAuditRecord {
	record.EventJSON = append(json.RawMessage(nil), record.EventJSON...)
	return record
}
