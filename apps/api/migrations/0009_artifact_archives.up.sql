CREATE TABLE IF NOT EXISTS artifact_archives (
    artifact_id TEXT PRIMARY KEY REFERENCES artifacts(id) ON DELETE CASCADE,
    job_id TEXT NOT NULL REFERENCES compute_jobs(id) ON DELETE CASCADE,
    original_storage_provider TEXT NOT NULL,
    original_object_key TEXT NOT NULL,
    archive_provider TEXT NOT NULL,
    archive_object_key TEXT NOT NULL,
    checksum TEXT NOT NULL,
    size_bytes BIGINT NOT NULL,
    status TEXT NOT NULL,
    metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    archived_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_artifact_archives_job_id ON artifact_archives(job_id);
CREATE INDEX IF NOT EXISTS idx_artifact_archives_status ON artifact_archives(status);
