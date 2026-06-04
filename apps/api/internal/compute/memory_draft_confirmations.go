package compute

import (
	"context"
	"encoding/json"
)

func (store *MemoryStore) UpsertDraftConfirmation(_ context.Context, record DraftConfirmationRecord) (bool, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	existing, ok := store.confirmations[record.ConfirmationID]
	if ok {
		if existing.PayloadHash != record.PayloadHash {
			return false, Conflict(CodeIdempotencyConflict, "confirmation_id was reused with a different payload")
		}
		return false, nil
	}
	record.Payload = append(json.RawMessage(nil), record.Payload...)
	record.Metadata = append(json.RawMessage(nil), record.Metadata...)
	store.confirmations[record.ConfirmationID] = record
	return true, nil
}

func (store *MemoryStore) FindDraftConfirmation(_ context.Context, confirmationID string) (*DraftConfirmationRecord, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	record, ok := store.confirmations[confirmationID]
	if !ok {
		return nil, NotFound(CodeDraftConfirmationNotFound, "draft confirmation not found")
	}
	record.Payload = append(json.RawMessage(nil), record.Payload...)
	record.Metadata = append(json.RawMessage(nil), record.Metadata...)
	return &record, nil
}
