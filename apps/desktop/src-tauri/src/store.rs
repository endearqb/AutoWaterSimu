use rusqlite::{params, Connection, OptionalExtension};
use serde_json::{json, Value};
use std::collections::BTreeSet;
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

    pub fn create_project(&self, name: &str) -> Result<Value, String> {
        let name = name.trim();
        if name.is_empty() {
            return Err(String::from("project name is required"));
        }
        let project_id = format!("project_{}", Uuid::new_v4());
        let now = utc_now();
        self.with_conn(|conn| {
            conn.execute(
                "INSERT INTO projects (id, name, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?3)",
                params![project_id, name, now],
            )
            .map_err(|err| format!("insert project failed: {err}"))?;
            project_snapshot(conn, &project_id)
        })
    }

    pub fn get_project(&self, project_id: &str) -> Result<Value, String> {
        self.with_conn(|conn| project_snapshot(conn, project_id))
    }

    pub fn upsert_project_snapshot(&self, project: &Value) -> Result<Value, String> {
        let project_id = required_str(project, "project_id")?;
        let name = required_str(project, "name")?;
        let created_at = required_str(project, "created_at")?;
        let updated_at = utc_now();
        self.with_conn(|conn| {
            conn.execute(
                "INSERT INTO projects (id, name, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4)
                 ON CONFLICT(id) DO UPDATE SET
                    name = excluded.name,
                    updated_at = excluded.updated_at",
                params![project_id, name, created_at, updated_at],
            )
            .map_err(|err| format!("upsert project failed: {err}"))?;
            project_snapshot(conn, project_id)
        })
    }

    pub fn list_projects(&self) -> Result<Value, String> {
        self.with_conn(|conn| {
            let mut stmt = conn
                .prepare("SELECT id FROM projects ORDER BY updated_at DESC, id DESC")
                .map_err(|err| format!("prepare list projects failed: {err}"))?;
            let ids = stmt
                .query_map([], |row| row.get::<_, String>(0))
                .map_err(|err| format!("list projects failed: {err}"))?;
            let mut projects = Vec::new();
            for id in ids {
                projects.push(project_snapshot(
                    conn,
                    &id.map_err(|err| format!("read project id failed: {err}"))?,
                )?);
            }
            Ok(json!({"projects": projects, "count": projects.len()}))
        })
    }

    pub fn create_job(&self, request_json: &str) -> Result<Value, String> {
        self.create_job_for_project(request_json, None)
    }

    pub fn create_job_for_project(
        &self,
        request_json: &str,
        project_id: Option<&str>,
    ) -> Result<Value, String> {
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
        let project_id = normalize_optional_project_id(project_id)?;
        let input_hash = sha256_hex(request_json.as_bytes());
        let now = utc_now();

        self.with_conn(|conn| {
            ensure_project_exists(conn, project_id.as_deref())?;
            if job_status(conn, job_id)?.is_some() {
                return Err(format!("compute_job already exists: {job_id}"));
            }
            conn.execute(
                "INSERT INTO compute_jobs (
                    id, project_id, schema_version, job_type, status, cancel_requested,
                    input_json, summary_json, input_hash, created_at, queued_at
                ) VALUES (?1, ?2, ?3, ?4, 'queued', 0, ?5, NULL, ?6, ?7, ?7)",
                params![
                    job_id,
                    project_id,
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

    pub fn cancel_job(&self, job_id: &str) -> Result<Value, String> {
        let now = utc_now();
        self.with_conn(|conn| {
            let current_status = job_status(conn, job_id)?;
            match current_status.as_deref() {
                Some("queued") => {}
                Some("running") => {
                    return Err(String::from(
                        "running job cancellation is not supported by source-mode worker",
                    ));
                }
                Some(status) => {
                    return Err(format!("job cannot be cancelled from status: {status}"))
                }
                None => return Err(format!("job not found: {job_id}")),
            }
            conn.execute(
                "UPDATE compute_jobs
                 SET status = 'cancelled', cancel_requested = 1, finished_at = ?2
                 WHERE id = ?1 AND status = 'queued'",
                params![job_id, now],
            )
            .map_err(|err| format!("cancel job failed: {err}"))?;
            append_event(
                conn,
                job_id,
                "job.cancelled",
                json!({"status": "cancelled"}),
            )?;
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

    pub fn insert_model_run(&self, job_id: &str, model_run: &Value) -> Result<(), String> {
        validate_model_run(job_id, model_run)?;
        let model_run_id = required_str(model_run, "model_run_id")?;
        let model_key = required_str(model_run, "model_key")?;
        let model_version = required_str(model_run, "model_version")?;
        let parameter_set_id = model_run
            .pointer("/metadata/parameter_set_id")
            .and_then(Value::as_str);
        let run_json = serde_json::to_string(model_run)
            .map_err(|err| format!("serialize model run failed: {err}"))?;
        let now = utc_now();

        self.with_conn(|conn| {
            conn.execute(
                "INSERT OR REPLACE INTO model_runs (
                    id, job_id, model_key, model_version, parameter_set_id, run_json, created_at
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![
                    model_run_id,
                    job_id,
                    model_key,
                    model_version,
                    parameter_set_id,
                    run_json,
                    now
                ],
            )
            .map_err(|err| format!("insert model run failed: {err}"))?;
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

    pub fn save_canvas_graph(&self, graph_json: &str) -> Result<Value, String> {
        self.save_canvas_graph_for_project(graph_json, None)
    }

    pub fn save_canvas_graph_for_project(
        &self,
        graph_json: &str,
        project_id: Option<&str>,
    ) -> Result<Value, String> {
        let graph_json = graph_json.trim();
        if graph_json.is_empty() {
            return Err(String::from("graph_json is required"));
        }
        let graph: Value = serde_json::from_str(graph_json)
            .map_err(|err| format!("canvas_graph JSON is invalid: {err}"))?;
        let graph_id = validate_canvas_graph(&graph)?.to_string();
        let project_id = normalize_optional_project_id(project_id)?;
        let schema_version = graph["schema_version"].as_str().unwrap().to_string();
        let canonical_json = serde_json::to_string(&graph)
            .map_err(|err| format!("serialize canvas graph failed: {err}"))?;
        let now = utc_now();

        self.with_conn(|conn| {
            ensure_project_exists(conn, project_id.as_deref())?;
            let created_at: Option<String> = conn
                .query_row(
                    "SELECT created_at FROM canvas_graphs WHERE id = ?1",
                    [&graph_id],
                    |row| row.get(0),
                )
                .optional()
                .map_err(|err| format!("read canvas graph timestamp failed: {err}"))?;
            let created_at = created_at.unwrap_or_else(|| now.clone());
            conn.execute(
                "INSERT INTO canvas_graphs (
                    id, project_id, schema_version, graph_json, created_at, updated_at
                 ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)
                 ON CONFLICT(id) DO UPDATE SET
                    project_id = excluded.project_id,
                    schema_version = excluded.schema_version,
                    graph_json = excluded.graph_json,
                    updated_at = excluded.updated_at",
                params![
                    graph_id,
                    project_id,
                    schema_version,
                    canonical_json,
                    created_at,
                    now
                ],
            )
            .map_err(|err| format!("save canvas graph failed: {err}"))?;
            canvas_graph_snapshot(conn, &graph_id)
        })
    }

    pub fn load_canvas_graph(&self, graph_id: &str) -> Result<Value, String> {
        self.with_conn(|conn| canvas_graph_snapshot(conn, graph_id))
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

fn validate_canvas_graph(graph: &Value) -> Result<&str, String> {
    if required_str(graph, "schema_version")? != "canvas_graph.v1" {
        return Err(String::from("schema_version must be canvas_graph.v1"));
    }
    let graph_id = required_str(graph, "graph_id")?;
    required_str(graph, "name")?;
    required_str(graph, "exported_at")?;
    let nodes = required_array(graph, "nodes")?;
    let edges = required_array(graph, "edges")?;

    let mut node_ids = BTreeSet::new();
    for (index, node) in nodes.iter().enumerate() {
        let node_id = required_str(node, "id")
            .map_err(|err| format!("nodes[{index}].{err}"))?
            .to_string();
        if !node_ids.insert(node_id.clone()) {
            return Err(format!("duplicate canvas node id: {node_id}"));
        }
        required_str(node, "type").map_err(|err| format!("nodes[{index}].{err}"))?;
        if !node.get("data").is_some_and(Value::is_object) {
            return Err(format!("nodes[{index}].data object is required"));
        }
        let position = node
            .get("position")
            .and_then(Value::as_object)
            .ok_or_else(|| format!("nodes[{index}].position object is required"))?;
        if !position.get("x").is_some_and(Value::is_number)
            || !position.get("y").is_some_and(Value::is_number)
        {
            return Err(format!("nodes[{index}].position x/y numbers are required"));
        }
    }

    let mut edge_ids = BTreeSet::new();
    for (index, edge) in edges.iter().enumerate() {
        let edge_id = required_str(edge, "id")
            .map_err(|err| format!("edges[{index}].{err}"))?
            .to_string();
        if !edge_ids.insert(edge_id.clone()) {
            return Err(format!("duplicate canvas edge id: {edge_id}"));
        }
        let source = required_str(edge, "source").map_err(|err| format!("edges[{index}].{err}"))?;
        let target = required_str(edge, "target").map_err(|err| format!("edges[{index}].{err}"))?;
        if !node_ids.contains(source) {
            return Err(format!(
                "edges[{index}].source references unknown node: {source}"
            ));
        }
        if !node_ids.contains(target) {
            return Err(format!(
                "edges[{index}].target references unknown node: {target}"
            ));
        }
    }
    Ok(graph_id)
}

fn validate_model_run(job_id: &str, model_run: &Value) -> Result<(), String> {
    if required_str(model_run, "schema_version")? != "model_run.v1" {
        return Err(String::from(
            "model_run.schema_version must be model_run.v1",
        ));
    }
    required_str(model_run, "model_run_id")?;
    if required_str(model_run, "job_id")? != job_id {
        return Err(String::from(
            "model_run job_id does not match completed job",
        ));
    }
    required_str(model_run, "model_key")?;
    required_str(model_run, "model_version")?;
    required_hash(model_run, "parameter_hash")?;
    required_hash(model_run, "input_hash")?;
    if !model_run
        .get("quality_metrics")
        .is_some_and(Value::is_object)
    {
        return Err(String::from("model_run.quality_metrics object is required"));
    }
    if !model_run.get("warnings").is_some_and(Value::is_array) {
        return Err(String::from("model_run.warnings array is required"));
    }
    if !model_run.get("evidence_refs").is_some_and(Value::is_array) {
        return Err(String::from("model_run.evidence_refs array is required"));
    }
    Ok(())
}

fn normalize_optional_project_id(project_id: Option<&str>) -> Result<Option<String>, String> {
    match project_id.map(str::trim).filter(|value| !value.is_empty()) {
        Some(value) => {
            if value.contains('/') || value.contains('\\') {
                return Err(String::from("project_id must not contain path separators"));
            }
            Ok(Some(value.to_string()))
        }
        None => Ok(None),
    }
}

fn ensure_project_exists(conn: &Connection, project_id: Option<&str>) -> Result<(), String> {
    let Some(project_id) = project_id else {
        return Ok(());
    };
    let exists: Option<String> = conn
        .query_row(
            "SELECT id FROM projects WHERE id = ?1",
            [project_id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|err| format!("read project failed: {err}"))?;
    if exists.is_none() {
        return Err(format!("project not found: {project_id}"));
    }
    Ok(())
}

fn project_snapshot(conn: &Connection, project_id: &str) -> Result<Value, String> {
    conn.query_row(
        "SELECT id, name, created_at, updated_at FROM projects WHERE id = ?1",
        [project_id],
        |row| {
            Ok(json!({
                "project_id": row.get::<_, String>(0)?,
                "name": row.get::<_, String>(1)?,
                "created_at": row.get::<_, String>(2)?,
                "updated_at": row.get::<_, String>(3)?,
            }))
        },
    )
    .optional()
    .map_err(|err| format!("read project failed: {err}"))?
    .ok_or_else(|| format!("project not found: {project_id}"))
}

fn canvas_graph_snapshot(conn: &Connection, graph_id: &str) -> Result<Value, String> {
    conn.query_row(
        "SELECT id, project_id, schema_version, graph_json, created_at, updated_at
         FROM canvas_graphs WHERE id = ?1",
        [graph_id],
        |row| {
            let graph_json: String = row.get(3)?;
            Ok(json!({
                "graph_id": row.get::<_, String>(0)?,
                "project_id": row.get::<_, Option<String>>(1)?,
                "schema_version": row.get::<_, String>(2)?,
                "graph": serde_json::from_str::<Value>(&graph_json).unwrap_or(Value::Null),
                "created_at": row.get::<_, String>(4)?,
                "updated_at": row.get::<_, String>(5)?,
            }))
        },
    )
    .optional()
    .map_err(|err| format!("read canvas graph failed: {err}"))?
    .ok_or_else(|| format!("canvas graph not found: {graph_id}"))
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
    let model_runs = model_runs_for_job(conn, job_id)?;
    let event_count = event_count(conn, job_id)?;
    Ok(json!({
        "job": job,
        "artifacts": artifacts,
        "model_runs": model_runs,
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

fn model_runs_for_job(conn: &Connection, job_id: &str) -> Result<Vec<Value>, String> {
    let mut stmt = conn
        .prepare("SELECT run_json FROM model_runs WHERE job_id = ?1 ORDER BY created_at, id")
        .map_err(|err| format!("prepare model runs query failed: {err}"))?;
    let rows = stmt
        .query_map([job_id], |row| {
            let run_json: String = row.get(0)?;
            Ok(serde_json::from_str::<Value>(&run_json).unwrap_or(Value::Null))
        })
        .map_err(|err| format!("query model runs failed: {err}"))?;
    let mut model_runs = Vec::new();
    for row in rows {
        model_runs.push(row.map_err(|err| format!("read model run row failed: {err}"))?);
    }
    Ok(model_runs)
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

fn required_array<'a>(value: &'a Value, key: &str) -> Result<&'a Vec<Value>, String> {
    value
        .get(key)
        .and_then(Value::as_array)
        .ok_or_else(|| format!("{key} array is required"))
}

fn required_hash<'a>(value: &'a Value, key: &str) -> Result<&'a str, String> {
    let text = required_str(value, key)?;
    let Some(hex) = text.strip_prefix("sha256:") else {
        return Err(format!("{key} must be a sha256 hash"));
    };
    if hex.len() != 64 || !hex.chars().all(|ch| ch.is_ascii_hexdigit()) {
        return Err(format!("{key} must be a sha256 hash"));
    }
    Ok(text)
}
