DROP INDEX IF EXISTS idx_compute_jobs_scope_created;

ALTER TABLE compute_jobs
    DROP COLUMN IF EXISTS site_id;
