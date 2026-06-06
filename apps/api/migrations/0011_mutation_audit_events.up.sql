CREATE TABLE IF NOT EXISTS mutation_audit_events (
    id BIGSERIAL PRIMARY KEY,
    event_type TEXT NOT NULL,
    target_object TEXT NOT NULL,
    target_id TEXT NOT NULL,
    event_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mutation_audit_events_target
    ON mutation_audit_events(target_object, target_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_mutation_audit_events_type
    ON mutation_audit_events(event_type, created_at DESC, id DESC);
