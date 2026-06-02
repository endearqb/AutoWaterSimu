package compute

import (
	domainmodels "autowatersimu/apps/api/internal/domain/models"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/jackc/pgx/v5"
	"strings"
	"time"
)

func (store *PostgresStore) InsertModelRuns(ctx context.Context, jobID string, modelRuns []json.RawMessage, now time.Time) error {
	if len(modelRuns) == 0 {
		return nil
	}
	tx, err := store.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	for _, modelRun := range modelRuns {
		modelRunID, modelRunJobID, modelKey, modelVersion, parameterSetID, err := domainmodels.RunFieldsFromRaw(modelRun)
		if err != nil {
			return ValidationError("model_run JSON is invalid")
		}
		if modelRunID == "" {
			return ValidationError("model_run_id is required")
		}
		if modelRunJobID != "" && modelRunJobID != jobID {
			return ValidationError("model_run job_id does not match completed job")
		}
		_, err = tx.Exec(ctx, `INSERT INTO model_runs (
			id, job_id, model_key, model_version, parameter_set_id, runtime_audit, created_at
		) VALUES ($1,$2,$3,$4,$5,$6,$7)
		ON CONFLICT (id) DO UPDATE SET
			job_id=EXCLUDED.job_id,
			model_key=EXCLUDED.model_key,
			model_version=EXCLUDED.model_version,
			parameter_set_id=EXCLUDED.parameter_set_id,
			runtime_audit=EXCLUDED.runtime_audit`,
			modelRunID, jobID, nullString(modelKey), nullString(modelVersion), nullString(parameterSetID), modelRun, now)
		if err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

func (store *PostgresStore) FindModelRun(ctx context.Context, modelRunID string) (json.RawMessage, error) {
	var modelRun json.RawMessage
	err := store.pool.QueryRow(ctx, "SELECT runtime_audit FROM model_runs WHERE id=$1", modelRunID).Scan(&modelRun)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, NotFound(CodeModelRunNotFound, "model run not found")
	}
	return modelRun, err
}

func (store *PostgresStore) ListModelRuns(ctx context.Context, filter ModelRunFilter) ([]json.RawMessage, string, int, error) {
	limit := filter.Limit
	if limit <= 0 {
		limit = 50
	}
	if limit > 200 {
		limit = 200
	}
	offset := decodeCursor(filter.Cursor)
	where, args := modelRunListWhere(filter)
	countSQL := "SELECT COUNT(*) FROM model_runs" + where
	var total int
	if err := store.pool.QueryRow(ctx, countSQL, args...).Scan(&total); err != nil {
		return nil, "", 0, err
	}
	args = append(args, limit+1, offset)
	rows, err := store.pool.Query(ctx, "SELECT runtime_audit FROM model_runs"+where+" ORDER BY created_at DESC, id DESC LIMIT $"+fmt.Sprint(len(args)-1)+" OFFSET $"+fmt.Sprint(len(args)), args...)
	if err != nil {
		return nil, "", 0, err
	}
	defer rows.Close()
	var modelRuns []json.RawMessage
	for rows.Next() {
		var modelRun json.RawMessage
		if err := rows.Scan(&modelRun); err != nil {
			return nil, "", 0, err
		}
		modelRuns = append(modelRuns, modelRun)
	}
	next := ""
	if len(modelRuns) > limit {
		modelRuns = modelRuns[:limit]
		next = encodeCursor(offset + limit)
	}
	return modelRuns, next, total, rows.Err()
}

func (store *PostgresStore) ModelRuns(ctx context.Context, jobID string) ([]json.RawMessage, error) {
	rows, err := store.pool.Query(ctx, "SELECT runtime_audit FROM model_runs WHERE job_id=$1 ORDER BY created_at, id", jobID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var modelRuns []json.RawMessage
	for rows.Next() {
		var modelRun json.RawMessage
		if err := rows.Scan(&modelRun); err != nil {
			return nil, err
		}
		modelRuns = append(modelRuns, modelRun)
	}
	return modelRuns, rows.Err()
}

func (store *PostgresStore) UpsertBenchmarkRun(ctx context.Context, record BenchmarkRunRecord) (BenchmarkRunRecord, bool, error) {
	tx, err := store.pool.Begin(ctx)
	if err != nil {
		return BenchmarkRunRecord{}, false, err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	existing, err := scanBenchmarkRun(tx.QueryRow(ctx, benchmarkRunSelectSQL()+" WHERE id=$1 FOR UPDATE", record.BenchmarkRunID))
	if err == nil {
		if existing.PayloadHash != record.PayloadHash {
			return BenchmarkRunRecord{}, false, Conflict(CodeIdempotencyConflict, "benchmark_run_id was reused with a different payload")
		}
		if err := tx.Commit(ctx); err != nil {
			return BenchmarkRunRecord{}, false, err
		}
		return *existing, false, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return BenchmarkRunRecord{}, false, err
	}
	_, err = tx.Exec(ctx, `INSERT INTO benchmark_runs (
		id, schema_version, model_key, model_version, benchmark_case_id,
		parameter_set_id, model_run_id, job_id, status, payload_hash, payload_json,
		source_system, requested_by, tenant_id, project_id, metadata_json, executed_at, created_at
	) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
		record.BenchmarkRunID, record.SchemaVersion, record.ModelKey, record.ModelVersion,
		record.BenchmarkCaseID, record.ParameterSetID, record.ModelRunID, record.JobID,
		record.Status, record.PayloadHash, record.Payload, record.SourceSystem, record.RequestedBy,
		nullString(record.TenantID), nullString(record.ProjectID), record.Metadata, record.ExecutedAt, record.CreatedAt)
	if err != nil {
		return BenchmarkRunRecord{}, false, err
	}
	return record, true, tx.Commit(ctx)
}

func (store *PostgresStore) FindBenchmarkRun(ctx context.Context, benchmarkRunID string) (*BenchmarkRunRecord, error) {
	record, err := scanBenchmarkRun(store.pool.QueryRow(ctx, benchmarkRunSelectSQL()+" WHERE id=$1", benchmarkRunID))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, NotFound(CodeBenchmarkRunNotFound, "benchmark run not found")
	}
	return record, err
}

func (store *PostgresStore) ListBenchmarkRuns(ctx context.Context, filter BenchmarkRunFilter) ([]BenchmarkRunRecord, string, int, error) {
	limit := filter.Limit
	if limit <= 0 {
		limit = 50
	}
	if limit > 200 {
		limit = 200
	}
	offset := decodeCursor(filter.Cursor)
	where, args := benchmarkRunListWhere(filter)
	var total int
	if err := store.pool.QueryRow(ctx, "SELECT COUNT(*) FROM benchmark_runs"+where, args...).Scan(&total); err != nil {
		return nil, "", 0, err
	}
	args = append(args, limit+1, offset)
	rows, err := store.pool.Query(ctx, benchmarkRunSelectSQL()+where+" ORDER BY executed_at DESC, id DESC LIMIT $"+fmt.Sprint(len(args)-1)+" OFFSET $"+fmt.Sprint(len(args)), args...)
	if err != nil {
		return nil, "", 0, err
	}
	defer rows.Close()
	var records []BenchmarkRunRecord
	for rows.Next() {
		record, err := scanBenchmarkRun(rows)
		if err != nil {
			return nil, "", 0, err
		}
		records = append(records, *record)
	}
	next := ""
	if len(records) > limit {
		records = records[:limit]
		next = encodeCursor(offset + limit)
	}
	return records, next, total, rows.Err()
}

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

func scanBenchmarkRun(row rowScanner) (*BenchmarkRunRecord, error) {
	var record BenchmarkRunRecord
	err := row.Scan(
		&record.BenchmarkRunID,
		&record.SchemaVersion,
		&record.ModelKey,
		&record.ModelVersion,
		&record.BenchmarkCaseID,
		&record.ParameterSetID,
		&record.ModelRunID,
		&record.JobID,
		&record.Status,
		&record.PayloadHash,
		&record.Payload,
		&record.SourceSystem,
		&record.RequestedBy,
		&record.TenantID,
		&record.ProjectID,
		&record.Metadata,
		&record.ExecutedAt,
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

func benchmarkRunSelectSQL() string {
	return `SELECT id, schema_version, model_key, model_version, benchmark_case_id,
		parameter_set_id, model_run_id, job_id, status, payload_hash, payload_json,
		source_system, requested_by, COALESCE(tenant_id,''), COALESCE(project_id,''),
		COALESCE(metadata_json,'null'::jsonb), executed_at, created_at FROM benchmark_runs`
}

func modelRunListWhere(filter ModelRunFilter) (string, []any) {
	var clauses []string
	var args []any
	add := func(sql string, value any) {
		args = append(args, value)
		clauses = append(clauses, fmt.Sprintf(sql, len(args)))
	}
	if filter.JobID != "" {
		add("job_id=$%d", filter.JobID)
	}
	if filter.ModelKey != "" {
		add("model_key=$%d", filter.ModelKey)
	}
	if filter.ModelVersion != "" {
		add("model_version=$%d", filter.ModelVersion)
	}
	if len(clauses) == 0 {
		return "", args
	}
	return " WHERE " + strings.Join(clauses, " AND "), args
}

func benchmarkRunListWhere(filter BenchmarkRunFilter) (string, []any) {
	var clauses []string
	var args []any
	add := func(sql string, value any) {
		args = append(args, value)
		clauses = append(clauses, fmt.Sprintf(sql, len(args)))
	}
	if filter.ModelKey != "" {
		add("model_key=$%d", filter.ModelKey)
	}
	if filter.ModelVersion != "" {
		add("model_version=$%d", filter.ModelVersion)
	}
	if filter.BenchmarkCaseID != "" {
		add("benchmark_case_id=$%d", filter.BenchmarkCaseID)
	}
	if filter.ParameterSetID != "" {
		add("parameter_set_id=$%d", filter.ParameterSetID)
	}
	if len(clauses) == 0 {
		return "", args
	}
	return " WHERE " + strings.Join(clauses, " AND "), args
}
