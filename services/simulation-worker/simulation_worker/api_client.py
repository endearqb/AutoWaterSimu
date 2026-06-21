from __future__ import annotations

import json
import os
import socket
import time
import uuid
from pathlib import Path
from typing import Any
from urllib import error, parse, request

try:
    from .runner import (
        SUPPORTED_CAPABILITIES,
        SUPPORTED_CONTRACT_VERSIONS,
        WORKER_VERSION,
        run_job,
    )
except ImportError:
    from runner import (  # type: ignore
        SUPPORTED_CAPABILITIES,
        SUPPORTED_CONTRACT_VERSIONS,
        WORKER_VERSION,
        run_job,
    )


DEFAULT_API_BASE_URL = "http://localhost:8088"
DEFAULT_API_TOKEN = os.getenv("SIMULATION_WORKER_API_TOKEN", "")
DEFAULT_IDLE_SLEEP_SECONDS = 5.0


class ComputeAPIClientError(RuntimeError):
    """Handled HTTP worker client failure."""


class ComputeAPIClient:
    def __init__(self, *, base_url: str, token: str, timeout_seconds: float = 30.0) -> None:
        self.base_url = base_url.rstrip("/")
        self.token = token
        self.timeout_seconds = timeout_seconds

    def post_json(self, path: str, payload: dict[str, Any]) -> dict[str, Any]:
        body = json.dumps(payload, ensure_ascii=False, sort_keys=True).encode("utf-8")
        req = request.Request(
            self._url(path),
            data=body,
            method="POST",
            headers=self._headers({
                "Content-Type": "application/json",
                "Accept": "application/json",
            }),
        )
        return self._send_json(req)

    def upload_artifact(
        self,
        *,
        worker_id: str,
        job_id: str,
        artifact: dict[str, Any],
        artifact_dir: Path,
    ) -> dict[str, Any]:
        object_key = str(artifact.get("object_key") or "")
        artifact_path = artifact_dir / Path(object_key)
        try:
            file_bytes = artifact_path.read_bytes()
        except OSError as exc:
            raise ComputeAPIClientError(f"artifact file is not readable: {object_key}") from exc

        boundary = f"----autowatersimu-{uuid.uuid4().hex}"
        body = _multipart_body(
            boundary=boundary,
            metadata=json.dumps(artifact, ensure_ascii=False, sort_keys=True),
            file_name=artifact_path.name or "artifact.json",
            file_bytes=file_bytes,
            content_type=str(artifact.get("content_type") or "application/json"),
        )
        req = request.Request(
            self._url(
                f"/api/v1/workers/{_quote(worker_id)}/jobs/{_quote(job_id)}/artifact"
            ),
            data=body,
            method="POST",
            headers=self._headers({
                "Content-Type": f"multipart/form-data; boundary={boundary}",
                "Accept": "application/json",
            }),
        )
        return self._send_json(req)

    def heartbeat(self, *, worker_id: str, job_id: str) -> dict[str, Any]:
        return self.post_json(
            f"/api/v1/workers/{_quote(worker_id)}/heartbeat",
            {"job_id": job_id},
        )

    def _send_json(self, req: request.Request) -> dict[str, Any]:
        try:
            with request.urlopen(req, timeout=self.timeout_seconds) as resp:
                data = resp.read()
        except error.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="replace")[:500]
            raise ComputeAPIClientError(f"compute api HTTP {exc.code}: {body}") from exc
        except OSError as exc:
            raise ComputeAPIClientError(f"compute api request failed: {exc}") from exc

        if not data:
            return {}
        try:
            payload = json.loads(data.decode("utf-8"))
        except json.JSONDecodeError as exc:
            raise ComputeAPIClientError("compute api returned invalid JSON") from exc
        if not isinstance(payload, dict):
            raise ComputeAPIClientError("compute api JSON response must be an object")
        return payload

    def _url(self, path: str) -> str:
        return f"{self.base_url}{path}"

    def _headers(self, headers: dict[str, str]) -> dict[str, str]:
        result = dict(headers)
        token = self.token.strip()
        if token:
            result["Authorization"] = f"Bearer {token}"
        return result


def run_api_once(
    *,
    base_url: str = DEFAULT_API_BASE_URL,
    token: str = DEFAULT_API_TOKEN,
    worker_id: str | None = None,
    artifact_dir: str | Path = "artifacts",
    adapter_validation_mode: str | None = None,
) -> dict[str, Any]:
    worker_id = worker_id or default_worker_id()
    client = ComputeAPIClient(base_url=base_url, token=token)
    _register_worker(client, worker_id)
    return _claim_and_run_once(
        client=client,
        worker_id=worker_id,
        artifact_dir_path=Path(artifact_dir),
        adapter_validation_mode=adapter_validation_mode,
    )


def run_api_loop(
    *,
    base_url: str = DEFAULT_API_BASE_URL,
    token: str = DEFAULT_API_TOKEN,
    worker_id: str | None = None,
    artifact_dir: str | Path = "artifacts",
    max_jobs: int | None = None,
    max_idle_polls: int | None = None,
    idle_sleep_seconds: float = DEFAULT_IDLE_SLEEP_SECONDS,
    adapter_validation_mode: str | None = None,
) -> dict[str, Any]:
    worker_id = worker_id or default_worker_id()
    client = ComputeAPIClient(base_url=base_url, token=token)
    artifact_dir_path = Path(artifact_dir)
    _register_worker(client, worker_id)

    processed = 0
    idle_polls = 0
    results: list[dict[str, Any]] = []
    while max_jobs is None or processed < max_jobs:
        result = _claim_and_run_once(
            client=client,
            worker_id=worker_id,
            artifact_dir_path=artifact_dir_path,
            include_compute_result=False,
            adapter_validation_mode=adapter_validation_mode,
        )
        if result.get("status") == "idle":
            idle_polls += 1
            if max_idle_polls is not None and idle_polls >= max_idle_polls:
                break
            if idle_sleep_seconds > 0:
                time.sleep(idle_sleep_seconds)
            continue

        idle_polls = 0
        processed += 1
        results.append(_loop_result_summary(result))

    return {
        "status": "completed",
        "worker_id": worker_id,
        "jobs_processed": processed,
        "idle_polls": idle_polls,
        "results": results,
    }


def _register_worker(client: ComputeAPIClient, worker_id: str) -> None:
    registration = {
        "worker_id": worker_id,
        "capabilities": SUPPORTED_CAPABILITIES,
        "supported_contract_versions": SUPPORTED_CONTRACT_VERSIONS,
        "runtime_version": WORKER_VERSION,
    }
    client.post_json("/api/v1/workers/register", registration)


def _claim_and_run_once(
    *,
    client: ComputeAPIClient,
    worker_id: str,
    artifact_dir_path: Path,
    include_compute_result: bool = True,
    adapter_validation_mode: str | None = None,
) -> dict[str, Any]:
    claim = client.post_json(f"/api/v1/workers/{_quote(worker_id)}/claim", {})
    job = claim.get("job")
    if job is None:
        return {"status": "idle", "worker_id": worker_id, "claim": claim}
    if not isinstance(job, dict):
        raise ComputeAPIClientError("claim response job must be an object")

    job_id = str(job.get("job_id") or "")
    if not job_id:
        raise ComputeAPIClientError("claimed job missing job_id")
    attempt = _int_value(claim.get("attempt"))
    if attempt <= 0:
        raise ComputeAPIClientError("claim response missing positive attempt")

    heartbeat = client.heartbeat(worker_id=worker_id, job_id=job_id)
    if bool(heartbeat.get("job_terminal")) or bool(heartbeat.get("cancel_requested")):
        return {
            "status": "cancelled" if heartbeat.get("cancel_requested") else "skipped",
            "worker_id": worker_id,
            "job_id": job_id,
            "attempt": attempt,
            "heartbeat": heartbeat,
        }

    compute_result = run_job(
        job,
        artifact_dir_path,
        adapter_validation_mode=adapter_validation_mode,
    )
    status = str(compute_result.get("status") or "failed")
    if status == "succeeded":
        uploaded_artifacts = [
            client.upload_artifact(
                worker_id=worker_id,
                job_id=job_id,
                artifact=artifact,
                artifact_dir=artifact_dir_path,
            )
            for artifact in _artifact_records(compute_result)
        ]
        compute_result["artifacts"] = uploaded_artifacts
        _replace_model_run_evidence_refs(compute_result, uploaded_artifacts)
        snapshot = client.post_json(
            f"/api/v1/workers/{_quote(worker_id)}/jobs/{_quote(job_id)}/succeed",
            {"attempt": attempt, "compute_result": compute_result},
        )
    else:
        summary = compute_result.get("summary") if isinstance(compute_result.get("summary"), dict) else {}
        snapshot = client.post_json(
            f"/api/v1/workers/{_quote(worker_id)}/jobs/{_quote(job_id)}/fail",
            {
                "attempt": attempt,
                "error_code": str(summary.get("error_code") or "WORKER_FAILED"),
                "error_message": str(summary.get("error_message") or "worker failed"),
            },
        )

    return {
        "status": status,
        "worker_id": worker_id,
        "job_id": job_id,
        "attempt": attempt,
        "snapshot": snapshot,
        **({"compute_result": compute_result} if include_compute_result else {}),
    }


def _loop_result_summary(result: dict[str, Any]) -> dict[str, Any]:
    return {
        key: result[key]
        for key in ("status", "worker_id", "job_id", "attempt")
        if key in result
    }


def default_worker_id() -> str:
    return os.getenv("COMPUTE_WORKER_ID") or f"worker_{socket.gethostname()}_{os.getpid()}"


def _artifact_records(compute_result: dict[str, Any]) -> list[dict[str, Any]]:
    artifacts = compute_result.get("artifacts")
    if not isinstance(artifacts, list):
        return []
    return [artifact for artifact in artifacts if isinstance(artifact, dict)]


def _replace_model_run_evidence_refs(
    compute_result: dict[str, Any],
    artifacts: list[dict[str, Any]],
) -> None:
    artifact_ids = [
        str(artifact.get("artifact_id"))
        for artifact in artifacts
        if str(artifact.get("artifact_id") or "")
    ]
    runtime_audit = compute_result.get("runtime_audit")
    if not isinstance(runtime_audit, dict):
        return
    model_runs = runtime_audit.get("model_runs")
    if not isinstance(model_runs, list):
        return
    for model_run in model_runs:
        if isinstance(model_run, dict):
            model_run["evidence_refs"] = artifact_ids


def _multipart_body(
    *,
    boundary: str,
    metadata: str,
    file_name: str,
    file_bytes: bytes,
    content_type: str,
) -> bytes:
    chunks = [
        f"--{boundary}\r\n".encode("utf-8"),
        b'Content-Disposition: form-data; name="metadata"\r\n',
        b"Content-Type: application/json\r\n\r\n",
        metadata.encode("utf-8"),
        b"\r\n",
        f"--{boundary}\r\n".encode("utf-8"),
        f'Content-Disposition: form-data; name="file"; filename="{file_name}"\r\n'.encode(
            "utf-8"
        ),
        f"Content-Type: {content_type}\r\n\r\n".encode("utf-8"),
        file_bytes,
        b"\r\n",
        f"--{boundary}--\r\n".encode("utf-8"),
    ]
    return b"".join(chunks)


def _quote(value: str) -> str:
    return parse.quote(value, safe="")


def _int_value(value: Any) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return 0
