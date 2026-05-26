from __future__ import annotations

import argparse
import json
import sys
from typing import IO, Any

try:
    from .runner import run_job_file, self_check
except ImportError:
    from runner import run_job_file, self_check  # type: ignore


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
    args = parser.parse_args(argv)

    stdin = stdin or sys.stdin
    stdout = stdout or sys.stdout
    stderr = stderr or sys.stderr

    if args.self_check:
        _write_json(stdout, self_check())
        return 0

    if args.stdio_jsonrpc:
        return _run_stdio_jsonrpc(stdin=stdin, stdout=stdout, stderr=stderr)

    if args.run_job:
        result = run_job_file(args.run_job, args.artifact_dir)
        _write_json(stdout, result)
        if result.get("status") == "failed":
            print(
                f"simulation-worker failed job {result.get('job_id')}: {result.get('summary', {}).get('error_message')}",
                file=stderr,
            )
        return 0

    parser.print_help(stderr)
    return 2


def _run_stdio_jsonrpc(*, stdin: IO[str], stdout: IO[str], stderr: IO[str]) -> int:
    for line in stdin:
        raw_line = line.strip()
        if not raw_line:
            continue
        try:
            request = json.loads(raw_line)
            response = _handle_jsonrpc_request(request)
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


def _handle_jsonrpc_request(request: dict[str, Any]) -> dict[str, Any]:
    request_id = request.get("id")
    method = request.get("method")
    params = request.get("params") if isinstance(request.get("params"), dict) else {}

    if method == "self_check":
        return {"jsonrpc": "2.0", "id": request_id, "result": self_check()}

    if method == "run_job":
        job_path = params.get("job_path")
        artifact_dir = params.get("artifact_dir", "artifacts")
        if not isinstance(job_path, str) or not job_path:
            return {
                "jsonrpc": "2.0",
                "id": request_id,
                "error": {"code": -32602, "message": "params.job_path is required"},
            }
        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "result": run_job_file(job_path, str(artifact_dir)),
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
