package compute

import (
	domainjobs "autowatersimu/apps/api/internal/domain/jobs"
	"context"
	"errors"
	"github.com/jackc/pgx/v5"
	"time"
)

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
