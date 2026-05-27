CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workers (
    worker_id TEXT PRIMARY KEY,
    capabilities JSONB NOT NULL DEFAULT '[]'::jsonb,
    supported_contract_versions JSONB NOT NULL DEFAULT '[]'::jsonb,
    runtime_version TEXT,
    current_job_id TEXT,
    heartbeat_at TIMESTAMPTZ,
    registered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS compute_jobs (
    id TEXT PRIMARY KEY,
    schema_version TEXT NOT NULL,
    job_type TEXT NOT NULL,
    queue TEXT NOT NULL,
    status TEXT NOT NULL,
    request_id TEXT NOT NULL,
    idempotency_key TEXT NOT NULL,
    source_system TEXT NOT NULL,
    requested_by TEXT NOT NULL,
    trace_id TEXT NOT NULL,
    tenant_id TEXT,
    project_id TEXT,
    created_by TEXT,
    payload_hash TEXT NOT NULL,
    input_json JSONB NOT NULL,
    summary_json JSONB,
    result_hash TEXT,
    worker_id TEXT,
    attempt INTEGER NOT NULL DEFAULT 0,
    cancel_requested BOOLEAN NOT NULL DEFAULT false,
    claimed_at TIMESTAMPTZ,
    lease_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL,
    queued_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    error_code TEXT,
    error_message TEXT,
    UNIQUE (source_system, requested_by, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_compute_jobs_status_created
    ON compute_jobs(status, created_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS compute_job_events (
    id BIGSERIAL PRIMARY KEY,
    job_id TEXT NOT NULL REFERENCES compute_jobs(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    event_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_compute_job_events_job
    ON compute_job_events(job_id, id);

CREATE TABLE IF NOT EXISTS artifacts (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL REFERENCES compute_jobs(id) ON DELETE CASCADE,
    schema_version TEXT NOT NULL,
    artifact_type TEXT NOT NULL,
    storage_provider TEXT NOT NULL,
    object_key TEXT NOT NULL,
    content_type TEXT NOT NULL,
    size_bytes BIGINT NOT NULL,
    checksum TEXT NOT NULL,
    metadata_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_artifacts_job
    ON artifacts(job_id, created_at, id);

CREATE TABLE IF NOT EXISTS model_runs (
    id TEXT PRIMARY KEY,
    job_id TEXT REFERENCES compute_jobs(id) ON DELETE CASCADE,
    model_key TEXT,
    model_version TEXT,
    parameter_set_id TEXT,
    runtime_audit JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
