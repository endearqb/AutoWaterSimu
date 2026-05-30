CREATE TABLE IF NOT EXISTS model_catalogs (
    snapshot_id BIGSERIAL PRIMARY KEY,
    catalog_id TEXT NOT NULL,
    schema_version TEXT NOT NULL,
    generated_at TEXT NOT NULL,
    payload_hash TEXT NOT NULL,
    payload_json JSONB NOT NULL,
    source_system TEXT NOT NULL,
    requested_by TEXT NOT NULL,
    tenant_id TEXT,
    project_id TEXT,
    metadata_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (catalog_id, payload_hash)
);

CREATE INDEX IF NOT EXISTS idx_model_catalogs_latest
    ON model_catalogs(catalog_id, created_at DESC, snapshot_id DESC);
