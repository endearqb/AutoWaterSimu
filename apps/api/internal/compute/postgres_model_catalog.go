package compute

import (
	"context"
	"errors"
	"github.com/jackc/pgx/v5"
)

func (store *PostgresStore) UpsertModelCatalog(ctx context.Context, record ModelCatalogRecord) (ModelCatalogRecord, bool, error) {
	tx, err := store.pool.Begin(ctx)
	if err != nil {
		return ModelCatalogRecord{}, false, err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	existing, err := scanModelCatalog(tx.QueryRow(ctx, modelCatalogSelectSQL()+" WHERE catalog_id=$1 AND payload_hash=$2 FOR UPDATE", record.CatalogID, record.PayloadHash))
	if err == nil {
		if err := tx.Commit(ctx); err != nil {
			return ModelCatalogRecord{}, false, err
		}
		return *existing, false, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return ModelCatalogRecord{}, false, err
	}
	_, err = tx.Exec(ctx, `INSERT INTO model_catalogs (
		catalog_id, schema_version, generated_at, payload_hash, payload_json,
		source_system, requested_by, tenant_id, project_id, metadata_json, created_at
	) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
		record.CatalogID, record.SchemaVersion, record.GeneratedAt, record.PayloadHash,
		record.Payload, record.SourceSystem, record.RequestedBy, nullString(record.TenantID),
		nullString(record.ProjectID), record.Metadata, record.CreatedAt)
	if err != nil {
		return ModelCatalogRecord{}, false, err
	}
	if err := tx.Commit(ctx); err != nil {
		return ModelCatalogRecord{}, false, err
	}
	return record, true, nil
}

func (store *PostgresStore) LatestModelCatalog(ctx context.Context, catalogID string) (*ModelCatalogRecord, error) {
	row := store.pool.QueryRow(ctx, modelCatalogSelectSQL()+" WHERE catalog_id=$1 ORDER BY created_at DESC, snapshot_id DESC LIMIT 1", catalogID)
	record, err := scanModelCatalog(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, NotFound(CodeModelCatalogNotFound, "model catalog not found")
	}
	return record, err
}

func (store *PostgresStore) ListModelCatalogSnapshots(ctx context.Context, filter ModelCatalogSnapshotFilter) ([]ModelCatalogRecord, string, int, error) {
	catalogID := defaultString(filter.CatalogID, "default")
	limit := normalizeListLimit(filter.Limit)
	offset := decodeCursor(filter.Cursor)
	var total int
	if err := store.pool.QueryRow(ctx, "SELECT COUNT(*) FROM model_catalogs WHERE catalog_id=$1", catalogID).Scan(&total); err != nil {
		return nil, "", 0, err
	}
	rows, err := store.pool.Query(
		ctx,
		modelCatalogSelectSQL()+" WHERE catalog_id=$1 ORDER BY created_at DESC, snapshot_id DESC LIMIT $2 OFFSET $3",
		catalogID,
		limit+1,
		offset,
	)
	if err != nil {
		return nil, "", 0, err
	}
	defer rows.Close()
	var records []ModelCatalogRecord
	for rows.Next() {
		record, err := scanModelCatalog(rows)
		if err != nil {
			return nil, "", 0, err
		}
		records = append(records, *record)
	}
	if err := rows.Err(); err != nil {
		return nil, "", 0, err
	}
	next := ""
	if len(records) > limit {
		records = records[:limit]
		next = encodeCursor(offset + limit)
	}
	return records, next, total, nil
}

func scanModelCatalog(row rowScanner) (*ModelCatalogRecord, error) {
	var record ModelCatalogRecord
	err := row.Scan(
		&record.CatalogID,
		&record.SchemaVersion,
		&record.GeneratedAt,
		&record.PayloadHash,
		&record.Payload,
		&record.SourceSystem,
		&record.RequestedBy,
		&record.TenantID,
		&record.ProjectID,
		&record.Metadata,
		&record.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &record, nil
}

func modelCatalogSelectSQL() string {
	return `SELECT catalog_id, schema_version, generated_at, payload_hash, payload_json,
		source_system, requested_by, COALESCE(tenant_id,''), COALESCE(project_id,''),
		COALESCE(metadata_json,'null'::jsonb), created_at FROM model_catalogs`
}
