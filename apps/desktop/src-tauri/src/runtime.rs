use chrono::Utc;
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::Duration;
use uuid::Uuid;

use crate::path_sandbox;
use crate::store::DesktopStore;
use crate::worker::SourceWorker;

#[derive(Clone, Debug)]
pub struct DesktopRuntime {
    base_dir: PathBuf,
    repo_root: PathBuf,
    store: DesktopStore,
    worker_timeout: Duration,
    worker_python_path: Option<PathBuf>,
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
        let store = DesktopStore::open(&base_dir)?;
        Ok(Self {
            base_dir,
            repo_root,
            store,
            worker_timeout,
            worker_python_path: None,
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

    pub fn default_runtime() -> Result<Self, String> {
        let repo_root = repo_root();
        let base_dir = std::env::var("AUTOWATERSIMU_DESKTOP_RUNTIME_DIR")
            .map(PathBuf::from)
            .unwrap_or_else(|_| repo_root.join("tmp").join("desktop-runtime"));
        Self::new(base_dir, repo_root)
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

    pub fn compute_job_create(&self, request_json: &str) -> Result<Value, String> {
        self.store.create_job(request_json)
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

    pub fn compute_job_list(&self) -> Result<Value, String> {
        self.store.list_jobs()
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
