package compute

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
)

func (store *PostgresStore) UpsertResultExplanation(ctx context.Context, record ResultExplanationRecord, createdEvent *EventRecord) (bool, error) {
	tx, err := store.pool.Begin(ctx)
	if err != nil {
		return false, err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	var existingHash string
	err = tx.QueryRow(ctx, "SELECT payload_hash FROM result_explanations WHERE id=$1 AND job_id=$2 FOR UPDATE", record.ExplanationID, record.JobID).Scan(&existingHash)
	if err == nil {
		if existingHash != record.PayloadHash {
			return false, Conflict(CodeIdempotencyConflict, "explanation_id was reused with a different payload")
		}
		if err := tx.Commit(ctx); err != nil {
			return false, err
		}
		return false, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return false, err
	}
	_, err = tx.Exec(ctx, `INSERT INTO result_explanations (
		id, job_id, schema_version, explanation_schema_version, status, created_by,
		payload_hash, payload_json, resolved_evidence_refs, source_system, requested_by,
		tenant_id, project_id, metadata_json, submitted_at, reviewed_by, reviewed_at,
		review_decision, review_reason, published_by, published_at, created_at, updated_at
	) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)`,
		record.ExplanationID, record.JobID, record.SchemaVersion, record.ExplanationSchemaVersion, record.Status, record.CreatedBy,
		record.PayloadHash, record.Payload, record.ResolvedEvidenceRefs, record.SourceSystem, record.RequestedBy,
		nullString(record.TenantID), nullString(record.ProjectID), record.Metadata, record.SubmittedAt, nullString(record.ReviewedBy),
		record.ReviewedAt, nullString(record.ReviewDecision), nullString(record.ReviewReason), nullString(record.PublishedBy),
		record.PublishedAt, record.CreatedAt, record.UpdatedAt)
	if err != nil {
		return false, err
	}
	if err := insertOptionalJobEvent(ctx, tx, createdEvent); err != nil {
		return false, err
	}
	if err := tx.Commit(ctx); err != nil {
		return false, err
	}
	return true, nil
}

func (store *PostgresStore) FindResultExplanation(ctx context.Context, jobID, explanationID string) (*ResultExplanationRecord, error) {
	row := store.pool.QueryRow(ctx, resultExplanationSelectSQL()+" WHERE job_id=$1 AND id=$2", jobID, explanationID)
	record, err := scanResultExplanation(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, NotFound(CodeResultExplanationNotFound, "result explanation not found")
	}
	return record, err
}

func (store *PostgresStore) UpdateResultExplanationReview(ctx context.Context, jobID, explanationID, reviewedBy, decision, reason string, metadata json.RawMessage, now time.Time, event *EventRecord) (*ResultExplanationRecord, error) {
	tx, err := store.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	record, err := scanResultExplanation(tx.QueryRow(ctx, resultExplanationSelectSQL()+" WHERE job_id=$1 AND id=$2 FOR UPDATE", jobID, explanationID))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, NotFound(CodeResultExplanationNotFound, "result explanation not found")
	}
	if err != nil {
		return nil, err
	}
	if record.Status == "published" {
		return nil, Conflict(CodeResultExplanationInvalidState, "published result explanation cannot be reviewed")
	}
	nextStatus := "rejected"
	if decision == "approved" {
		nextStatus = "approved"
	}
	nextMetadata := record.Metadata
	if len(metadata) > 0 && string(metadata) != "null" {
		nextMetadata = metadata
	}
	_, err = tx.Exec(ctx, `UPDATE result_explanations SET
		status=$1, reviewed_by=$2, reviewed_at=$3, review_decision=$4, review_reason=$5,
		metadata_json=$6, updated_at=$7
		WHERE job_id=$8 AND id=$9`,
		nextStatus, reviewedBy, now, decision, nullString(reason), nextMetadata, now, jobID, explanationID)
	if err != nil {
		return nil, err
	}
	updated, err := scanResultExplanation(tx.QueryRow(ctx, resultExplanationSelectSQL()+" WHERE job_id=$1 AND id=$2", jobID, explanationID))
	if err != nil {
		return nil, err
	}
	if err := insertOptionalJobEvent(ctx, tx, event); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return updated, nil
}

func (store *PostgresStore) PublishResultExplanation(ctx context.Context, jobID, explanationID, publishedBy string, now time.Time, event *EventRecord) (*ResultExplanationRecord, error) {
	tx, err := store.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	record, err := scanResultExplanation(tx.QueryRow(ctx, resultExplanationSelectSQL()+" WHERE job_id=$1 AND id=$2 FOR UPDATE", jobID, explanationID))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, NotFound(CodeResultExplanationNotFound, "result explanation not found")
	}
	if err != nil {
		return nil, err
	}
	if record.Status == "published" {
		if err := tx.Commit(ctx); err != nil {
			return nil, err
		}
		return record, nil
	}
	if record.Status != "approved" {
		return nil, Conflict(CodeResultExplanationInvalidState, "result explanation must be approved before publishing")
	}
	_, err = tx.Exec(ctx, `UPDATE result_explanations SET
		status='published', published_by=$1, published_at=$2, updated_at=$2
		WHERE job_id=$3 AND id=$4`,
		publishedBy, now, jobID, explanationID)
	if err != nil {
		return nil, err
	}
	updated, err := scanResultExplanation(tx.QueryRow(ctx, resultExplanationSelectSQL()+" WHERE job_id=$1 AND id=$2", jobID, explanationID))
	if err != nil {
		return nil, err
	}
	if err := insertOptionalJobEvent(ctx, tx, event); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return updated, nil
}

func insertOptionalJobEvent(ctx context.Context, tx pgx.Tx, event *EventRecord) error {
	if event == nil {
		return nil
	}
	copy := *event
	if copy.CreatedAt.IsZero() {
		copy.CreatedAt = time.Now().UTC()
	}
	if len(copy.EventJSON) == 0 {
		copy.EventJSON = mustJSON(map[string]any{})
	}
	_, err := tx.Exec(ctx, "INSERT INTO compute_job_events (job_id,event_type,event_json,created_at) VALUES ($1,$2,$3,$4)", copy.JobID, copy.EventType, copy.EventJSON, copy.CreatedAt)
	return err
}

func scanResultExplanation(row rowScanner) (*ResultExplanationRecord, error) {
	var record ResultExplanationRecord
	err := row.Scan(
		&record.ExplanationID,
		&record.JobID,
		&record.SchemaVersion,
		&record.ExplanationSchemaVersion,
		&record.Status,
		&record.CreatedBy,
		&record.PayloadHash,
		&record.Payload,
		&record.ResolvedEvidenceRefs,
		&record.SourceSystem,
		&record.RequestedBy,
		&record.TenantID,
		&record.ProjectID,
		&record.Metadata,
		&record.SubmittedAt,
		&record.ReviewedBy,
		&record.ReviewedAt,
		&record.ReviewDecision,
		&record.ReviewReason,
		&record.PublishedBy,
		&record.PublishedAt,
		&record.CreatedAt,
		&record.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &record, nil
}

func resultExplanationSelectSQL() string {
	return `SELECT id, job_id, schema_version, explanation_schema_version, status, created_by,
		payload_hash, payload_json, resolved_evidence_refs, source_system, requested_by,
		COALESCE(tenant_id,''), COALESCE(project_id,''), COALESCE(metadata_json,'null'::jsonb),
		submitted_at, COALESCE(reviewed_by,''), reviewed_at, COALESCE(review_decision,''),
		COALESCE(review_reason,''), COALESCE(published_by,''), published_at, created_at, updated_at
		FROM result_explanations`
}
