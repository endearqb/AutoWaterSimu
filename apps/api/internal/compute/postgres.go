package compute

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresStore struct {
	pool *pgxpool.Pool
}

func OpenPostgresStore(ctx context.Context, databaseURL string) (*PostgresStore, error) {
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		return nil, err
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, err
	}
	return &PostgresStore{pool: pool}, nil
}

func (store *PostgresStore) Close() {
	store.pool.Close()
}

func (store *PostgresStore) ApplyMigrations(ctx context.Context, migrationsDir string) error {
	entries, err := os.ReadDir(migrationsDir)
	if err != nil {
		return err
	}
	var ups []string
	for _, entry := range entries {
		name := entry.Name()
		if strings.HasSuffix(name, ".up.sql") {
			ups = append(ups, name)
		}
	}
	sort.Strings(ups)
	for _, name := range ups {
		version := strings.TrimSuffix(name, ".up.sql")
		applied, err := store.migrationApplied(ctx, version)
		if err != nil {
			return err
		}
		if applied {
			continue
		}
		sqlBytes, err := os.ReadFile(filepath.Join(migrationsDir, name))
		if err != nil {
			return err
		}
		tx, err := store.pool.Begin(ctx)
		if err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, string(sqlBytes)); err != nil {
			_ = tx.Rollback(ctx)
			return err
		}
		if _, err := tx.Exec(ctx, "INSERT INTO schema_migrations (version) VALUES ($1)", version); err != nil {
			_ = tx.Rollback(ctx)
			return err
		}
		if err := tx.Commit(ctx); err != nil {
			return err
		}
	}
	return nil
}

func (store *PostgresStore) migrationApplied(ctx context.Context, version string) (bool, error) {
	_, err := store.pool.Exec(ctx, "CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())")
	if err != nil {
		return false, err
	}
	var exists bool
	err = store.pool.QueryRow(ctx, "SELECT EXISTS (SELECT 1 FROM schema_migrations WHERE version=$1)", version).Scan(&exists)
	return exists, err
}

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
		source_system, requested_by, trace_id, tenant_id, project_id, created_by,
		payload_hash, input_json, attempt, cancel_requested, created_at, queued_at
	) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
		job.JobID, job.SchemaVersion, job.JobType, job.Queue, job.Status, job.RequestID, job.IdempotencyKey,
		job.SourceSystem, job.RequestedBy, job.TraceID, nullString(job.TenantID), nullString(job.ProjectID), nullString(job.CreatedBy),
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

func (store *PostgresStore) Artifacts(ctx context.Context, jobID string) ([]ArtifactRecord, error) {
	rows, err := store.pool.Query(ctx, artifactSelectSQL()+" WHERE job_id=$1 ORDER BY created_at, id", jobID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanArtifacts(rows)
}

func (store *PostgresStore) FindArtifact(ctx context.Context, artifactID string) (*ArtifactRecord, error) {
	row := store.pool.QueryRow(ctx, artifactSelectSQL()+" WHERE id=$1", artifactID)
	artifact, err := scanArtifact(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, NotFound(CodeArtifactNotFound, "artifact not found")
	}
	return artifact, err
}

func (store *PostgresStore) InsertArtifact(ctx context.Context, artifact ArtifactRecord, event EventRecord) error {
	tx, err := store.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	var status string
	if err := tx.QueryRow(ctx, "SELECT status FROM compute_jobs WHERE id=$1", artifact.JobID).Scan(&status); err != nil {
		return err
	}
	if status != StatusRunning {
		_, _ = tx.Exec(ctx, "INSERT INTO compute_job_events (job_id,event_type,event_json,created_at) VALUES ($1,'late_result_rejected',$2,$3)", artifact.JobID, mustJSON(map[string]any{"artifact_id": artifact.ArtifactID, "status": status}), time.Now().UTC())
		_ = tx.Commit(ctx)
		return Conflict(CodeWorkerStale, "job is terminal or not running")
	}
	_, err = tx.Exec(ctx, `INSERT INTO artifacts (
		id, job_id, schema_version, artifact_type, storage_provider, object_key,
		content_type, size_bytes, checksum, metadata_json, created_at
	) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
		artifact.ArtifactID, artifact.JobID, artifact.SchemaVersion, artifact.ArtifactType, artifact.StorageProvider,
		artifact.ObjectKey, artifact.ContentType, artifact.SizeBytes, artifact.Checksum, artifact.Metadata, artifact.CreatedAt)
	if err != nil {
		return err
	}
	_, err = tx.Exec(ctx, "INSERT INTO compute_job_events (job_id,event_type,event_json,created_at) VALUES ($1,$2,$3,$4)", event.JobID, event.EventType, event.EventJSON, event.CreatedAt)
	if err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (store *PostgresStore) UpsertWorker(ctx context.Context, worker WorkerRecord) error {
	_, err := store.pool.Exec(ctx, `INSERT INTO workers (
		worker_id, capabilities, supported_contract_versions, runtime_version, current_job_id, heartbeat_at, registered_at
	) VALUES ($1,$2,$3,$4,$5,$6,$7)
	ON CONFLICT (worker_id) DO UPDATE SET
		capabilities=EXCLUDED.capabilities,
		supported_contract_versions=EXCLUDED.supported_contract_versions,
		runtime_version=EXCLUDED.runtime_version,
		current_job_id=EXCLUDED.current_job_id,
		heartbeat_at=EXCLUDED.heartbeat_at`,
		worker.WorkerID, worker.Capabilities, worker.SupportedContractVersions, worker.RuntimeVersion,
		nullString(worker.CurrentJobID), worker.HeartbeatAt, worker.RegisteredAt)
	return err
}

func (store *PostgresStore) ClaimNext(ctx context.Context, workerID string, leaseExpiresAt time.Time) (*JobRecord, error) {
	tx, err := store.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	var jobID string
	if err := tx.QueryRow(ctx, "SELECT id FROM compute_jobs WHERE status='queued' AND cancel_requested=false ORDER BY created_at, id LIMIT 1 FOR UPDATE SKIP LOCKED").Scan(&jobID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	now := time.Now().UTC()
	if _, err := tx.Exec(ctx, "UPDATE compute_jobs SET status='running', worker_id=$2, attempt=attempt+1, claimed_at=$3, started_at=$3, lease_expires_at=$4 WHERE id=$1", jobID, workerID, now, leaseExpiresAt); err != nil {
		return nil, err
	}
	if _, err := tx.Exec(ctx, "INSERT INTO compute_job_events (job_id,event_type,event_json,created_at) VALUES ($1,'job.running',$2,$3)", jobID, mustJSON(map[string]any{"worker_id": workerID}), now); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return store.FindJobByID(ctx, jobID)
}

func (store *PostgresStore) Heartbeat(ctx context.Context, workerID, jobID string, leaseExpiresAt time.Time) (*JobRecord, error) {
	now := time.Now().UTC()
	_, _ = store.pool.Exec(ctx, "UPDATE workers SET heartbeat_at=$2, current_job_id=$3 WHERE worker_id=$1", workerID, now, jobID)
	_, _ = store.pool.Exec(ctx, "UPDATE compute_jobs SET lease_expires_at=$3 WHERE id=$1 AND worker_id=$2 AND status='running'", jobID, workerID, leaseExpiresAt)
	return store.FindJobByID(ctx, jobID)
}

func (store *PostgresStore) CancelJob(ctx context.Context, jobID string, now time.Time) (*JobRecord, error) {
	tx, err := store.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	tag, err := tx.Exec(ctx, "UPDATE compute_jobs SET status='cancelled', cancel_requested=true, finished_at=$2 WHERE id=$1 AND status IN ('queued','running')", jobID, now)
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
	if _, err := tx.Exec(ctx, "INSERT INTO compute_job_events (job_id,event_type,event_json,created_at) VALUES ($1,'job.cancelled',$2,$3)", jobID, mustJSON(map[string]any{"status": StatusCancelled}), now); err != nil {
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

func (store *PostgresStore) TimeoutExpired(ctx context.Context, now time.Time) ([]JobRecord, error) {
	rows, err := store.pool.Query(ctx, "UPDATE compute_jobs SET status='timed_out', error_code=$1, error_message='worker lease expired', finished_at=$2 WHERE status='running' AND lease_expires_at < $2 RETURNING id", CodeTimeout, now)
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
		_, _ = store.pool.Exec(ctx, "INSERT INTO compute_job_events (job_id,event_type,event_json,created_at) VALUES ($1,'job.timed_out',$2,$3)", id, mustJSON(map[string]any{"status": StatusTimedOut, "error_code": CodeTimeout}), now)
		job, err := store.FindJobByID(ctx, id)
		if err != nil {
			return nil, err
		}
		jobs = append(jobs, *job)
	}
	return jobs, nil
}

type rowScanner interface {
	Scan(dest ...any) error
}

func scanJob(row rowScanner) (*JobRecord, error) {
	var job JobRecord
	err := row.Scan(
		&job.JobID, &job.SchemaVersion, &job.JobType, &job.Queue, &job.Status, &job.RequestID,
		&job.IdempotencyKey, &job.SourceSystem, &job.RequestedBy, &job.TraceID, &job.TenantID,
		&job.ProjectID, &job.CreatedBy, &job.PayloadHash, &job.InputJSON, &job.Summary, &job.ResultHash,
		&job.WorkerID, &job.Attempt, &job.CancelRequested, &job.ClaimedAt, &job.LeaseExpiresAt,
		&job.CreatedAt, &job.QueuedAt, &job.StartedAt, &job.FinishedAt, &job.ErrorCode, &job.ErrorMessage,
	)
	if err != nil {
		return nil, err
	}
	return &job, nil
}

func scanArtifact(row rowScanner) (*ArtifactRecord, error) {
	var artifact ArtifactRecord
	err := row.Scan(&artifact.ArtifactID, &artifact.JobID, &artifact.SchemaVersion, &artifact.ArtifactType, &artifact.StorageProvider, &artifact.ObjectKey, &artifact.ContentType, &artifact.SizeBytes, &artifact.Checksum, &artifact.Metadata, &artifact.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &artifact, nil
}

func scanArtifacts(rows pgx.Rows) ([]ArtifactRecord, error) {
	var artifacts []ArtifactRecord
	for rows.Next() {
		artifact, err := scanArtifact(rows)
		if err != nil {
			return nil, err
		}
		artifacts = append(artifacts, *artifact)
	}
	return artifacts, rows.Err()
}

func jobSelectSQL() string {
	return `SELECT id, schema_version, job_type, queue, status, request_id, idempotency_key,
		source_system, requested_by, trace_id, COALESCE(tenant_id,''), COALESCE(project_id,''), COALESCE(created_by,''),
		payload_hash, input_json, COALESCE(summary_json,'null'::jsonb), COALESCE(result_hash,''), COALESCE(worker_id,''),
		attempt, cancel_requested, claimed_at, lease_expires_at, created_at, queued_at, started_at, finished_at,
		COALESCE(error_code,''), COALESCE(error_message,'') FROM compute_jobs`
}

func artifactSelectSQL() string {
	return `SELECT id, job_id, schema_version, artifact_type, storage_provider, object_key, content_type,
		size_bytes, checksum, COALESCE(metadata_json,'null'::jsonb), created_at FROM artifacts`
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

func nullString(value string) any {
	if value == "" {
		return nil
	}
	return value
}
