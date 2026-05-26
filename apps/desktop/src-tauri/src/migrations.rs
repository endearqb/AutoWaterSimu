use rusqlite::{Connection, OptionalExtension};

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

pub const MIGRATION_0002_UP: &str = r#"
ALTER TABLE compute_jobs ADD COLUMN input_hash TEXT;
ALTER TABLE compute_jobs ADD COLUMN result_hash TEXT;
ALTER TABLE compute_jobs ADD COLUMN worker_version TEXT;
ALTER TABLE compute_jobs ADD COLUMN error_code TEXT;
ALTER TABLE compute_jobs ADD COLUMN error_message TEXT;
ALTER TABLE compute_jobs ADD COLUMN stderr_tail TEXT;

CREATE TABLE IF NOT EXISTS canvas_graphs (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    schema_version TEXT NOT NULL,
    graph_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(project_id) REFERENCES projects(id)
);

CREATE TABLE IF NOT EXISTS process_graphs (
    id TEXT PRIMARY KEY,
    canvas_graph_id TEXT,
    schema_version TEXT NOT NULL,
    graph_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(canvas_graph_id) REFERENCES canvas_graphs(id)
);

CREATE TABLE IF NOT EXISTS model_runs (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL,
    model_key TEXT,
    model_version TEXT,
    parameter_set_id TEXT,
    run_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(job_id) REFERENCES compute_jobs(id)
);

CREATE TABLE IF NOT EXISTS support_bundles (
    id TEXT PRIMARY KEY,
    job_id TEXT,
    object_key TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    checksum TEXT NOT NULL,
    created_at TEXT NOT NULL,
    metadata_json TEXT,
    FOREIGN KEY(job_id) REFERENCES compute_jobs(id)
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS recent_files (
    id TEXT PRIMARY KEY,
    file_path TEXT NOT NULL,
    file_type TEXT NOT NULL,
    last_opened_at TEXT NOT NULL
);
"#;

pub const MIGRATION_0002_DOWN: &str = r#"
DROP TABLE IF EXISTS recent_files;
DROP TABLE IF EXISTS settings;
DROP TABLE IF EXISTS support_bundles;
DROP TABLE IF EXISTS model_runs;
DROP TABLE IF EXISTS process_graphs;
DROP TABLE IF EXISTS canvas_graphs;
ALTER TABLE compute_jobs DROP COLUMN stderr_tail;
ALTER TABLE compute_jobs DROP COLUMN error_message;
ALTER TABLE compute_jobs DROP COLUMN error_code;
ALTER TABLE compute_jobs DROP COLUMN worker_version;
ALTER TABLE compute_jobs DROP COLUMN result_hash;
ALTER TABLE compute_jobs DROP COLUMN input_hash;
"#;

pub fn migrations() -> Vec<Migration> {
    vec![
        Migration {
            name: "0001_desktop_job_store",
            up_sql: MIGRATION_0001_UP,
            down_sql: MIGRATION_0001_DOWN,
        },
        Migration {
            name: "0002_desktop_runtime_foundation",
            up_sql: MIGRATION_0002_UP,
            down_sql: MIGRATION_0002_DOWN,
        },
    ]
}

pub fn migration_names() -> Vec<&'static str> {
    migrations()
        .iter()
        .map(|migration| migration.name)
        .collect()
}

pub fn apply_migrations(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS schema_migrations (
            name TEXT PRIMARY KEY,
            applied_at TEXT NOT NULL
        );",
    )
    .map_err(|err| format!("create schema_migrations failed: {err}"))?;

    for migration in migrations() {
        let applied: Option<String> = conn
            .query_row(
                "SELECT name FROM schema_migrations WHERE name = ?1",
                [migration.name],
                |row| row.get(0),
            )
            .optional()
            .map_err(|err| format!("read schema_migrations failed: {err}"))?;
        if applied.is_some() {
            continue;
        }
        conn.execute_batch("BEGIN IMMEDIATE TRANSACTION;")
            .map_err(|err| format!("begin migration {} failed: {err}", migration.name))?;

        let migration_result = (|| {
            conn.execute_batch(migration.up_sql)
                .map_err(|err| format!("apply migration {} failed: {err}", migration.name))?;
            conn.execute(
                "INSERT INTO schema_migrations (name, applied_at) VALUES (?1, ?2)",
                (migration.name, crate::runtime::utc_now()),
            )
            .map_err(|err| format!("record migration {} failed: {err}", migration.name))?;
            Ok::<(), String>(())
        })();

        if let Err(err) = migration_result {
            let _ = conn.execute_batch("ROLLBACK;");
            return Err(err);
        }

        conn.execute_batch("COMMIT;")
            .map_err(|err| format!("commit migration {} failed: {err}", migration.name))?;
    }

    Ok(())
}

pub fn rollback_all(conn: &Connection) -> Result<(), String> {
    for migration in migrations().into_iter().rev() {
        conn.execute_batch(migration.down_sql)
            .map_err(|err| format!("rollback migration {} failed: {err}", migration.name))?;
        conn.execute(
            "DELETE FROM schema_migrations WHERE name = ?1",
            [migration.name],
        )
        .map_err(|err| format!("delete migration {} failed: {err}", migration.name))?;
    }
    conn.execute_batch("DROP TABLE IF EXISTS schema_migrations;")
        .map_err(|err| format!("drop schema_migrations failed: {err}"))?;
    Ok(())
}
