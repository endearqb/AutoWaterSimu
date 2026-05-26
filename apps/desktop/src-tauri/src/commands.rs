use crate::runtime::DesktopRuntime;

pub type CommandResult<T> = Result<T, String>;

pub fn worker_self_check() -> CommandResult<String> {
    let runtime = DesktopRuntime::default_runtime()?;
    runtime.worker_self_check().map(|value| value.to_string())
}

pub fn compute_job_create(request_json: &str) -> CommandResult<String> {
    let runtime = DesktopRuntime::default_runtime()?;
    runtime
        .compute_job_create(request_json)
        .map(|value| value.to_string())
}

pub fn compute_job_run(job_id: &str) -> CommandResult<String> {
    let runtime = DesktopRuntime::default_runtime()?;
    runtime
        .compute_job_run(job_id)
        .map(|value| value.to_string())
}

pub fn compute_job_get(job_id: &str) -> CommandResult<String> {
    let runtime = DesktopRuntime::default_runtime()?;
    runtime
        .compute_job_get(job_id)
        .map(|value| value.to_string())
}

pub fn compute_job_list() -> CommandResult<String> {
    let runtime = DesktopRuntime::default_runtime()?;
    runtime.compute_job_list().map(|value| value.to_string())
}

pub fn artifact_export(artifact_id: &str, target_dir: &str) -> CommandResult<String> {
    let runtime = DesktopRuntime::default_runtime()?;
    runtime
        .artifact_export(artifact_id, target_dir)
        .map(|value| value.to_string())
}

pub fn support_bundle_create(job_id: &str) -> CommandResult<String> {
    let runtime = DesktopRuntime::default_runtime()?;
    runtime
        .support_bundle_create(job_id)
        .map(|value| value.to_string())
}
