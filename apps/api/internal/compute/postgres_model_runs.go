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
