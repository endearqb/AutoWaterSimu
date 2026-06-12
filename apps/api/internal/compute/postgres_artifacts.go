package compute

import (
	"context"
	"errors"
	"fmt"
	"github.com/jackc/pgx/v5"
	"strings"
	"time"
)

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

func (store *PostgresStore) ListArtifactRetentionCandidates(ctx context.Context, now time.Time, limit int, filter ListFilter) ([]ArtifactRecord, error) {
	args := []any{now}
	clauses := []string{
		"artifacts.retention_policy IN ('ttl','archive_candidate')",
		"artifacts.retain_until IS NOT NULL",
		"artifacts.retain_until <= $1",
		`NOT EXISTS (
			SELECT 1 FROM artifact_archives aa
			WHERE aa.artifact_id = artifacts.id AND aa.status = 'archived'
		)`,
	}
	addScopeClause := func(column string, value string) {
		if value == "" {
			return
		}
		args = append(args, value)
		clauses = append(clauses, fmt.Sprintf("compute_jobs.%s=$%d", column, len(args)))
	}
	addScopeClause("tenant_id", filter.TenantID)
	addScopeClause("project_id", filter.ProjectID)
	addScopeClause("site_id", filter.SiteID)
	args = append(args, normalizeRetentionLimit(limit))
	rows, err := store.pool.Query(
		ctx,
		artifactSelectSQL()+` JOIN compute_jobs ON compute_jobs.id = artifacts.job_id
			WHERE `+strings.Join(clauses, " AND ")+`
			ORDER BY artifacts.retain_until, artifacts.created_at, artifacts.id
			LIMIT $`+fmt.Sprint(len(args)),
		args...,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanArtifacts(rows)
}

func (store *PostgresStore) ArtifactReferences(ctx context.Context, artifactID string) ([]string, error) {
	rows, err := store.pool.Query(
		ctx,
		`SELECT id FROM model_runs
			WHERE (runtime_audit->'evidence_refs' ? $1)
				OR (runtime_audit->'evidence_refs' ? $2)
			ORDER BY id`,
		artifactID,
		"artifact:"+artifactID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var refs []string
	for rows.Next() {
		var modelRunID string
		if err := rows.Scan(&modelRunID); err != nil {
			return nil, err
		}
		refs = append(refs, "model_run:"+modelRunID)
	}
	return refs, rows.Err()
}

func (store *PostgresStore) DeleteArtifact(ctx context.Context, artifactID string, event EventRecord) error {
	tx, err := store.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	var jobID string
	if err := tx.QueryRow(ctx, "SELECT job_id FROM artifacts WHERE id=$1 FOR UPDATE", artifactID).Scan(&jobID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return NotFound(CodeArtifactNotFound, "artifact not found")
		}
		return err
	}
	if _, err := tx.Exec(ctx, "DELETE FROM artifacts WHERE id=$1", artifactID); err != nil {
		return err
	}
	event.JobID = jobID
	if _, err := tx.Exec(ctx, "INSERT INTO compute_job_events (job_id,event_type,event_json,created_at) VALUES ($1,$2,$3,$4)", event.JobID, event.EventType, event.EventJSON, event.CreatedAt); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (store *PostgresStore) UpsertArtifactArchive(ctx context.Context, archive ArtifactArchiveRecord, event EventRecord) error {
	tx, err := store.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	var jobID string
	if err := tx.QueryRow(ctx, "SELECT job_id FROM artifacts WHERE id=$1 FOR UPDATE", archive.ArtifactID).Scan(&jobID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return NotFound(CodeArtifactNotFound, "artifact not found")
		}
		return err
	}
	archive.JobID = jobID
	_, err = tx.Exec(ctx, `INSERT INTO artifact_archives (
		artifact_id, job_id, original_storage_provider, original_object_key,
		archive_provider, archive_object_key, checksum, size_bytes, status, metadata_json, archived_at
	) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
	ON CONFLICT (artifact_id) DO UPDATE SET
		job_id=EXCLUDED.job_id,
		original_storage_provider=EXCLUDED.original_storage_provider,
		original_object_key=EXCLUDED.original_object_key,
		archive_provider=EXCLUDED.archive_provider,
		archive_object_key=EXCLUDED.archive_object_key,
		checksum=EXCLUDED.checksum,
		size_bytes=EXCLUDED.size_bytes,
		status=EXCLUDED.status,
		metadata_json=EXCLUDED.metadata_json,
		archived_at=EXCLUDED.archived_at`,
		archive.ArtifactID, archive.JobID, archive.OriginalStorageProvider, archive.OriginalObjectKey,
		archive.ArchiveProvider, archive.ArchiveObjectKey, archive.Checksum, archive.SizeBytes,
		archive.Status, archive.Metadata, archive.ArchivedAt,
	)
	if err != nil {
		return err
	}
	event.JobID = jobID
	if _, err := tx.Exec(ctx, "INSERT INTO compute_job_events (job_id,event_type,event_json,created_at) VALUES ($1,$2,$3,$4)", event.JobID, event.EventType, event.EventJSON, event.CreatedAt); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (store *PostgresStore) FindArtifactArchive(ctx context.Context, artifactID string) (*ArtifactArchiveRecord, error) {
	row := store.pool.QueryRow(ctx, `SELECT artifact_id, job_id, original_storage_provider, original_object_key,
		archive_provider, archive_object_key, checksum, size_bytes, status,
		COALESCE(metadata_json,'null'::jsonb), archived_at
		FROM artifact_archives WHERE artifact_id=$1`, artifactID)
	var archive ArtifactArchiveRecord
	if err := row.Scan(
		&archive.ArtifactID,
		&archive.JobID,
		&archive.OriginalStorageProvider,
		&archive.OriginalObjectKey,
		&archive.ArchiveProvider,
		&archive.ArchiveObjectKey,
		&archive.Checksum,
		&archive.SizeBytes,
		&archive.Status,
		&archive.Metadata,
		&archive.ArchivedAt,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, NotFound(CodeArtifactNotFound, "artifact archive not found")
		}
		return nil, err
	}
	return &archive, nil
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

func artifactSelectSQL() string {
	return `SELECT artifacts.id, artifacts.job_id, artifacts.schema_version, artifacts.artifact_type,
		artifacts.storage_provider, artifacts.object_key, artifacts.content_type,
		artifacts.size_bytes, artifacts.checksum, COALESCE(artifacts.retention_policy,'retain_forever'),
		artifacts.retain_until, COALESCE(artifacts.metadata_json,'null'::jsonb), artifacts.created_at FROM artifacts`
}
