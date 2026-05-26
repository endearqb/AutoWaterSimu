pub struct Migration {
    pub name: &'static str,
    pub up_sql: &'static str,
    pub down_sql: &'static str,
}

pub const MIGRATION_0001_UP: &str = r#"
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS compute_jobs (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    schema_version TEXT NOT NULL,
    job_type TEXT NOT NULL,
    status TEXT NOT NULL,
    cancel_requested INTEGER NOT NULL DEFAULT 0,
    input_json TEXT NOT NULL,
    summary_json TEXT,
    created_at TEXT NOT NULL,
    queued_at TEXT,
    started_at TEXT,
    finished_at TEXT,
    FOREIGN KEY(project_id) REFERENCES projects(id)
);

CREATE TABLE IF NOT EXISTS compute_job_events (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    event_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(job_id) REFERENCES compute_jobs(id)
);

CREATE TABLE IF NOT EXISTS artifacts (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL,
    schema_version TEXT NOT NULL,
    artifact_type TEXT NOT NULL,
    object_key TEXT NOT NULL,
    content_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    checksum TEXT NOT NULL,
    created_at TEXT NOT NULL,
    metadata_json TEXT,
    FOREIGN KEY(job_id) REFERENCES compute_jobs(id)
);
"#;

pub const MIGRATION_0001_DOWN: &str = r#"
DROP TABLE IF EXISTS artifacts;
DROP TABLE IF EXISTS compute_job_events;
DROP TABLE IF EXISTS compute_jobs;
DROP TABLE IF EXISTS projects;
"#;

pub fn migrations() -> Vec<Migration> {
    vec![Migration {
        name: "0001_desktop_job_store",
        up_sql: MIGRATION_0001_UP,
        down_sql: MIGRATION_0001_DOWN,
    }]
}

pub fn migration_names() -> Vec<&'static str> {
    migrations().iter().map(|migration| migration.name).collect()
}
