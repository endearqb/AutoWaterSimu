use chrono::Utc;
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::collections::BTreeSet;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::Duration;
use uuid::Uuid;

use crate::path_sandbox;
use crate::store::DesktopStore;
use crate::worker::SourceWorker;

pub const DESKTOP_WORKER_EXE_ENV: &str = "AUTOWATERSIMU_DESKTOP_WORKER_EXE";
pub const PACKAGED_WORKER_RESOURCE_RELATIVE_PATH: &str =
    "simulation-worker/simulation-worker-x86_64-pc-windows-msvc.exe";
const PROJECT_PACKAGE_FILE_SUFFIX: &str = ".autowatersimu-project.json";

#[derive(Clone, Debug)]
pub struct DesktopRuntime {
    base_dir: PathBuf,
    repo_root: PathBuf,
    store: DesktopStore,
    worker_timeout: Duration,
    worker_python_path: Option<PathBuf>,
    worker_cli_path: Option<PathBuf>,
    worker_exe_path: Option<PathBuf>,
}

impl DesktopRuntime {
    pub fn new(base_dir: PathBuf, repo_root: PathBuf) -> Result<Self, String> {
        Self::new_with_timeout(base_dir, repo_root, Duration::from_secs(120))
    }

    pub fn new_with_timeout(
        base_dir: PathBuf,
        repo_root: PathBuf,
        worker_timeout: Duration,
    ) -> Result<Self, String> {
        fs::create_dir_all(base_dir.join("artifacts"))
            .map_err(|err| format!("create artifacts dir failed: {err}"))?;
        fs::create_dir_all(base_dir.join("exports"))
            .map_err(|err| format!("create exports dir failed: {err}"))?;
        fs::create_dir_all(base_dir.join("support_bundles"))
            .map_err(|err| format!("create support_bundles dir failed: {err}"))?;
        fs::create_dir_all(base_dir.join("backups"))
            .map_err(|err| format!("create backups dir failed: {err}"))?;
        let store = DesktopStore::open(&base_dir)?;
        Ok(Self {
            base_dir,
            repo_root,
            store,
            worker_timeout,
            worker_python_path: None,
            worker_cli_path: None,
            worker_exe_path: None,
        })
    }

    pub fn new_with_worker_python(
        base_dir: PathBuf,
        repo_root: PathBuf,
        worker_timeout: Duration,
        worker_python_path: PathBuf,
    ) -> Result<Self, String> {
        let mut runtime = Self::new_with_timeout(base_dir, repo_root, worker_timeout)?;
        runtime.worker_python_path = Some(worker_python_path);
        Ok(runtime)
    }

    pub fn new_with_worker_process(
        base_dir: PathBuf,
        repo_root: PathBuf,
        worker_timeout: Duration,
        worker_python_path: PathBuf,
        worker_cli_path: PathBuf,
    ) -> Result<Self, String> {
        let mut runtime =
            Self::new_with_worker_python(base_dir, repo_root, worker_timeout, worker_python_path)?;
        runtime.worker_cli_path = Some(worker_cli_path);
        Ok(runtime)
    }

    pub fn new_with_packaged_worker(
        base_dir: PathBuf,
        repo_root: PathBuf,
        worker_timeout: Duration,
        worker_exe_path: PathBuf,
    ) -> Result<Self, String> {
        let mut runtime = Self::new_with_timeout(base_dir, repo_root, worker_timeout)?;
        runtime.worker_exe_path = Some(worker_exe_path);
        Ok(runtime)
    }

    pub fn default_runtime() -> Result<Self, String> {
        let repo_root = repo_root();
        let base_dir = std::env::var("AUTOWATERSIMU_DESKTOP_RUNTIME_DIR")
            .map(PathBuf::from)
            .unwrap_or_else(|_| repo_root.join("tmp").join("desktop-runtime"));
        let mut runtime = Self::new(base_dir, repo_root)?;
        if let Ok(worker_exe_path) = std::env::var(DESKTOP_WORKER_EXE_ENV) {
            let worker_exe_path = worker_exe_path.trim();
            if !worker_exe_path.is_empty() {
                runtime.worker_exe_path = Some(PathBuf::from(worker_exe_path));
            }
        }
        Ok(runtime)
    }

    pub fn base_dir(&self) -> &Path {
        &self.base_dir
    }

    pub fn store(&self) -> &DesktopStore {
        &self.store
    }

    pub fn worker_self_check(&self) -> Result<Value, String> {
        let worker = self.source_worker();
        let (value, stderr_tail) = worker.self_check()?;
        Ok(json!({
            "status": "ok",
            "self_check": value,
            "stderr_tail": stderr_tail
        }))
    }

    pub fn project_create(&self, name: &str) -> Result<Value, String> {
        self.store.create_project(name)
    }

    pub fn project_get(&self, project_id: &str) -> Result<Value, String> {
        self.store
            .get_project(require_non_empty(project_id, "project_id")?)
    }

    pub fn project_list(&self) -> Result<Value, String> {
        self.store.list_projects()
    }

    pub fn recent_file_list(&self) -> Result<Value, String> {
        self.store.list_recent_files()
    }

    pub fn project_export(&self, project_id: &str, target_dir: &str) -> Result<Value, String> {
        let project_id = require_non_empty(project_id, "project_id")?;
        let target_dir = require_non_empty(target_dir, "target_dir")?;
        let (payload, content_counts) = self.project_export_payload(project_id)?;
        let bytes = serde_json::to_vec_pretty(&payload)
            .map_err(|err| format!("serialize project export failed: {err}"))?;
        let target_dir_path = path_sandbox::join_under(&self.base_dir.join("exports"), target_dir)?;
        fs::create_dir_all(&target_dir_path)
            .map_err(|err| format!("create project export dir failed: {err}"))?;
        let filename = format!(
            "{}.autowatersimu-project.json",
            sanitize_path_part(project_id)
        );
        let target = target_dir_path.join(filename);
        fs::write(&target, &bytes).map_err(|err| format!("write project export failed: {err}"))?;
        Ok(json!({
            "project_id": project_id,
            "object_key": target.strip_prefix(self.base_dir.join("exports"))
                .map_err(|err| format!("project export path is outside exports: {err}"))?
                .to_string_lossy()
                .replace('\\', "/")
                .trim_start_matches('/')
                .to_string(),
            "exported_path": target.to_string_lossy(),
            "size_bytes": bytes.len(),
            "checksum": format!("sha256:{}", sha256_hex(&bytes)),
            "content_counts": content_counts,
            "target_kind": "sandbox",
            "status": "exported"
        }))
    }

    pub fn project_export_file(&self, project_id: &str, file_path: &str) -> Result<Value, String> {
        let project_id = require_non_empty(project_id, "project_id")?;
        let target = external_project_package_target(file_path)?;
        let (payload, content_counts) = self.project_export_payload(project_id)?;
        let bytes = serde_json::to_vec_pretty(&payload)
            .map_err(|err| format!("serialize project export failed: {err}"))?;
        fs::write(&target, &bytes)
            .map_err(|err| format!("write external project export failed: {err}"))?;
        let recent_file = self.store.record_recent_file(&target, "project_package")?;
        Ok(json!({
            "project_id": project_id,
            "object_key": Value::Null,
            "exported_path": target.to_string_lossy(),
            "size_bytes": bytes.len(),
            "checksum": format!("sha256:{}", sha256_hex(&bytes)),
            "content_counts": content_counts,
            "recent_file": recent_file,
            "target_kind": "external_file",
            "status": "exported"
        }))
    }

    pub fn project_import(&self, export_object_key: &str) -> Result<Value, String> {
        let export_object_key = require_non_empty(export_object_key, "export_object_key")?;
        let path = path_sandbox::join_under(&self.base_dir.join("exports"), export_object_key)?;
        if !path.is_file() {
            return Err(format!("project export file not found: {}", path.display()));
        }
        let text = fs::read_to_string(&path)
            .map_err(|err| format!("read project export failed: {err}"))?;
        let payload: Value = serde_json::from_str(&text)
            .map_err(|err| format!("project export JSON is invalid: {err}"))?;
        validate_project_export(&payload)?;
        let mut result = self.import_project_export_payload(&payload)?;
        result["object_key"] = json!(export_object_key);
        result["source_kind"] = json!("sandbox");
        Ok(result)
    }

    pub fn project_import_file(&self, file_path: &str) -> Result<Value, String> {
        let path = external_project_package_source(file_path)?;
        let text = fs::read_to_string(&path)
            .map_err(|err| format!("read external project export failed: {err}"))?;
        let payload: Value = serde_json::from_str(&text)
            .map_err(|err| format!("project export JSON is invalid: {err}"))?;
        validate_project_export(&payload)?;
        let mut result = self.import_project_export_payload(&payload)?;
        let recent_file = self.store.record_recent_file(&path, "project_package")?;
        result["object_key"] = Value::Null;
        result["source_path"] = json!(path.to_string_lossy());
        result["source_kind"] = json!("external_file");
        result["recent_file"] = recent_file;
        Ok(result)
    }

    pub fn project_import_recent(&self, recent_file_id: &str) -> Result<Value, String> {
        let recent_file_id = require_non_empty(recent_file_id, "recent_file_id")?;
        let recent_file = self.store.get_recent_file(recent_file_id)?;
        if recent_file.get("file_type").and_then(Value::as_str) != Some("project_package") {
            return Err(String::from("recent file is not a project package"));
        }
        let file_path = recent_file
            .get("file_path")
            .and_then(Value::as_str)
            .ok_or_else(|| String::from("recent file path is missing"))?;
        let mut result = self.project_import_file(file_path)?;
        result["recent_file_id"] = json!(recent_file_id);
        Ok(result)
    }

    fn project_export_payload(&self, project_id: &str) -> Result<(Value, Value), String> {
        let snapshot = self.store.project_package_snapshot(project_id)?;
        let payload = json!({
            "schema_version": "desktop_project_export.v1",
            "exported_at": utc_now(),
            "project": snapshot["project"],
            "contents": snapshot["contents"],
            "content_counts": snapshot["content_counts"]
        });
        Ok((payload, snapshot["content_counts"].clone()))
    }

    fn import_project_export_payload(&self, payload: &Value) -> Result<Value, String> {
        let imported = self.store.upsert_project_snapshot(&payload["project"])?;
        let project_id = imported["project_id"]
            .as_str()
            .ok_or_else(|| String::from("imported project_id is missing"))?;
        let canvas_graphs = payload
            .pointer("/contents/canvas_graphs")
            .and_then(Value::as_array)
            .cloned()
            .unwrap_or_default();
        let imported_canvas_graphs = self
            .store
            .import_canvas_graphs_for_project(project_id, &canvas_graphs)?;
        let content_counts = project_export_content_counts(&payload);
        let metadata_only_counts = json!({
            "compute_jobs": project_export_content_array_len(&payload, "compute_jobs"),
            "artifact_refs": project_export_content_array_len(&payload, "artifact_refs"),
            "support_bundle_refs": project_export_content_array_len(&payload, "support_bundle_refs")
        });
        Ok(json!({
            "project": imported,
            "content_counts": content_counts,
            "imported_counts": {
                "canvas_graphs": imported_canvas_graphs
            },
            "metadata_only_counts": metadata_only_counts,
            "imported_at": utc_now(),
            "status": "imported"
        }))
    }

    pub fn compute_job_create(&self, request_json: &str) -> Result<Value, String> {
        self.compute_job_create_for_project(request_json, None)
    }

    pub fn compute_job_create_for_project(
        &self,
        request_json: &str,
        project_id: Option<&str>,
    ) -> Result<Value, String> {
        self.store.create_job_for_project(request_json, project_id)
    }

    pub fn compute_job_run(&self, job_id: &str) -> Result<Value, String> {
        let job_id = require_non_empty(job_id, "job_id")?;
        self.store.mark_running(job_id)?;
        let job = self.store.job_input(job_id)?;
        let artifact_dir = self.base_dir.join("artifacts");
        let worker = self.source_worker();
        let (compute_result, stderr_tail) = match worker.run_job_jsonrpc(&job, &artifact_dir) {
            Ok(output) => output,
            Err(err) => return self.complete_failed_job(job_id, "WORKER_FAILED", &err, ""),
        };
        match self.persist_compute_result(job_id, &artifact_dir, &compute_result, &stderr_tail) {
            Ok(value) => Ok(value),
            Err(err) => self.complete_failed_job(job_id, "WORKER_FAILED", &err, &stderr_tail),
        }
    }

    pub fn compute_job_get(&self, job_id: &str) -> Result<Value, String> {
        self.store.get_job(require_non_empty(job_id, "job_id")?)
    }

    pub fn compute_job_cancel(&self, job_id: &str) -> Result<Value, String> {
        self.store.cancel_job(require_non_empty(job_id, "job_id")?)
    }

    pub fn compute_job_list(&self) -> Result<Value, String> {
        self.store.list_jobs()
    }

    pub fn canvas_graph_save(&self, graph_json: &str) -> Result<Value, String> {
        self.canvas_graph_save_for_project(graph_json, None)
    }

    pub fn canvas_graph_save_for_project(
        &self,
        graph_json: &str,
        project_id: Option<&str>,
    ) -> Result<Value, String> {
        self.store
            .save_canvas_graph_for_project(graph_json, project_id)
    }

    pub fn canvas_graph_load(&self, graph_id: &str) -> Result<Value, String> {
        self.store
            .load_canvas_graph(require_non_empty(graph_id, "graph_id")?)
    }

    pub fn process_graph_validate(&self, graph_json: &str) -> Result<Value, String> {
        Ok(validate_process_graph_json(graph_json))
    }

    pub fn artifact_export(&self, artifact_id: &str, target_dir: &str) -> Result<Value, String> {
        let artifact_id = require_non_empty(artifact_id, "artifact_id")?;
        let target_dir = require_non_empty(target_dir, "target_dir")?;
        let artifact = self.store.artifact(artifact_id)?;
        let object_key = artifact["object_key"]
            .as_str()
            .ok_or_else(|| String::from("artifact.object_key is missing"))?;
        let source = self
            .base_dir
            .join("artifacts")
            .join(path_sandbox::safe_relative_path(object_key)?);
        if !source.is_file() {
            return Err(format!("artifact file not found: {}", source.display()));
        }

        let target_dir_path = path_sandbox::join_under(&self.base_dir.join("exports"), target_dir)?;
        fs::create_dir_all(&target_dir_path)
            .map_err(|err| format!("create export dir failed: {err}"))?;
        let filename = Path::new(object_key)
            .file_name()
            .ok_or_else(|| String::from("artifact object_key has no filename"))?;
        let target = target_dir_path.join(filename);
        fs::copy(&source, &target).map_err(|err| format!("copy artifact failed: {err}"))?;
        Ok(json!({
            "artifact_id": artifact_id,
            "source_object_key": object_key,
            "exported_path": target.to_string_lossy(),
            "status": "exported"
        }))
    }

    pub fn artifact_export_csv(
        &self,
        artifact_id: &str,
        target_dir: &str,
    ) -> Result<Value, String> {
        let artifact_id = require_non_empty(artifact_id, "artifact_id")?;
        let target_dir = require_non_empty(target_dir, "target_dir")?;
        let artifact = self.store.artifact(artifact_id)?;
        let artifact_type = artifact["artifact_type"]
            .as_str()
            .ok_or_else(|| String::from("artifact.artifact_type is missing"))?;
        if artifact_type != "material_balance.time_series" {
            return Err(format!(
                "artifact cannot be exported as CSV: {artifact_type}"
            ));
        }
        let object_key = artifact["object_key"]
            .as_str()
            .ok_or_else(|| String::from("artifact.object_key is missing"))?;
        let source = self
            .base_dir
            .join("artifacts")
            .join(path_sandbox::safe_relative_path(object_key)?);
        if !source.is_file() {
            return Err(format!("artifact file not found: {}", source.display()));
        }

        let artifact_text =
            fs::read_to_string(&source).map_err(|err| format!("read artifact failed: {err}"))?;
        let payload: Value = serde_json::from_str(&artifact_text)
            .map_err(|err| format!("artifact JSON is invalid: {err}"))?;
        let csv = material_balance_time_series_csv(&payload)?;

        let target_dir_path = path_sandbox::join_under(&self.base_dir.join("exports"), target_dir)?;
        fs::create_dir_all(&target_dir_path)
            .map_err(|err| format!("create export dir failed: {err}"))?;
        let stem = Path::new(object_key)
            .file_stem()
            .and_then(|value| value.to_str())
            .ok_or_else(|| String::from("artifact object_key has no filename"))?;
        let target = target_dir_path.join(format!("{stem}.csv"));
        fs::write(&target, csv.as_bytes())
            .map_err(|err| format!("write CSV export failed: {err}"))?;
        Ok(json!({
            "artifact_id": artifact_id,
            "source_object_key": object_key,
            "exported_path": target.to_string_lossy(),
            "format": "csv",
            "row_count": payload
                .get("timestamps")
                .and_then(Value::as_array)
                .map(Vec::len)
                .unwrap_or(0),
            "status": "exported"
        }))
    }

    pub fn support_bundle_create(&self, job_id: &str) -> Result<Value, String> {
        let job_id = require_non_empty(job_id, "job_id")?;
        let job_snapshot = self.store.get_job(job_id)?;
        let bundle_id = format!("support_{}_{}", sanitize_path_part(job_id), Uuid::new_v4());
        let object_key = format!("{bundle_id}.json");
        self.store.append_job_event(
            job_id,
            "support_bundle.created",
            json!({"bundle_id": bundle_id, "object_key": object_key}),
        )?;
        let events = self.store.events_for_job(job_id)?;
        let payload = json!({
            "schema_version": "desktop_support_bundle.v1",
            "bundle_id": bundle_id,
            "job": job_snapshot["job"],
            "events": events,
            "artifacts": job_snapshot["artifacts"],
            "model_runs": job_snapshot["model_runs"],
            "versions": {
                "desktop_runtime": env!("CARGO_PKG_VERSION"),
                "migration_version": crate::migrations::migration_names().last().copied().unwrap_or("unknown")
            },
            "redaction": {
                "artifact_contents_included": false,
                "stderr_tail_only": true
            }
        });
        let bytes = serde_json::to_vec_pretty(&payload)
            .map_err(|err| format!("serialize support bundle failed: {err}"))?;
        let path = self.base_dir.join("support_bundles").join(&object_key);
        fs::write(&path, &bytes).map_err(|err| format!("write support bundle failed: {err}"))?;
        let checksum = format!("sha256:{}", sha256_hex(&bytes));
        self.store.insert_support_bundle(
            payload["bundle_id"].as_str().unwrap(),
            job_id,
            &object_key,
            bytes.len() as u64,
            &checksum,
            &json!({"artifact_contents_included": false}),
        )
    }

    pub fn project_backup(&self) -> Result<Value, String> {
        let backup_id = format!("backup_{}", Uuid::new_v4());
        let backup_dir = self.base_dir.join("backups").join(&backup_id);
        fs::create_dir_all(&backup_dir)
            .map_err(|err| format!("create backup dir failed: {err}"))?;

        let db_target = backup_dir.join("autowatersimu_desktop.sqlite");
        fs::copy(self.store.db_path(), &db_target)
            .map_err(|err| format!("copy SQLite backup failed: {err}"))?;
        copy_dir_if_exists(
            &self.base_dir.join("artifacts"),
            &backup_dir.join("artifacts"),
        )?;
        copy_dir_if_exists(
            &self.base_dir.join("support_bundles"),
            &backup_dir.join("support_bundles"),
        )?;

        let files = backup_files(&backup_dir)?;
        let size_bytes: u64 = files
            .iter()
            .filter_map(|file| file.get("size_bytes").and_then(Value::as_u64))
            .sum();
        let manifest = json!({
            "schema_version": "desktop_backup.v1",
            "backup_id": backup_id,
            "created_at": utc_now(),
            "desktop_runtime": env!("CARGO_PKG_VERSION"),
            "migration_version": crate::migrations::migration_names().last().copied().unwrap_or("unknown"),
            "contents": {
                "sqlite": "autowatersimu_desktop.sqlite",
                "artifacts_dir": "artifacts",
                "support_bundles_dir": "support_bundles"
            },
            "files": files
        });
        let manifest_bytes = serde_json::to_vec_pretty(&manifest)
            .map_err(|err| format!("serialize backup manifest failed: {err}"))?;
        fs::write(backup_dir.join("manifest.json"), &manifest_bytes)
            .map_err(|err| format!("write backup manifest failed: {err}"))?;
        Ok(json!({
            "backup_id": manifest["backup_id"],
            "object_key": format!("{}/manifest.json", manifest["backup_id"].as_str().unwrap()),
            "backup_path": backup_dir.to_string_lossy(),
            "size_bytes": size_bytes + manifest_bytes.len() as u64,
            "file_count": manifest["files"].as_array().map(Vec::len).unwrap_or(0),
            "checksum": format!("sha256:{}", sha256_hex(&manifest_bytes)),
            "created_at": manifest["created_at"],
            "status": "created"
        }))
    }

    pub fn project_restore(&self, backup_object_key: &str) -> Result<Value, String> {
        let backup_object_key = require_non_empty(backup_object_key, "backup_object_key")?;
        let manifest_path =
            path_sandbox::join_under(&self.base_dir.join("backups"), backup_object_key)?;
        if manifest_path.file_name().and_then(|value| value.to_str()) != Some("manifest.json") {
            return Err(String::from(
                "backup_object_key must point to manifest.json",
            ));
        }
        if !manifest_path.is_file() {
            return Err(format!(
                "backup manifest not found: {}",
                manifest_path.display()
            ));
        }

        let manifest_text = fs::read_to_string(&manifest_path)
            .map_err(|err| format!("read backup manifest failed: {err}"))?;
        let manifest: Value = serde_json::from_str(&manifest_text)
            .map_err(|err| format!("backup manifest JSON is invalid: {err}"))?;
        validate_backup_manifest(&manifest)?;
        let backup_dir = manifest_path
            .parent()
            .ok_or_else(|| String::from("backup manifest has no parent directory"))?;
        verify_backup_files(backup_dir, &manifest)?;

        let db_source = backup_dir.join("autowatersimu_desktop.sqlite");
        if !db_source.is_file() {
            return Err(String::from("backup SQLite file is missing"));
        }

        replace_runtime_dir(&self.base_dir, "artifacts", &backup_dir.join("artifacts"))?;
        replace_runtime_dir(
            &self.base_dir,
            "support_bundles",
            &backup_dir.join("support_bundles"),
        )?;
        fs::copy(&db_source, self.store.db_path())
            .map_err(|err| format!("restore SQLite backup failed: {err}"))?;
        self.store
            .with_conn(crate::migrations::apply_migrations)
            .map_err(|err| format!("apply migrations after restore failed: {err}"))?;

        Ok(json!({
            "backup_id": manifest["backup_id"],
            "object_key": backup_object_key,
            "restored_at": utc_now(),
            "status": "restored"
        }))
    }

    fn persist_compute_result(
        &self,
        job_id: &str,
        artifact_dir: &Path,
        result: &Value,
        stderr_tail: &str,
    ) -> Result<Value, String> {
        let raw_status = result
            .get("status")
            .and_then(Value::as_str)
            .unwrap_or("failed");
        let mut status = raw_status;
        let mut summary = result.get("summary").cloned().unwrap_or_else(|| json!({}));
        if !matches!(status, "succeeded" | "failed" | "cancelled" | "timed_out") {
            status = "failed";
            summary =
                json!({"error_message": format!("worker returned unknown status: {raw_status}")});
        }
        let result_bytes = serde_json::to_vec(result)
            .map_err(|err| format!("serialize compute result failed: {err}"))?;
        let result_hash = format!("sha256:{}", sha256_hex(&result_bytes));
        let worker_version = result
            .pointer("/runtime_audit/worker_version")
            .and_then(Value::as_str);

        if status == "succeeded" {
            for artifact in result
                .get("artifacts")
                .and_then(Value::as_array)
                .into_iter()
                .flatten()
            {
                verify_artifact_file(artifact_dir, artifact)?;
                self.store.insert_artifact(job_id, artifact)?;
            }
            for model_run in result
                .pointer("/runtime_audit/model_runs")
                .and_then(Value::as_array)
                .into_iter()
                .flatten()
            {
                self.store.insert_model_run(job_id, model_run)?;
            }
        }

        let error_message = if status == "succeeded" {
            None
        } else {
            summary
                .get("error_message")
                .and_then(Value::as_str)
                .or_else(|| {
                    result
                        .pointer("/quality/warnings/0")
                        .and_then(Value::as_str)
                })
                .or(Some("worker returned failed result"))
        };
        let error_code = match status {
            "succeeded" => None,
            "timed_out" => Some("TIMEOUT"),
            _ => Some("WORKER_FAILED"),
        };
        self.store.complete_job(
            job_id,
            status,
            &summary,
            Some(&result_hash),
            worker_version,
            error_code,
            error_message,
            Some(stderr_tail),
        )
    }

    fn complete_failed_job(
        &self,
        job_id: &str,
        error_code: &str,
        error_message: &str,
        stderr_tail: &str,
    ) -> Result<Value, String> {
        let status = if error_code == "TIMEOUT" {
            "timed_out"
        } else {
            "failed"
        };
        self.store.complete_job(
            job_id,
            status,
            &json!({"error_message": error_message}),
            None,
            None,
            Some(error_code),
            Some(error_message),
            Some(stderr_tail),
        )
    }

    fn source_worker(&self) -> SourceWorker {
        if let Some(exe_path) = &self.worker_exe_path {
            return SourceWorker::new_packaged(self.worker_timeout, exe_path.clone());
        }
        if let (Some(python_path), Some(cli_path)) =
            (&self.worker_python_path, &self.worker_cli_path)
        {
            return SourceWorker::new_with_python_and_cli(
                self.worker_timeout,
                python_path.clone(),
                cli_path.clone(),
            );
        }
        if let Some(python_path) = &self.worker_python_path {
            return SourceWorker::new_with_python(
                &self.repo_root,
                self.worker_timeout,
                python_path.clone(),
            );
        }
        SourceWorker::new(&self.repo_root, self.worker_timeout)
    }
}

pub fn utc_now() -> String {
    Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true)
}

pub fn sha256_hex(bytes: &[u8]) -> String {
    let digest = Sha256::digest(bytes);
    digest.iter().map(|byte| format!("{byte:02x}")).collect()
}

pub fn repo_root() -> PathBuf {
    let manifest = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    manifest
        .parent()
        .and_then(Path::parent)
        .and_then(Path::parent)
        .map(Path::to_path_buf)
        .unwrap_or(manifest)
}

fn verify_artifact_file(artifact_dir: &Path, artifact: &Value) -> Result<(), String> {
    let object_key = artifact
        .get("object_key")
        .and_then(Value::as_str)
        .ok_or_else(|| String::from("artifact.object_key is required"))?;
    let checksum = artifact
        .get("checksum")
        .and_then(Value::as_str)
        .ok_or_else(|| String::from("artifact.checksum is required"))?;
    let path = artifact_dir.join(path_sandbox::safe_relative_path(object_key)?);
    let bytes = fs::read(&path).map_err(|err| format!("read artifact file failed: {err}"))?;
    let actual = format!("sha256:{}", sha256_hex(&bytes));
    if actual != checksum {
        return Err(format!("artifact checksum mismatch for {object_key}"));
    }
    Ok(())
}

fn copy_dir_if_exists(source: &Path, target: &Path) -> Result<(), String> {
    if !source.exists() {
        return Ok(());
    }
    fs::create_dir_all(target).map_err(|err| format!("create backup subdir failed: {err}"))?;
    for entry in fs::read_dir(source).map_err(|err| format!("read source dir failed: {err}"))? {
        let entry = entry.map_err(|err| format!("read source dir entry failed: {err}"))?;
        let source_path = entry.path();
        let target_path = target.join(entry.file_name());
        if source_path.is_dir() {
            copy_dir_if_exists(&source_path, &target_path)?;
        } else if source_path.is_file() {
            if let Some(parent) = target_path.parent() {
                fs::create_dir_all(parent)
                    .map_err(|err| format!("create backup file parent failed: {err}"))?;
            }
            fs::copy(&source_path, &target_path)
                .map_err(|err| format!("copy backup file failed: {err}"))?;
        }
    }
    Ok(())
}

fn backup_files(backup_dir: &Path) -> Result<Vec<Value>, String> {
    let mut files = Vec::new();
    collect_backup_files(backup_dir, backup_dir, &mut files)?;
    files.sort_by(|left, right| {
        left["path"]
            .as_str()
            .unwrap_or("")
            .cmp(right["path"].as_str().unwrap_or(""))
    });
    Ok(files)
}

fn collect_backup_files(root: &Path, current: &Path, files: &mut Vec<Value>) -> Result<(), String> {
    for entry in fs::read_dir(current).map_err(|err| format!("read backup dir failed: {err}"))? {
        let entry = entry.map_err(|err| format!("read backup dir entry failed: {err}"))?;
        let path = entry.path();
        if path.is_dir() {
            collect_backup_files(root, &path, files)?;
            continue;
        }
        if !path.is_file() {
            continue;
        }
        let relative = path
            .strip_prefix(root)
            .map_err(|err| format!("strip backup root failed: {err}"))?
            .to_string_lossy()
            .replace('\\', "/");
        if relative == "manifest.json" {
            continue;
        }
        let bytes = fs::read(&path).map_err(|err| format!("read backup file failed: {err}"))?;
        files.push(json!({
            "path": relative,
            "size_bytes": bytes.len(),
            "checksum": format!("sha256:{}", sha256_hex(&bytes))
        }));
    }
    Ok(())
}

fn validate_backup_manifest(manifest: &Value) -> Result<(), String> {
    if manifest.get("schema_version").and_then(Value::as_str) != Some("desktop_backup.v1") {
        return Err(String::from(
            "backup manifest schema_version must be desktop_backup.v1",
        ));
    }
    require_object_str(manifest, "backup_id")?;
    let files = manifest
        .get("files")
        .and_then(Value::as_array)
        .ok_or_else(|| String::from("backup manifest files array is required"))?;
    if files.is_empty() {
        return Err(String::from("backup manifest files array cannot be empty"));
    }
    if !files.iter().any(|file| {
        file.get("path").and_then(Value::as_str) == Some("autowatersimu_desktop.sqlite")
    }) {
        return Err(String::from("backup manifest must include SQLite file"));
    }
    for file in files {
        require_object_str(file, "path")?;
        require_object_str(file, "checksum")?;
        if !file.get("size_bytes").is_some_and(Value::is_u64) {
            return Err(String::from("backup file size_bytes is required"));
        }
    }
    Ok(())
}

fn validate_project_export(payload: &Value) -> Result<(), String> {
    if payload.get("schema_version").and_then(Value::as_str) != Some("desktop_project_export.v1") {
        return Err(String::from(
            "project export schema_version must be desktop_project_export.v1",
        ));
    }
    require_object_str(payload, "exported_at")?;
    let project = payload
        .get("project")
        .filter(|value| value.is_object())
        .ok_or_else(|| String::from("project export project object is required"))?;
    require_object_str(project, "project_id")?;
    require_object_str(project, "name")?;
    require_object_str(project, "created_at")?;
    require_object_str(project, "updated_at")?;
    if let Some(contents) = payload.get("contents") {
        if !contents.is_object() {
            return Err(String::from("project export contents object is required"));
        }
        for key in [
            "compute_jobs",
            "canvas_graphs",
            "artifact_refs",
            "support_bundle_refs",
        ] {
            if contents.get(key).is_some_and(|value| !value.is_array()) {
                return Err(format!("project export contents.{key} must be an array"));
            }
        }
        if contents
            .get("redaction")
            .is_some_and(|value| !value.is_object())
        {
            return Err(String::from(
                "project export contents.redaction must be an object",
            ));
        }
    }
    Ok(())
}

fn project_export_content_counts(payload: &Value) -> Value {
    json!({
        "compute_jobs": project_export_content_array_len(payload, "compute_jobs"),
        "canvas_graphs": project_export_content_array_len(payload, "canvas_graphs"),
        "artifact_refs": project_export_content_array_len(payload, "artifact_refs"),
        "support_bundle_refs": project_export_content_array_len(payload, "support_bundle_refs")
    })
}

fn project_export_content_array_len(payload: &Value, key: &str) -> usize {
    payload
        .pointer(&format!("/contents/{key}"))
        .and_then(Value::as_array)
        .map(Vec::len)
        .unwrap_or(0)
}

fn external_project_package_source(file_path: &str) -> Result<PathBuf, String> {
    let path = external_project_package_path(file_path)?;
    let canonical_path = fs::canonicalize(&path)
        .map_err(|err| format!("canonicalize project package path failed: {err}"))?;
    if !canonical_path.is_file() {
        return Err(format!(
            "project package file not found: {}",
            path.display()
        ));
    }
    Ok(path)
}

fn external_project_package_target(file_path: &str) -> Result<PathBuf, String> {
    let path = external_project_package_path(file_path)?;
    let parent = path
        .parent()
        .ok_or_else(|| String::from("project package file_path has no parent directory"))?;
    let canonical_parent = fs::canonicalize(parent)
        .map_err(|err| format!("canonicalize project package parent failed: {err}"))?;
    if !canonical_parent.is_dir() {
        return Err(format!(
            "project package parent is not a directory: {}",
            canonical_parent.display()
        ));
    }
    Ok(path)
}

fn external_project_package_path(file_path: &str) -> Result<PathBuf, String> {
    let file_path = require_non_empty(file_path, "file_path")?;
    let path = PathBuf::from(file_path);
    if !path.is_absolute() {
        return Err(String::from("project package file_path must be absolute"));
    }
    let file_name = path
        .file_name()
        .and_then(|value| value.to_str())
        .ok_or_else(|| String::from("project package file_path has no filename"))?;
    if !file_name
        .to_ascii_lowercase()
        .ends_with(PROJECT_PACKAGE_FILE_SUFFIX)
    {
        return Err(format!(
            "project package file must end with {PROJECT_PACKAGE_FILE_SUFFIX}"
        ));
    }
    Ok(path)
}

fn verify_backup_files(backup_dir: &Path, manifest: &Value) -> Result<(), String> {
    let files = manifest
        .get("files")
        .and_then(Value::as_array)
        .ok_or_else(|| String::from("backup manifest files array is required"))?;
    for file in files {
        let relative = require_object_str(file, "path")?;
        let expected_checksum = require_object_str(file, "checksum")?;
        let path = backup_dir.join(path_sandbox::safe_relative_path(relative)?);
        let bytes = fs::read(&path).map_err(|err| format!("read backup file failed: {err}"))?;
        let actual_checksum = format!("sha256:{}", sha256_hex(&bytes));
        if actual_checksum != expected_checksum {
            return Err(format!("backup checksum mismatch for {relative}"));
        }
    }
    Ok(())
}

fn replace_runtime_dir(
    base_dir: &Path,
    dir_name: &str,
    backup_source: &Path,
) -> Result<(), String> {
    let target = base_dir.join(dir_name);
    ensure_runtime_child(base_dir, &target, dir_name)?;
    if target.exists() {
        fs::remove_dir_all(&target).map_err(|err| format!("clear runtime dir failed: {err}"))?;
    }
    fs::create_dir_all(&target).map_err(|err| format!("create runtime dir failed: {err}"))?;
    if backup_source.exists() {
        copy_dir_if_exists(backup_source, &target)?;
    }
    Ok(())
}

fn ensure_runtime_child(base_dir: &Path, target: &Path, dir_name: &str) -> Result<(), String> {
    if !matches!(dir_name, "artifacts" | "support_bundles") {
        return Err(String::from("unsupported runtime restore directory"));
    }
    let expected = base_dir.join(dir_name);
    if target != expected {
        return Err(String::from("runtime restore target mismatch"));
    }
    Ok(())
}

fn require_object_str<'a>(value: &'a Value, key: &str) -> Result<&'a str, String> {
    value
        .get(key)
        .and_then(Value::as_str)
        .filter(|text| !text.trim().is_empty())
        .ok_or_else(|| format!("{key} is required"))
}

fn validate_process_graph_json(graph_json: &str) -> Value {
    let mut errors = Vec::new();
    let mut warnings = Vec::new();
    let graph_json = graph_json.trim();
    if graph_json.is_empty() {
        push_validation_error(
            &mut errors,
            "GRAPH_JSON_REQUIRED",
            "$",
            "graph_json is required",
        );
        return process_validation_response(None, errors, warnings);
    }

    let graph: Value = match serde_json::from_str(graph_json) {
        Ok(value) => value,
        Err(err) => {
            push_validation_error(
                &mut errors,
                "GRAPH_JSON_INVALID",
                "$",
                format!("process_graph JSON is invalid: {err}"),
            );
            return process_validation_response(None, errors, warnings);
        }
    };
    let process_graph_id = non_empty_str(&graph, "process_graph_id").map(str::to_string);

    require_process_str(&graph, "schema_version", "$.schema_version", &mut errors);
    if graph.get("schema_version").and_then(Value::as_str) != Some("process_graph.v1") {
        push_validation_error(
            &mut errors,
            "SCHEMA_VERSION_INVALID",
            "$.schema_version",
            "schema_version must be process_graph.v1",
        );
    }
    require_process_str(
        &graph,
        "process_graph_id",
        "$.process_graph_id",
        &mut errors,
    );
    require_process_str(
        &graph,
        "source_canvas_graph_id",
        "$.source_canvas_graph_id",
        &mut errors,
    );
    if !graph
        .get("version")
        .and_then(Value::as_i64)
        .is_some_and(|value| value >= 1)
    {
        push_validation_error(
            &mut errors,
            "VERSION_INVALID",
            "$.version",
            "version must be an integer >= 1",
        );
    }

    validate_component_schema(&graph, &mut errors);
    let node_ids = validate_process_nodes(&graph, &mut errors);
    validate_process_edges(&graph, &node_ids, &mut errors);

    if let Some(existing_warnings) = graph
        .pointer("/validation/warnings")
        .and_then(Value::as_array)
    {
        for warning in existing_warnings {
            if let Some(warning) = warning.as_str() {
                warnings.push(warning.to_string());
            }
        }
    }

    process_validation_response(process_graph_id, errors, warnings)
}

fn validate_component_schema(graph: &Value, errors: &mut Vec<Value>) {
    let Some(component_schema) = graph.get("component_schema").and_then(Value::as_object) else {
        push_validation_error(
            errors,
            "COMPONENT_SCHEMA_REQUIRED",
            "$.component_schema",
            "component_schema object is required",
        );
        return;
    };
    require_process_str(
        graph.get("component_schema").unwrap(),
        "component_schema_id",
        "$.component_schema.component_schema_id",
        errors,
    );
    require_process_str(
        graph.get("component_schema").unwrap(),
        "unit",
        "$.component_schema.unit",
        errors,
    );
    let components = component_schema.get("components").and_then(Value::as_array);
    if !components.is_some_and(|items| {
        !items.is_empty()
            && items
                .iter()
                .all(|item| item.as_str().is_some_and(|text| !text.trim().is_empty()))
    }) {
        push_validation_error(
            errors,
            "COMPONENTS_INVALID",
            "$.component_schema.components",
            "components must be a non-empty string array",
        );
    }
}

fn validate_process_nodes(graph: &Value, errors: &mut Vec<Value>) -> BTreeSet<String> {
    let mut node_ids = BTreeSet::new();
    let Some(nodes) = graph.get("nodes").and_then(Value::as_array) else {
        push_validation_error(
            errors,
            "NODES_REQUIRED",
            "$.nodes",
            "nodes array is required",
        );
        return node_ids;
    };
    if nodes.len() < 2 {
        push_validation_error(
            errors,
            "NODES_TOO_FEW",
            "$.nodes",
            "nodes must contain at least two process nodes",
        );
    }
    for (index, node) in nodes.iter().enumerate() {
        let path = format!("$.nodes[{index}]");
        if let Some(node_id) =
            require_process_str(node, "node_id", format!("{path}.node_id"), errors)
        {
            if !node_ids.insert(node_id.to_string()) {
                push_validation_error(
                    errors,
                    "DUPLICATE_NODE_ID",
                    format!("{path}.node_id"),
                    format!("duplicate node_id: {node_id}"),
                );
            }
        }
        require_process_str(node, "node_type", format!("{path}.node_type"), errors);
        require_process_str(
            node,
            "process_unit_type",
            format!("{path}.process_unit_type"),
            errors,
        );
        if !node.get("ports").is_some_and(Value::is_array) {
            push_validation_error(
                errors,
                "NODE_PORTS_REQUIRED",
                format!("{path}.ports"),
                "ports array is required",
            );
        }
        if !node.get("model_binding").is_some_and(Value::is_object) {
            push_validation_error(
                errors,
                "NODE_MODEL_BINDING_REQUIRED",
                format!("{path}.model_binding"),
                "model_binding object is required",
            );
        }
        if !node.get("unit_metadata").is_some_and(Value::is_object) {
            push_validation_error(
                errors,
                "NODE_UNIT_METADATA_REQUIRED",
                format!("{path}.unit_metadata"),
                "unit_metadata object is required",
            );
        }
    }
    node_ids
}

fn validate_process_edges(graph: &Value, node_ids: &BTreeSet<String>, errors: &mut Vec<Value>) {
    let mut edge_ids = BTreeSet::new();
    let Some(edges) = graph.get("edges").and_then(Value::as_array) else {
        push_validation_error(
            errors,
            "EDGES_REQUIRED",
            "$.edges",
            "edges array is required",
        );
        return;
    };
    if edges.is_empty() {
        push_validation_error(
            errors,
            "EDGES_EMPTY",
            "$.edges",
            "edges must contain at least one process edge",
        );
    }
    for (index, edge) in edges.iter().enumerate() {
        let path = format!("$.edges[{index}]");
        if let Some(edge_id) =
            require_process_str(edge, "edge_id", format!("{path}.edge_id"), errors)
        {
            if !edge_ids.insert(edge_id.to_string()) {
                push_validation_error(
                    errors,
                    "DUPLICATE_EDGE_ID",
                    format!("{path}.edge_id"),
                    format!("duplicate edge_id: {edge_id}"),
                );
            }
        }
        let source = require_process_str(
            edge,
            "source_node_id",
            format!("{path}.source_node_id"),
            errors,
        );
        let target = require_process_str(
            edge,
            "target_node_id",
            format!("{path}.target_node_id"),
            errors,
        );
        if let Some(source) = source {
            if !node_ids.contains(source) {
                push_validation_error(
                    errors,
                    "EDGE_SOURCE_UNKNOWN",
                    format!("{path}.source_node_id"),
                    format!("source_node_id references unknown node: {source}"),
                );
            }
        }
        if let Some(target) = target {
            if !node_ids.contains(target) {
                push_validation_error(
                    errors,
                    "EDGE_TARGET_UNKNOWN",
                    format!("{path}.target_node_id"),
                    format!("target_node_id references unknown node: {target}"),
                );
            }
        }
        require_process_str(edge, "source_port", format!("{path}.source_port"), errors);
        require_process_str(edge, "target_port", format!("{path}.target_port"), errors);
        if !edge
            .get("flow_rate")
            .and_then(Value::as_f64)
            .is_some_and(|value| value >= 0.0)
        {
            push_validation_error(
                errors,
                "EDGE_FLOW_RATE_INVALID",
                format!("{path}.flow_rate"),
                "flow_rate must be a number >= 0",
            );
        }
        if !edge
            .get("concentration_transform")
            .is_some_and(Value::is_object)
        {
            push_validation_error(
                errors,
                "EDGE_CONCENTRATION_TRANSFORM_REQUIRED",
                format!("{path}.concentration_transform"),
                "concentration_transform object is required",
            );
        }
    }
}

fn require_process_str<'a>(
    value: &'a Value,
    key: &str,
    path: impl Into<String>,
    errors: &mut Vec<Value>,
) -> Option<&'a str> {
    let result = non_empty_str(value, key);
    if result.is_none() {
        push_validation_error(errors, "FIELD_REQUIRED", path, format!("{key} is required"));
    }
    result
}

fn non_empty_str<'a>(value: &'a Value, key: &str) -> Option<&'a str> {
    value
        .get(key)
        .and_then(Value::as_str)
        .filter(|text| !text.trim().is_empty())
}

fn push_validation_error(
    errors: &mut Vec<Value>,
    code: &str,
    path: impl Into<String>,
    message: impl Into<String>,
) {
    errors.push(json!({
        "code": code,
        "path": path.into(),
        "message": message.into()
    }));
}

fn process_validation_response(
    process_graph_id: Option<String>,
    errors: Vec<Value>,
    warnings: Vec<String>,
) -> Value {
    json!({
        "schema_version": "process_graph_validation.v1",
        "process_graph_id": process_graph_id,
        "status": if errors.is_empty() { "valid" } else { "invalid" },
        "errors": errors,
        "warnings": warnings
    })
}

fn material_balance_time_series_csv(payload: &Value) -> Result<String, String> {
    if payload.get("schema_version").and_then(Value::as_str)
        != Some("material_balance_time_series_artifact.v1")
    {
        return Err(String::from(
            "artifact schema_version must be material_balance_time_series_artifact.v1",
        ));
    }
    let timestamps = payload
        .get("timestamps")
        .and_then(Value::as_array)
        .ok_or_else(|| String::from("artifact.timestamps array is required"))?;

    let mut columns: Vec<(String, Vec<&Value>)> = Vec::new();
    columns.push(("time".to_string(), timestamps.iter().collect()));
    collect_series_columns("node", payload.get("node_data"), &mut columns);
    collect_series_columns("edge", payload.get("edge_data"), &mut columns);

    let mut lines = Vec::with_capacity(timestamps.len() + 1);
    lines.push(
        columns
            .iter()
            .map(|(header, _)| csv_escape(header))
            .collect::<Vec<_>>()
            .join(","),
    );

    for index in 0..timestamps.len() {
        lines.push(
            columns
                .iter()
                .map(|(_, series)| {
                    series
                        .get(index)
                        .map(|value| csv_escape(&csv_cell(value)))
                        .unwrap_or_default()
                })
                .collect::<Vec<_>>()
                .join(","),
        );
    }
    Ok(format!("{}\n", lines.join("\n")))
}

fn collect_series_columns<'a>(
    prefix: &str,
    group: Option<&'a Value>,
    columns: &mut Vec<(String, Vec<&'a Value>)>,
) {
    let Some(group_object) = group.and_then(Value::as_object) else {
        return;
    };
    let mut item_ids: Vec<&String> = group_object.keys().collect();
    item_ids.sort();

    for item_id in item_ids {
        let Some(item_object) = group_object.get(item_id).and_then(Value::as_object) else {
            continue;
        };
        let mut metric_keys = BTreeSet::new();
        for (metric_key, metric_value) in item_object {
            if metric_key == "label" || !metric_value.is_array() {
                continue;
            }
            metric_keys.insert(metric_key.as_str());
        }
        for metric_key in metric_keys {
            if let Some(series) = item_object.get(metric_key).and_then(Value::as_array) {
                columns.push((
                    format!("{prefix}.{item_id}.{metric_key}"),
                    series.iter().collect(),
                ));
            }
        }
    }
}

fn csv_cell(value: &Value) -> String {
    match value {
        Value::Null => String::new(),
        Value::Bool(value) => value.to_string(),
        Value::Number(value) => value.to_string(),
        Value::String(value) => value.clone(),
        _ => value.to_string(),
    }
}

fn csv_escape(value: &str) -> String {
    if value.contains(',') || value.contains('"') || value.contains('\n') || value.contains('\r') {
        format!("\"{}\"", value.replace('"', "\"\""))
    } else {
        value.to_string()
    }
}

fn require_non_empty<'a>(value: &'a str, name: &str) -> Result<&'a str, String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Err(format!("{name} is required"));
    }
    Ok(trimmed)
}

fn sanitize_path_part(value: &str) -> String {
    value
        .chars()
        .map(|ch| {
            if ch.is_ascii_alphanumeric() || ch == '-' || ch == '_' {
                ch
            } else {
                '_'
            }
        })
        .collect()
}
