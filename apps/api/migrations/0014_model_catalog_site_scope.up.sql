ALTER TABLE model_catalogs
    ADD COLUMN IF NOT EXISTS site_id TEXT;

CREATE INDEX IF NOT EXISTS idx_model_catalogs_scope_latest
    ON model_catalogs(catalog_id, tenant_id, project_id, site_id, created_at DESC, snapshot_id DESC);
