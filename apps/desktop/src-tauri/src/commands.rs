use crate::runtime::DesktopRuntime;
use serde_json::Value;

pub type CommandResult<T> = Result<T, String>;

#[tauri::command]
pub fn worker_self_check() -> CommandResult<Value> {
    let runtime = DesktopRuntime::default_runtime()?;
    runtime.worker_self_check()
}

#[tauri::command]
pub fn project_create(name: String) -> CommandResult<Value> {
    let runtime = DesktopRuntime::default_runtime()?;
    runtime.project_create(&name)
}

#[tauri::command]
pub fn project_get(project_id: String) -> CommandResult<Value> {
    let runtime = DesktopRuntime::default_runtime()?;
    runtime.project_get(&project_id)
}

#[tauri::command]
pub fn project_list() -> CommandResult<Value> {
    let runtime = DesktopRuntime::default_runtime()?;
    runtime.project_list()
}

#[tauri::command]
pub fn project_export(project_id: String, target_dir: String) -> CommandResult<Value> {
    let runtime = DesktopRuntime::default_runtime()?;
    runtime.project_export(&project_id, &target_dir)
}

#[tauri::command]
pub fn project_import(export_object_key: String) -> CommandResult<Value> {
    let runtime = DesktopRuntime::default_runtime()?;
    runtime.project_import(&export_object_key)
}

#[tauri::command]
pub fn compute_job_create(
    request_json: String,
    project_id: Option<String>,
) -> CommandResult<Value> {
    let runtime = DesktopRuntime::default_runtime()?;
    runtime.compute_job_create_for_project(&request_json, project_id.as_deref())
}

#[tauri::command]
pub fn compute_job_run(job_id: String) -> CommandResult<Value> {
    let runtime = DesktopRuntime::default_runtime()?;
    runtime.compute_job_run(&job_id)
}

#[tauri::command]
pub fn compute_job_get(job_id: String) -> CommandResult<Value> {
    let runtime = DesktopRuntime::default_runtime()?;
    runtime.compute_job_get(&job_id)
}

#[tauri::command]
pub fn compute_job_cancel(job_id: String) -> CommandResult<Value> {
    let runtime = DesktopRuntime::default_runtime()?;
    runtime.compute_job_cancel(&job_id)
}

#[tauri::command]
pub fn compute_job_list() -> CommandResult<Value> {
    let runtime = DesktopRuntime::default_runtime()?;
    runtime.compute_job_list()
}

#[tauri::command]
pub fn canvas_graph_save(graph_json: String, project_id: Option<String>) -> CommandResult<Value> {
    let runtime = DesktopRuntime::default_runtime()?;
    runtime.canvas_graph_save_for_project(&graph_json, project_id.as_deref())
}

#[tauri::command]
pub fn canvas_graph_load(graph_id: String) -> CommandResult<Value> {
    let runtime = DesktopRuntime::default_runtime()?;
    runtime.canvas_graph_load(&graph_id)
}

#[tauri::command]
pub fn process_graph_validate(graph_json: String) -> CommandResult<Value> {
    let runtime = DesktopRuntime::default_runtime()?;
    runtime.process_graph_validate(&graph_json)
}

#[tauri::command]
pub fn artifact_export(artifact_id: String, target_dir: String) -> CommandResult<Value> {
    let runtime = DesktopRuntime::default_runtime()?;
    runtime.artifact_export(&artifact_id, &target_dir)
}

#[tauri::command]
pub fn artifact_export_csv(artifact_id: String, target_dir: String) -> CommandResult<Value> {
    let runtime = DesktopRuntime::default_runtime()?;
    runtime.artifact_export_csv(&artifact_id, &target_dir)
}

#[tauri::command]
pub fn project_backup() -> CommandResult<Value> {
    let runtime = DesktopRuntime::default_runtime()?;
    runtime.project_backup()
}

#[tauri::command]
pub fn project_restore(backup_object_key: String) -> CommandResult<Value> {
    let runtime = DesktopRuntime::default_runtime()?;
    runtime.project_restore(&backup_object_key)
}

#[tauri::command]
pub fn support_bundle_create(job_id: String) -> CommandResult<Value> {
    let runtime = DesktopRuntime::default_runtime()?;
    runtime.support_bundle_create(&job_id)
}
