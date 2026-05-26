pub mod commands;
pub mod migrations;

#[cfg(test)]
mod tests {
    use super::commands::{artifact_export, compute_job_create, compute_job_get, worker_self_check};
    use super::migrations::{migration_names, MIGRATION_0001_UP};

    #[test]
    fn migration_0001_declares_required_tables() {
        let names = migration_names();
        assert_eq!(names, vec!["0001_desktop_job_store"]);

        for table in [
            "projects",
            "compute_jobs",
            "compute_job_events",
            "artifacts",
        ] {
            assert!(MIGRATION_0001_UP.contains(&format!("CREATE TABLE IF NOT EXISTS {table}")));
        }
    }

    #[test]
    fn command_placeholders_return_deterministic_json() {
        assert!(worker_self_check().unwrap().contains("\"status\":\"ok\""));
        assert!(compute_job_create("{\"job_type\":\"simulation.material_balance.v1\"}")
            .unwrap()
            .contains("\"status\":\"queued\""));
        assert!(compute_job_get("job_1").unwrap().contains("\"job_id\":\"job_1\""));
        assert!(artifact_export("artifact_1", "C:/tmp").unwrap().contains("\"artifact_id\":\"artifact_1\""));
    }

    #[test]
    fn command_placeholders_reject_empty_required_values() {
        assert!(compute_job_create("").is_err());
        assert!(compute_job_get("").is_err());
        assert!(artifact_export("", "C:/tmp").is_err());
        assert!(artifact_export("artifact_1", "").is_err());
    }
}
