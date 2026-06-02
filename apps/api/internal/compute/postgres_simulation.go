package compute

import (
	"context"
	"errors"
	"github.com/jackc/pgx/v5"
)

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
