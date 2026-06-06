ALTER TABLE draft_confirmations
    ADD COLUMN IF NOT EXISTS site_id TEXT;
