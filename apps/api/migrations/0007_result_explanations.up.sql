CREATE TABLE IF NOT EXISTS result_explanations (
    id TEXT NOT NULL,
    job_id TEXT NOT NULL REFERENCES compute_jobs(id) ON DELETE CASCADE,
    schema_version TEXT NOT NULL,
    explanation_schema_version TEXT NOT NULL,
    status TEXT NOT NULL,
    created_by TEXT NOT NULL,
    payload_hash TEXT NOT NULL,
    payload_json JSONB NOT NULL,
    resolved_evidence_refs TEXT[] NOT NULL DEFAULT '{}',
    source_system TEXT NOT NULL,
    requested_by TEXT NOT NULL,
    tenant_id TEXT,
    project_id TEXT,
    metadata_json JSONB,
    submitted_at TIMESTAMPTZ NOT NULL,
    reviewed_by TEXT,
    reviewed_at TIMESTAMPTZ,
    review_decision TEXT,
    review_reason TEXT,
    published_by TEXT,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (job_id, id)
);

CREATE INDEX IF NOT EXISTS idx_result_explanations_job_id ON result_explanations(job_id);
CREATE INDEX IF NOT EXISTS idx_result_explanations_status ON result_explanations(status);
