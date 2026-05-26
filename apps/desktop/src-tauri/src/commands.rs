pub type CommandResult<T> = Result<T, String>;

pub fn worker_self_check() -> CommandResult<String> {
    Ok(String::from(
        "{\"status\":\"ok\",\"command\":\"worker_self_check\",\"phase\":\"3A\",\"worker\":\"not_spawned\"}",
    ))
}

pub fn compute_job_create(request_json: &str) -> CommandResult<String> {
    if request_json.trim().is_empty() {
        return Err(String::from("request_json is required"));
    }

    Ok(format!(
        "{{\"job_id\":\"desktop_stub_job\",\"status\":\"queued\",\"request_bytes\":{}}}",
        request_json.len()
    ))
}

pub fn compute_job_get(job_id: &str) -> CommandResult<String> {
    let job_id = job_id.trim();
    if job_id.is_empty() {
        return Err(String::from("job_id is required"));
    }

    Ok(format!(
        "{{\"job_id\":\"{}\",\"status\":\"created\",\"phase\":\"3A\"}}",
        escape_json_string(job_id)
    ))
}

pub fn artifact_export(artifact_id: &str, target_dir: &str) -> CommandResult<String> {
    let artifact_id = artifact_id.trim();
    let target_dir = target_dir.trim();
    if artifact_id.is_empty() {
        return Err(String::from("artifact_id is required"));
    }
    if target_dir.is_empty() {
        return Err(String::from("target_dir is required"));
    }

    Ok(format!(
        "{{\"artifact_id\":\"{}\",\"target_dir\":\"{}\",\"status\":\"planned\",\"phase\":\"3A\"}}",
        escape_json_string(artifact_id),
        escape_json_string(target_dir)
    ))
}

fn escape_json_string(value: &str) -> String {
    value
        .chars()
        .flat_map(|ch| match ch {
            '"' => "\\\"".chars().collect::<Vec<char>>(),
            '\\' => "\\\\".chars().collect::<Vec<char>>(),
            '\n' => "\\n".chars().collect::<Vec<char>>(),
            '\r' => "\\r".chars().collect::<Vec<char>>(),
            '\t' => "\\t".chars().collect::<Vec<char>>(),
            _ => vec![ch],
        })
        .collect()
}
