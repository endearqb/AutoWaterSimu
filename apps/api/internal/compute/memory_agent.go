package compute

import (
	"context"
	"encoding/json"
	"strings"
	"time"
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

func (store *MemoryStore) UpsertResultExplanation(_ context.Context, record ResultExplanationRecord) (bool, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	key := resultExplanationStoreKey(record.JobID, record.ExplanationID)
	existing, ok := store.explanations[key]
	if ok {
		if existing.PayloadHash != record.PayloadHash {
			return false, Conflict(CodeIdempotencyConflict, "explanation_id was reused with a different payload")
		}
		return false, nil
	}
	store.explanations[key] = cloneResultExplanationRecord(record)
	return true, nil
}

func (store *MemoryStore) FindResultExplanation(_ context.Context, jobID, explanationID string) (*ResultExplanationRecord, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	record, ok := store.explanations[resultExplanationStoreKey(jobID, explanationID)]
	if !ok {
		return nil, NotFound(CodeResultExplanationNotFound, "result explanation not found")
	}
	record = cloneResultExplanationRecord(record)
	return &record, nil
}

func (store *MemoryStore) UpdateResultExplanationReview(_ context.Context, jobID, explanationID, reviewedBy, decision, reason string, metadata json.RawMessage, now time.Time) (*ResultExplanationRecord, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	key := resultExplanationStoreKey(jobID, explanationID)
	record, ok := store.explanations[key]
	if !ok {
		return nil, NotFound(CodeResultExplanationNotFound, "result explanation not found")
	}
	if record.Status == "published" {
		return nil, Conflict(CodeResultExplanationInvalidState, "published result explanation cannot be reviewed")
	}
	if decision == "approved" {
		record.Status = "approved"
	} else {
		record.Status = "rejected"
	}
	record.ReviewedBy = reviewedBy
	record.ReviewedAt = &now
	record.ReviewDecision = decision
	record.ReviewReason = reason
	if len(metadata) > 0 && string(metadata) != "null" {
		record.Metadata = append(json.RawMessage(nil), metadata...)
	}
	record.UpdatedAt = now
	store.explanations[key] = cloneResultExplanationRecord(record)
	record = cloneResultExplanationRecord(record)
	return &record, nil
}

func (store *MemoryStore) PublishResultExplanation(_ context.Context, jobID, explanationID, publishedBy string, now time.Time) (*ResultExplanationRecord, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	key := resultExplanationStoreKey(jobID, explanationID)
	record, ok := store.explanations[key]
	if !ok {
		return nil, NotFound(CodeResultExplanationNotFound, "result explanation not found")
	}
	if record.Status == "published" {
		record = cloneResultExplanationRecord(record)
		return &record, nil
	}
	if record.Status != "approved" {
		return nil, Conflict(CodeResultExplanationInvalidState, "result explanation must be approved before publishing")
	}
	record.Status = "published"
	record.PublishedBy = publishedBy
	record.PublishedAt = &now
	record.UpdatedAt = now
	store.explanations[key] = cloneResultExplanationRecord(record)
	record = cloneResultExplanationRecord(record)
	return &record, nil
}

func resultExplanationStoreKey(jobID, explanationID string) string {
	return strings.TrimSpace(jobID) + ":" + strings.TrimSpace(explanationID)
}

func cloneResultExplanationRecord(record ResultExplanationRecord) ResultExplanationRecord {
	record.Payload = append(json.RawMessage(nil), record.Payload...)
	record.Metadata = append(json.RawMessage(nil), record.Metadata...)
	record.ResolvedEvidenceRefs = append([]string(nil), record.ResolvedEvidenceRefs...)
	if record.ReviewedAt != nil {
		reviewedAt := *record.ReviewedAt
		record.ReviewedAt = &reviewedAt
	}
	if record.PublishedAt != nil {
		publishedAt := *record.PublishedAt
		record.PublishedAt = &publishedAt
	}
	return record
}
