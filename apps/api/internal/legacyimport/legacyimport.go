package legacyimport

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"sort"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	SchemaVersion = "legacy_migration_report.v1"
	sourceSystem  = "legacy-fastapi"
)

type Options struct {
	LegacyDatabaseURL string
	TargetDatabaseURL string
	DryRun            bool
	Resume            bool
	VerifyOnly        bool
	Only              []string
	BatchSize         int
	ReportPath        string
	Now               func() time.Time
}

type Report struct {
	SchemaVersion        string              `json:"schema_version"`
	GeneratedAt          string              `json:"generated_at"`
	DryRun               bool                `json:"dry_run"`
	Resume               bool                `json:"resume"`
	VerifyOnly           bool                `json:"verify_only"`
	Only                 []string            `json:"only"`
	BatchSize            int                 `json:"batch_size"`
	LegacyReadOnly       bool                `json:"legacy_read_only_session"`
	Totals               Counters            `json:"totals"`
	Resources            map[string]Counters `json:"resources"`
	Conflicts            []Issue             `json:"conflicts,omitempty"`
	Warnings             []Issue             `json:"warnings,omitempty"`
	RequiredTargetTables []string            `json:"required_target_tables"`
}

type Counters struct {
	Scanned         int `json:"scanned"`
	Planned         int `json:"planned"`
	Imported        int `json:"imported"`
	Skipped         int `json:"skipped"`
	Conflicts       int `json:"conflicts"`
	HistoryImported int `json:"history_imported"`
	Missing         int `json:"missing"`
}

type Issue struct {
	Resource string `json:"resource"`
	Table    string `json:"table,omitempty"`
	ID       string `json:"id,omitempty"`
	Message  string `json:"message"`
}

type FlowchartRecord struct {
	Table       string
	ModelFamily string
	ID          string
	Name        string
	Description string
	OwnerID     string
	FlowData    json.RawMessage
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type UDMModelRecord struct {
	ID             string
	Name           string
	Description    string
	Tags           json.RawMessage
	CurrentVersion int
	IsPublished    bool
	OwnerID        string
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

type UDMVersionRecord struct {
	ID               string
	ModelID          string
	Version          int
	ContentHash      string
	Components       json.RawMessage
	Parameters       json.RawMessage
	Processes        json.RawMessage
	Meta             json.RawMessage
	ValidationOK     bool
	ValidationErrors json.RawMessage
	SeedSource       string
	OwnerID          string
	CreatedAt        time.Time
	UpdatedAt        time.Time
}

type UDMHybridRecord struct {
	ID           string
	Name         string
	Description  string
	HybridConfig json.RawMessage
	OwnerID      string
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

type JobRecord struct {
	Table        string
	JobType      string
	ID           string
	JobID        string
	JobName      string
	Status       string
	InputData    json.RawMessage
	ResultData   json.RawMessage
	SummaryData  json.RawMessage
	ErrorMessage string
	OwnerID      string
	CreatedAt    time.Time
	StartedAt    *time.Time
	CompletedAt  *time.Time
}

type rowScanner interface {
	Scan(dest ...any) error
}

type queryer interface {
	Query(context.Context, string, ...any) (pgx.Rows, error)
	QueryRow(context.Context, string, ...any) pgx.Row
}

type execer interface {
	Exec(context.Context, string, ...any) (pgconn.CommandTag, error)
	QueryRow(context.Context, string, ...any) pgx.Row
}

type importRunner struct {
	legacy queryer
	target *pgxpool.Pool
	opt    Options
	report *Report
}

var flowchartTables = []struct {
	Table       string
	ModelFamily string
}{
	{"flowchart", "material_balance"},
	{"asm1slimflowchart", "asm1slim"},
	{"asm1flowchart", "asm1"},
	{"asm3flowchart", "asm3"},
	{"udmflowchart", "udm"},
}

var jobTables = []struct {
	Table   string
	JobType string
}{
	{"materialbalancejob", "simulation.material_balance.v1"},
	{"asm1slimjob", "simulation.asm1slim.v1"},
	{"asm1job", "simulation.asm1.v1"},
	{"asm3job", "simulation.asm3.v1"},
	{"udmjob", "simulation.udm.v1"},
}

var requiredTargetTables = []string{
	"simulation_scenarios",
	"canvas_graphs",
	"udm_models",
	"udm_model_versions",
	"udm_hybrid_configs",
	"compute_jobs",
	"compute_job_events",
	"imported_legacy_history",
}

func Run(ctx context.Context, opt Options) (Report, error) {
	opt = normalizeOptions(opt)
	if strings.TrimSpace(opt.LegacyDatabaseURL) == "" {
		return Report{}, errors.New("legacy database URL is required")
	}
	if strings.TrimSpace(opt.TargetDatabaseURL) == "" {
		return Report{}, errors.New("target database URL is required")
	}
	legacyPool, err := pgxpool.New(ctx, opt.LegacyDatabaseURL)
	if err != nil {
		return Report{}, fmt.Errorf("open legacy database: %w", err)
	}
	defer legacyPool.Close()
	targetPool, err := pgxpool.New(ctx, opt.TargetDatabaseURL)
	if err != nil {
		return Report{}, fmt.Errorf("open target database: %w", err)
	}
	defer targetPool.Close()
	if err := legacyPool.Ping(ctx); err != nil {
		return Report{}, fmt.Errorf("ping legacy database: %w", err)
	}
	if err := targetPool.Ping(ctx); err != nil {
		return Report{}, fmt.Errorf("ping target database: %w", err)
	}
	tx, err := legacyPool.BeginTx(ctx, pgx.TxOptions{AccessMode: pgx.ReadOnly})
	if err != nil {
		return Report{}, fmt.Errorf("start legacy read-only transaction: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()
	report := NewReport(opt)
	runner := importRunner{legacy: tx, target: targetPool, opt: opt, report: &report}
	if err := runner.checkTargetTables(ctx); err != nil {
		return report, err
	}
	if err := runner.run(ctx); err != nil {
		return report, err
	}
	if opt.ReportPath != "" {
		if err := WriteReport(opt.ReportPath, report); err != nil {
			return report, err
		}
	}
	return report, nil
}

func NewReport(opt Options) Report {
	now := optionNow(opt).UTC()
	return Report{
		SchemaVersion:        SchemaVersion,
		GeneratedAt:          now.Format(time.RFC3339Nano),
		DryRun:               opt.DryRun,
		Resume:               opt.Resume,
		VerifyOnly:           opt.VerifyOnly,
		Only:                 normalizedOnly(opt.Only),
		BatchSize:            opt.BatchSize,
		LegacyReadOnly:       true,
		Resources:            map[string]Counters{},
		RequiredTargetTables: append([]string(nil), requiredTargetTables...),
	}
}

func WriteReport(path string, report Report) error {
	bytes, err := json.MarshalIndent(report, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, append(bytes, '\n'), 0o644)
}

func (runner *importRunner) run(ctx context.Context) error {
	only := selectedResources(runner.opt.Only)
	if only["flowcharts"] {
		if err := runner.importFlowcharts(ctx); err != nil {
			return err
		}
	}
	if only["udm"] {
		if err := runner.importUDM(ctx); err != nil {
			return err
		}
	}
	if only["jobs"] {
		if err := runner.importJobs(ctx); err != nil {
			return err
		}
	}
	return nil
}

func (runner *importRunner) checkTargetTables(ctx context.Context) error {
	for _, table := range requiredTargetTables {
		exists, err := tableExists(ctx, runner.target, table)
		if err != nil {
			return err
		}
		if !exists {
			runner.warn("target", table, "", "target table is missing; apply apps/api migrations before running migrate-legacy")
			return fmt.Errorf("target table %q is missing", table)
		}
	}
	return nil
}

func (runner *importRunner) importFlowcharts(ctx context.Context) error {
	for _, spec := range flowchartTables {
		if err := runner.importFlowchartTable(ctx, spec.Table, spec.ModelFamily); err != nil {
			return err
		}
	}
	return nil
}

func (runner *importRunner) importFlowchartTable(ctx context.Context, table, modelFamily string) error {
	resource := "flowcharts"
	exists, err := tableExists(ctx, runner.legacy, table)
	if err != nil {
		return err
	}
	if !exists {
		runner.warn(resource, table, "", "legacy table not found; skipping")
		return nil
	}
	offset := 0
	for {
		rows, err := runner.legacy.Query(ctx, fmt.Sprintf(`SELECT id::text, name, COALESCE(description,''), owner_id::text,
			COALESCE(flow_data,'{}'::json), created_at, updated_at FROM %s ORDER BY created_at, id LIMIT $1 OFFSET $2`, table), runner.opt.BatchSize, offset)
		if err != nil {
			return err
		}
		records := []FlowchartRecord{}
		for rows.Next() {
			var record FlowchartRecord
			record.Table = table
			record.ModelFamily = modelFamily
			if err := rows.Scan(&record.ID, &record.Name, &record.Description, &record.OwnerID, &record.FlowData, &record.CreatedAt, &record.UpdatedAt); err != nil {
				rows.Close()
				return err
			}
			record.FlowData = nonEmptyJSON(record.FlowData, "{}")
			records = append(records, record)
		}
		if err := rows.Err(); err != nil {
			rows.Close()
			return err
		}
		rows.Close()
		for _, record := range records {
			if err := runner.importFlowchart(ctx, record); err != nil {
				return err
			}
		}
		if len(records) < runner.opt.BatchSize {
			return nil
		}
		offset += runner.opt.BatchSize
	}
}

func (runner *importRunner) importFlowchart(ctx context.Context, record FlowchartRecord) error {
	resource := "flowcharts"
	runner.inc(resource, func(c *Counters) { c.Scanned++ })
	sourceHash := CanonicalJSONHash(record.FlowData)
	graphID := "legacy_canvas_" + safeID(record.Table) + "_" + safeID(record.ID)
	existing, err := targetLegacyHash(ctx, runner.target, "canvas_graphs", "id=$1 AND version=1", graphID)
	if err != nil {
		return err
	}
	if existing != "" {
		if existing == sourceHash {
			runner.inc(resource, func(c *Counters) { c.Skipped++ })
			return nil
		}
		runner.conflict(resource, record.Table, record.ID, "target canvas graph exists with different legacy source hash")
		return nil
	}
	runner.inc(resource, func(c *Counters) { c.Planned++ })
	if runner.opt.DryRun || runner.opt.VerifyOnly {
		if runner.opt.VerifyOnly {
			runner.missing(resource, record.Table, record.ID, "target canvas graph missing")
		}
		return nil
	}
	payload := BuildCanvasGraphPayload(record, graphID, sourceHash)
	payloadBytes := mustJSON(payload)
	metadata := legacyMetadata(record.Table, record.ID, record.OwnerID, sourceHash, map[string]any{
		"legacy_updated_at":  record.UpdatedAt.UTC().Format(time.RFC3339Nano),
		"original_flow_data": jsonObject(record.FlowData),
	})
	now := optionNow(runner.opt).UTC()
	scenarioID := "legacy_scenario_" + safeID(record.Table) + "_" + safeID(record.ID)
	tx, err := runner.target.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	if _, err := tx.Exec(ctx, `INSERT INTO simulation_scenarios (
		id, name, description, model_family, status, version, current_canvas_graph_id, current_canvas_graph_version,
		source_system, requested_by, metadata_json, created_at, updated_at
	) VALUES ($1,$2,$3,$4,'imported',1,$5,1,$6,$7,$8,$9,$10)`,
		scenarioID, record.Name, record.Description, record.ModelFamily, graphID, sourceSystem, record.OwnerID, mustJSON(metadata), record.CreatedAt.UTC(), now); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `INSERT INTO canvas_graphs (
		id, scenario_id, schema_version, name, version, payload_hash, payload_json,
		source_system, requested_by, metadata_json, created_at
	) VALUES ($1,$2,'canvas_graph.v1',$3,1,$4,$5,$6,$7,$8,$9)`,
		graphID, scenarioID, record.Name, CanonicalJSONHash(payloadBytes), payloadBytes, sourceSystem, record.OwnerID, mustJSON(metadata), record.CreatedAt.UTC()); err != nil {
		return err
	}
	if err := tx.Commit(ctx); err != nil {
		return err
	}
	runner.inc(resource, func(c *Counters) { c.Imported++ })
	return nil
}

func (runner *importRunner) importUDM(ctx context.Context) error {
	if err := runner.importUDMModels(ctx); err != nil {
		return err
	}
	if err := runner.importUDMVersions(ctx); err != nil {
		return err
	}
	return runner.importUDMHybrids(ctx)
}

func (runner *importRunner) importUDMModels(ctx context.Context) error {
	resource := "udm_models"
	exists, err := tableExists(ctx, runner.legacy, "udmmodel")
	if err != nil {
		return err
	}
	if !exists {
		runner.warn(resource, "udmmodel", "", "legacy table not found; skipping")
		return nil
	}
	rows, err := runner.legacy.Query(ctx, `SELECT id::text, name, COALESCE(description,''), COALESCE(tags,'[]'::json),
		current_version, is_published, owner_id::text, created_at, updated_at FROM udmmodel ORDER BY created_at, id`)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var record UDMModelRecord
		if err := rows.Scan(&record.ID, &record.Name, &record.Description, &record.Tags, &record.CurrentVersion, &record.IsPublished, &record.OwnerID, &record.CreatedAt, &record.UpdatedAt); err != nil {
			return err
		}
		record.Tags = nonEmptyJSON(record.Tags, "[]")
		if err := runner.importUDMModel(ctx, record); err != nil {
			return err
		}
	}
	return rows.Err()
}

func (runner *importRunner) importUDMModel(ctx context.Context, record UDMModelRecord) error {
	resource := "udm_models"
	runner.inc(resource, func(c *Counters) { c.Scanned++ })
	sourceHash := CanonicalJSONHash(mustJSON(record))
	existing, err := targetLegacyHash(ctx, runner.target, "udm_models", "id=$1", record.ID)
	if err != nil {
		return err
	}
	if existing != "" {
		if existing == sourceHash {
			runner.inc(resource, func(c *Counters) { c.Skipped++ })
			return nil
		}
		runner.conflict(resource, "udmmodel", record.ID, "target UDM model exists with different legacy source hash")
		return nil
	}
	runner.inc(resource, func(c *Counters) { c.Planned++ })
	if runner.opt.DryRun || runner.opt.VerifyOnly {
		if runner.opt.VerifyOnly {
			runner.missing(resource, "udmmodel", record.ID, "target UDM model missing")
		}
		return nil
	}
	metadata := legacyMetadata("udmmodel", record.ID, record.OwnerID, sourceHash, nil)
	_, err = runner.target.Exec(ctx, `INSERT INTO udm_models (
		id, name, description, tags_json, current_version, is_published, source_system, requested_by,
		metadata_json, created_at, updated_at
	) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
		record.ID, record.Name, record.Description, record.Tags, record.CurrentVersion, record.IsPublished,
		sourceSystem, record.OwnerID, mustJSON(metadata), record.CreatedAt.UTC(), record.UpdatedAt.UTC())
	if err == nil {
		runner.inc(resource, func(c *Counters) { c.Imported++ })
	}
	return err
}

func (runner *importRunner) importUDMVersions(ctx context.Context) error {
	resource := "udm_versions"
	exists, err := tableExists(ctx, runner.legacy, "udmmodelversion")
	if err != nil {
		return err
	}
	if !exists {
		runner.warn(resource, "udmmodelversion", "", "legacy table not found; skipping")
		return nil
	}
	rows, err := runner.legacy.Query(ctx, `SELECT id::text, model_id::text, version, COALESCE(content_hash,''),
		COALESCE(components,'[]'::json), COALESCE(parameters,'[]'::json), COALESCE(processes,'[]'::json),
		COALESCE(meta,'null'::json), validation_ok, COALESCE(validation_errors,'[]'::json),
		COALESCE(seed_source,''), owner_id::text, created_at, updated_at FROM udmmodelversion ORDER BY created_at, id`)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var record UDMVersionRecord
		if err := rows.Scan(&record.ID, &record.ModelID, &record.Version, &record.ContentHash, &record.Components, &record.Parameters, &record.Processes, &record.Meta, &record.ValidationOK, &record.ValidationErrors, &record.SeedSource, &record.OwnerID, &record.CreatedAt, &record.UpdatedAt); err != nil {
			return err
		}
		if err := runner.importUDMVersion(ctx, record); err != nil {
			return err
		}
	}
	return rows.Err()
}

func (runner *importRunner) importUDMVersion(ctx context.Context, record UDMVersionRecord) error {
	resource := "udm_versions"
	runner.inc(resource, func(c *Counters) { c.Scanned++ })
	sourceHash := CanonicalJSONHash(mustJSON(record))
	existing, err := targetLegacyHash(ctx, runner.target, "udm_model_versions", "id=$1", record.ID)
	if err != nil {
		return err
	}
	if existing != "" {
		if existing == sourceHash {
			runner.inc(resource, func(c *Counters) { c.Skipped++ })
			return nil
		}
		runner.conflict(resource, "udmmodelversion", record.ID, "target UDM version exists with different legacy source hash")
		return nil
	}
	runner.inc(resource, func(c *Counters) { c.Planned++ })
	if runner.opt.DryRun || runner.opt.VerifyOnly {
		if runner.opt.VerifyOnly {
			runner.missing(resource, "udmmodelversion", record.ID, "target UDM version missing")
		}
		return nil
	}
	contentHash := strings.TrimSpace(record.ContentHash)
	if contentHash == "" {
		contentHash = sourceHash
	}
	metadata := legacyMetadata("udmmodelversion", record.ID, record.OwnerID, sourceHash, nil)
	_, err = runner.target.Exec(ctx, `INSERT INTO udm_model_versions (
		id, model_id, version, content_hash, parameter_hash, components_json, parameters_json, processes_json, meta_json,
		validation_ok, validation_errors_json, seed_source, source_system, requested_by, owner_id, metadata_json, created_at, updated_at
	) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
		record.ID, record.ModelID, record.Version, contentHash, CanonicalJSONHash(record.Parameters),
		nonEmptyJSON(record.Components, "[]"), nonEmptyJSON(record.Parameters, "[]"), nonEmptyJSON(record.Processes, "[]"),
		nonEmptyJSON(record.Meta, "null"), record.ValidationOK, nonEmptyJSON(record.ValidationErrors, "[]"),
		nullString(record.SeedSource), sourceSystem, record.OwnerID, record.OwnerID, mustJSON(metadata), record.CreatedAt.UTC(), record.UpdatedAt.UTC())
	if err == nil {
		runner.inc(resource, func(c *Counters) { c.Imported++ })
	}
	return err
}

func (runner *importRunner) importUDMHybrids(ctx context.Context) error {
	resource := "udm_hybrid_configs"
	exists, err := tableExists(ctx, runner.legacy, "udmhybridconfig")
	if err != nil {
		return err
	}
	if !exists {
		runner.warn(resource, "udmhybridconfig", "", "legacy table not found; skipping")
		return nil
	}
	rows, err := runner.legacy.Query(ctx, `SELECT id::text, name, COALESCE(description,''), COALESCE(hybrid_config,'{}'::json),
		owner_id::text, created_at, updated_at FROM udmhybridconfig ORDER BY created_at, id`)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var record UDMHybridRecord
		if err := rows.Scan(&record.ID, &record.Name, &record.Description, &record.HybridConfig, &record.OwnerID, &record.CreatedAt, &record.UpdatedAt); err != nil {
			return err
		}
		if err := runner.importUDMHybrid(ctx, record); err != nil {
			return err
		}
	}
	return rows.Err()
}

func (runner *importRunner) importUDMHybrid(ctx context.Context, record UDMHybridRecord) error {
	resource := "udm_hybrid_configs"
	runner.inc(resource, func(c *Counters) { c.Scanned++ })
	record.HybridConfig = nonEmptyJSON(record.HybridConfig, "{}")
	sourceHash := CanonicalJSONHash(record.HybridConfig)
	existing, err := targetLegacyHash(ctx, runner.target, "udm_hybrid_configs", "id=$1", record.ID)
	if err != nil {
		return err
	}
	if existing != "" {
		if existing == sourceHash {
			runner.inc(resource, func(c *Counters) { c.Skipped++ })
			return nil
		}
		runner.conflict(resource, "udmhybridconfig", record.ID, "target UDM hybrid config exists with different legacy source hash")
		return nil
	}
	runner.inc(resource, func(c *Counters) { c.Planned++ })
	if runner.opt.DryRun || runner.opt.VerifyOnly {
		if runner.opt.VerifyOnly {
			runner.missing(resource, "udmhybridconfig", record.ID, "target UDM hybrid config missing")
		}
		return nil
	}
	metadata := legacyMetadata("udmhybridconfig", record.ID, record.OwnerID, sourceHash, nil)
	validation := mustJSON(map[string]any{"status": "imported_unverified"})
	_, err = runner.target.Exec(ctx, `INSERT INTO udm_hybrid_configs (
		id, name, description, hybrid_config_json, parameter_hash, validation_json,
		source_system, requested_by, owner_id, metadata_json, created_at, updated_at
	) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
		record.ID, record.Name, record.Description, record.HybridConfig, CanonicalJSONHash(record.HybridConfig), validation,
		sourceSystem, record.OwnerID, record.OwnerID, mustJSON(metadata), record.CreatedAt.UTC(), record.UpdatedAt.UTC())
	if err == nil {
		runner.inc(resource, func(c *Counters) { c.Imported++ })
	}
	return err
}

func (runner *importRunner) importJobs(ctx context.Context) error {
	for _, spec := range jobTables {
		if err := runner.importJobTable(ctx, spec.Table, spec.JobType); err != nil {
			return err
		}
	}
	return nil
}

func (runner *importRunner) importJobTable(ctx context.Context, table, jobType string) error {
	resource := "jobs"
	exists, err := tableExists(ctx, runner.legacy, table)
	if err != nil {
		return err
	}
	if !exists {
		runner.warn(resource, table, "", "legacy table not found; skipping")
		return nil
	}
	offset := 0
	for {
		rows, err := runner.legacy.Query(ctx, fmt.Sprintf(`SELECT id::text, job_id, job_name, status::text, COALESCE(input_data,'{}'::json),
			COALESCE(result_data,'null'::json), COALESCE(summary_data,'null'::json), COALESCE(error_message,''),
			owner_id::text, created_at, started_at, completed_at FROM %s ORDER BY created_at, id LIMIT $1 OFFSET $2`, table), runner.opt.BatchSize, offset)
		if err != nil {
			return err
		}
		records := []JobRecord{}
		for rows.Next() {
			var record JobRecord
			record.Table = table
			record.JobType = jobType
			if err := rows.Scan(&record.ID, &record.JobID, &record.JobName, &record.Status, &record.InputData, &record.ResultData, &record.SummaryData, &record.ErrorMessage, &record.OwnerID, &record.CreatedAt, &record.StartedAt, &record.CompletedAt); err != nil {
				rows.Close()
				return err
			}
			records = append(records, record)
		}
		if err := rows.Err(); err != nil {
			rows.Close()
			return err
		}
		rows.Close()
		for _, record := range records {
			if err := runner.importJob(ctx, record); err != nil {
				return err
			}
		}
		if len(records) < runner.opt.BatchSize {
			return nil
		}
		offset += runner.opt.BatchSize
	}
}

func (runner *importRunner) importJob(ctx context.Context, record JobRecord) error {
	resource := "jobs"
	runner.inc(resource, func(c *Counters) { c.Scanned++ })
	record.InputData = nonEmptyJSON(record.InputData, "{}")
	sourceHash := CanonicalJSONHash(mustJSON(record))
	if canonicalComputeJob(record.InputData) && convertibleTerminalStatus(record.Status) {
		return runner.importCanonicalJob(ctx, record, sourceHash)
	}
	return runner.importJobHistory(ctx, record, sourceHash, "legacy job is not canonical compute_job.v1 or is not terminal")
}

func (runner *importRunner) importCanonicalJob(ctx context.Context, record JobRecord, sourceHash string) error {
	resource := "jobs"
	existing, err := targetLegacyHash(ctx, runner.target, "compute_jobs", "id=$1", record.JobID)
	if err != nil {
		return err
	}
	if existing != "" {
		if existing == sourceHash {
			runner.inc(resource, func(c *Counters) { c.Skipped++ })
			return nil
		}
		runner.conflict(resource, record.Table, record.ID, "target compute job exists with different legacy source hash")
		return nil
	}
	runner.inc(resource, func(c *Counters) { c.Planned++ })
	if runner.opt.DryRun || runner.opt.VerifyOnly {
		if runner.opt.VerifyOnly {
			runner.missing(resource, record.Table, record.ID, "target compute job missing")
		}
		return nil
	}
	status := mapLegacyJobStatus(record.Status)
	metadata := legacyMetadata(record.Table, record.ID, record.OwnerID, sourceHash, map[string]any{"legacy_job_name": record.JobName})
	input := mergeMetadata(record.InputData, metadata)
	tx, err := runner.target.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	if _, err := tx.Exec(ctx, `INSERT INTO compute_jobs (
		id, schema_version, job_type, queue, status, request_id, idempotency_key,
		source_system, requested_by, trace_id, payload_hash, input_json, summary_json, result_hash,
		attempt, cancel_requested, created_at, queued_at, started_at, finished_at, error_code, error_message
	) VALUES ($1,'compute_job.v1',$2,'default',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,0,false,$13,$14,$15,$16,$17,$18)`,
		record.JobID, record.JobType, status, "legacy-"+record.ID, "legacy-"+record.ID,
		sourceSystem, record.OwnerID, "legacy-"+record.JobID, CanonicalJSONHash(input), input,
		nullJSON(record.SummaryData), CanonicalJSONHash(record.ResultData), record.CreatedAt.UTC(), record.CreatedAt.UTC(),
		record.StartedAt, record.CompletedAt, legacyErrorCode(status), nullString(record.ErrorMessage)); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, "INSERT INTO compute_job_events (job_id,event_type,event_json,created_at) VALUES ($1,$2,$3,$4)",
		record.JobID, "legacy.imported", mustJSON(map[string]any{"legacy_source": metadata["legacy_source"], "status": status}), optionNow(runner.opt).UTC()); err != nil {
		return err
	}
	if err := tx.Commit(ctx); err != nil {
		return err
	}
	runner.inc(resource, func(c *Counters) { c.Imported++ })
	return nil
}

func (runner *importRunner) importJobHistory(ctx context.Context, record JobRecord, sourceHash, reason string) error {
	resource := "jobs"
	historyID := "legacy_history_" + safeID(record.Table) + "_" + safeID(record.ID)
	existing, err := historyLegacyHash(ctx, runner.target, record.Table, record.ID)
	if err != nil {
		return err
	}
	if existing != "" {
		if existing == sourceHash {
			runner.inc(resource, func(c *Counters) { c.Skipped++ })
			return nil
		}
		runner.conflict(resource, record.Table, record.ID, "imported legacy history exists with different source hash")
		return nil
	}
	runner.inc(resource, func(c *Counters) { c.Planned++ })
	if runner.opt.DryRun || runner.opt.VerifyOnly {
		if runner.opt.VerifyOnly {
			runner.missing(resource, record.Table, record.ID, "imported legacy history missing")
		}
		return nil
	}
	metadata := legacyMetadata(record.Table, record.ID, record.OwnerID, sourceHash, map[string]any{
		"legacy_job_id":   record.JobID,
		"legacy_status":   record.Status,
		"legacy_job_type": record.JobType,
	})
	payload := mustJSON(map[string]any{
		"input_data":   jsonObject(record.InputData),
		"summary_data": jsonObject(record.SummaryData),
	})
	result := mustJSON(map[string]any{
		"result_data":   jsonObject(record.ResultData),
		"error_message": record.ErrorMessage,
	})
	_, err = runner.target.Exec(ctx, `INSERT INTO imported_legacy_history (
		id, legacy_source_table, legacy_source_id, legacy_source_hash, target_kind, target_id,
		status, reason, payload_json, result_json, metadata_json, imported_at
	) VALUES ($1,$2,$3,$4,'job_history',$5,'imported',$6,$7,$8,$9,$10)`,
		historyID, record.Table, record.ID, sourceHash, record.JobID, reason, payload, result, mustJSON(metadata), optionNow(runner.opt).UTC())
	if err == nil {
		runner.inc(resource, func(c *Counters) {
			c.Imported++
			c.HistoryImported++
		})
	}
	return err
}

func BuildCanvasGraphPayload(record FlowchartRecord, graphID, sourceHash string) map[string]any {
	flow := jsonObject(record.FlowData)
	nodes := normalizeCanvasNodes(arrayOfMaps(flow["nodes"]))
	edges := normalizeCanvasEdges(arrayOfMaps(flow["edges"]))
	viewport, ok := flow["viewport"].(map[string]any)
	if !ok {
		viewport = map[string]any{"x": 0, "y": 0, "zoom": 1}
	}
	return map[string]any{
		"schema_version": "canvas_graph.v1",
		"graph_id":       graphID,
		"name":           defaultString(record.Name, graphID),
		"nodes":          nodes,
		"edges":          edges,
		"viewport":       viewport,
		"ui_state":       map[string]any{},
		"exported_at":    record.UpdatedAt.UTC().Format(time.RFC3339Nano),
		"metadata": map[string]any{
			"legacy_source_table": record.Table,
			"legacy_source_id":    record.ID,
			"legacy_source_hash":  sourceHash,
			"model_family":        record.ModelFamily,
		},
	}
}

func normalizeCanvasNodes(nodes []map[string]any) []map[string]any {
	result := make([]map[string]any, 0, len(nodes))
	for i, node := range nodes {
		id := defaultString(asString(node["id"]), fmt.Sprintf("legacy_node_%d", i+1))
		nodeType := defaultString(asString(node["type"]), defaultString(asString(node["node_type"]), "legacy"))
		position, ok := node["position"].(map[string]any)
		if !ok {
			position = map[string]any{"x": float64(i * 180), "y": 0}
		}
		if _, ok := position["x"]; !ok {
			position["x"] = 0
		}
		if _, ok := position["y"]; !ok {
			position["y"] = 0
		}
		data, ok := node["data"].(map[string]any)
		if !ok {
			data = map[string]any{}
		}
		normalized := cloneMap(node)
		normalized["id"] = id
		normalized["type"] = nodeType
		normalized["position"] = position
		normalized["data"] = data
		result = append(result, normalized)
	}
	return result
}

func normalizeCanvasEdges(edges []map[string]any) []map[string]any {
	result := make([]map[string]any, 0, len(edges))
	for i, edge := range edges {
		id := defaultString(asString(edge["id"]), fmt.Sprintf("legacy_edge_%d", i+1))
		source := defaultString(asString(edge["source"]), asString(edge["source_node_id"]))
		target := defaultString(asString(edge["target"]), asString(edge["target_node_id"]))
		if source == "" || target == "" {
			continue
		}
		data, ok := edge["data"].(map[string]any)
		if !ok {
			data = map[string]any{}
		}
		normalized := cloneMap(edge)
		normalized["id"] = id
		normalized["source"] = source
		normalized["target"] = target
		normalized["data"] = data
		result = append(result, normalized)
	}
	return result
}

func CanonicalJSONHash(raw json.RawMessage) string {
	if len(raw) == 0 {
		raw = []byte("null")
	}
	var value any
	if err := json.Unmarshal(raw, &value); err != nil {
		sum := sha256.Sum256(raw)
		return "sha256:" + hex.EncodeToString(sum[:])
	}
	bytes, err := json.Marshal(value)
	if err != nil {
		bytes = raw
	}
	sum := sha256.Sum256(bytes)
	return "sha256:" + hex.EncodeToString(sum[:])
}

func canonicalComputeJob(raw json.RawMessage) bool {
	obj := jsonObject(raw)
	return asString(obj["schema_version"]) == "compute_job.v1" && asString(obj["job_type"]) != ""
}

func convertibleTerminalStatus(status string) bool {
	switch strings.ToLower(strings.TrimSpace(status)) {
	case "success", "failed", "cancelled":
		return true
	default:
		return false
	}
}

func mapLegacyJobStatus(status string) string {
	switch strings.ToLower(strings.TrimSpace(status)) {
	case "success":
		return "succeeded"
	case "cancelled":
		return "cancelled"
	case "failed":
		return "failed"
	default:
		return "failed"
	}
}

func legacyErrorCode(status string) string {
	if status == "failed" {
		return "legacy_failed"
	}
	return ""
}

func selectedResources(only []string) map[string]bool {
	normalized := normalizedOnly(only)
	if len(normalized) == 0 {
		return map[string]bool{"flowcharts": true, "udm": true, "jobs": true}
	}
	result := map[string]bool{"flowcharts": false, "udm": false, "jobs": false}
	for _, item := range normalized {
		result[item] = true
	}
	return result
}

func normalizedOnly(only []string) []string {
	seen := map[string]bool{}
	var result []string
	for _, raw := range only {
		for _, part := range strings.Split(raw, ",") {
			item := strings.ToLower(strings.TrimSpace(part))
			if item == "" {
				continue
			}
			switch item {
			case "flowchart":
				item = "flowcharts"
			case "job":
				item = "jobs"
			}
			if item != "flowcharts" && item != "udm" && item != "jobs" {
				continue
			}
			if !seen[item] {
				result = append(result, item)
				seen[item] = true
			}
		}
	}
	sort.Strings(result)
	return result
}

func normalizeOptions(opt Options) Options {
	if opt.BatchSize <= 0 {
		opt.BatchSize = 500
	}
	if opt.Now == nil {
		opt.Now = time.Now
	}
	opt.Only = normalizedOnly(opt.Only)
	return opt
}

func optionNow(opt Options) time.Time {
	if opt.Now != nil {
		return opt.Now()
	}
	return time.Now()
}

func tableExists(ctx context.Context, q queryer, table string) (bool, error) {
	var exists bool
	err := q.QueryRow(ctx, "SELECT to_regclass($1) IS NOT NULL", "public."+table).Scan(&exists)
	return exists, err
}

func targetLegacyHash(ctx context.Context, target queryer, table, where string, args ...any) (string, error) {
	query := fmt.Sprintf("SELECT COALESCE(metadata_json->'legacy_source'->>'checksum','') FROM %s WHERE %s LIMIT 1", table, where)
	var hash string
	err := target.QueryRow(ctx, query, args...).Scan(&hash)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", nil
	}
	return hash, err
}

func historyLegacyHash(ctx context.Context, target queryer, sourceTable, sourceID string) (string, error) {
	var hash string
	err := target.QueryRow(ctx, "SELECT legacy_source_hash FROM imported_legacy_history WHERE legacy_source_table=$1 AND legacy_source_id=$2", sourceTable, sourceID).Scan(&hash)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", nil
	}
	return hash, err
}

func legacyMetadata(table, id, ownerID, checksum string, extra map[string]any) map[string]any {
	metadata := map[string]any{
		"legacy_source": map[string]any{
			"system":   "fastapi",
			"table":    table,
			"id":       id,
			"checksum": checksum,
			"owner_id": ownerID,
		},
	}
	for key, value := range extra {
		metadata[key] = value
	}
	return metadata
}

func mergeMetadata(raw json.RawMessage, metadata map[string]any) json.RawMessage {
	obj := jsonObject(raw)
	existing, _ := obj["metadata"].(map[string]any)
	if existing == nil {
		existing = map[string]any{}
	}
	for key, value := range metadata {
		existing[key] = value
	}
	obj["metadata"] = existing
	return mustJSON(obj)
}

func nullJSON(raw json.RawMessage) any {
	if len(raw) == 0 || string(raw) == "null" {
		return nil
	}
	return raw
}

func nullString(value string) any {
	if strings.TrimSpace(value) == "" {
		return nil
	}
	return value
}

func nonEmptyJSON(raw json.RawMessage, fallback string) json.RawMessage {
	if len(strings.TrimSpace(string(raw))) == 0 {
		return json.RawMessage(fallback)
	}
	return raw
}

func jsonObject(raw json.RawMessage) map[string]any {
	var obj map[string]any
	if err := json.Unmarshal(nonEmptyJSON(raw, "{}"), &obj); err != nil || obj == nil {
		return map[string]any{}
	}
	return obj
}

func arrayOfMaps(value any) []map[string]any {
	raw, ok := value.([]any)
	if !ok {
		return nil
	}
	result := make([]map[string]any, 0, len(raw))
	for _, item := range raw {
		if record, ok := item.(map[string]any); ok {
			result = append(result, record)
		}
	}
	return result
}

func cloneMap(input map[string]any) map[string]any {
	out := make(map[string]any, len(input))
	for key, value := range input {
		out[key] = value
	}
	return out
}

func asString(value any) string {
	if value == nil {
		return ""
	}
	switch typed := value.(type) {
	case string:
		return strings.TrimSpace(typed)
	default:
		return strings.TrimSpace(fmt.Sprint(value))
	}
}

func defaultString(value, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return strings.TrimSpace(value)
}

func safeID(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return "unknown"
	}
	var b strings.Builder
	for _, r := range value {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '-' || r == '_' {
			b.WriteRune(r)
		} else {
			b.WriteByte('_')
		}
	}
	return b.String()
}

func mustJSON(value any) json.RawMessage {
	bytes, err := json.Marshal(value)
	if err != nil {
		return json.RawMessage("null")
	}
	return bytes
}

func (runner *importRunner) inc(resource string, mutate func(*Counters)) {
	counters := runner.report.Resources[resource]
	mutate(&counters)
	runner.report.Resources[resource] = counters
	mutate(&runner.report.Totals)
}

func (runner *importRunner) conflict(resource, table, id, message string) {
	runner.report.Conflicts = append(runner.report.Conflicts, Issue{Resource: resource, Table: table, ID: id, Message: message})
	runner.inc(resource, func(c *Counters) { c.Conflicts++ })
}

func (runner *importRunner) missing(resource, table, id, message string) {
	runner.warn(resource, table, id, message)
	runner.inc(resource, func(c *Counters) { c.Missing++ })
}

func (runner *importRunner) warn(resource, table, id, message string) {
	runner.report.Warnings = append(runner.report.Warnings, Issue{Resource: resource, Table: table, ID: id, Message: message})
}
