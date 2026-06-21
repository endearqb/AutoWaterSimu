package compute

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

func (store *PostgresStore) InsertUDMModelWithVersion(ctx context.Context, model UDMModelRecord, version UDMModelVersionRecord) error {
	tx, err := store.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	if err := insertUDMModel(ctx, tx, model); err != nil {
		return err
	}
	if err := insertUDMModelVersion(ctx, tx, version); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (store *PostgresStore) UpdateUDMModel(ctx context.Context, model UDMModelRecord) error {
	tag, err := store.pool.Exec(ctx, `UPDATE udm_models SET
		name=$2, description=$3, tags_json=$4, current_version=$5, is_published=$6,
		source_system=$7, requested_by=$8, tenant_id=$9, project_id=$10, site_id=$11,
		metadata_json=$12, updated_at=$13, archived_at=$14
		WHERE id=$1`,
		model.ID, model.Name, model.Description, mustJSON(model.Tags), model.CurrentVersion, model.IsPublished,
		model.SourceSystem, model.RequestedBy, nullString(model.TenantID), nullString(model.ProjectID), nullString(model.SiteID),
		model.Metadata, model.UpdatedAt, model.ArchivedAt,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return NotFound(CodeUDMModelNotFound, "UDM model not found")
	}
	return nil
}

func (store *PostgresStore) InsertUDMModelVersion(ctx context.Context, version UDMModelVersionRecord) error {
	return insertUDMModelVersion(ctx, store.pool, version)
}

func (store *PostgresStore) FindUDMModel(ctx context.Context, modelID string) (*UDMModelRecord, error) {
	row := store.pool.QueryRow(ctx, udmModelSelectSQL()+" WHERE id=$1 AND archived_at IS NULL", modelID)
	record, err := scanUDMModel(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, NotFound(CodeUDMModelNotFound, "UDM model not found")
	}
	return record, err
}

func (store *PostgresStore) FindUDMModelVersion(ctx context.Context, modelID string, version int) (*UDMModelVersionRecord, error) {
	row := store.pool.QueryRow(ctx, udmModelVersionSelectSQL()+" WHERE model_id=$1 AND version=$2", modelID, version)
	record, err := scanUDMModelVersion(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, NotFound(CodeUDMModelNotFound, "UDM model version not found")
	}
	return record, err
}

func (store *PostgresStore) ListUDMModelVersions(ctx context.Context, modelID string) ([]UDMModelVersionRecord, error) {
	rows, err := store.pool.Query(ctx, udmModelVersionSelectSQL()+" WHERE model_id=$1 ORDER BY version DESC", modelID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var records []UDMModelVersionRecord
	for rows.Next() {
		record, err := scanUDMModelVersion(rows)
		if err != nil {
			return nil, err
		}
		records = append(records, *record)
	}
	return records, rows.Err()
}

func (store *PostgresStore) ListUDMModels(ctx context.Context, filter UDMModelFilter) ([]UDMModelRecord, int, error) {
	limit := normalizeListLimit(filter.Limit)
	offset := filter.Skip
	if offset < 0 {
		offset = 0
	}
	where, args := udmModelListWhere(filter)
	var total int
	if err := store.pool.QueryRow(ctx, "SELECT COUNT(*) FROM udm_models"+where, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	queryArgs := append(append([]any(nil), args...), limit, offset)
	rows, err := store.pool.Query(
		ctx,
		udmModelSelectSQL()+where+fmt.Sprintf(" ORDER BY updated_at DESC, id DESC LIMIT $%d OFFSET $%d", len(args)+1, len(args)+2),
		queryArgs...,
	)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var records []UDMModelRecord
	for rows.Next() {
		record, err := scanUDMModel(rows)
		if err != nil {
			return nil, 0, err
		}
		records = append(records, *record)
	}
	return records, total, rows.Err()
}

func (store *PostgresStore) InsertUDMHybridConfig(ctx context.Context, record UDMHybridConfigRecord) error {
	_, err := store.pool.Exec(ctx, `INSERT INTO udm_hybrid_configs (
		id, name, description, hybrid_config_json, parameter_hash, validation_json,
		source_system, requested_by, owner_id, tenant_id, project_id, site_id, metadata_json, created_at, updated_at, archived_at
	) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
		record.ID, record.Name, record.Description, record.HybridConfig, record.ParameterHash, record.Validation,
		record.SourceSystem, record.RequestedBy, record.OwnerID, nullString(record.TenantID), nullString(record.ProjectID),
		nullString(record.SiteID), record.Metadata, record.CreatedAt, record.UpdatedAt, record.ArchivedAt,
	)
	return err
}

func (store *PostgresStore) UpdateUDMHybridConfig(ctx context.Context, record UDMHybridConfigRecord) error {
	tag, err := store.pool.Exec(ctx, `UPDATE udm_hybrid_configs SET
		name=$2, description=$3, hybrid_config_json=$4, parameter_hash=$5, validation_json=$6,
		source_system=$7, requested_by=$8, owner_id=$9, tenant_id=$10, project_id=$11, site_id=$12,
		metadata_json=$13, updated_at=$14, archived_at=$15
		WHERE id=$1`,
		record.ID, record.Name, record.Description, record.HybridConfig, record.ParameterHash, record.Validation,
		record.SourceSystem, record.RequestedBy, record.OwnerID, nullString(record.TenantID), nullString(record.ProjectID),
		nullString(record.SiteID), record.Metadata, record.UpdatedAt, record.ArchivedAt,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return NotFound(CodeUDMHybridConfigNotFound, "UDM hybrid config not found")
	}
	return nil
}

func (store *PostgresStore) FindUDMHybridConfig(ctx context.Context, configID string) (*UDMHybridConfigRecord, error) {
	row := store.pool.QueryRow(ctx, udmHybridConfigSelectSQL()+" WHERE id=$1 AND archived_at IS NULL", configID)
	record, err := scanUDMHybridConfig(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, NotFound(CodeUDMHybridConfigNotFound, "UDM hybrid config not found")
	}
	return record, err
}

func (store *PostgresStore) ListUDMHybridConfigs(ctx context.Context, filter UDMHybridConfigFilter) ([]UDMHybridConfigRecord, int, error) {
	limit := normalizeListLimit(filter.Limit)
	offset := filter.Skip
	if offset < 0 {
		offset = 0
	}
	where, args := udmHybridConfigListWhere(filter)
	var total int
	if err := store.pool.QueryRow(ctx, "SELECT COUNT(*) FROM udm_hybrid_configs"+where, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	queryArgs := append(append([]any(nil), args...), limit, offset)
	rows, err := store.pool.Query(
		ctx,
		udmHybridConfigSelectSQL()+where+fmt.Sprintf(" ORDER BY updated_at DESC, id DESC LIMIT $%d OFFSET $%d", len(args)+1, len(args)+2),
		queryArgs...,
	)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var records []UDMHybridConfigRecord
	for rows.Next() {
		record, err := scanUDMHybridConfig(rows)
		if err != nil {
			return nil, 0, err
		}
		records = append(records, *record)
	}
	return records, total, rows.Err()
}

type queryExecer interface {
	Exec(context.Context, string, ...any) (pgconn.CommandTag, error)
}

func insertUDMModel(ctx context.Context, exec queryExecer, record UDMModelRecord) error {
	_, err := exec.Exec(ctx, `INSERT INTO udm_models (
		id, name, description, tags_json, current_version, is_published,
		source_system, requested_by, tenant_id, project_id, site_id, metadata_json, created_at, updated_at, archived_at
	) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
		record.ID, record.Name, record.Description, mustJSON(record.Tags), record.CurrentVersion, record.IsPublished,
		record.SourceSystem, record.RequestedBy, nullString(record.TenantID), nullString(record.ProjectID),
		nullString(record.SiteID), record.Metadata, record.CreatedAt, record.UpdatedAt, record.ArchivedAt,
	)
	return err
}

func insertUDMModelVersion(ctx context.Context, exec queryExecer, record UDMModelVersionRecord) error {
	_, err := exec.Exec(ctx, `INSERT INTO udm_model_versions (
		id, model_id, version, content_hash, parameter_hash, components_json, parameters_json, processes_json, meta_json,
		validation_ok, validation_errors_json, seed_source, source_system, requested_by, owner_id,
		tenant_id, project_id, site_id, metadata_json, created_at, updated_at
	) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)`,
		record.ID, record.ModelID, record.Version, record.ContentHash, record.ParameterHash, record.Components,
		record.Parameters, record.Processes, record.Meta, record.ValidationOK, record.ValidationErrors,
		nullString(record.SeedSource), record.SourceSystem, record.RequestedBy, record.OwnerID,
		nullString(record.TenantID), nullString(record.ProjectID), nullString(record.SiteID), record.Metadata,
		record.CreatedAt, record.UpdatedAt,
	)
	return err
}

func scanUDMModel(row rowScanner) (*UDMModelRecord, error) {
	var record UDMModelRecord
	var tags json.RawMessage
	err := row.Scan(&record.ID, &record.Name, &record.Description, &tags, &record.CurrentVersion, &record.IsPublished,
		&record.SourceSystem, &record.RequestedBy, &record.TenantID, &record.ProjectID, &record.SiteID,
		&record.Metadata, &record.CreatedAt, &record.UpdatedAt, &record.ArchivedAt)
	if err != nil {
		return nil, err
	}
	_ = json.Unmarshal(tags, &record.Tags)
	if record.Tags == nil {
		record.Tags = []string{}
	}
	return &record, nil
}

func scanUDMModelVersion(row rowScanner) (*UDMModelVersionRecord, error) {
	var record UDMModelVersionRecord
	err := row.Scan(&record.ID, &record.ModelID, &record.Version, &record.ContentHash, &record.ParameterHash,
		&record.Components, &record.Parameters, &record.Processes, &record.Meta, &record.ValidationOK,
		&record.ValidationErrors, &record.SeedSource, &record.SourceSystem, &record.RequestedBy, &record.OwnerID,
		&record.TenantID, &record.ProjectID, &record.SiteID, &record.Metadata, &record.CreatedAt, &record.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &record, nil
}

func scanUDMHybridConfig(row rowScanner) (*UDMHybridConfigRecord, error) {
	var record UDMHybridConfigRecord
	err := row.Scan(&record.ID, &record.Name, &record.Description, &record.HybridConfig, &record.ParameterHash,
		&record.Validation, &record.SourceSystem, &record.RequestedBy, &record.OwnerID, &record.TenantID,
		&record.ProjectID, &record.SiteID, &record.Metadata, &record.CreatedAt, &record.UpdatedAt, &record.ArchivedAt)
	if err != nil {
		return nil, err
	}
	return &record, nil
}

func udmModelSelectSQL() string {
	return `SELECT id, name, description, COALESCE(tags_json,'[]'::jsonb), current_version, is_published,
		source_system, requested_by, COALESCE(tenant_id,''), COALESCE(project_id,''), COALESCE(site_id,''),
		COALESCE(metadata_json,'null'::jsonb), created_at, updated_at, archived_at FROM udm_models`
}

func udmModelVersionSelectSQL() string {
	return `SELECT id, model_id, version, content_hash, parameter_hash, components_json, parameters_json, processes_json,
		COALESCE(meta_json,'null'::jsonb), validation_ok, COALESCE(validation_errors_json,'[]'::jsonb), COALESCE(seed_source,''),
		source_system, requested_by, owner_id, COALESCE(tenant_id,''), COALESCE(project_id,''), COALESCE(site_id,''),
		COALESCE(metadata_json,'null'::jsonb), created_at, updated_at FROM udm_model_versions`
}

func udmHybridConfigSelectSQL() string {
	return `SELECT id, name, description, hybrid_config_json, parameter_hash, COALESCE(validation_json,'null'::jsonb),
		source_system, requested_by, owner_id, COALESCE(tenant_id,''), COALESCE(project_id,''), COALESCE(site_id,''),
		COALESCE(metadata_json,'null'::jsonb), created_at, updated_at, archived_at FROM udm_hybrid_configs`
}

func udmModelListWhere(filter UDMModelFilter) (string, []any) {
	var clauses []string
	var args []any
	clauses = append(clauses, "archived_at IS NULL")
	add := func(sql string, value any) {
		args = append(args, value)
		clauses = append(clauses, fmt.Sprintf(sql, len(args)))
	}
	if strings.TrimSpace(filter.TenantID) != "" {
		add("tenant_id=$%d", strings.TrimSpace(filter.TenantID))
	}
	if strings.TrimSpace(filter.ProjectID) != "" {
		add("project_id=$%d", strings.TrimSpace(filter.ProjectID))
	}
	if strings.TrimSpace(filter.SiteID) != "" {
		add("site_id=$%d", strings.TrimSpace(filter.SiteID))
	}
	if strings.TrimSpace(filter.Query) != "" {
		add("LOWER(name) LIKE LOWER($%d)", "%"+strings.TrimSpace(filter.Query)+"%")
	}
	return " WHERE " + strings.Join(clauses, " AND "), args
}

func udmHybridConfigListWhere(filter UDMHybridConfigFilter) (string, []any) {
	var clauses []string
	var args []any
	clauses = append(clauses, "archived_at IS NULL")
	add := func(sql string, value any) {
		args = append(args, value)
		clauses = append(clauses, fmt.Sprintf(sql, len(args)))
	}
	if strings.TrimSpace(filter.TenantID) != "" {
		add("tenant_id=$%d", strings.TrimSpace(filter.TenantID))
	}
	if strings.TrimSpace(filter.ProjectID) != "" {
		add("project_id=$%d", strings.TrimSpace(filter.ProjectID))
	}
	if strings.TrimSpace(filter.SiteID) != "" {
		add("site_id=$%d", strings.TrimSpace(filter.SiteID))
	}
	return " WHERE " + strings.Join(clauses, " AND "), args
}
