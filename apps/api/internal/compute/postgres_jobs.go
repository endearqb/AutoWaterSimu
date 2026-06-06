package compute

import (
	domainjobs "autowatersimu/apps/api/internal/domain/jobs"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/jackc/pgx/v5"
	"strings"
	"time"
)

func (store *PostgresStore) FindJobByID(ctx context.Context, jobID string) (*JobRecord, error) {
	row := store.pool.QueryRow(ctx, jobSelectSQL()+" WHERE id=$1", jobID)
	job, err := scanJob(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, NotFound(CodeJobNotFound, "job not found")
	}
	return job, err
}

func (store *PostgresStore) FindJobByIdempotency(ctx context.Context, sourceSystem, requestedBy, key string) (*JobRecord, error) {
	row := store.pool.QueryRow(ctx, jobSelectSQL()+" WHERE source_system=$1 AND requested_by=$2 AND idempotency_key=$3", sourceSystem, requestedBy, key)
	job, err := scanJob(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return job, err
}

func (store *PostgresStore) InsertJob(ctx context.Context, job JobRecord, events []EventRecord) error {
	tx, err := store.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	_, err = tx.Exec(ctx, `INSERT INTO compute_jobs (
		id, schema_version, job_type, queue, status, request_id, idempotency_key,
		source_system, requested_by, trace_id, tenant_id, project_id, site_id, created_by,
		payload_hash, input_json, attempt, cancel_requested, created_at, queued_at
	) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
		job.JobID, job.SchemaVersion, job.JobType, job.Queue, job.Status, job.RequestID, job.IdempotencyKey,
		job.SourceSystem, job.RequestedBy, job.TraceID, nullString(job.TenantID), nullString(job.ProjectID), nullString(job.SiteID), nullString(job.CreatedBy),
		job.PayloadHash, job.InputJSON, job.Attempt, job.CancelRequested, job.CreatedAt, job.QueuedAt)
	if err != nil {
		return err
	}
	for _, event := range events {
		if _, err := tx.Exec(ctx, "INSERT INTO compute_job_events (job_id, event_type, event_json, created_at) VALUES ($1,$2,$3,$4)", event.JobID, event.EventType, event.EventJSON, event.CreatedAt); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

func (store *PostgresStore) ListJobs(ctx context.Context, filter ListFilter) ([]JobRecord, string, int, error) {
	limit := filter.Limit
	if limit <= 0 {
		limit = 50
	}
	if limit > 200 {
		limit = 200
	}
	offset := decodeCursor(filter.Cursor)
	where, args := listWhere(filter)
	countSQL := "SELECT COUNT(*) FROM compute_jobs" + where
	var total int
	if err := store.pool.QueryRow(ctx, countSQL, args...).Scan(&total); err != nil {
		return nil, "", 0, err
	}
	args = append(args, limit+1, offset)
	rows, err := store.pool.Query(ctx, jobSelectSQL()+where+" ORDER BY created_at DESC, id DESC LIMIT $"+fmt.Sprint(len(args)-1)+" OFFSET $"+fmt.Sprint(len(args)), args...)
	if err != nil {
		return nil, "", 0, err
	}
	defer rows.Close()
	var jobs []JobRecord
	for rows.Next() {
		job, err := scanJob(rows)
		if err != nil {
			return nil, "", 0, err
		}
		jobs = append(jobs, *job)
	}
	next := ""
	if len(jobs) > limit {
		jobs = jobs[:limit]
		next = encodeCursor(offset + limit)
	}
	return jobs, next, total, rows.Err()
}

func (store *PostgresStore) Events(ctx context.Context, jobID string) ([]EventRecord, error) {
	rows, err := store.pool.Query(ctx, "SELECT id, job_id, event_type, event_json, created_at FROM compute_job_events WHERE job_id=$1 ORDER BY id", jobID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var events []EventRecord
	for rows.Next() {
		var event EventRecord
		if err := rows.Scan(&event.ID, &event.JobID, &event.EventType, &event.EventJSON, &event.CreatedAt); err != nil {
			return nil, err
		}
		events = append(events, event)
	}
	return events, rows.Err()
}

func (store *PostgresStore) CancelJob(ctx context.Context, jobID string, mutation domainjobs.StateMutation) (*JobRecord, error) {
	tx, err := store.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	tag, err := tx.Exec(ctx, "UPDATE compute_jobs SET status=$3, cancel_requested=$4, finished_at=$2 WHERE id=$1 AND status IN ('queued','running')", jobID, mutation.FinishedAt, mutation.Status, mutation.CancelRequested)
	if err != nil {
		return nil, err
	}
	if tag.RowsAffected() == 0 {
		var status string
		err := tx.QueryRow(ctx, "SELECT status FROM compute_jobs WHERE id=$1", jobID).Scan(&status)
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, NotFound(CodeJobNotFound, "job not found")
		}
		return nil, Conflict(CodeJobAlreadyTerminal, "job is already terminal")
	}
	if _, err := tx.Exec(ctx, "INSERT INTO compute_job_events (job_id,event_type,event_json,created_at) VALUES ($1,$2,$3,$4)", jobID, mutation.EventType, mutation.EventJSON, mutation.FinishedAt); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return store.FindJobByID(ctx, jobID)
}

func (store *PostgresStore) CompleteJob(ctx context.Context, jobID, workerID string, attempt int, status string, summary json.RawMessage, resultHash, errorCode, errorMessage string, now time.Time) (*JobRecord, error) {
	tx, err := store.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	tag, err := tx.Exec(ctx, `UPDATE compute_jobs SET
		status=$4, summary_json=$5, result_hash=$6, error_code=$7, error_message=$8, finished_at=$9
		WHERE id=$1 AND worker_id=$2 AND attempt=$3 AND status='running' AND lease_expires_at >= $9`,
		jobID, workerID, attempt, status, summary, nullString(resultHash), nullString(errorCode), nullString(errorMessage), now)
	if err != nil {
		return nil, err
	}
	if tag.RowsAffected() == 0 {
		_, _ = tx.Exec(ctx, "INSERT INTO compute_job_events (job_id,event_type,event_json,created_at) VALUES ($1,'late_result_rejected',$2,$3)", jobID, mustJSON(map[string]any{"worker_id": workerID, "attempt": attempt}), now)
		_ = tx.Commit(ctx)
		return nil, Conflict(CodeWorkerStale, "worker result is stale")
	}
	if _, err := tx.Exec(ctx, "INSERT INTO compute_job_events (job_id,event_type,event_json,created_at) VALUES ($1,$2,$3,$4)", jobID, "job."+status, mustJSON(map[string]any{"status": status, "error_code": errorCode, "error_message": errorMessage}), now); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return store.FindJobByID(ctx, jobID)
}

func (store *PostgresStore) TimeoutExpired(ctx context.Context, mutation domainjobs.StateMutation) ([]JobRecord, error) {
	rows, err := store.pool.Query(ctx, "UPDATE compute_jobs SET status=$1, error_code=$2, error_message=$3, finished_at=$4 WHERE status='running' AND lease_expires_at < $4 RETURNING id", mutation.Status, mutation.ErrorCode, mutation.ErrorMessage, mutation.FinishedAt)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var ids []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	var jobs []JobRecord
	for _, id := range ids {
		_, _ = store.pool.Exec(ctx, "INSERT INTO compute_job_events (job_id,event_type,event_json,created_at) VALUES ($1,$2,$3,$4)", id, mutation.EventType, mutation.EventJSON, mutation.FinishedAt)
		job, err := store.FindJobByID(ctx, id)
		if err != nil {
			return nil, err
		}
		jobs = append(jobs, *job)
	}
	return jobs, nil
}

func scanJob(row rowScanner) (*JobRecord, error) {
	var job JobRecord
	err := row.Scan(
		&job.JobID, &job.SchemaVersion, &job.JobType, &job.Queue, &job.Status, &job.RequestID,
		&job.IdempotencyKey, &job.SourceSystem, &job.RequestedBy, &job.TraceID, &job.TenantID,
		&job.ProjectID, &job.SiteID, &job.CreatedBy, &job.PayloadHash, &job.InputJSON, &job.Summary, &job.ResultHash,
		&job.WorkerID, &job.Attempt, &job.CancelRequested, &job.ClaimedAt, &job.LeaseExpiresAt,
		&job.CreatedAt, &job.QueuedAt, &job.StartedAt, &job.FinishedAt, &job.ErrorCode, &job.ErrorMessage,
	)
	if err != nil {
		return nil, err
	}
	return &job, nil
}

func jobSelectSQL() string {
	return `SELECT id, schema_version, job_type, queue, status, request_id, idempotency_key,
		source_system, requested_by, trace_id, COALESCE(tenant_id,''), COALESCE(project_id,''), COALESCE(site_id,''), COALESCE(created_by,''),
		payload_hash, input_json, COALESCE(summary_json,'null'::jsonb), COALESCE(result_hash,''), COALESCE(worker_id,''),
		attempt, cancel_requested, claimed_at, lease_expires_at, created_at, queued_at, started_at, finished_at,
		COALESCE(error_code,''), COALESCE(error_message,'') FROM compute_jobs`
}

func listWhere(filter ListFilter) (string, []any) {
	var clauses []string
	var args []any
	add := func(sql string, value any) {
		args = append(args, value)
		clauses = append(clauses, fmt.Sprintf(sql, len(args)))
	}
	if filter.Status != "" {
		add("status=$%d", filter.Status)
	}
	if filter.JobType != "" {
		add("job_type=$%d", filter.JobType)
	}
	if filter.TenantID != "" {
		add("tenant_id=$%d", filter.TenantID)
	}
	if filter.ProjectID != "" {
		add("project_id=$%d", filter.ProjectID)
	}
	if filter.SiteID != "" {
		add("site_id=$%d", filter.SiteID)
	}
	if filter.CreatedAfter != nil {
		add("created_at>$%d", *filter.CreatedAfter)
	}
	if filter.CreatedBefore != nil {
		add("created_at<$%d", *filter.CreatedBefore)
	}
	if len(clauses) == 0 {
		return "", args
	}
	return " WHERE " + strings.Join(clauses, " AND "), args
}
