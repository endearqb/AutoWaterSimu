CREATE TABLE IF NOT EXISTS simulation_scenarios (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    model_family TEXT NOT NULL,
    status TEXT NOT NULL,
    version INTEGER NOT NULL,
    current_canvas_graph_id TEXT,
    current_canvas_graph_version INTEGER,
    published_process_graph_id TEXT,
    published_process_graph_version INTEGER,
    current_simulation_input_id TEXT,
    context_snapshot_id TEXT,
    source_scenario_id TEXT,
    last_job_id TEXT,
    source_system TEXT NOT NULL,
    requested_by TEXT NOT NULL,
    tenant_id TEXT,
    project_id TEXT,
    site_id TEXT,
    metadata_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    archived_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_simulation_scenarios_status_updated
    ON simulation_scenarios(status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_simulation_scenarios_scope_updated
    ON simulation_scenarios(tenant_id, project_id, site_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS canvas_graphs (
    id TEXT NOT NULL,
    scenario_id TEXT,
    schema_version TEXT NOT NULL,
    name TEXT NOT NULL,
    version INTEGER NOT NULL,
    payload_hash TEXT NOT NULL,
    payload_json JSONB NOT NULL,
    source_system TEXT NOT NULL,
    requested_by TEXT NOT NULL,
    tenant_id TEXT,
    project_id TEXT,
    site_id TEXT,
    metadata_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    archived_at TIMESTAMPTZ,
    PRIMARY KEY (id, version)
);

CREATE INDEX IF NOT EXISTS idx_canvas_graphs_scenario_created
    ON canvas_graphs(scenario_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_canvas_graphs_scope_created
    ON canvas_graphs(tenant_id, project_id, site_id, created_at DESC);

CREATE TABLE IF NOT EXISTS context_snapshots (
    id TEXT PRIMARY KEY,
    scenario_id TEXT,
    schema_version TEXT NOT NULL,
    source_system TEXT NOT NULL,
    captured_at TIMESTAMPTZ NOT NULL,
    payload_hash TEXT NOT NULL,
    payload_json JSONB NOT NULL,
    tenant_id TEXT,
    project_id TEXT,
    site_id TEXT,
    metadata_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_context_snapshots_scenario_captured
    ON context_snapshots(scenario_id, captured_at DESC);

CREATE INDEX IF NOT EXISTS idx_context_snapshots_scope_captured
    ON context_snapshots(tenant_id, project_id, site_id, captured_at DESC);
