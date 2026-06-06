DROP INDEX IF EXISTS idx_model_catalogs_scope_latest;

ALTER TABLE model_catalogs
    DROP COLUMN IF EXISTS site_id;
