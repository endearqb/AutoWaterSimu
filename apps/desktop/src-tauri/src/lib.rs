pub mod commands;
pub mod migrations;
pub mod path_sandbox;
pub mod runtime;
pub mod store;
pub mod worker;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::worker_self_check,
            commands::compute_job_create,
            commands::compute_job_run,
            commands::compute_job_get,
            commands::compute_job_list,
            commands::artifact_export,
            commands::support_bundle_create
        ])
        .run(tauri::generate_context!())
        .expect("error while running AutoWaterSimu Desktop");
}

#[cfg(test)]
mod tests {
    use rusqlite::Connection;
    use serde_json::{json, Value};
    use std::fs;
    use std::time::Duration;
    use tempfile::TempDir;

    use super::migrations::{
        apply_migrations, migration_names, rollback_all, MIGRATION_0001_UP, MIGRATION_0002_UP,
    };
    use super::path_sandbox::safe_relative_path;
    use super::runtime::{repo_root, DesktopRuntime};

    fn valid_job_json() -> String {
        fs::read_to_string(
            repo_root()
                .join("contracts")
                .join("examples")
                .join("valid")
                .join("material_balance_minimal.compute_job.v1.json"),
        )
        .expect("valid compute job fixture should exist")
    }

    fn runtime() -> (TempDir, DesktopRuntime) {
        let temp = tempfile::tempdir().expect("tempdir");
        let runtime = DesktopRuntime::new(temp.path().to_path_buf(), repo_root()).expect("runtime");
        (temp, runtime)
    }

    fn event_types(runtime: &DesktopRuntime, job_id: &str) -> Vec<String> {
        runtime
            .store()
            .events_for_job(job_id)
            .unwrap()
            .into_iter()
            .map(|event| event["event_type"].as_str().unwrap().to_string())
            .collect()
    }

    #[test]
    fn migrations_declare_and_apply_required_tables() {
        let names = migration_names();
        assert_eq!(
            names,
            vec!["0001_desktop_job_store", "0002_desktop_runtime_foundation"]
        );
        for table in [
            "projects",
            "compute_jobs",
            "compute_job_events",
            "artifacts",
        ] {
            assert!(MIGRATION_0001_UP.contains(&format!("CREATE TABLE IF NOT EXISTS {table}")));
        }
        for table in [
            "canvas_graphs",
            "process_graphs",
            "model_runs",
            "support_bundles",
            "settings",
            "recent_files",
        ] {
            assert!(MIGRATION_0002_UP.contains(&format!("CREATE TABLE IF NOT EXISTS {table}")));
        }

        let conn = Connection::open_in_memory().unwrap();
        apply_migrations(&conn).unwrap();
        for table in [
            "schema_migrations",
            "projects",
            "compute_jobs",
            "compute_job_events",
            "artifacts",
            "canvas_graphs",
            "process_graphs",
            "model_runs",
            "support_bundles",
            "settings",
            "recent_files",
        ] {
            let count: i64 = conn
                .query_row(
                    "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?1",
                    [table],
                    |row| row.get(0),
                )
                .unwrap();
            assert_eq!(count, 1, "missing table {table}");
        }
        rollback_all(&conn).unwrap();
    }

    #[test]
    fn store_can_create_get_and_list_jobs() {
        let (_temp, runtime) = runtime();
        let created = runtime.compute_job_create(&valid_job_json()).unwrap();
        assert_eq!(created["job"]["status"], "queued");
        assert!(created["job"]["input_hash"].as_str().unwrap().len() >= 64);
        assert_eq!(created["event_count"], 2);

        let fetched = runtime
            .compute_job_get("job_material_balance_minimal")
            .unwrap();
        assert_eq!(fetched["job"]["job_id"], "job_material_balance_minimal");

        let listed = runtime.compute_job_list().unwrap();
        assert_eq!(listed["count"], 1);

        let duplicate = runtime.compute_job_create(&valid_job_json()).unwrap_err();
        assert!(duplicate.contains("compute_job already exists"));
        assert!(!duplicate.contains("UNIQUE constraint"));
    }

    #[test]
    fn worker_self_check_smoke_returns_json() {
        let (_temp, runtime) = runtime();
        let result = runtime.worker_self_check().unwrap();
        assert_eq!(result["status"], "ok");
        assert_eq!(result["self_check"]["minimal_job_status"]["ok"], true);
    }

    #[test]
    fn compute_job_run_succeeds_and_records_artifact() {
        let (_temp, runtime) = runtime();
        runtime.compute_job_create(&valid_job_json()).unwrap();
        let result = runtime
            .compute_job_run("job_material_balance_minimal")
            .unwrap();

        assert_eq!(result["job"]["status"], "succeeded");
        assert!(result["job"]["result_hash"]
            .as_str()
            .unwrap()
            .starts_with("sha256:"));
        assert_eq!(result["artifacts"].as_array().unwrap().len(), 1);
        let object_key = result["artifacts"][0]["object_key"].as_str().unwrap();
        assert!(runtime
            .base_dir()
            .join("artifacts")
            .join(object_key)
            .is_file());
        assert_eq!(
            event_types(&runtime, "job_material_balance_minimal"),
            vec![
                "job.created",
                "job.queued",
                "job.running",
                "artifact.recorded",
                "job.succeeded"
            ]
        );
    }

    #[test]
    fn terminal_job_cannot_be_rerun() {
        let (_temp, runtime) = runtime();
        runtime.compute_job_create(&valid_job_json()).unwrap();
        runtime
            .compute_job_run("job_material_balance_minimal")
            .unwrap();
        let before = event_types(&runtime, "job_material_balance_minimal");

        let error = runtime
            .compute_job_run("job_material_balance_minimal")
            .unwrap_err();
        let after = event_types(&runtime, "job_material_balance_minimal");

        assert!(error.contains("job cannot be run from status: succeeded"));
        assert_eq!(before, after);
        assert_eq!(
            runtime
                .compute_job_get("job_material_balance_minimal")
                .unwrap()["job"]["status"],
            "succeeded"
        );
    }

    #[test]
    fn compute_job_run_failed_result_records_readable_error() {
        let (_temp, runtime) = runtime();
        let mut job: Value = serde_json::from_str(&valid_job_json()).unwrap();
        job["payload"]["parameters"]["tolerance"] = json!(0.1);
        runtime.compute_job_create(&job.to_string()).unwrap();
        let result = runtime
            .compute_job_run("job_material_balance_minimal")
            .unwrap();

        assert_eq!(result["job"]["status"], "failed");
        assert!(result["job"]["error_message"]
            .as_str()
            .unwrap()
            .contains("validation failed"));
    }

    #[test]
    fn worker_spawn_failure_records_failed_terminal_status() {
        let temp = tempfile::tempdir().unwrap();
        let runtime = DesktopRuntime::new_with_worker_python(
            temp.path().to_path_buf(),
            repo_root(),
            Duration::from_secs(1),
            temp.path().join("missing-python.exe"),
        )
        .unwrap();
        runtime.compute_job_create(&valid_job_json()).unwrap();
        let result = runtime
            .compute_job_run("job_material_balance_minimal")
            .unwrap();

        assert_eq!(result["job"]["status"], "failed");
        assert_eq!(result["job"]["error_code"], "WORKER_FAILED");
        assert!(result["job"]["error_message"]
            .as_str()
            .unwrap()
            .contains("spawn worker failed"));
        assert_eq!(
            event_types(&runtime, "job_material_balance_minimal"),
            vec!["job.created", "job.queued", "job.running", "job.failed"]
        );
    }

    #[test]
    fn worker_invalid_stdout_records_failed_terminal_status() {
        let temp = tempfile::tempdir().unwrap();
        let fake_worker = temp.path().join("fake_worker.py");
        fs::write(
            &fake_worker,
            "import sys\nif '--stdio-jsonrpc' in sys.argv:\n    print('not-json')\nelse:\n    print('{\"status\":\"ok\"}')\n",
        )
        .unwrap();
        let python_path = repo_root()
            .join("backend")
            .join(".venv")
            .join("Scripts")
            .join("python.exe");
        let runtime = DesktopRuntime::new_with_worker_process(
            temp.path().to_path_buf(),
            repo_root(),
            Duration::from_secs(3),
            python_path,
            fake_worker,
        )
        .unwrap();
        runtime.compute_job_create(&valid_job_json()).unwrap();
        let result = runtime
            .compute_job_run("job_material_balance_minimal")
            .unwrap();

        assert_eq!(result["job"]["status"], "failed");
        assert_eq!(result["job"]["error_code"], "WORKER_FAILED");
        assert!(result["job"]["error_message"]
            .as_str()
            .unwrap()
            .contains("worker JSON-RPC stdout is not JSON"));
        assert_eq!(
            event_types(&runtime, "job_material_balance_minimal"),
            vec!["job.created", "job.queued", "job.running", "job.failed"]
        );
    }

    #[test]
    fn compute_job_run_timeout_records_terminal_status() {
        let temp = tempfile::tempdir().unwrap();
        let runtime = DesktopRuntime::new_with_timeout(
            temp.path().to_path_buf(),
            repo_root(),
            Duration::from_millis(1),
        )
        .unwrap();
        runtime.compute_job_create(&valid_job_json()).unwrap();
        let result = runtime
            .compute_job_run("job_material_balance_minimal")
            .unwrap();
        assert_eq!(result["job"]["status"], "timed_out");
        assert_eq!(result["job"]["error_code"], "TIMEOUT");
        assert_eq!(
            event_types(&runtime, "job_material_balance_minimal"),
            vec!["job.created", "job.queued", "job.running", "job.timed_out"]
        );
    }

    #[test]
    fn artifact_export_is_limited_to_runtime_sandbox() {
        let (_temp, runtime) = runtime();
        runtime.compute_job_create(&valid_job_json()).unwrap();
        let result = runtime
            .compute_job_run("job_material_balance_minimal")
            .unwrap();
        let artifact_id = result["artifacts"][0]["artifact_id"].as_str().unwrap();

        let exported = runtime
            .artifact_export(artifact_id, "manual/job-1")
            .unwrap();
        assert_eq!(exported["status"], "exported");
        assert!(runtime.artifact_export(artifact_id, "../escape").is_err());
        assert!(runtime.artifact_export(artifact_id, "C:/escape").is_err());
        assert!(runtime
            .artifact_export(artifact_id, r"\\server\share")
            .is_err());
        assert!(runtime.artifact_export(artifact_id, "").is_err());
    }

    #[test]
    fn path_sandbox_rejects_unsafe_paths() {
        assert!(safe_relative_path("exports/job").is_ok());
        assert!(safe_relative_path("../job").is_err());
        assert!(safe_relative_path("C:/job").is_err());
        assert!(safe_relative_path(r"\\server\share").is_err());
        assert!(safe_relative_path("").is_err());
    }

    #[test]
    fn support_bundle_excludes_artifact_contents() {
        let (_temp, runtime) = runtime();
        runtime.compute_job_create(&valid_job_json()).unwrap();
        runtime
            .compute_job_run("job_material_balance_minimal")
            .unwrap();
        let bundle = runtime
            .support_bundle_create("job_material_balance_minimal")
            .unwrap();
        let path = runtime
            .base_dir()
            .join("support_bundles")
            .join(bundle["object_key"].as_str().unwrap());
        let text = fs::read_to_string(path).unwrap();
        let payload: Value = serde_json::from_str(&text).unwrap();
        assert_eq!(payload["redaction"]["artifact_contents_included"], false);
        assert!(payload["artifacts"].is_array());
        assert!(payload["events"]
            .as_array()
            .unwrap()
            .iter()
            .any(|event| event["event_type"] == "support_bundle.created"));
        assert!(!text.contains("\"timestamps\""));
    }
}
