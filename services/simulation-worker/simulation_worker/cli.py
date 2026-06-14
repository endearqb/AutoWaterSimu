from __future__ import annotations

import argparse
import json
import sys
from typing import IO, Any

try:
    from .api_client import (
        DEFAULT_API_BASE_URL,
        DEFAULT_API_TOKEN,
        run_api_loop,
        run_api_once,
    )
    from .runner import run_job, run_job_file, self_check
except ImportError:
    from api_client import (  # type: ignore
        DEFAULT_API_BASE_URL,
        DEFAULT_API_TOKEN,
        run_api_loop,
        run_api_once,
    )
    from runner import run_job, run_job_file, self_check  # type: ignore


def main(
    argv: list[str] | None = None,
    *,
    stdin: IO[str] | None = None,
    stdout: IO[str] | None = None,
    stderr: IO[str] | None = None,
) -> int:
    parser = argparse.ArgumentParser(prog="simulation-worker")
    parser.add_argument("--self-check", action="store_true")
    parser.add_argument("--run-job")
    parser.add_argument("--artifact-dir", default="artifacts")
    parser.add_argument("--stdio-jsonrpc", action="store_true")
    parser.add_argument("--run-api-once", action="store_true")
    parser.add_argument("--run-api-loop", action="store_true")
    parser.add_argument("--api-base-url", default=DEFAULT_API_BASE_URL)
    parser.add_argument("--api-token", default=DEFAULT_API_TOKEN)
    parser.add_argument("--worker-id")
    parser.add_argument(
        "--adapter-validation-mode",
        choices=("compat", "warn", "strict"),
        help="Override the simulation_input adapter validation mode for this worker invocation.",
    )
    parser.add_argument("--max-jobs", type=int)
    parser.add_argument("--max-idle-polls", type=int)
    parser.add_argument("--idle-sleep-seconds", type=float, default=5.0)
    args = parser.parse_args(argv)

    stdin = stdin or sys.stdin
    stdout = stdout or sys.stdout
    stderr = stderr or sys.stderr

    if args.self_check:
        _write_json(stdout, self_check())
        return 0

    if args.stdio_jsonrpc:
        return _run_stdio_jsonrpc(
            stdin=stdin,
            stdout=stdout,
            stderr=stderr,
            adapter_validation_mode=args.adapter_validation_mode,
        )

    if args.run_api_once:
        try:
            result = run_api_once(
                base_url=args.api_base_url,
                token=args.api_token,
                worker_id=args.worker_id,
                artifact_dir=args.artifact_dir,
                adapter_validation_mode=args.adapter_validation_mode,
            )
            _write_json(stdout, result)
            return 0
        except Exception as exc:
            message = _safe_error_message(exc)
            _write_json(stdout, {"status": "failed", "error_message": message})
            print(f"simulation-worker api client failed: {message}", file=stderr)
            return 1

    if args.run_api_loop:
        try:
            result = run_api_loop(
                base_url=args.api_base_url,
                token=args.api_token,
                worker_id=args.worker_id,
                artifact_dir=args.artifact_dir,
                max_jobs=args.max_jobs,
                max_idle_polls=args.max_idle_polls,
                idle_sleep_seconds=args.idle_sleep_seconds,
                adapter_validation_mode=args.adapter_validation_mode,
            )
            _write_json(stdout, result)
            return 0
        except Exception as exc:
            message = _safe_error_message(exc)
            _write_json(stdout, {"status": "failed", "error_message": message})
            print(f"simulation-worker api client failed: {message}", file=stderr)
            return 1

    if args.run_job:
        result = run_job_file(
            args.run_job,
            args.artifact_dir,
            adapter_validation_mode=args.adapter_validation_mode,
        )
        _write_json(stdout, result)
        if result.get("status") == "failed":
            print(
                f"simulation-worker failed job {result.get('job_id')}: {result.get('summary', {}).get('error_message')}",
                file=stderr,
            )
        return 0

    parser.print_help(stderr)
    return 2


def _run_stdio_jsonrpc(
    *,
    stdin: IO[str],
    stdout: IO[str],
    stderr: IO[str],
    adapter_validation_mode: str | None = None,
) -> int:
    for line in stdin:
        raw_line = line.strip()
        if not raw_line:
            continue
        try:
            request = json.loads(raw_line)
            response = _handle_jsonrpc_request(
                request,
                adapter_validation_mode=adapter_validation_mode,
            )
        except Exception as exc:
            response = {
                "jsonrpc": "2.0",
                "id": None,
                "error": {"code": -32700, "message": _safe_error_message(exc)},
            }
            print(f"simulation-worker jsonrpc error: {response['error']['message']}", file=stderr)
        _write_json(stdout, response)
        stdout.flush()
    return 0


def _handle_jsonrpc_request(
    request: dict[str, Any],
    *,
    adapter_validation_mode: str | None = None,
) -> dict[str, Any]:
    request_id = request.get("id")
    method = request.get("method")
    params = request.get("params") if isinstance(request.get("params"), dict) else {}

    if method == "self_check":
        return {"jsonrpc": "2.0", "id": request_id, "result": self_check()}

    if method == "run_job":
        artifact_dir = params.get("artifact_dir", "artifacts")
        job = params.get("job")
        request_adapter_validation_mode = params.get("adapter_validation_mode")
        effective_adapter_validation_mode = (
            str(request_adapter_validation_mode)
            if isinstance(request_adapter_validation_mode, str) and request_adapter_validation_mode
            else adapter_validation_mode
        )
        if isinstance(job, dict):
            return {
                "jsonrpc": "2.0",
                "id": request_id,
                "result": {
                    "compute_result": run_job(
                        job,
                        str(artifact_dir),
                        adapter_validation_mode=effective_adapter_validation_mode,
                    )
                },
            }

        job_path = params.get("job_path")
        if not isinstance(job_path, str) or not job_path:
            return {
                "jsonrpc": "2.0",
                "id": request_id,
                "error": {
                    "code": -32602,
                    "message": "params.job or params.job_path is required",
                },
            }
        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "result": {
                "compute_result": run_job_file(
                    job_path,
                    str(artifact_dir),
                    adapter_validation_mode=effective_adapter_validation_mode,
                )
            },
        }

    return {
        "jsonrpc": "2.0",
        "id": request_id,
        "error": {"code": -32601, "message": f"unknown method: {method}"},
    }


def _write_json(stdout: IO[str], payload: dict[str, Any]) -> None:
    stdout.write(json.dumps(payload, ensure_ascii=False, sort_keys=True))
    stdout.write("\n")
    stdout.flush()


def _safe_error_message(exc: Exception) -> str:
    return str(exc).splitlines()[0][:500] or exc.__class__.__name__


if __name__ == "__main__":
    raise SystemExit(main())
