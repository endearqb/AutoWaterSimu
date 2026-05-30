ALTER TABLE artifacts
    DROP COLUMN IF EXISTS retain_until,
    DROP COLUMN IF EXISTS retention_policy;
