package compute

import (
	domainjobs "autowatersimu/apps/api/internal/domain/jobs"
	"context"
	"errors"
	"fmt"
	"github.com/jackc/pgx/v5"
	"time"
)

func (store *PostgresStore) UpsertWorker(ctx context.Context, worker WorkerRecord) error {
	tx, err := store.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	var before *WorkerRecord
	existing, err := scanWorker(tx.QueryRow(ctx, `SELECT worker_id, capabilities, supported_contract_versions, COALESCE(runtime_version,''), COALESCE(current_job_id,''), heartbeat_at, registered_at FROM workers WHERE worker_id=$1`, worker.WorkerID))
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return err
	}
	if err == nil {
		before = existing
	}
	_, err = tx.Exec(ctx, `INSERT INTO workers (
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
	if err != nil {
		return err
	}
	if err := insertMutationAuditEvent(ctx, tx, workerRegistrationAudit(ctx, before, worker)); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (store *PostgresStore) FindWorkerByID(ctx context.Context, workerID string) (*WorkerRecord, error) {
	row := store.pool.QueryRow(ctx, `SELECT worker_id, capabilities, supported_contract_versions, COALESCE(runtime_version,''), COALESCE(current_job_id,''), heartbeat_at, registered_at FROM workers WHERE worker_id=$1`, workerID)
	worker, err := scanWorker(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ValidationError("worker is not registered")
	}
	return worker, err
}

func (store *PostgresStore) ClaimNext(ctx context.Context, worker WorkerRecord, leaseExpiresAt time.Time, filter ListFilter) (*JobRecord, error) {
	tx, err := store.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	now := time.Now().UTC()
	activeFilter := filter
	activeFilter.Status = StatusRunning
	activeWhere, activeArgs := listWhere(activeFilter)
	activeArgs = append(activeArgs, worker.WorkerID, now)
	activeWhere += fmt.Sprintf(" AND worker_id=$%d AND lease_expires_at >= $%d", len(activeArgs)-1, len(activeArgs))
	active, err := scanJob(tx.QueryRow(ctx, jobSelectSQL()+activeWhere+" ORDER BY started_at, id LIMIT 1 FOR UPDATE", activeArgs...))
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}
	if err == nil {
		before := *active
		mutation, ok := domainjobs.NewHeartbeatMutation(domainjobs.HeartbeatRecord{
			JobID:    active.JobID,
			Status:   active.Status,
			WorkerID: active.WorkerID,
		}, worker.WorkerID, now, leaseExpiresAt)
		if ok {
			after := *active
			applyHeartbeatMutationToJobRecord(&after, mutation)
			if _, err := tx.Exec(ctx, "UPDATE compute_jobs SET lease_expires_at=$3 WHERE id=$1 AND worker_id=$2 AND status=$4", mutation.JobID, mutation.WorkerID, mutation.LeaseExpiresAt, mutation.Status); err != nil {
				return nil, err
			}
			if _, err := tx.Exec(ctx, "INSERT INTO compute_job_events (job_id,event_type,event_json,created_at) VALUES ($1,$2,$3,$4)", mutation.JobID, mutation.EventType, workerHeartbeatEventJSON(ctx, mutation.HeartbeatAt, before, after, mutation.WorkerID), mutation.HeartbeatAt); err != nil {
				return nil, err
			}
		}
		if err := tx.Commit(ctx); err != nil {
			return nil, err
		}
		return store.FindJobByID(ctx, active.JobID)
	}
	claimFilter := filter
	claimFilter.Status = StatusQueued
	where, args := listWhere(claimFilter)
	if where == "" {
		where = " WHERE cancel_requested=false"
	} else {
		where += " AND cancel_requested=false"
	}
	rows, err := tx.Query(ctx, jobSelectSQL()+where+" ORDER BY created_at, id FOR UPDATE SKIP LOCKED", args...)
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
		if domainjobs.MatchesWorker(
			domainjobs.ClaimCandidate{
				SchemaVersion: job.SchemaVersion,
				InputJSON:     job.InputJSON,
			},
			domainjobs.WorkerCapabilities{
				Capabilities:              worker.Capabilities,
				SupportedContractVersions: worker.SupportedContractVersions,
			},
		) {
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
	mutation := domainjobs.NewClaimMutation(domainjobs.ClaimRecord{
		JobID:   selected.JobID,
		Attempt: selected.Attempt,
	}, worker.WorkerID, now, leaseExpiresAt)
	if _, err := tx.Exec(ctx, "UPDATE compute_jobs SET status=$2, worker_id=$3, attempt=$4, claimed_at=$5, started_at=$6, lease_expires_at=$7 WHERE id=$1", selected.JobID, mutation.Status, mutation.WorkerID, mutation.Attempt, mutation.ClaimedAt, mutation.StartedAt, mutation.LeaseExpiresAt); err != nil {
		return nil, err
	}
	if _, err := tx.Exec(ctx, "INSERT INTO compute_job_events (job_id,event_type,event_json,created_at) VALUES ($1,$2,$3,$4)", selected.JobID, mutation.EventType, workerClaimEventJSON(ctx, mutation.ClaimedAt, *selected, mutation.WorkerID, mutation.Attempt), mutation.ClaimedAt); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return store.FindJobByID(ctx, selected.JobID)
}

func (store *PostgresStore) Heartbeat(ctx context.Context, workerID, jobID string, leaseExpiresAt time.Time) (*JobRecord, error) {
	now := time.Now().UTC()
	tx, err := store.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	job, err := scanJob(tx.QueryRow(ctx, jobSelectSQL()+" WHERE id=$1 FOR UPDATE", jobID))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, NotFound(CodeJobNotFound, "job not found")
	}
	if err != nil {
		return nil, err
	}
	if _, err := tx.Exec(ctx, "UPDATE workers SET heartbeat_at=$2, current_job_id=$3 WHERE worker_id=$1", workerID, now, jobID); err != nil {
		return nil, err
	}
	mutation, ok := domainjobs.NewHeartbeatMutation(domainjobs.HeartbeatRecord{
		JobID:    job.JobID,
		Status:   job.Status,
		WorkerID: job.WorkerID,
	}, workerID, now, leaseExpiresAt)
	if ok {
		after := *job
		applyHeartbeatMutationToJobRecord(&after, mutation)
		if _, err := tx.Exec(ctx, "UPDATE compute_jobs SET lease_expires_at=$3 WHERE id=$1 AND worker_id=$2 AND status=$4", mutation.JobID, mutation.WorkerID, mutation.LeaseExpiresAt, mutation.Status); err != nil {
			return nil, err
		}
		if _, err := tx.Exec(ctx, "INSERT INTO compute_job_events (job_id,event_type,event_json,created_at) VALUES ($1,$2,$3,$4)", mutation.JobID, mutation.EventType, workerHeartbeatEventJSON(ctx, mutation.HeartbeatAt, *job, after, mutation.WorkerID), mutation.HeartbeatAt); err != nil {
			return nil, err
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return store.FindJobByID(ctx, jobID)
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
