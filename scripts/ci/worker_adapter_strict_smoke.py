from __future__ import annotations

import argparse
import json
import subprocess
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Run worker adapter strict-mode smoke across valid compute_job fixtures."
    )
    parser.add_argument("--repo-root", default="")
    parser.add_argument("--evidence-dir", default="")
    args = parser.parse_args()

    repo_root = Path(args.repo_root).resolve() if args.repo_root else Path(__file__).resolve().parents[2]
    evidence_dir = Path(args.evidence_dir).resolve() if args.evidence_dir else repo_root / "tmp" / "ci-evidence"
    work_dir = repo_root / "tmp" / "worker-adapter-strict-smoke"
    evidence_dir.mkdir(parents=True, exist_ok=True)
    work_dir.mkdir(parents=True, exist_ok=True)

    hard_violations: list[dict[str, Any]] = []
    fixtures = sorted((repo_root / "contracts" / "examples" / "valid").glob("*.compute_job.v1.json"))
    if not fixtures:
        hard_violations.append(
            {
                "rule": "worker-adapter-strict-fixtures-missing",
                "summary": "No valid compute_job fixtures were found for strict-mode smoke.",
                "details": {"glob": "contracts/examples/valid/*.compute_job.v1.json"},
            }
        )

    self_check = run_self_check(repo_root)
    if self_check.get("exit_code") != 0 or self_check.get("payload", {}).get("adapter_validation_mode", {}).get("mode") != "strict":
        hard_violations.append(
            {
                "rule": "worker-adapter-strict-self-check",
                "summary": "Worker self-check did not report strict adapter validation mode under the strict env.",
                "details": self_check,
            }
        )

    results = [
        run_fixture(repo_root, work_dir, fixture)
        for fixture in fixtures
    ]
    for result in results:
        if result.get("status") != "passed":
            hard_violations.append(
                {
                    "rule": "worker-adapter-strict-fixture-failed",
                    "summary": "A valid compute_job fixture failed under strict adapter validation mode.",
                    "details": result,
                }
            )

    passed = sum(1 for result in results if result.get("status") == "passed")
    failure_reasons = Counter(
        str(result.get("error_code") or result.get("error_message") or "unknown")
        for result in results
        if result.get("status") != "passed"
    )

    report = {
        "schema_version": "autowatersimu_worker_adapter_strict_smoke.v1",
        "generated_at": utc_now(),
        "repo_root": str(repo_root),
        "status": "failed" if hard_violations else "passed",
        "summary": {
            "fixtures_total": len(results),
            "fixtures_passed": passed,
            "fixtures_failed": len(results) - passed,
            "pass_rate": round(passed / len(results), 4) if results else 0.0,
            "hard_violations": len(hard_violations),
            "open_gaps": 0,
        },
        "git": git_metadata(repo_root),
        "adapter_validation_mode": {
            "default_mode": "compat",
            "strict_env_var": "AUTOWATERSIMU_WORKER_ADAPTER_VALIDATION_MODE",
            "strict_cli_flag": "--adapter-validation-mode strict",
            "default_behavior_changed": False,
        },
        "rollout_policy": {
            "warn_to_strict_switch_conditions": [
                "input-contract audit remains passed",
                "worker-adapter-strict-smoke remains passed on tracked valid compute_job fixtures",
                "failed fixture reasons are either zero or documented with migration owners",
                "frontend copy is updated before making strict the default for user-submitted flows",
                "strict default switch is made in a separate PR",
            ],
            "this_smoke_changes_default": False,
        },
        "self_check": self_check,
        "fixture_results": results,
        "failure_reasons": dict(failure_reasons),
        "open_gaps": [],
        "hard_violations": hard_violations,
    }

    evidence_path = evidence_dir / "worker-adapter-strict-smoke.json"
    markdown_path = evidence_dir / "worker-adapter-strict-smoke.md"
    write_json(evidence_path, report)
    markdown_path.write_text(render_markdown(report), encoding="utf-8")

    print(f"worker adapter strict smoke status: {report['status']}")
    print(f"evidence: {evidence_path}")
    print(f"markdown: {markdown_path}")
    print(f"fixtures: {passed}/{len(results)} passed")
    print(f"hard_violations: {len(hard_violations)}")
    print("open_gaps: 0")
    return 1 if hard_violations else 0


def run_self_check(repo_root: Path) -> dict[str, Any]:
    env = {"AUTOWATERSIMU_WORKER_ADAPTER_VALIDATION_MODE": "strict"}
    completed = run_worker(
        repo_root,
        ["--self-check"],
        artifact_dir=None,
        extra_env=env,
    )
    payload = parse_json(completed.stdout)
    return {
        "exit_code": completed.returncode,
        "stdout_parseable": isinstance(payload, dict),
        "payload": payload if isinstance(payload, dict) else None,
        "stderr": completed.stderr.strip(),
    }


def run_fixture(repo_root: Path, work_dir: Path, fixture: Path) -> dict[str, Any]:
    artifact_dir = work_dir / "artifacts" / fixture.stem.replace(".", "_")
    completed = run_worker(
        repo_root,
        [
            "--run-job",
            str(fixture),
            "--artifact-dir",
            str(artifact_dir),
            "--adapter-validation-mode",
            "strict",
        ],
        artifact_dir=artifact_dir,
    )
    payload = parse_json(completed.stdout)
    result_status = payload.get("status") if isinstance(payload, dict) else None
    runtime_audit = payload.get("runtime_audit") if isinstance(payload, dict) else {}
    summary = payload.get("summary") if isinstance(payload, dict) else {}
    error_message = ""
    if isinstance(summary, dict):
        error_message = str(summary.get("error_message") or "")
    status = "passed" if completed.returncode == 0 and result_status == "succeeded" else "failed"
    return {
        "fixture": str(fixture.relative_to(repo_root)),
        "status": status,
        "worker_exit_code": completed.returncode,
        "compute_result_status": result_status,
        "adapter_validation_mode": runtime_audit.get("adapter_validation_mode") if isinstance(runtime_audit, dict) else None,
        "error_message": error_message,
        "stderr": completed.stderr.strip(),
    }


def run_worker(
    repo_root: Path,
    args: list[str],
    *,
    artifact_dir: Path | None,
    extra_env: dict[str, str] | None = None,
) -> subprocess.CompletedProcess[str]:
    env = None
    if extra_env:
        import os

        env = os.environ.copy()
        env.update(extra_env)
    return subprocess.run(
        [
            sys.executable,
            str(repo_root / "services" / "simulation-worker" / "simulation_worker" / "cli.py"),
            *args,
        ],
        cwd=repo_root,
        env=env,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )


def parse_json(text: str) -> Any:
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return None


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def render_markdown(report: dict[str, Any]) -> str:
    lines = [
        "# Worker Adapter Strict Smoke",
        "",
        f"- status: `{report.get('status')}`",
        f"- generated_at: `{report.get('generated_at')}`",
        f"- pass_rate: `{report.get('summary', {}).get('pass_rate')}`",
        f"- hard_violations: `{len(report.get('hard_violations', []))}`",
        "",
        "## Fixtures",
        "",
        "| fixture | status | adapter mode | error |",
        "|---|---|---|---|",
    ]
    for item in report.get("fixture_results", []):
        lines.append(
            "| {fixture} | {status} | {mode} | {error} |".format(
                fixture=item.get("fixture", ""),
                status=item.get("status", ""),
                mode=item.get("adapter_validation_mode", ""),
                error=str(item.get("error_message") or "").replace("|", "\\|"),
            )
        )
    lines.extend(["", "## Hard Violations", ""])
    violations = report.get("hard_violations", [])
    if not violations:
        lines.append("- none")
    else:
        for item in violations:
            lines.append(f"- `{item.get('rule')}`: {item.get('summary')}")
    return "\n".join(lines) + "\n"


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


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


if __name__ == "__main__":
    raise SystemExit(main())
