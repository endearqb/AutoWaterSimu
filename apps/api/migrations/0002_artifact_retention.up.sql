ALTER TABLE artifacts
    ADD COLUMN IF NOT EXISTS retention_policy TEXT NOT NULL DEFAULT 'retain_forever',
    ADD COLUMN IF NOT EXISTS retain_until TIMESTAMPTZ;
