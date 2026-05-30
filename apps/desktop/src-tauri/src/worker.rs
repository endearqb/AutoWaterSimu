use serde_json::{json, Value};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::thread;
use std::time::{Duration, Instant};

#[derive(Debug)]
pub struct WorkerOutput {
    pub stdout: String,
    pub stderr_tail: String,
    pub timed_out: bool,
    pub status_success: bool,
}

#[derive(Clone, Debug)]
pub struct SourceWorker {
    launch: WorkerLaunch,
    timeout: Duration,
}

#[derive(Clone, Debug)]
enum WorkerLaunch {
    Source {
        python_path: PathBuf,
        cli_path: PathBuf,
    },
    Packaged {
        exe_path: PathBuf,
    },
}

impl SourceWorker {
    pub fn new(repo_root: &Path, timeout: Duration) -> Self {
        let python_path = std::env::var("AUTOWATERSIMU_WORKER_PYTHON")
            .map(PathBuf::from)
            .unwrap_or_else(|_| {
                repo_root
                    .join("backend")
                    .join(".venv")
                    .join("Scripts")
                    .join("python.exe")
            });
        let cli_path = repo_root
            .join("services")
            .join("simulation-worker")
            .join("simulation_worker")
            .join("cli.py");
        Self {
            launch: WorkerLaunch::Source {
                python_path,
                cli_path,
            },
            timeout,
        }
    }

    pub fn new_with_python(repo_root: &Path, timeout: Duration, python_path: PathBuf) -> Self {
        let cli_path = repo_root
            .join("services")
            .join("simulation-worker")
            .join("simulation_worker")
            .join("cli.py");
        Self {
            launch: WorkerLaunch::Source {
                python_path,
                cli_path,
            },
            timeout,
        }
    }

    pub fn new_with_python_and_cli(
        timeout: Duration,
        python_path: PathBuf,
        cli_path: PathBuf,
    ) -> Self {
        Self {
            launch: WorkerLaunch::Source {
                python_path,
                cli_path,
            },
            timeout,
        }
    }

    pub fn new_packaged(timeout: Duration, exe_path: PathBuf) -> Self {
        Self {
            launch: WorkerLaunch::Packaged { exe_path },
            timeout,
        }
    }

    pub fn self_check(&self) -> Result<(Value, String), String> {
        let output = self.run_args(&["--self-check"], None)?;
        if output.timed_out {
            return Err(String::from("worker self-check timed out"));
        }
        if !output.status_success {
            return Err(format!("worker self-check failed: {}", output.stderr_tail));
        }
        let value: Value = serde_json::from_str(output.stdout.trim())
            .map_err(|err| format!("worker self-check stdout is not JSON: {err}"))?;
        Ok((value, output.stderr_tail))
    }

    pub fn run_job_jsonrpc(
        &self,
        job: &Value,
        artifact_dir: &Path,
    ) -> Result<(Value, String), String> {
        let request = json!({
            "jsonrpc": "2.0",
            "id": "desktop_run_job",
            "method": "run_job",
            "params": {
                "job": job,
                "artifact_dir": artifact_dir.to_string_lossy()
            }
        });
        let input = format!("{}\n", request);
        let output = self.run_args(&["--stdio-jsonrpc"], Some(input.as_bytes()))?;
        if output.timed_out {
            return Ok((
                json!({"status": "timed_out", "summary": {"error_message": "worker run timed out"}}),
                output.stderr_tail,
            ));
        }
        if !output.status_success {
            return Ok((
                json!({"status": "failed", "summary": {"error_message": "worker process exited unsuccessfully"}}),
                output.stderr_tail,
            ));
        }

        let first_line = output
            .stdout
            .lines()
            .find(|line| !line.trim().is_empty())
            .ok_or_else(|| String::from("worker JSON-RPC stdout was empty"))?;
        let response: Value = serde_json::from_str(first_line)
            .map_err(|err| format!("worker JSON-RPC stdout is not JSON: {err}"))?;
        if let Some(error) = response.get("error") {
            return Ok((
                json!({"status": "failed", "summary": {"error_message": error.to_string()}}),
                output.stderr_tail,
            ));
        }
        let result = response
            .get("result")
            .and_then(|value| value.get("compute_result"))
            .cloned()
            .ok_or_else(|| {
                String::from("worker JSON-RPC response missing result.compute_result")
            })?;
        Ok((result, output.stderr_tail))
    }

    fn run_args(&self, args: &[&str], stdin_bytes: Option<&[u8]>) -> Result<WorkerOutput, String> {
        let mut command = match &self.launch {
            WorkerLaunch::Source {
                python_path,
                cli_path,
            } => {
                let mut command = Command::new(python_path);
                command.arg(cli_path);
                command
            }
            WorkerLaunch::Packaged { exe_path } => Command::new(exe_path),
        };
        let mut child = command
            .args(args)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|err| format!("spawn worker failed: {err}"))?;

        if let Some(bytes) = stdin_bytes {
            let mut stdin = child
                .stdin
                .take()
                .ok_or_else(|| String::from("worker stdin was unavailable"))?;
            stdin
                .write_all(bytes)
                .map_err(|err| format!("write worker stdin failed: {err}"))?;
        }
        drop(child.stdin.take());

        let started = Instant::now();
        loop {
            if child
                .try_wait()
                .map_err(|err| format!("poll worker failed: {err}"))?
                .is_some()
            {
                let output = child
                    .wait_with_output()
                    .map_err(|err| format!("read worker output failed: {err}"))?;
                return Ok(WorkerOutput {
                    stdout: String::from_utf8_lossy(&output.stdout).to_string(),
                    stderr_tail: tail(&String::from_utf8_lossy(&output.stderr), 4096),
                    timed_out: false,
                    status_success: output.status.success(),
                });
            }
            if started.elapsed() >= self.timeout {
                let _ = child.kill();
                let output = child
                    .wait_with_output()
                    .map_err(|err| format!("read timed-out worker output failed: {err}"))?;
                return Ok(WorkerOutput {
                    stdout: String::from_utf8_lossy(&output.stdout).to_string(),
                    stderr_tail: tail(&String::from_utf8_lossy(&output.stderr), 4096),
                    timed_out: true,
                    status_success: false,
                });
            }
            thread::sleep(Duration::from_millis(10));
        }
    }
}

pub fn tail(value: &str, max_chars: usize) -> String {
    let chars: Vec<char> = value.chars().collect();
    if chars.len() <= max_chars {
        return value.to_string();
    }
    chars[chars.len() - max_chars..].iter().collect()
}
