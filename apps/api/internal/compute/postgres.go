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
		content_type, size_bytes, checksum, retention_policy, retain_until, metadata_json, created_at
	) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
		artifact.ArtifactID, artifact.JobID, artifact.SchemaVersion, artifact.ArtifactType, artifact.StorageProvider,
		artifact.ObjectKey, artifact.ContentType, artifact.SizeBytes, artifact.Checksum, artifact.RetentionPolicy, artifact.RetainUntil,
		artifact.Metadata, artifact.CreatedAt)
	if err != nil {
		return err
	}
	_, err = tx.Exec(ctx, "INSERT INTO compute_job_events (job_id,event_type,event_json,created_at) VALUES ($1,$2,$3,$4)", event.JobID, event.EventType, event.EventJSON, event.CreatedAt)
	if err != nil {
		return err
	}
	return tx.Commit(ctx)
}

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
		modelRunID, modelRunJobID, modelKey, modelVersion, parameterSetID, err := modelRunFieldsFromRaw(modelRun)
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

func (store *PostgresStore) UpsertProcessGraph(ctx context.Context, record ProcessGraphRecord) (bool, error) {
	tx, err := store.pool.Begin(ctx)
	if err != nil {
		return false, err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	var existingHash string
	err = tx.QueryRow(ctx, "SELECT payload_hash FROM process_graphs WHERE id=$1 AND version=$2 FOR UPDATE", record.ProcessGraphID, record.Version).Scan(&existingHash)
	if err == nil {
		if existingHash != record.PayloadHash {
			return false, Conflict(CodeIdempotencyConflict, "process_graph_id/version was reused with a different payload")
		}
		if err := tx.Commit(ctx); err != nil {
			return false, err
		}
		return false, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return false, err
	}
	_, err = tx.Exec(ctx, `INSERT INTO process_graphs (
		id, schema_version, version, source_canvas_graph_id, payload_hash, payload_json,
		source_system, requested_by, tenant_id, project_id, metadata_json, created_at
	) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
		record.ProcessGraphID, record.SchemaVersion, record.Version, record.SourceCanvasGraphID,
		record.PayloadHash, record.Payload, record.SourceSystem, record.RequestedBy,
		nullString(record.TenantID), nullString(record.ProjectID), record.Metadata, record.CreatedAt)
	if err != nil {
		return false, err
	}
	if err := tx.Commit(ctx); err != nil {
		return false, err
	}
	return true, nil
}

func (store *PostgresStore) FindProcessGraph(ctx context.Context, processGraphID string, version int) (*ProcessGraphRecord, error) {
	row := store.pool.QueryRow(ctx, processGraphSelectSQL()+" WHERE id=$1 AND version=$2", processGraphID, version)
	record, err := scanProcessGraph(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, NotFound(CodeProcessGraphNotFound, "process graph not found")
	}
	return record, err
}

func (store *PostgresStore) UpsertSimulationInput(ctx context.Context, record SimulationInputRecord) (bool, error) {
	tx, err := store.pool.Begin(ctx)
	if err != nil {
		return false, err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	var existingHash string
	err = tx.QueryRow(ctx, "SELECT payload_hash FROM simulation_inputs WHERE id=$1 FOR UPDATE", record.SimulationInputID).Scan(&existingHash)
	if err == nil {
		if existingHash != record.PayloadHash {
			return false, Conflict(CodeIdempotencyConflict, "simulation_input_id was reused with a different payload")
		}
		if err := tx.Commit(ctx); err != nil {
			return false, err
		}
		return false, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return false, err
	}
	_, err = tx.Exec(ctx, `INSERT INTO simulation_inputs (
		id, schema_version, job_type, process_graph_id, process_graph_version,
		payload_hash, payload_json, source_system, requested_by, tenant_id, project_id,
		metadata_json, created_at
	) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
		record.SimulationInputID, record.SchemaVersion, record.JobType, record.ProcessGraphID, record.ProcessGraphVersion,
		record.PayloadHash, record.Payload, record.SourceSystem, record.RequestedBy, nullString(record.TenantID), nullString(record.ProjectID),
		record.Metadata, record.CreatedAt)
	if err != nil {
		return false, err
	}
	if err := tx.Commit(ctx); err != nil {
		return false, err
	}
	return true, nil
}

func (store *PostgresStore) FindSimulationInput(ctx context.Context, simulationInputID string) (*SimulationInputRecord, error) {
	row := store.pool.QueryRow(ctx, simulationInputSelectSQL()+" WHERE id=$1", simulationInputID)
	record, err := scanSimulationInput(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, NotFound(CodeSimulationInputNotFound, "simulation input not found")
	}
	return record, err
}

func (store *PostgresStore) UpsertDraftConfirmation(ctx context.Context, record DraftConfirmationRecord) (bool, error) {
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
		tenant_id, project_id, metadata_json, created_at
	) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
		record.ConfirmationID, record.SchemaVersion, record.DraftSchemaVersion, record.DraftID,
		record.Decision, nullString(record.DecisionReason), record.ConfirmedBy, record.ConfirmedAt,
		record.PayloadHash, record.Payload, record.SourceSystem, record.RequestedBy,
		nullString(record.TenantID), nullString(record.ProjectID), record.Metadata, record.CreatedAt)
	if err != nil {
		return false, err
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

func (store *PostgresStore) UpsertResultExplanation(ctx context.Context, record ResultExplanationRecord) (bool, error) {
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

func (store *PostgresStore) UpdateResultExplanationReview(ctx context.Context, jobID, explanationID, reviewedBy, decision, reason string, metadata json.RawMessage, now time.Time) (*ResultExplanationRecord, error) {
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
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return updated, nil
}

func (store *PostgresStore) PublishResultExplanation(ctx context.Context, jobID, explanationID, publishedBy string, now time.Time) (*ResultExplanationRecord, error) {
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
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return updated, nil
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

func (store *PostgresStore) FindWorkerByID(ctx context.Context, workerID string) (*WorkerRecord, error) {
	row := store.pool.QueryRow(ctx, `SELECT worker_id, capabilities, supported_contract_versions, COALESCE(runtime_version,''), COALESCE(current_job_id,''), heartbeat_at, registered_at FROM workers WHERE worker_id=$1`, workerID)
	worker, err := scanWorker(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ValidationError("worker is not registered")
	}
	return worker, err
}

func (store *PostgresStore) ClaimNext(ctx context.Context, worker WorkerRecord, leaseExpiresAt time.Time) (*JobRecord, error) {
	tx, err := store.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	rows, err := tx.Query(ctx, jobSelectSQL()+" WHERE status='queued' AND cancel_requested=false ORDER BY created_at, id FOR UPDATE SKIP LOCKED")
	if err != nil {
		return nil, err
	}
	var selected *JobRecord
	for rows.Next() {
		job, err := scanJob(rows)
		if err != nil {
			rows.Close()
			return nil, err
		}
		if jobMatchesWorker(*job, worker) {
			selected = job
			break
		}
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return nil, err
	}
	rows.Close()
	if selected == nil {
		_ = tx.Commit(ctx)
		return nil, nil
	}
	now := time.Now().UTC()
	if _, err := tx.Exec(ctx, "UPDATE compute_jobs SET status='running', worker_id=$2, attempt=attempt+1, claimed_at=$3, started_at=$3, lease_expires_at=$4 WHERE id=$1", selected.JobID, worker.WorkerID, now, leaseExpiresAt); err != nil {
		return nil, err
	}
	if _, err := tx.Exec(ctx, "INSERT INTO compute_job_events (job_id,event_type,event_json,created_at) VALUES ($1,'job.running',$2,$3)", selected.JobID, mustJSON(map[string]any{"worker_id": worker.WorkerID}), now); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return store.FindJobByID(ctx, selected.JobID)
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
	err := row.Scan(
		&artifact.ArtifactID,
		&artifact.JobID,
		&artifact.SchemaVersion,
		&artifact.ArtifactType,
		&artifact.StorageProvider,
		&artifact.ObjectKey,
		&artifact.ContentType,
		&artifact.SizeBytes,
		&artifact.Checksum,
		&artifact.RetentionPolicy,
		&artifact.RetainUntil,
		&artifact.Metadata,
		&artifact.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &artifact, nil
}

func scanWorker(row rowScanner) (*WorkerRecord, error) {
	var worker WorkerRecord
	err := row.Scan(
		&worker.WorkerID,
		&worker.Capabilities,
		&worker.SupportedContractVersions,
		&worker.RuntimeVersion,
		&worker.CurrentJobID,
		&worker.HeartbeatAt,
		&worker.RegisteredAt,
	)
	if err != nil {
		return nil, err
	}
	return &worker, nil
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

func scanProcessGraph(row rowScanner) (*ProcessGraphRecord, error) {
	var record ProcessGraphRecord
	err := row.Scan(
		&record.ProcessGraphID,
		&record.SchemaVersion,
		&record.Version,
		&record.SourceCanvasGraphID,
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

func scanSimulationInput(row rowScanner) (*SimulationInputRecord, error) {
	var record SimulationInputRecord
	err := row.Scan(
		&record.SimulationInputID,
		&record.SchemaVersion,
		&record.JobType,
		&record.ProcessGraphID,
		&record.ProcessGraphVersion,
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
		&record.Metadata,
		&record.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &record, nil
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
		size_bytes, checksum, COALESCE(retention_policy,'retain_forever'), retain_until,
		COALESCE(metadata_json,'null'::jsonb), created_at FROM artifacts`
}

func modelCatalogSelectSQL() string {
	return `SELECT catalog_id, schema_version, generated_at, payload_hash, payload_json,
		source_system, requested_by, COALESCE(tenant_id,''), COALESCE(project_id,''),
		COALESCE(metadata_json,'null'::jsonb), created_at FROM model_catalogs`
}

func processGraphSelectSQL() string {
	return `SELECT id, schema_version, version, source_canvas_graph_id, payload_hash, payload_json,
		source_system, requested_by, COALESCE(tenant_id,''), COALESCE(project_id,''),
		COALESCE(metadata_json,'null'::jsonb), created_at FROM process_graphs`
}

func simulationInputSelectSQL() string {
	return `SELECT id, schema_version, job_type, process_graph_id, process_graph_version,
		payload_hash, payload_json, source_system, requested_by, COALESCE(tenant_id,''), COALESCE(project_id,''),
		COALESCE(metadata_json,'null'::jsonb), created_at FROM simulation_inputs`
}

func draftConfirmationSelectSQL() string {
	return `SELECT id, schema_version, draft_schema_version, draft_id, decision,
		COALESCE(decision_reason,''), confirmed_by, confirmed_at, payload_hash, payload_json,
		source_system, requested_by, COALESCE(tenant_id,''), COALESCE(project_id,''),
		COALESCE(metadata_json,'null'::jsonb), created_at FROM draft_confirmations`
}

func resultExplanationSelectSQL() string {
	return `SELECT id, job_id, schema_version, explanation_schema_version, status, created_by,
		payload_hash, payload_json, resolved_evidence_refs, source_system, requested_by,
		COALESCE(tenant_id,''), COALESCE(project_id,''), COALESCE(metadata_json,'null'::jsonb),
		submitted_at, COALESCE(reviewed_by,''), reviewed_at, COALESCE(review_decision,''),
		COALESCE(review_reason,''), COALESCE(published_by,''), published_at, created_at, updated_at
		FROM result_explanations`
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

func nullString(value string) any {
	if value == "" {
		return nil
	}
	return value
}
