use rusqlite::{params, Connection, OptionalExtension};
use serde_json::{json, Value};
use std::fs;
use std::path::{Path, PathBuf};
use uuid::Uuid;

use crate::migrations;
use crate::runtime::{sha256_hex, utc_now};

#[derive(Clone, Debug)]
pub struct DesktopStore {
    db_path: PathBuf,
}

impl DesktopStore {
    pub fn open(base_dir: &Path) -> Result<Self, String> {
        fs::create_dir_all(base_dir).map_err(|err| format!("create runtime dir failed: {err}"))?;
        let db_path = base_dir.join("autowatersimu_desktop.sqlite");
        let store = Self { db_path };
        store.with_conn(|conn| migrations::apply_migrations(conn))?;
        Ok(store)
    }

    pub fn db_path(&self) -> &Path {
        &self.db_path
    }

    pub fn with_conn<T>(
        &self,
        f: impl FnOnce(&Connection) -> Result<T, String>,
    ) -> Result<T, String> {
        let conn = Connection::open(&self.db_path)
            .map_err(|err| format!("open sqlite database failed: {err}"))?;
        conn.pragma_update(None, "foreign_keys", "ON")
            .map_err(|err| format!("enable foreign keys failed: {err}"))?;
        f(&conn)
    }

    pub fn create_job(&self, request_json: &str) -> Result<Value, String> {
        let request_json = request_json.trim();
        if request_json.is_empty() {
            return Err(String::from("request_json is required"));
        }
        let job: Value = serde_json::from_str(request_json)
            .map_err(|err| format!("compute_job JSON is invalid: {err}"))?;
        validate_compute_job(&job)?;

        let job_id = job["job_id"].as_str().unwrap();
        let schema_version = job["schema_version"].as_str().unwrap();
        let job_type = job["job_type"].as_str().unwrap();
        let input_hash = sha256_hex(request_json.as_bytes());
        let now = utc_now();

        self.with_conn(|conn| {
            if job_status(conn, job_id)?.is_some() {
                return Err(format!("compute_job already exists: {job_id}"));
            }
            conn.execute(
                "INSERT INTO compute_jobs (
                    id, project_id, schema_version, job_type, status, cancel_requested,
                    input_json, summary_json, input_hash, created_at, queued_at
                ) VALUES (?1, NULL, ?2, ?3, 'queued', 0, ?4, NULL, ?5, ?6, ?6)",
                params![
                    job_id,
                    schema_version,
                    job_type,
                    request_json,
                    input_hash,
                    now
                ],
            )
            .map_err(|err| format!("insert compute job failed: {err}"))?;
            append_event(conn, job_id, "job.created", json!({"status": "created"}))?;
            append_event(conn, job_id, "job.queued", json!({"status": "queued"}))?;
            job_snapshot(conn, job_id)
        })
    }

    pub fn mark_running(&self, job_id: &str) -> Result<Value, String> {
        let now = utc_now();
        self.with_conn(|conn| {
            let changed = conn
                .execute(
                    "UPDATE compute_jobs
                     SET status = 'running', started_at = ?2
                     WHERE id = ?1 AND status = 'queued'",
                    params![job_id, now],
                )
                .map_err(|err| format!("mark job running failed: {err}"))?;
            if changed == 0 {
                let current_status = job_status(conn, job_id)?;
                return match current_status {
                    Some(status) => Err(format!("job cannot be run from status: {status}")),
                    None => Err(format!("job not found: {job_id}")),
                };
            }
            append_event(conn, job_id, "job.running", json!({"status": "running"}))?;
            job_snapshot(conn, job_id)
        })
    }

    pub fn complete_job(
        &self,
        job_id: &str,
        status: &str,
        summary: &Value,
        result_hash: Option<&str>,
        worker_version: Option<&str>,
        error_code: Option<&str>,
        error_message: Option<&str>,
        stderr_tail: Option<&str>,
    ) -> Result<Value, String> {
        let now = utc_now();
        let summary_json = serde_json::to_string(summary)
            .map_err(|err| format!("serialize job summary failed: {err}"))?;
        self.with_conn(|conn| {
            conn.execute(
                "UPDATE compute_jobs
                 SET status = ?2, summary_json = ?3, result_hash = ?4, worker_version = ?5,
                     error_code = ?6, error_message = ?7, stderr_tail = ?8, finished_at = ?9
                 WHERE id = ?1",
                params![
                    job_id,
                    status,
                    summary_json,
                    result_hash,
                    worker_version,
                    error_code,
                    error_message,
                    stderr_tail,
                    now
                ],
            )
            .map_err(|err| format!("complete job failed: {err}"))?;
            append_event(
                conn,
                job_id,
                &format!("job.{status}"),
                json!({"status": status, "error_code": error_code, "error_message": error_message}),
            )?;
            job_snapshot(conn, job_id)
        })
    }

    pub fn insert_artifact(&self, job_id: &str, artifact: &Value) -> Result<(), String> {
        let artifact_id = required_str(artifact, "artifact_id")?;
        let schema_version = required_str(artifact, "schema_version")?;
        let artifact_type = required_str(artifact, "artifact_type")?;
        let object_key = required_str(artifact, "object_key")?;
        let content_type = required_str(artifact, "content_type")?;
        let checksum = required_str(artifact, "checksum")?;
        let size_bytes = artifact
            .get("size_bytes")
            .and_then(Value::as_i64)
            .ok_or_else(|| String::from("artifact.size_bytes is required"))?;
        let metadata_json = serde_json::to_string(artifact.get("metadata").unwrap_or(&Value::Null))
            .map_err(|err| format!("serialize artifact metadata failed: {err}"))?;
        let created_at = artifact
            .get("created_at")
            .and_then(Value::as_str)
            .unwrap_or("")
            .to_string();

        self.with_conn(|conn| {
            conn.execute(
                "INSERT OR REPLACE INTO artifacts (
                    id, job_id, schema_version, artifact_type, object_key, content_type,
                    size_bytes, checksum, created_at, metadata_json
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
                params![
                    artifact_id,
                    job_id,
                    schema_version,
                    artifact_type,
                    object_key,
                    content_type,
                    size_bytes,
                    checksum,
                    created_at,
                    metadata_json
                ],
            )
            .map_err(|err| format!("insert artifact failed: {err}"))?;
            append_event(conn, job_id, "artifact.recorded", artifact.clone())?;
            Ok(())
        })
    }

    pub fn job_input(&self, job_id: &str) -> Result<Value, String> {
        self.with_conn(|conn| {
            let input_json: String = conn
                .query_row(
                    "SELECT input_json FROM compute_jobs WHERE id = ?1",
                    [job_id],
                    |row| row.get(0),
                )
                .map_err(|err| format!("read job input failed: {err}"))?;
            serde_json::from_str(&input_json)
                .map_err(|err| format!("stored job JSON is invalid: {err}"))
        })
    }

    pub fn get_job(&self, job_id: &str) -> Result<Value, String> {
        self.with_conn(|conn| job_snapshot(conn, job_id))
    }

    pub fn list_jobs(&self) -> Result<Value, String> {
        self.with_conn(|conn| {
            let mut stmt = conn
                .prepare(
                    "SELECT id FROM compute_jobs ORDER BY COALESCE(created_at, '') DESC, id DESC",
                )
                .map_err(|err| format!("prepare list jobs failed: {err}"))?;
            let ids = stmt
                .query_map([], |row| row.get::<_, String>(0))
                .map_err(|err| format!("list jobs failed: {err}"))?;
            let mut jobs = Vec::new();
            for id in ids {
                jobs.push(job_snapshot(conn, &id.map_err(|err| err.to_string())?)?);
            }
            Ok(json!({"jobs": jobs, "count": jobs.len()}))
        })
    }

    pub fn artifact(&self, artifact_id: &str) -> Result<Value, String> {
        self.with_conn(|conn| artifact_snapshot(conn, artifact_id))
    }

    pub fn events_for_job(&self, job_id: &str) -> Result<Vec<Value>, String> {
        self.with_conn(|conn| events_for_job(conn, job_id))
    }

    pub fn insert_support_bundle(
        &self,
        bundle_id: &str,
        job_id: &str,
        object_key: &str,
        size_bytes: u64,
        checksum: &str,
        metadata: &Value,
    ) -> Result<Value, String> {
        let metadata_json = serde_json::to_string(metadata)
            .map_err(|err| format!("serialize support bundle metadata failed: {err}"))?;
        let now = utc_now();
        self.with_conn(|conn| {
            conn.execute(
                "INSERT INTO support_bundles (
                    id, job_id, object_key, size_bytes, checksum, created_at, metadata_json
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![
                    bundle_id,
                    job_id,
                    object_key,
                    size_bytes as i64,
                    checksum,
                    now,
                    metadata_json
                ],
            )
            .map_err(|err| format!("insert support bundle failed: {err}"))?;
            Ok(json!({
                "bundle_id": bundle_id,
                "job_id": job_id,
                "object_key": object_key,
                "size_bytes": size_bytes,
                "checksum": checksum,
                "created_at": now
            }))
        })
    }

    pub fn append_job_event(
        &self,
        job_id: &str,
        event_type: &str,
        event: Value,
    ) -> Result<(), String> {
        self.with_conn(|conn| append_event(conn, job_id, event_type, event))
    }
}

fn validate_compute_job(job: &Value) -> Result<(), String> {
    if required_str(job, "schema_version")? != "compute_job.v1" {
        return Err(String::from("schema_version must be compute_job.v1"));
    }
    if required_str(job, "job_type")? != "simulation.material_balance.v1" {
        return Err(String::from(
            "only simulation.material_balance.v1 is supported",
        ));
    }
    required_str(job, "job_id")?;
    if !job.get("payload").is_some_and(Value::is_object) {
        return Err(String::from("payload object is required"));
    }
    Ok(())
}

fn job_snapshot(conn: &Connection, job_id: &str) -> Result<Value, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, project_id, schema_version, job_type, status, cancel_requested,
                    input_hash, result_hash, worker_version, error_code, error_message,
                    stderr_tail, summary_json, created_at, queued_at, started_at, finished_at
             FROM compute_jobs WHERE id = ?1",
        )
        .map_err(|err| format!("prepare job snapshot failed: {err}"))?;
    let job = stmt
        .query_row([job_id], |row| {
            let summary_json: Option<String> = row.get(12)?;
            Ok(json!({
                "job_id": row.get::<_, String>(0)?,
                "project_id": row.get::<_, Option<String>>(1)?,
                "schema_version": row.get::<_, String>(2)?,
                "job_type": row.get::<_, String>(3)?,
                "status": row.get::<_, String>(4)?,
                "cancel_requested": row.get::<_, i64>(5)? != 0,
                "input_hash": row.get::<_, Option<String>>(6)?,
                "result_hash": row.get::<_, Option<String>>(7)?,
                "worker_version": row.get::<_, Option<String>>(8)?,
                "error_code": row.get::<_, Option<String>>(9)?,
                "error_message": row.get::<_, Option<String>>(10)?,
                "stderr_tail": row.get::<_, Option<String>>(11)?,
                "summary": summary_json
                    .as_deref()
                    .and_then(|text| serde_json::from_str::<Value>(text).ok())
                    .unwrap_or(Value::Null),
                "created_at": row.get::<_, String>(13)?,
                "queued_at": row.get::<_, Option<String>>(14)?,
                "started_at": row.get::<_, Option<String>>(15)?,
                "finished_at": row.get::<_, Option<String>>(16)?,
            }))
        })
        .optional()
        .map_err(|err| format!("read job snapshot failed: {err}"))?
        .ok_or_else(|| format!("job not found: {job_id}"))?;

    let artifacts = artifacts_for_job(conn, job_id)?;
    let event_count = event_count(conn, job_id)?;
    Ok(json!({
        "job": job,
        "artifacts": artifacts,
        "event_count": event_count
    }))
}

fn artifact_snapshot(conn: &Connection, artifact_id: &str) -> Result<Value, String> {
    conn.query_row(
        "SELECT id, job_id, schema_version, artifact_type, object_key, content_type,
                size_bytes, checksum, created_at, metadata_json
         FROM artifacts WHERE id = ?1",
        [artifact_id],
        artifact_row_to_json,
    )
    .optional()
    .map_err(|err| format!("read artifact failed: {err}"))?
    .ok_or_else(|| format!("artifact not found: {artifact_id}"))
}

fn artifacts_for_job(conn: &Connection, job_id: &str) -> Result<Vec<Value>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, job_id, schema_version, artifact_type, object_key, content_type,
                    size_bytes, checksum, created_at, metadata_json
             FROM artifacts WHERE job_id = ?1 ORDER BY created_at, id",
        )
        .map_err(|err| format!("prepare artifacts query failed: {err}"))?;
    let rows = stmt
        .query_map([job_id], artifact_row_to_json)
        .map_err(|err| format!("query artifacts failed: {err}"))?;
    let mut artifacts = Vec::new();
    for row in rows {
        artifacts.push(row.map_err(|err| format!("read artifact row failed: {err}"))?);
    }
    Ok(artifacts)
}

fn events_for_job(conn: &Connection, job_id: &str) -> Result<Vec<Value>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, event_type, event_json, created_at
             FROM compute_job_events WHERE job_id = ?1 ORDER BY rowid",
        )
        .map_err(|err| format!("prepare events query failed: {err}"))?;
    let rows = stmt
        .query_map([job_id], |row| {
            let event_json: String = row.get(2)?;
            Ok(json!({
                "id": row.get::<_, String>(0)?,
                "event_type": row.get::<_, String>(1)?,
                "event": serde_json::from_str::<Value>(&event_json).unwrap_or(Value::Null),
                "created_at": row.get::<_, String>(3)?
            }))
        })
        .map_err(|err| format!("query events failed: {err}"))?;
    let mut events = Vec::new();
    for row in rows {
        events.push(row.map_err(|err| format!("read event row failed: {err}"))?);
    }
    Ok(events)
}

fn job_status(conn: &Connection, job_id: &str) -> Result<Option<String>, String> {
    conn.query_row(
        "SELECT status FROM compute_jobs WHERE id = ?1",
        [job_id],
        |row| row.get(0),
    )
    .optional()
    .map_err(|err| format!("read job status failed: {err}"))
}

fn append_event(
    conn: &Connection,
    job_id: &str,
    event_type: &str,
    event: Value,
) -> Result<(), String> {
    conn.execute(
        "INSERT INTO compute_job_events (id, job_id, event_type, event_json, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![
            Uuid::new_v4().to_string(),
            job_id,
            event_type,
            serde_json::to_string(&event).map_err(|err| err.to_string())?,
            utc_now()
        ],
    )
    .map_err(|err| format!("append event failed: {err}"))?;
    Ok(())
}

fn event_count(conn: &Connection, job_id: &str) -> Result<i64, String> {
    conn.query_row(
        "SELECT COUNT(*) FROM compute_job_events WHERE job_id = ?1",
        [job_id],
        |row| row.get(0),
    )
    .map_err(|err| format!("read event count failed: {err}"))
}

fn artifact_row_to_json(row: &rusqlite::Row<'_>) -> rusqlite::Result<Value> {
    let metadata_json: Option<String> = row.get(9)?;
    Ok(json!({
        "artifact_id": row.get::<_, String>(0)?,
        "job_id": row.get::<_, String>(1)?,
        "schema_version": row.get::<_, String>(2)?,
        "artifact_type": row.get::<_, String>(3)?,
        "object_key": row.get::<_, String>(4)?,
        "content_type": row.get::<_, String>(5)?,
        "size_bytes": row.get::<_, i64>(6)?,
        "checksum": row.get::<_, String>(7)?,
        "created_at": row.get::<_, String>(8)?,
        "metadata": metadata_json
            .as_deref()
            .and_then(|text| serde_json::from_str::<Value>(text).ok())
            .unwrap_or(Value::Null)
    }))
}

fn required_str<'a>(value: &'a Value, key: &str) -> Result<&'a str, String> {
    value
        .get(key)
        .and_then(Value::as_str)
        .filter(|text| !text.trim().is_empty())
        .ok_or_else(|| format!("{key} is required"))
}
