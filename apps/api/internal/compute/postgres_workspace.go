package compute

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

func (store *PostgresStore) InsertScenario(ctx context.Context, record ScenarioRecord) error {
	_, err := store.pool.Exec(ctx, `INSERT INTO simulation_scenarios (
		id, name, description, model_family, status, version,
		current_canvas_graph_id, current_canvas_graph_version,
		published_process_graph_id, published_process_graph_version,
		current_simulation_input_id, context_snapshot_id, source_scenario_id, last_job_id,
		source_system, requested_by, tenant_id, project_id, site_id, metadata_json,
		created_at, updated_at, archived_at
	) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)`,
		record.ScenarioID, record.Name, record.Description, record.ModelFamily, record.Status, record.Version,
		nullString(record.CurrentCanvasGraphID), nullInt(record.CurrentCanvasGraphVersion),
		nullString(record.PublishedProcessGraphID), nullInt(record.PublishedProcessGraphVersion),
		nullString(record.CurrentSimulationInputID), nullString(record.ContextSnapshotID), nullString(record.SourceScenarioID), nullString(record.LastJobID),
		record.SourceSystem, record.RequestedBy, nullString(record.TenantID), nullString(record.ProjectID), nullString(record.SiteID), record.Metadata,
		record.CreatedAt, record.UpdatedAt, record.ArchivedAt)
	return err
}

func (store *PostgresStore) UpdateScenario(ctx context.Context, record ScenarioRecord) error {
	tag, err := store.pool.Exec(ctx, `UPDATE simulation_scenarios SET
		name=$2, description=$3, model_family=$4, status=$5, version=$6,
		current_canvas_graph_id=$7, current_canvas_graph_version=$8,
		published_process_graph_id=$9, published_process_graph_version=$10,
		current_simulation_input_id=$11, context_snapshot_id=$12, source_scenario_id=$13, last_job_id=$14,
		source_system=$15, requested_by=$16, tenant_id=$17, project_id=$18, site_id=$19,
		metadata_json=$20, updated_at=$21, archived_at=$22
		WHERE id=$1`,
		record.ScenarioID, record.Name, record.Description, record.ModelFamily, record.Status, record.Version,
		nullString(record.CurrentCanvasGraphID), nullInt(record.CurrentCanvasGraphVersion),
		nullString(record.PublishedProcessGraphID), nullInt(record.PublishedProcessGraphVersion),
		nullString(record.CurrentSimulationInputID), nullString(record.ContextSnapshotID), nullString(record.SourceScenarioID), nullString(record.LastJobID),
		record.SourceSystem, record.RequestedBy, nullString(record.TenantID), nullString(record.ProjectID), nullString(record.SiteID),
		record.Metadata, record.UpdatedAt, record.ArchivedAt)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return NotFound(CodeScenarioNotFound, "scenario not found")
	}
	return nil
}

func (store *PostgresStore) FindScenario(ctx context.Context, scenarioID string) (*ScenarioRecord, error) {
	record, err := scanScenario(store.pool.QueryRow(ctx, scenarioSelectSQL()+" WHERE id=$1", scenarioID))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, NotFound(CodeScenarioNotFound, "scenario not found")
	}
	return record, err
}

func (store *PostgresStore) ListScenarios(ctx context.Context, filter ScenarioFilter) ([]ScenarioRecord, string, int, error) {
	limit := normalizeListLimit(filter.Limit)
	offset := decodeCursor(filter.Cursor)
	where, args := scenarioListWhere(filter)
	var total int
	if err := store.pool.QueryRow(ctx, "SELECT COUNT(*) FROM simulation_scenarios"+where, args...).Scan(&total); err != nil {
		return nil, "", 0, err
	}
	queryArgs := append(append([]any(nil), args...), limit+1, offset)
	rows, err := store.pool.Query(ctx, scenarioSelectSQL()+where+fmt.Sprintf(" ORDER BY updated_at DESC, id DESC LIMIT $%d OFFSET $%d", len(args)+1, len(args)+2), queryArgs...)
	if err != nil {
		return nil, "", 0, err
	}
	defer rows.Close()
	var records []ScenarioRecord
	for rows.Next() {
		record, err := scanScenario(rows)
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

func (store *PostgresStore) InsertCanvasGraph(ctx context.Context, record CanvasGraphRecord) error {
	_, err := store.pool.Exec(ctx, `INSERT INTO canvas_graphs (
		id, scenario_id, schema_version, name, version, payload_hash, payload_json,
		source_system, requested_by, tenant_id, project_id, site_id, metadata_json, created_at, archived_at
	) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
		record.GraphID, nullString(record.ScenarioID), record.SchemaVersion, record.Name, record.Version, record.PayloadHash, record.Payload,
		record.SourceSystem, record.RequestedBy, nullString(record.TenantID), nullString(record.ProjectID), nullString(record.SiteID), record.Metadata, record.CreatedAt, record.ArchivedAt)
	return err
}

func (store *PostgresStore) FindCanvasGraph(ctx context.Context, graphID string, version int) (*CanvasGraphRecord, error) {
	record, err := scanCanvasGraph(store.pool.QueryRow(ctx, canvasGraphSelectSQL()+" WHERE id=$1 AND version=$2", graphID, version))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, NotFound(CodeCanvasGraphNotFound, "canvas graph not found")
	}
	return record, err
}

func (store *PostgresStore) LatestCanvasGraph(ctx context.Context, graphID string) (*CanvasGraphRecord, error) {
	record, err := scanCanvasGraph(store.pool.QueryRow(ctx, canvasGraphSelectSQL()+" WHERE id=$1 ORDER BY version DESC LIMIT 1", graphID))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, NotFound(CodeCanvasGraphNotFound, "canvas graph not found")
	}
	return record, err
}

func (store *PostgresStore) ListCanvasGraphs(ctx context.Context, filter CanvasGraphFilter) ([]CanvasGraphRecord, string, int, error) {
	limit := normalizeListLimit(filter.Limit)
	offset := decodeCursor(filter.Cursor)
	where, args := canvasGraphListWhere(filter)
	var total int
	if err := store.pool.QueryRow(ctx, "SELECT COUNT(*) FROM canvas_graphs"+where, args...).Scan(&total); err != nil {
		return nil, "", 0, err
	}
	queryArgs := append(append([]any(nil), args...), limit+1, offset)
	rows, err := store.pool.Query(ctx, canvasGraphSelectSQL()+where+fmt.Sprintf(" ORDER BY created_at DESC, id DESC, version DESC LIMIT $%d OFFSET $%d", len(args)+1, len(args)+2), queryArgs...)
	if err != nil {
		return nil, "", 0, err
	}
	defer rows.Close()
	var records []CanvasGraphRecord
	for rows.Next() {
		record, err := scanCanvasGraph(rows)
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

func (store *PostgresStore) ArchiveCanvasGraph(ctx context.Context, graphID string, archivedAt time.Time) error {
	tag, err := store.pool.Exec(ctx, "UPDATE canvas_graphs SET archived_at=$2 WHERE id=$1", graphID, archivedAt)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return NotFound(CodeCanvasGraphNotFound, "canvas graph not found")
	}
	return nil
}

func (store *PostgresStore) InsertContextSnapshot(ctx context.Context, record ContextSnapshotRecord) error {
	_, err := store.pool.Exec(ctx, `INSERT INTO context_snapshots (
		id, scenario_id, schema_version, source_system, captured_at, payload_hash, payload_json,
		tenant_id, project_id, site_id, metadata_json, created_at
	) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
		record.ContextSnapshotID, nullString(record.ScenarioID), record.SchemaVersion, record.SourceSystem, record.CapturedAt, record.PayloadHash, record.Payload,
		nullString(record.TenantID), nullString(record.ProjectID), nullString(record.SiteID), record.Metadata, record.CreatedAt)
	return err
}

func (store *PostgresStore) FindContextSnapshot(ctx context.Context, snapshotID string) (*ContextSnapshotRecord, error) {
	record, err := scanContextSnapshot(store.pool.QueryRow(ctx, contextSnapshotSelectSQL()+" WHERE id=$1", snapshotID))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, NotFound(CodeContextSnapshotNotFound, "context snapshot not found")
	}
	return record, err
}

func (store *PostgresStore) ListContextSnapshots(ctx context.Context, filter ContextSnapshotFilter) ([]ContextSnapshotRecord, string, int, error) {
	limit := normalizeListLimit(filter.Limit)
	offset := decodeCursor(filter.Cursor)
	where, args := contextSnapshotListWhere(filter)
	var total int
	if err := store.pool.QueryRow(ctx, "SELECT COUNT(*) FROM context_snapshots"+where, args...).Scan(&total); err != nil {
		return nil, "", 0, err
	}
	queryArgs := append(append([]any(nil), args...), limit+1, offset)
	rows, err := store.pool.Query(ctx, contextSnapshotSelectSQL()+where+fmt.Sprintf(" ORDER BY captured_at DESC, id DESC LIMIT $%d OFFSET $%d", len(args)+1, len(args)+2), queryArgs...)
	if err != nil {
		return nil, "", 0, err
	}
	defer rows.Close()
	var records []ContextSnapshotRecord
	for rows.Next() {
		record, err := scanContextSnapshot(rows)
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

func scanScenario(row rowScanner) (*ScenarioRecord, error) {
	var record ScenarioRecord
	err := row.Scan(
		&record.ScenarioID, &record.Name, &record.Description, &record.ModelFamily, &record.Status, &record.Version,
		&record.CurrentCanvasGraphID, &record.CurrentCanvasGraphVersion,
		&record.PublishedProcessGraphID, &record.PublishedProcessGraphVersion,
		&record.CurrentSimulationInputID, &record.ContextSnapshotID, &record.SourceScenarioID, &record.LastJobID,
		&record.SourceSystem, &record.RequestedBy, &record.TenantID, &record.ProjectID, &record.SiteID, &record.Metadata,
		&record.CreatedAt, &record.UpdatedAt, &record.ArchivedAt,
	)
	if err != nil {
		return nil, err
	}
	return &record, nil
}

func scanCanvasGraph(row rowScanner) (*CanvasGraphRecord, error) {
	var record CanvasGraphRecord
	err := row.Scan(
		&record.GraphID, &record.ScenarioID, &record.SchemaVersion, &record.Name, &record.Version,
		&record.PayloadHash, &record.Payload, &record.SourceSystem, &record.RequestedBy,
		&record.TenantID, &record.ProjectID, &record.SiteID, &record.Metadata, &record.CreatedAt, &record.ArchivedAt,
	)
	if err != nil {
		return nil, err
	}
	return &record, nil
}

func scanContextSnapshot(row rowScanner) (*ContextSnapshotRecord, error) {
	var record ContextSnapshotRecord
	err := row.Scan(
		&record.ContextSnapshotID, &record.ScenarioID, &record.SchemaVersion, &record.SourceSystem, &record.CapturedAt,
		&record.PayloadHash, &record.Payload, &record.TenantID, &record.ProjectID, &record.SiteID, &record.Metadata, &record.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &record, nil
}

func scenarioSelectSQL() string {
	return `SELECT id, name, description, model_family, status, version,
		COALESCE(current_canvas_graph_id,''), COALESCE(current_canvas_graph_version,0),
		COALESCE(published_process_graph_id,''), COALESCE(published_process_graph_version,0),
		COALESCE(current_simulation_input_id,''), COALESCE(context_snapshot_id,''), COALESCE(source_scenario_id,''), COALESCE(last_job_id,''),
		source_system, requested_by, COALESCE(tenant_id,''), COALESCE(project_id,''), COALESCE(site_id,''),
		COALESCE(metadata_json,'null'::jsonb), created_at, updated_at, archived_at FROM simulation_scenarios`
}

func canvasGraphSelectSQL() string {
	return `SELECT id, COALESCE(scenario_id,''), schema_version, name, version, payload_hash, payload_json,
		source_system, requested_by, COALESCE(tenant_id,''), COALESCE(project_id,''), COALESCE(site_id,''),
		COALESCE(metadata_json,'null'::jsonb), created_at, archived_at FROM canvas_graphs`
}

func contextSnapshotSelectSQL() string {
	return `SELECT id, COALESCE(scenario_id,''), schema_version, source_system, captured_at, payload_hash, payload_json,
		COALESCE(tenant_id,''), COALESCE(project_id,''), COALESCE(site_id,''),
		COALESCE(metadata_json,'null'::jsonb), created_at FROM context_snapshots`
}

func scenarioListWhere(filter ScenarioFilter) (string, []any) {
	var clauses []string
	var args []any
	addClause := func(sql string, value any) {
		args = append(args, value)
		clauses = append(clauses, fmt.Sprintf(sql, len(args)))
	}
	if strings.TrimSpace(filter.Status) != "" {
		addClause("status=$%d", strings.TrimSpace(filter.Status))
	}
	addScopeClauses(&clauses, &args, filter.TenantID, filter.ProjectID, filter.SiteID)
	if len(clauses) == 0 {
		return "", nil
	}
	return " WHERE " + strings.Join(clauses, " AND "), args
}

func canvasGraphListWhere(filter CanvasGraphFilter) (string, []any) {
	var clauses []string
	var args []any
	addClause := func(sql string, value any) {
		args = append(args, value)
		clauses = append(clauses, fmt.Sprintf(sql, len(args)))
	}
	if strings.TrimSpace(filter.ScenarioID) != "" {
		addClause("scenario_id=$%d", strings.TrimSpace(filter.ScenarioID))
	}
	addScopeClauses(&clauses, &args, filter.TenantID, filter.ProjectID, filter.SiteID)
	if len(clauses) == 0 {
		return "", nil
	}
	return " WHERE " + strings.Join(clauses, " AND "), args
}

func contextSnapshotListWhere(filter ContextSnapshotFilter) (string, []any) {
	var clauses []string
	var args []any
	addClause := func(sql string, value any) {
		args = append(args, value)
		clauses = append(clauses, fmt.Sprintf(sql, len(args)))
	}
	if strings.TrimSpace(filter.ScenarioID) != "" {
		addClause("scenario_id=$%d", strings.TrimSpace(filter.ScenarioID))
	}
	addScopeClauses(&clauses, &args, filter.TenantID, filter.ProjectID, filter.SiteID)
	if len(clauses) == 0 {
		return "", nil
	}
	return " WHERE " + strings.Join(clauses, " AND "), args
}

func addScopeClauses(clauses *[]string, args *[]any, tenantID, projectID, siteID string) {
	add := func(sql string, value any) {
		*args = append(*args, value)
		*clauses = append(*clauses, fmt.Sprintf(sql, len(*args)))
	}
	if strings.TrimSpace(tenantID) != "" {
		add("tenant_id=$%d", strings.TrimSpace(tenantID))
	}
	if strings.TrimSpace(projectID) != "" {
		add("project_id=$%d", strings.TrimSpace(projectID))
	}
	if strings.TrimSpace(siteID) != "" {
		add("site_id=$%d", strings.TrimSpace(siteID))
	}
}
