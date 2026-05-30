pub mod commands;
pub mod migrations;
pub mod path_sandbox;
pub mod runtime;
pub mod store;
pub mod worker;

use crate::runtime::{DESKTOP_WORKER_EXE_ENV, PACKAGED_WORKER_RESOURCE_RELATIVE_PATH};
use tauri::{path::BaseDirectory, Manager};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            configure_packaged_worker_env_from_resources(app);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::worker_self_check,
            commands::project_create,
            commands::project_export,
            commands::project_export_file,
            commands::project_get,
            commands::project_import,
            commands::project_import_file,
            commands::project_import_recent,
            commands::project_list,
            commands::recent_file_list,
            commands::compute_job_create,
            commands::compute_job_run,
            commands::compute_job_get,
            commands::compute_job_cancel,
            commands::compute_job_list,
            commands::canvas_graph_save,
            commands::canvas_graph_load,
            commands::process_graph_validate,
            commands::artifact_export,
            commands::artifact_export_csv,
            commands::project_backup,
            commands::project_restore,
            commands::support_bundle_create
        ])
        .run(tauri::generate_context!())
        .expect("error while running AutoWaterSimu Desktop");
}

fn configure_packaged_worker_env_from_resources<R: tauri::Runtime>(app: &tauri::App<R>) {
    if std::env::var(DESKTOP_WORKER_EXE_ENV)
        .map(|value| !value.trim().is_empty())
        .unwrap_or(false)
    {
        return;
    }

    if let Ok(worker_exe) = app.path().resolve(
        PACKAGED_WORKER_RESOURCE_RELATIVE_PATH,
        BaseDirectory::Resource,
    ) {
        if worker_exe.is_file() {
            std::env::set_var(DESKTOP_WORKER_EXE_ENV, worker_exe);
        }
    }
}

#[cfg(test)]
mod tests {
    use rusqlite::Connection;
    use serde_json::{json, Value};
    use std::time::Duration;
    use std::{env, fs};
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

    fn valid_canvas_graph_json() -> String {
        fs::read_to_string(
            repo_root()
                .join("contracts")
                .join("examples")
                .join("valid")
                .join("material_balance_3_node.canvas_graph.v1.json"),
        )
        .expect("valid canvas graph fixture should exist")
    }

    fn valid_process_graph_json() -> String {
        fs::read_to_string(
            repo_root()
                .join("contracts")
                .join("examples")
                .join("valid")
                .join("material_balance_3_node.process_graph.v1.json"),
        )
        .expect("valid process graph fixture should exist")
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
    fn project_registry_create_get_and_list() {
        let (_temp, runtime) = runtime();
        let project = runtime.project_create("Desktop Smoke Project").unwrap();
        let project_id = project["project_id"].as_str().unwrap();
        assert!(project_id.starts_with("project_"));
        assert_eq!(project["name"], "Desktop Smoke Project");

        let fetched = runtime.project_get(project_id).unwrap();
        assert_eq!(fetched["project_id"], project_id);

        let listed = runtime.project_list().unwrap();
        assert_eq!(listed["count"], 1);
        assert_eq!(listed["projects"][0]["project_id"], project_id);
        assert!(runtime.project_create(" ").is_err());
        assert!(runtime.project_get("missing_project").is_err());
    }

    #[test]
    fn jobs_and_canvas_graphs_can_attach_to_project() {
        let (_temp, runtime) = runtime();
        let project = runtime.project_create("Desktop Smoke Project").unwrap();
        let project_id = project["project_id"].as_str().unwrap();

        let created = runtime
            .compute_job_create_for_project(&valid_job_json(), Some(project_id))
            .unwrap();
        assert_eq!(created["job"]["project_id"], project_id);
        assert!(runtime
            .compute_job_create_for_project(&valid_job_json(), Some("missing_project"))
            .unwrap_err()
            .contains("project not found"));

        let saved = runtime
            .canvas_graph_save_for_project(&valid_canvas_graph_json(), Some(project_id))
            .unwrap();
        assert_eq!(saved["project_id"], project_id);
        assert!(runtime
            .canvas_graph_save_for_project(&valid_canvas_graph_json(), Some("missing_project"))
            .unwrap_err()
            .contains("project not found"));
    }

    #[test]
    fn project_export_import_is_limited_to_runtime_sandbox() {
        let (_temp, runtime) = runtime();
        let project = runtime.project_create("Desktop Smoke Project").unwrap();
        let project_id = project["project_id"].as_str().unwrap();
        runtime
            .compute_job_create_for_project(&valid_job_json(), Some(project_id))
            .unwrap();
        runtime
            .compute_job_run("job_material_balance_minimal")
            .unwrap();
        runtime
            .support_bundle_create("job_material_balance_minimal")
            .unwrap();
        runtime
            .canvas_graph_save_for_project(&valid_canvas_graph_json(), Some(project_id))
            .unwrap();

        let exported = runtime.project_export(project_id, "projects").unwrap();
        assert_eq!(exported["status"], "exported");
        assert_eq!(exported["content_counts"]["compute_jobs"], 1);
        assert_eq!(exported["content_counts"]["canvas_graphs"], 1);
        assert_eq!(exported["content_counts"]["artifact_refs"], 1);
        assert_eq!(exported["content_counts"]["support_bundle_refs"], 1);
        let object_key = exported["object_key"].as_str().unwrap();
        let export_path = runtime.base_dir().join("exports").join(object_key);
        assert!(export_path.is_file());

        let text = fs::read_to_string(&export_path).unwrap();
        let mut payload: Value = serde_json::from_str(&text).unwrap();
        assert_eq!(
            payload["contents"]["compute_jobs"]
                .as_array()
                .unwrap()
                .len(),
            1
        );
        assert_eq!(
            payload["contents"]["canvas_graphs"]
                .as_array()
                .unwrap()
                .len(),
            1
        );
        assert_eq!(
            payload["contents"]["artifact_refs"]
                .as_array()
                .unwrap()
                .len(),
            1
        );
        assert_eq!(
            payload["contents"]["artifact_files"]
                .as_array()
                .unwrap()
                .len(),
            1
        );
        assert!(
            payload["contents"]["artifact_files"][0]["content_hex"]
                .as_str()
                .unwrap()
                .len()
                > 100
        );
        assert_eq!(
            payload["contents"]["support_bundle_refs"]
                .as_array()
                .unwrap()
                .len(),
            1
        );
        assert_eq!(
            payload["contents"]["support_bundle_files"]
                .as_array()
                .unwrap()
                .len(),
            1
        );
        assert_eq!(
            payload["contents"]["redaction"]["artifact_contents_included"],
            true
        );
        assert_eq!(
            payload["contents"]["redaction"]["support_bundle_contents_included"],
            true
        );
        assert_eq!(
            payload["contents"]["redaction"]["job_events_included"],
            true
        );
        payload["project"]["name"] = json!("Imported Project");
        fs::write(
            &export_path,
            serde_json::to_string_pretty(&payload).unwrap(),
        )
        .unwrap();

        let (_target_temp, target_runtime) = self::runtime();
        let target_export_path = target_runtime.base_dir().join("exports").join(object_key);
        fs::create_dir_all(target_export_path.parent().unwrap()).unwrap();
        fs::copy(&export_path, &target_export_path).unwrap();

        let imported = target_runtime.project_import(object_key).unwrap();
        assert_eq!(imported["status"], "imported");
        assert_eq!(imported["project"]["name"], "Imported Project");
        assert_eq!(imported["content_counts"]["compute_jobs"], 1);
        assert_eq!(imported["content_counts"]["canvas_graphs"], 1);
        assert_eq!(imported["content_counts"]["artifact_refs"], 1);
        assert_eq!(imported["content_counts"]["artifact_files"], 1);
        assert_eq!(imported["content_counts"]["support_bundle_refs"], 1);
        assert_eq!(imported["content_counts"]["support_bundle_files"], 1);
        assert_eq!(imported["imported_counts"]["canvas_graphs"], 1);
        assert_eq!(imported["imported_counts"]["compute_jobs"], 1);
        assert_eq!(imported["imported_counts"]["artifacts"], 1);
        assert_eq!(imported["imported_counts"]["model_runs"], 1);
        assert!(imported["imported_counts"]["job_events"].as_u64().unwrap() >= 5);
        assert_eq!(imported["imported_counts"]["support_bundles"], 1);
        assert_eq!(imported["metadata_only_counts"]["compute_jobs"], 0);
        assert_eq!(imported["metadata_only_counts"]["artifact_refs"], 0);
        assert_eq!(imported["metadata_only_counts"]["support_bundle_refs"], 0);
        assert_eq!(
            target_runtime
                .canvas_graph_load("graph_material_balance_minimal")
                .unwrap()["project_id"],
            imported["project"]["project_id"]
        );
        let imported_job = target_runtime
            .compute_job_get("job_material_balance_minimal")
            .unwrap();
        assert_eq!(imported_job["job"]["status"], "succeeded");
        assert_eq!(imported_job["artifacts"].as_array().unwrap().len(), 1);
        assert_eq!(imported_job["model_runs"].as_array().unwrap().len(), 1);
        let artifact_object_key = imported_job["artifacts"][0]["object_key"].as_str().unwrap();
        let restored_artifact_path = target_runtime
            .base_dir()
            .join("artifacts")
            .join(artifact_object_key);
        assert!(restored_artifact_path.is_file());
        assert!(fs::read_to_string(restored_artifact_path)
            .unwrap()
            .contains("\"timestamps\""));
        let support_object_key = payload["contents"]["support_bundle_refs"][0]["object_key"]
            .as_str()
            .unwrap();
        assert!(target_runtime
            .base_dir()
            .join("support_bundles")
            .join(support_object_key)
            .is_file());
        assert!(runtime.project_export(project_id, "../escape").is_err());
        assert!(runtime.project_import("../escape/project.json").is_err());
        assert!(runtime.project_import("C:/escape/project.json").is_err());
    }

    #[test]
    fn external_project_package_files_record_recent_files_and_validate_paths() {
        let (_temp, runtime) = runtime();
        let project = runtime.project_create("Desktop Smoke Project").unwrap();
        let project_id = project["project_id"].as_str().unwrap();
        let external_dir = tempfile::tempdir().unwrap();
        let project_file = external_dir
            .path()
            .join("site-a.autowatersimu-project.json");
        let project_file_path = project_file.to_string_lossy().to_string();

        let exported = runtime
            .project_export_file(project_id, &project_file_path)
            .unwrap();
        assert_eq!(exported["status"], "exported");
        assert_eq!(exported["target_kind"], "external_file");
        assert_eq!(exported["object_key"], Value::Null);
        assert!(project_file.is_file());

        let imported = runtime.project_import_file(&project_file_path).unwrap();
        assert_eq!(imported["status"], "imported");
        assert_eq!(imported["source_kind"], "external_file");
        assert_eq!(imported["object_key"], Value::Null);

        let recent_files = runtime.recent_file_list().unwrap();
        assert_eq!(recent_files["count"], 1);
        assert_eq!(
            recent_files["recent_files"][0]["file_type"],
            "project_package"
        );
        assert_eq!(
            recent_files["recent_files"][0]["file_path"]
                .as_str()
                .unwrap(),
            project_file.to_string_lossy().as_ref()
        );
        let recent_file_id = recent_files["recent_files"][0]["recent_file_id"]
            .as_str()
            .unwrap();
        let recent_imported = runtime.project_import_recent(recent_file_id).unwrap();
        assert_eq!(recent_imported["status"], "imported");
        assert_eq!(recent_imported["recent_file_id"], recent_file_id);
        assert!(runtime
            .project_import_recent("missing_recent_file")
            .unwrap_err()
            .contains("recent file not found"));

        let wrong_suffix = external_dir.path().join("site-a.json");
        let wrong_suffix_path = wrong_suffix.to_string_lossy().to_string();
        assert!(runtime
            .project_export_file(project_id, &wrong_suffix_path)
            .unwrap_err()
            .contains(".autowatersimu-project.json"));
        assert!(runtime
            .project_import_file(&wrong_suffix_path)
            .unwrap_err()
            .contains(".autowatersimu-project.json"));
        assert!(runtime
            .project_export_file(project_id, "relative.autowatersimu-project.json")
            .unwrap_err()
            .contains("must be absolute"));
    }

    #[test]
    fn canvas_graph_save_load_round_trip_validates_edges() {
        let (_temp, runtime) = runtime();
        let saved = runtime
            .canvas_graph_save(&valid_canvas_graph_json())
            .unwrap();
        assert_eq!(saved["graph_id"], "graph_material_balance_minimal");
        assert_eq!(saved["schema_version"], "canvas_graph.v1");
        assert_eq!(saved["graph"]["nodes"].as_array().unwrap().len(), 3);

        let loaded = runtime
            .canvas_graph_load("graph_material_balance_minimal")
            .unwrap();
        assert_eq!(
            loaded["graph"]["graph_id"],
            "graph_material_balance_minimal"
        );
        assert!(loaded["updated_at"].as_str().unwrap().len() >= 20);

        let mut invalid: Value = serde_json::from_str(&valid_canvas_graph_json()).unwrap();
        invalid["edges"][0]["target"] = json!("missing_node");
        let error = runtime.canvas_graph_save(&invalid.to_string()).unwrap_err();
        assert!(error.contains("references unknown node"));
    }

    #[test]
    fn process_graph_validate_reports_validity_and_edge_errors() {
        let (_temp, runtime) = runtime();
        let valid = runtime
            .process_graph_validate(&valid_process_graph_json())
            .unwrap();
        assert_eq!(valid["status"], "valid");
        assert_eq!(valid["process_graph_id"], "pg_material_balance_minimal");
        assert!(valid["errors"].as_array().unwrap().is_empty());

        let mut invalid: Value = serde_json::from_str(&valid_process_graph_json()).unwrap();
        invalid["edges"][0]["target_node_id"] = json!("missing_node");
        let result = runtime
            .process_graph_validate(&invalid.to_string())
            .unwrap();
        assert_eq!(result["status"], "invalid");
        assert!(result["errors"].as_array().unwrap().iter().any(|error| {
            error["code"] == "EDGE_TARGET_UNKNOWN" && error["path"] == "$.edges[0].target_node_id"
        }));

        let malformed = runtime.process_graph_validate("{").unwrap();
        assert_eq!(malformed["status"], "invalid");
        assert_eq!(malformed["errors"][0]["code"], "GRAPH_JSON_INVALID");
    }

    #[test]
    fn worker_self_check_smoke_returns_json() {
        let (_temp, runtime) = runtime();
        let result = runtime.worker_self_check().unwrap();
        assert_eq!(result["status"], "ok");
        assert_eq!(result["self_check"]["minimal_job_status"]["ok"], true);
    }

    #[test]
    fn packaged_worker_exe_smoke_when_env_is_available() {
        let worker_exe = match env::var("AUTOWATERSIMU_TEST_PACKAGED_WORKER_EXE") {
            Ok(value) if !value.trim().is_empty() => value,
            _ => return,
        };
        let temp = tempfile::tempdir().unwrap();
        let runtime = DesktopRuntime::new_with_packaged_worker(
            temp.path().to_path_buf(),
            repo_root(),
            Duration::from_secs(120),
            worker_exe.into(),
        )
        .unwrap();
        let result = runtime.worker_self_check().unwrap();
        assert_eq!(result["status"], "ok");
        assert_eq!(result["self_check"]["packaging_mode"], "frozen");
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
        assert_eq!(result["model_runs"].as_array().unwrap().len(), 1);
        assert_eq!(result["model_runs"][0]["schema_version"], "model_run.v1");
        assert_eq!(
            result["model_runs"][0]["job_id"],
            "job_material_balance_minimal"
        );
        assert_eq!(result["model_runs"][0]["model_key"], "material_balance");
        assert_eq!(
            result["model_runs"][0]["evidence_refs"][0],
            result["artifacts"][0]["artifact_id"]
        );
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
    fn queued_job_can_be_cancelled() {
        let (_temp, runtime) = runtime();
        runtime.compute_job_create(&valid_job_json()).unwrap();
        let cancelled = runtime
            .compute_job_cancel("job_material_balance_minimal")
            .unwrap();

        assert_eq!(cancelled["job"]["status"], "cancelled");
        assert_eq!(cancelled["job"]["cancel_requested"], true);
        assert_eq!(
            event_types(&runtime, "job_material_balance_minimal"),
            vec!["job.created", "job.queued", "job.cancelled"]
        );
        let error = runtime
            .compute_job_run("job_material_balance_minimal")
            .unwrap_err();
        assert!(error.contains("job cannot be run from status: cancelled"));
        assert!(runtime
            .compute_job_cancel("job_material_balance_minimal")
            .unwrap_err()
            .contains("job cannot be cancelled from status: cancelled"));
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
    fn artifact_export_csv_flattens_time_series() {
        let (_temp, runtime) = runtime();
        runtime.compute_job_create(&valid_job_json()).unwrap();
        let result = runtime
            .compute_job_run("job_material_balance_minimal")
            .unwrap();
        let artifact_id = result["artifacts"][0]["artifact_id"].as_str().unwrap();

        let exported = runtime
            .artifact_export_csv(artifact_id, "manual/job-1")
            .unwrap();
        assert_eq!(exported["status"], "exported");
        assert_eq!(exported["format"], "csv");
        assert!(exported["exported_path"]
            .as_str()
            .unwrap()
            .ends_with(".csv"));
        let csv = fs::read_to_string(exported["exported_path"].as_str().unwrap()).unwrap();
        let header = csv.lines().next().unwrap();
        assert!(header.starts_with("time,"));
        assert!(header.contains("node.n_in.COD"));
        assert!(header.contains("node.n_tank.volume"));
        assert!(header.contains("edge.e_in_tank.flow_rate"));
        assert_eq!(
            csv.lines().count(),
            exported["row_count"].as_u64().unwrap() as usize + 1
        );
        assert!(runtime
            .artifact_export_csv(artifact_id, "../escape")
            .is_err());
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
        assert_eq!(payload["model_runs"].as_array().unwrap().len(), 1);
        assert!(payload["events"]
            .as_array()
            .unwrap()
            .iter()
            .any(|event| event["event_type"] == "support_bundle.created"));
        assert!(!text.contains("\"timestamps\""));
    }

    #[test]
    fn project_backup_restore_round_trip_restores_sqlite_and_artifacts() {
        let (_temp, runtime) = runtime();
        runtime.compute_job_create(&valid_job_json()).unwrap();
        let result = runtime
            .compute_job_run("job_material_balance_minimal")
            .unwrap();
        let object_key = result["artifacts"][0]["object_key"].as_str().unwrap();
        let artifact_path = runtime.base_dir().join("artifacts").join(object_key);

        let backup = runtime.project_backup().unwrap();
        assert_eq!(backup["status"], "created");
        let backup_object_key = backup["object_key"].as_str().unwrap();
        assert!(runtime
            .base_dir()
            .join("backups")
            .join(backup_object_key)
            .is_file());

        let mut second_job: Value = serde_json::from_str(&valid_job_json()).unwrap();
        second_job["job_id"] = json!("job_after_backup");
        runtime.compute_job_create(&second_job.to_string()).unwrap();
        fs::remove_file(&artifact_path).unwrap();
        assert_eq!(runtime.compute_job_list().unwrap()["count"], 2);
        assert!(!artifact_path.is_file());

        let restored = runtime.project_restore(backup_object_key).unwrap();
        assert_eq!(restored["status"], "restored");
        assert_eq!(runtime.compute_job_list().unwrap()["count"], 1);
        assert!(artifact_path.is_file());
        assert!(runtime.project_restore("../escape/manifest.json").is_err());
        assert!(runtime.project_restore("C:/escape/manifest.json").is_err());
    }
}
