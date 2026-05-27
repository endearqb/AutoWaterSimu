use crate::runtime::DesktopRuntime;
use serde_json::Value;

pub type CommandResult<T> = Result<T, String>;

#[tauri::command]
pub fn worker_self_check() -> CommandResult<Value> {
    let runtime = DesktopRuntime::default_runtime()?;
    runtime.worker_self_check()
}

#[tauri::command]
pub fn compute_job_create(request_json: String) -> CommandResult<Value> {
    let runtime = DesktopRuntime::default_runtime()?;
    runtime.compute_job_create(&request_json)
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
pub fn compute_job_list() -> CommandResult<Value> {
    let runtime = DesktopRuntime::default_runtime()?;
    runtime.compute_job_list()
}

#[tauri::command]
pub fn artifact_export(artifact_id: String, target_dir: String) -> CommandResult<Value> {
    let runtime = DesktopRuntime::default_runtime()?;
    runtime.artifact_export(&artifact_id, &target_dir)
}

#[tauri::command]
pub fn support_bundle_create(job_id: String) -> CommandResult<Value> {
    let runtime = DesktopRuntime::default_runtime()?;
    runtime.support_bundle_create(&job_id)
}
