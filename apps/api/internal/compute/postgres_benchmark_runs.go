package compute

import (
	"context"
	"errors"
	"fmt"
	"github.com/jackc/pgx/v5"
	"strings"
)

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

func benchmarkRunSelectSQL() string {
	return `SELECT id, schema_version, model_key, model_version, benchmark_case_id,
		parameter_set_id, model_run_id, job_id, status, payload_hash, payload_json,
		source_system, requested_by, COALESCE(tenant_id,''), COALESCE(project_id,''),
		COALESCE(metadata_json,'null'::jsonb), executed_at, created_at FROM benchmark_runs`
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
