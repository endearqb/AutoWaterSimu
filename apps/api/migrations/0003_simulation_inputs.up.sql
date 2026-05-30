CREATE TABLE IF NOT EXISTS simulation_inputs (
    id TEXT PRIMARY KEY,
    schema_version TEXT NOT NULL,
    job_type TEXT NOT NULL,
    process_graph_id TEXT NOT NULL,
    process_graph_version INTEGER NOT NULL,
    payload_hash TEXT NOT NULL,
    payload_json JSONB NOT NULL,
    source_system TEXT NOT NULL,
    requested_by TEXT NOT NULL,
    tenant_id TEXT,
    project_id TEXT,
    metadata_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_simulation_inputs_process_graph
    ON simulation_inputs(process_graph_id, process_graph_version);
