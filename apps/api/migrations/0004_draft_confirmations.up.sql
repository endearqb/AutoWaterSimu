CREATE TABLE IF NOT EXISTS draft_confirmations (
    id TEXT PRIMARY KEY,
    schema_version TEXT NOT NULL,
    draft_schema_version TEXT NOT NULL,
    draft_id TEXT NOT NULL,
    decision TEXT NOT NULL,
    decision_reason TEXT,
    confirmed_by TEXT NOT NULL,
    confirmed_at TIMESTAMPTZ NOT NULL,
    payload_hash TEXT NOT NULL,
    payload_json JSONB NOT NULL,
    source_system TEXT NOT NULL,
    requested_by TEXT NOT NULL,
    tenant_id TEXT,
    project_id TEXT,
    metadata_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_draft_confirmations_draft
    ON draft_confirmations(draft_schema_version, draft_id, created_at DESC);
