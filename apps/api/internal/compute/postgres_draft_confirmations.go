package compute

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
)

func (store *PostgresStore) UpsertDraftConfirmation(ctx context.Context, record DraftConfirmationRecord, audit *MutationAuditRecord) (bool, error) {
	tx, err := store.pool.Begin(ctx)
	if err != nil {
		return false, err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	var existingHash string
	err = tx.QueryRow(ctx, "SELECT payload_hash FROM draft_confirmations WHERE id=$1 FOR UPDATE", record.ConfirmationID).Scan(&existingHash)
	if err == nil {
		if existingHash != record.PayloadHash {
			return false, Conflict(CodeIdempotencyConflict, "confirmation_id was reused with a different payload")
		}
		if err := tx.Commit(ctx); err != nil {
			return false, err
		}
		return false, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return false, err
	}
	_, err = tx.Exec(ctx, `INSERT INTO draft_confirmations (
		id, schema_version, draft_schema_version, draft_id, decision, decision_reason,
		confirmed_by, confirmed_at, payload_hash, payload_json, source_system, requested_by,
		tenant_id, project_id, site_id, metadata_json, created_at
	) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
		record.ConfirmationID, record.SchemaVersion, record.DraftSchemaVersion, record.DraftID,
		record.Decision, nullString(record.DecisionReason), record.ConfirmedBy, record.ConfirmedAt,
		record.PayloadHash, record.Payload, record.SourceSystem, record.RequestedBy,
		nullString(record.TenantID), nullString(record.ProjectID), nullString(record.SiteID), record.Metadata, record.CreatedAt)
	if err != nil {
		return false, err
	}
	if audit != nil {
		if err := insertMutationAuditEvent(ctx, tx, *audit); err != nil {
			return false, err
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return false, err
	}
	return true, nil
}

func (store *PostgresStore) FindDraftConfirmation(ctx context.Context, confirmationID string) (*DraftConfirmationRecord, error) {
	row := store.pool.QueryRow(ctx, draftConfirmationSelectSQL()+" WHERE id=$1", confirmationID)
	record, err := scanDraftConfirmation(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, NotFound(CodeDraftConfirmationNotFound, "draft confirmation not found")
	}
	return record, err
}

func scanDraftConfirmation(row rowScanner) (*DraftConfirmationRecord, error) {
	var record DraftConfirmationRecord
	err := row.Scan(
		&record.ConfirmationID,
		&record.SchemaVersion,
		&record.DraftSchemaVersion,
		&record.DraftID,
		&record.Decision,
		&record.DecisionReason,
		&record.ConfirmedBy,
		&record.ConfirmedAt,
		&record.PayloadHash,
		&record.Payload,
		&record.SourceSystem,
		&record.RequestedBy,
		&record.TenantID,
		&record.ProjectID,
		&record.SiteID,
		&record.Metadata,
		&record.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &record, nil
}

func draftConfirmationSelectSQL() string {
	return `SELECT id, schema_version, draft_schema_version, draft_id, decision,
		COALESCE(decision_reason,''), confirmed_by, confirmed_at, payload_hash, payload_json,
		source_system, requested_by, COALESCE(tenant_id,''), COALESCE(project_id,''), COALESCE(site_id,''),
		COALESCE(metadata_json,'null'::jsonb), created_at FROM draft_confirmations`
}
