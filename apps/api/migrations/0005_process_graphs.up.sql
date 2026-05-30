CREATE TABLE IF NOT EXISTS process_graphs (
    id TEXT NOT NULL,
    schema_version TEXT NOT NULL,
    version INTEGER NOT NULL,
    source_canvas_graph_id TEXT NOT NULL,
    payload_hash TEXT NOT NULL,
    payload_json JSONB NOT NULL,
    source_system TEXT NOT NULL,
    requested_by TEXT NOT NULL,
    tenant_id TEXT,
    project_id TEXT,
    metadata_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (id, version)
);

CREATE INDEX IF NOT EXISTS idx_process_graphs_source_canvas
    ON process_graphs(source_canvas_graph_id, created_at DESC);
