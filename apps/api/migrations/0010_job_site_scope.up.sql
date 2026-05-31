ALTER TABLE compute_jobs
    ADD COLUMN IF NOT EXISTS site_id TEXT;

CREATE INDEX IF NOT EXISTS idx_compute_jobs_scope_created
    ON compute_jobs(tenant_id, project_id, site_id, created_at DESC, id DESC);
