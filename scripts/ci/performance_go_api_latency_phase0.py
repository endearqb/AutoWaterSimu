from __future__ import annotations

import argparse
import copy
import json
import math
import os
import platform
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any


PUBLIC_TOKEN = "dev-public-token"
WORKER_TOKEN = "dev-worker-token"


class ApiError(RuntimeError):
    def __init__(self, method: str, url: str, status: int | None, body: str, message: str) -> None:
        super().__init__(f"{method} {url} failed: {message}")
        self.method = method
        self.url = url
        self.status = status
        self.body = body
        self.message = message


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Run Phase 0 local Compute API claim/list/get latency smoke."
    )
    parser.add_argument("--repo-root", default="")
    parser.add_argument("--evidence-dir", default="")
    parser.add_argument("--job-count", type=int, default=80)
    parser.add_argument("--list-iterations", type=int, default=40)
    parser.add_argument("--get-iterations", type=int, default=80)
    parser.add_argument("--claim-iterations", type=int, default=40)
    parser.add_argument("--list-limit", type=int, default=50)
    parser.add_argument("--startup-timeout-sec", type=float, default=240.0)
    args = parser.parse_args()

    repo_root = Path(args.repo_root).resolve() if args.repo_root else Path(__file__).resolve().parents[2]
    evidence_dir = Path(args.evidence_dir).resolve() if args.evidence_dir else repo_root / "tmp" / "ci-evidence"
    work_dir = repo_root / "tmp" / "performance-go-api-latency-phase0"
    evidence_dir.mkdir(parents=True, exist_ok=True)
    work_dir.mkdir(parents=True, exist_ok=True)

    min_jobs = max(1, args.claim_iterations)
    job_count = max(args.job_count, min_jobs)
    list_iterations = max(1, args.list_iterations)
    get_iterations = max(1, args.get_iterations)
    claim_iterations = max(1, args.claim_iterations)
    list_limit = max(1, min(args.list_limit, 200))

    report: dict[str, Any] = {
        "schema_version": "autowatersimu_performance_go_api_latency_phase0.v1",
        "generated_at": utc_now(),
        "repo_root": str(repo_root),
        "status": "failed",
        "summary": {},
        "git": git_metadata(repo_root),
        "environment": {
            "platform": platform.platform(),
            "python": sys.version.split()[0],
            "api_store": "memory",
            "started_with_go_run": True,
            "dev_tokens": {
                "public": PUBLIC_TOKEN,
                "worker": WORKER_TOKEN,
            },
        },
        "config": {
            "job_count": job_count,
            "list_iterations": list_iterations,
            "get_iterations": get_iterations,
            "claim_iterations": claim_iterations,
            "list_limit": list_limit,
            "startup_timeout_sec": args.startup_timeout_sec,
        },
        "measurements": {},
        "claim_scanned_rows": {
            "available": False,
            "p50": None,
            "p95": None,
            "p99": None,
            "source": "reserved_phase0_field; current Compute API does not expose scanned-row counts.",
        },
        "answers": {},
        "open_gaps": [],
        "hard_violations": [],
    }

    server: subprocess.Popen[str] | None = None
    try:
        run_id = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
        port = find_free_port()
        api_base_url = f"http://127.0.0.1:{port}"
        report["api_base_url"] = api_base_url
        server = start_compute_api(repo_root, work_dir, port)
        wait_for_ready(api_base_url, server, args.startup_timeout_sec, work_dir)

        fixture = read_json(repo_root / "contracts" / "examples" / "valid" / "material_balance_minimal.compute_job.v1.json")
        created_jobs, create_ms = create_jobs(api_base_url, fixture, run_id, job_count)
        worker_ids = register_workers(api_base_url, run_id, claim_iterations)

        list_ms = measure_list(api_base_url, list_iterations, list_limit)
        get_ms = measure_get(api_base_url, created_jobs, get_iterations)
        claim_result = measure_claim(api_base_url, worker_ids)

        report["measurements"] = {
            "setup_create_jobs_ms": summarize(create_ms),
            "get_jobs_ms": summarize(list_ms),
            "get_job_by_id_ms": summarize(get_ms),
            "worker_claim_post_ms": summarize(claim_result["latencies_ms"]),
        }
        report["route_samples"] = {
            "GET /api/v1/compute/jobs": list_ms,
            "GET /api/v1/compute/jobs/{id}": get_ms,
            "POST /api/v1/workers/{worker_id}/claim": claim_result["latencies_ms"],
        }
        report["setup"] = {
            "created_jobs": len(created_jobs),
            "registered_workers": len(worker_ids),
            "claimed_jobs": len(claim_result["claimed_job_ids"]),
            "claimed_job_ids_preview": claim_result["claimed_job_ids"][:10],
        }

        if len(claim_result["claimed_job_ids"]) != claim_iterations:
            report["hard_violations"].append(
                {
                    "rule": "p06-claim-returned-job",
                    "summary": "Every measured worker claim must return a queued job in the prepared in-memory queue.",
                    "details": {
                        "claim_iterations": claim_iterations,
                        "claimed_jobs": len(claim_result["claimed_job_ids"]),
                        "empty_claims": claim_result["empty_claims"],
                    },
                }
            )

        report["answers"] = build_answers(report)
    except Exception as err:  # noqa: BLE001 - evidence should capture unexpected setup/runtime failures.
        report["hard_violations"].append(
            {
                "rule": "p06-go-api-latency-smoke-runtime-error",
                "summary": str(err),
                "details": exception_details(err, work_dir),
            }
        )
    finally:
        stop_process_tree(server)

    report["status"] = "failed" if report["hard_violations"] else "passed"
    report["summary"] = {
        "status": report["status"],
        "hard_violations": len(report["hard_violations"]),
        "open_gaps": len(report["open_gaps"]),
        "routes_measured": [
            "GET /api/v1/compute/jobs",
            "GET /api/v1/compute/jobs/{id}",
            "POST /api/v1/workers/{worker_id}/claim",
        ],
        "claim_scanned_rows_reserved": True,
        "claim_scanned_rows_available": False,
        "latency_ms": report.get("measurements", {}),
    }

    evidence_path = evidence_dir / "performance-go-api-latency-phase0.json"
    markdown_path = evidence_dir / "performance-go-api-latency-phase0.md"
    write_json(evidence_path, report)
    markdown_path.write_text(render_markdown(report), encoding="utf-8")

    print(f"performance go api latency phase0 status: {report['status']}")
    print(f"evidence: {evidence_path}")
    print(f"markdown: {markdown_path}")
    print(f"hard_violations: {len(report['hard_violations'])}")
    print(f"open_gaps: {len(report['open_gaps'])}")
    return 1 if report["hard_violations"] else 0


def start_compute_api(repo_root: Path, work_dir: Path, port: int) -> subprocess.Popen[str]:
    stdout_path = work_dir / "compute-api.stdout.log"
    stderr_path = work_dir / "compute-api.stderr.log"
    env = os.environ.copy()
    for key in [
        "COMPUTE_API_DATABASE_URL",
        "COMPUTE_API_TOKENS_JSON",
        "COMPUTE_API_TOKENS_FILE",
        "COMPUTE_API_ARCHIVE_DIR",
        "COMPUTE_API_ARCHIVE_S3_ENDPOINT",
        "COMPUTE_API_ARCHIVE_S3_BUCKET",
        "COMPUTE_API_ARCHIVE_S3_REGION",
        "COMPUTE_API_ARCHIVE_S3_ACCESS_KEY_ID",
        "COMPUTE_API_ARCHIVE_S3_SECRET_ACCESS_KEY",
        "COMPUTE_API_ARCHIVE_S3_PREFIX",
        "ENVIRONMENT",
    ]:
        env.pop(key, None)
    env["APP_ENV"] = "development"
    env["COMPUTE_API_PORT"] = str(port)
    env["COMPUTE_API_ARTIFACT_DIR"] = str(work_dir / "artifacts")
    flags = subprocess.CREATE_NEW_PROCESS_GROUP if os.name == "nt" else 0
    stdout = stdout_path.open("w", encoding="utf-8")
    stderr = stderr_path.open("w", encoding="utf-8")
    return subprocess.Popen(
        ["go", "run", "./cmd/compute-api"],
        cwd=repo_root / "apps" / "api",
        env=env,
        stdout=stdout,
        stderr=stderr,
        text=True,
        creationflags=flags,
    )


def stop_process_tree(process: subprocess.Popen[str] | None) -> None:
    if process is None or process.poll() is not None:
        return
    if os.name == "nt":
        subprocess.run(
            ["taskkill", "/PID", str(process.pid), "/T", "/F"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=False,
        )
        return
    process.terminate()
    try:
        process.wait(timeout=10)
    except subprocess.TimeoutExpired:
        process.kill()


def wait_for_ready(
    api_base_url: str,
    process: subprocess.Popen[str],
    timeout_sec: float,
    work_dir: Path,
) -> None:
    deadline = time.monotonic() + timeout_sec
    last_error = ""
    while time.monotonic() < deadline:
        if process.poll() is not None:
            raise RuntimeError(
                "Compute API process exited before /readyz became ready. "
                f"stdout={tail_file(work_dir / 'compute-api.stdout.log')} "
                f"stderr={tail_file(work_dir / 'compute-api.stderr.log')}"
            )
        try:
            _, payload, _ = request_json("GET", f"{api_base_url}/readyz")
            if payload.get("status") == "ready":
                return
        except Exception as err:  # noqa: BLE001 - readiness loop keeps the last transport error.
            last_error = str(err)
        time.sleep(0.5)
    raise TimeoutError(f"Compute API did not become ready within {timeout_sec}s. Last error: {last_error}")


def create_jobs(api_base_url: str, fixture: dict[str, Any], run_id: str, job_count: int) -> tuple[list[str], list[float]]:
    job_ids: list[str] = []
    latencies: list[float] = []
    base_time = datetime.now(timezone.utc)
    for index in range(job_count):
        payload = make_job_payload(fixture, run_id, index, base_time + timedelta(milliseconds=index))
        _, body, elapsed_ms = request_json_retry(
            "POST",
            f"{api_base_url}/api/v1/compute/jobs",
            token=PUBLIC_TOKEN,
            body=payload,
        )
        job_id = payload["job_id"]
        if nested_get(body, ["job", "job_id"]) != job_id:
            raise RuntimeError(f"Created job response did not echo expected job_id {job_id}: {body}")
        job_ids.append(job_id)
        latencies.append(elapsed_ms)
    return job_ids, latencies


def make_job_payload(fixture: dict[str, Any], run_id: str, index: int, created_at: datetime) -> dict[str, Any]:
    payload = copy.deepcopy(fixture)
    suffix = f"go_latency_{run_id}_{index:04d}"
    payload["job_id"] = f"job_{suffix}"
    payload["request_id"] = f"req_{suffix}"
    payload["idempotency_key"] = f"idem_{suffix}"
    payload["created_at"] = created_at.isoformat().replace("+00:00", "Z")
    payload.setdefault("payload", {})["simulation_input_id"] = f"si_{suffix}"
    payload.setdefault("payload", {})["process_graph_id"] = f"pg_{suffix}"
    payload.setdefault("context", {})["trace_id"] = f"trace_{suffix}"
    return payload


def register_workers(api_base_url: str, run_id: str, count: int) -> list[str]:
    worker_ids: list[str] = []
    for index in range(count):
        worker_id = f"worker_go_latency_{run_id}_{index:04d}"
        request_json_retry(
            "POST",
            f"{api_base_url}/api/v1/workers/register",
            token=WORKER_TOKEN,
            body={
                "worker_id": worker_id,
                "capabilities": ["material_balance", "ode"],
                "supported_contract_versions": ["compute_job.v1", "simulation_input.v1"],
                "runtime_version": "performance-go-api-latency-phase0",
            },
        )
        worker_ids.append(worker_id)
    return worker_ids


def measure_list(api_base_url: str, iterations: int, list_limit: int) -> list[float]:
    samples: list[float] = []
    query = urllib.parse.urlencode({"limit": str(list_limit)})
    for _ in range(iterations):
        _, payload, elapsed_ms = request_json(
            "GET",
            f"{api_base_url}/api/v1/compute/jobs?{query}",
            token=PUBLIC_TOKEN,
        )
        if "items" not in payload:
            raise RuntimeError(f"List jobs response does not contain items: {payload}")
        samples.append(elapsed_ms)
    return samples


def measure_get(api_base_url: str, job_ids: list[str], iterations: int) -> list[float]:
    samples: list[float] = []
    for index in range(iterations):
        job_id = job_ids[index % len(job_ids)]
        escaped = urllib.parse.quote(job_id, safe="")
        _, payload, elapsed_ms = request_json(
            "GET",
            f"{api_base_url}/api/v1/compute/jobs/{escaped}",
            token=PUBLIC_TOKEN,
        )
        if nested_get(payload, ["job", "job_id"]) != job_id:
            raise RuntimeError(f"Get job response returned unexpected payload for {job_id}: {payload}")
        samples.append(elapsed_ms)
    return samples


def measure_claim(api_base_url: str, worker_ids: list[str]) -> dict[str, Any]:
    samples: list[float] = []
    claimed_job_ids: list[str] = []
    empty_claims: list[str] = []
    for worker_id in worker_ids:
        escaped = urllib.parse.quote(worker_id, safe="")
        _, payload, elapsed_ms = request_json(
            "POST",
            f"{api_base_url}/api/v1/workers/{escaped}/claim",
            token=WORKER_TOKEN,
        )
        samples.append(elapsed_ms)
        job_id = nested_get(payload, ["job", "job_id"])
        if job_id:
            claimed_job_ids.append(str(job_id))
        else:
            empty_claims.append(worker_id)
    return {
        "latencies_ms": samples,
        "claimed_job_ids": claimed_job_ids,
        "empty_claims": empty_claims,
    }


def request_json(
    method: str,
    url: str,
    token: str = "",
    body: dict[str, Any] | None = None,
    timeout: float = 30.0,
) -> tuple[int, dict[str, Any], float]:
    data = None
    headers = {"Accept": "application/json", "Connection": "close"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if body is not None:
        data = json.dumps(body, ensure_ascii=False).encode("utf-8")
        headers["Content-Type"] = "application/json"
    request = urllib.request.Request(url, data=data, headers=headers, method=method)
    start = time.perf_counter_ns()
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            response_body = response.read().decode("utf-8")
            elapsed_ms = (time.perf_counter_ns() - start) / 1_000_000.0
            payload = json.loads(response_body) if response_body.strip() else {}
            return int(response.status), payload, round(elapsed_ms, 3)
    except urllib.error.HTTPError as err:
        elapsed_ms = (time.perf_counter_ns() - start) / 1_000_000.0
        error_body = err.read().decode("utf-8", errors="replace")
        raise ApiError(method, url, err.code, error_body, f"HTTP {err.code} after {elapsed_ms:.3f}ms") from err
    except urllib.error.URLError as err:
        raise ApiError(method, url, None, "", str(err)) from err
    except (OSError, TimeoutError) as err:
        raise ApiError(method, url, None, "", str(err)) from err


def request_json_retry(
    method: str,
    url: str,
    token: str = "",
    body: dict[str, Any] | None = None,
    timeout: float = 30.0,
    attempts: int = 4,
) -> tuple[int, dict[str, Any], float]:
    last_error: ApiError | None = None
    total_elapsed_ms = 0.0
    for attempt in range(1, attempts + 1):
        try:
            status, payload, elapsed_ms = request_json(method, url, token=token, body=body, timeout=timeout)
            return status, payload, round(total_elapsed_ms + elapsed_ms, 3)
        except ApiError as err:
            last_error = err
            if err.status is not None and err.status < 500:
                raise
            if attempt >= attempts:
                raise
            sleep_sec = min(2.0, 0.2 * attempt)
            total_elapsed_ms += sleep_sec * 1000.0
            time.sleep(sleep_sec)
    if last_error is not None:
        raise last_error
    raise RuntimeError(f"{method} {url} retry loop ended without a result")


def summarize(samples: list[float]) -> dict[str, Any]:
    ordered = sorted(samples)
    return {
        "count": len(ordered),
        "min": round(ordered[0], 3) if ordered else None,
        "p50": percentile(ordered, 50),
        "p95": percentile(ordered, 95),
        "p99": percentile(ordered, 99),
        "max": round(ordered[-1], 3) if ordered else None,
        "mean": round(sum(ordered) / len(ordered), 3) if ordered else None,
        "percentile_method": "nearest_rank",
    }


def percentile(ordered: list[float], percentile_value: int) -> float | None:
    if not ordered:
        return None
    rank = max(1, math.ceil((percentile_value / 100.0) * len(ordered)))
    return round(ordered[min(rank - 1, len(ordered) - 1)], 3)


def build_answers(report: dict[str, Any]) -> dict[str, Any]:
    measurements = report.get("measurements", {})
    return {
        "local_compute_api_started": bool(report.get("api_base_url")),
        "list_get_claim_wall_time_measured": all(
            key in measurements for key in ("get_jobs_ms", "get_job_by_id_ms", "worker_claim_post_ms")
        ),
        "p50_p95_p99_written": all(
            measurements.get(key, {}).get("p50") is not None
            and measurements.get(key, {}).get("p95") is not None
            and measurements.get(key, {}).get("p99") is not None
            for key in ("get_jobs_ms", "get_job_by_id_ms", "worker_claim_post_ms")
        ),
        "claim_scanned_rows_reserved": "claim_scanned_rows" in report,
        "service_behavior_changes_required": False,
    }


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def find_free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        return int(sock.getsockname()[1])


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def git_metadata(repo_root: Path) -> dict[str, Any]:
    return {
        "commit": run_git(repo_root, ["rev-parse", "HEAD"]),
        "short_commit": run_git(repo_root, ["rev-parse", "--short", "HEAD"]),
        "status_short": run_git(repo_root, ["status", "--short"]).splitlines(),
    }


def run_git(repo_root: Path, args: list[str]) -> str:
    try:
        result = subprocess.run(
            ["git", *args],
            cwd=repo_root,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
        )
        return result.stdout.strip()
    except Exception:
        return ""


def exception_details(err: Exception, work_dir: Path) -> dict[str, Any]:
    details: dict[str, Any] = {
        "type": type(err).__name__,
        "message": str(err),
        "server_stdout_tail": tail_file(work_dir / "compute-api.stdout.log"),
        "server_stderr_tail": tail_file(work_dir / "compute-api.stderr.log"),
    }
    if isinstance(err, ApiError):
        details.update(
            {
                "method": err.method,
                "url": err.url,
                "status": err.status,
                "response_body": err.body,
            }
        )
    return details


def tail_file(path: Path, max_chars: int = 4000) -> str:
    if not path.exists():
        return ""
    text = path.read_text(encoding="utf-8", errors="replace")
    return text[-max_chars:]


def nested_get(value: Any, keys: list[str]) -> Any:
    current = value
    for key in keys:
        if not isinstance(current, dict):
            return None
        current = current.get(key)
    return current


def render_markdown(report: dict[str, Any]) -> str:
    lines = [
        "# Performance Go API Latency Phase 0",
        "",
        f"- status: `{report.get('status')}`",
        f"- generated_at: `{report.get('generated_at')}`",
        f"- api_base_url: `{report.get('api_base_url', '')}`",
        f"- hard_violations: `{len(report.get('hard_violations', []))}`",
        f"- open_gaps: `{len(report.get('open_gaps', []))}`",
        "",
        "## Latency Summary",
        "",
        "| metric | count | p50 ms | p95 ms | p99 ms | max ms |",
        "|---|---:|---:|---:|---:|---:|",
    ]
    for key, label in [
        ("get_jobs_ms", "GET /api/v1/compute/jobs"),
        ("get_job_by_id_ms", "GET /api/v1/compute/jobs/{id}"),
        ("worker_claim_post_ms", "POST /api/v1/workers/{worker_id}/claim"),
    ]:
        metric = report.get("measurements", {}).get(key, {})
        lines.append(
            f"| {label} | {metric.get('count', 0)} | {fmt(metric.get('p50'))} | "
            f"{fmt(metric.get('p95'))} | {fmt(metric.get('p99'))} | {fmt(metric.get('max'))} |"
        )
    lines.extend(
        [
            "",
            "## Claim Scanned Rows",
            "",
            f"- available: `{report.get('claim_scanned_rows', {}).get('available')}`",
            f"- source: {report.get('claim_scanned_rows', {}).get('source')}",
            "",
            "## Hard Violations",
            "",
        ]
    )
    violations = report.get("hard_violations", [])
    if not violations:
        lines.append("- none")
    else:
        for item in violations:
            lines.append(f"- `{item.get('rule')}`: {item.get('summary')}")
    return "\n".join(lines) + "\n"


def fmt(value: Any) -> str:
    if value is None:
        return ""
    return str(value)


if __name__ == "__main__":
    raise SystemExit(main())
