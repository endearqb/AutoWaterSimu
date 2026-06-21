CREATE TABLE IF NOT EXISTS imported_legacy_history (
    id TEXT PRIMARY KEY,
    legacy_source_table TEXT NOT NULL,
    legacy_source_id TEXT NOT NULL,
    legacy_source_hash TEXT NOT NULL,
    target_kind TEXT NOT NULL,
    target_id TEXT,
    status TEXT NOT NULL,
    reason TEXT NOT NULL DEFAULT '',
    payload_json JSONB NOT NULL,
    result_json JSONB,
    metadata_json JSONB,
    imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (legacy_source_table, legacy_source_id)
);

CREATE INDEX IF NOT EXISTS idx_imported_legacy_history_source
    ON imported_legacy_history(legacy_source_table, legacy_source_id);

CREATE INDEX IF NOT EXISTS idx_imported_legacy_history_status
    ON imported_legacy_history(status, imported_at DESC);
