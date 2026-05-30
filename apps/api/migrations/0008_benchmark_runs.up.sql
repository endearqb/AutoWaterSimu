CREATE TABLE IF NOT EXISTS benchmark_runs (
    id TEXT PRIMARY KEY,
    schema_version TEXT NOT NULL,
    model_key TEXT NOT NULL,
    model_version TEXT NOT NULL,
    benchmark_case_id TEXT NOT NULL,
    parameter_set_id TEXT NOT NULL,
    model_run_id TEXT NOT NULL,
    job_id TEXT NOT NULL,
    status TEXT NOT NULL,
    payload_hash TEXT NOT NULL,
    payload_json JSONB NOT NULL,
    source_system TEXT NOT NULL,
    requested_by TEXT NOT NULL,
    tenant_id TEXT,
    project_id TEXT,
    metadata_json JSONB,
    executed_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_benchmark_runs_model
    ON benchmark_runs(model_key, model_version, benchmark_case_id, executed_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_benchmark_runs_model_run
    ON benchmark_runs(model_run_id);

CREATE INDEX IF NOT EXISTS idx_benchmark_runs_job
    ON benchmark_runs(job_id);
