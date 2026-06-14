from __future__ import annotations

import argparse
import cProfile
import json
import os
import platform
import pstats
import shutil
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


CASES: list[dict[str, Any]] = [
    {
        "id": "small_material_balance",
        "size": "small",
        "fixture": "contracts/examples/valid/material_balance_minimal.compute_job.v1.json",
        "expected_job_type": "simulation.material_balance.v1",
        "purpose": "small transport/material-balance baseline",
    },
    {
        "id": "medium_asm1",
        "size": "medium",
        "fixture": "contracts/examples/valid/asm1_independent.compute_job.v1.json",
        "expected_job_type": "simulation.asm1.v1",
        "purpose": "medium ASM1 ODE baseline",
    },
    {
        "id": "udm_single",
        "size": "udm",
        "fixture": "contracts/examples/valid/udm_independent.compute_job.v1.json",
        "expected_job_type": "simulation.udm.v1",
        "purpose": "single UDM expression baseline",
    },
    {
        "id": "mixed_asm_udm",
        "size": "mixed_asm_udm",
        "fixture": "contracts/examples/valid/mixed_asm_udm.compute_job.v1.json",
        "expected_job_type": "simulation.udm.v1",
        "purpose": "current-state mixed ASM/UDM baseline",
    },
]

DEFAULT_SOLVERS = ("scipy_solver", "rk4", "adaptive_heun")
REQUESTED_BUCKETS = (
    "adapter_conversion",
    "artifact_serialization",
    "expression",
    "item_device_sync",
    "ode_framework",
    "schema_validation",
    "transport_dense_sparse",
)
ZERO_SELF_TIME_OK_BUCKETS = {"item_device_sync"}
HOT_PATH_MARKERS = {
    "expression": ("evaluate_reaction", "_evaluate_ast", "rate_expr"),
    "item_device_sync": (".item(",),
    "ode_framework": ("odeint(", "solve_ivp(", "adaptive_heun", "rk4"),
    "transport_dense_sparse": (
        "_balance_param",
        "_balance_param_sparse",
        "_build_runtime_edge_tensors",
        "_convert_to_tensors",
    ),
    "artifact_serialization": ("json.dumps", "_write_time_series_artifact"),
    "adapter_conversion": ("simulation_input_to_material_balance_input",),
}
STATIC_SCAN_FILES = (
    "simulation_core/python/autowatersimu_simulation_core/material_balance/core.py",
    "simulation_core/python/autowatersimu_simulation_core/material_balance/udm_engine.py",
    "simulation_core/python/autowatersimu_simulation_core/material_balance/udm_ode.py",
    "simulation_core/python/autowatersimu_simulation_core/material_balance/udm_expression.py",
    "services/simulation-worker/simulation_worker/runner.py",
)


def main() -> int:
    parser = argparse.ArgumentParser(description="Build Phase 0 profiling evidence for simulation worker runs.")
    parser.add_argument("--repo-root", default="")
    parser.add_argument("--evidence-dir", default="")
    parser.add_argument("--iterations", type=int, default=1)
    parser.add_argument("--solver", action="append", dest="solvers")
    parser.add_argument("--case-id", action="append", dest="case_ids")
    parser.add_argument("--fail-on-open-gaps", action="store_true")
    args = parser.parse_args()

    repo_root = Path(args.repo_root).resolve() if args.repo_root else Path(__file__).resolve().parents[2]
    evidence_dir = Path(args.evidence_dir).resolve() if args.evidence_dir else repo_root / "tmp" / "ci-evidence"
    evidence_dir.mkdir(parents=True, exist_ok=True)
    work_dir = repo_root / "tmp" / "performance-profiling-phase0"
    job_dir = work_dir / "jobs"
    artifact_root = work_dir / "artifacts"
    profile_dir = work_dir / "profiles"
    stdout_dir = work_dir / "stdout"
    stderr_dir = work_dir / "stderr"
    for path in (job_dir, artifact_root, profile_dir, stdout_dir, stderr_dir):
        path.mkdir(parents=True, exist_ok=True)

    solvers = tuple(args.solvers or DEFAULT_SOLVERS)
    case_ids = set(args.case_ids or [case["id"] for case in CASES])
    selected_cases = [case for case in CASES if case["id"] in case_ids]
    open_gaps: list[dict[str, Any]] = []
    hard_violations: list[dict[str, Any]] = []
    runs: list[dict[str, Any]] = []

    if args.iterations < 1:
        hard_violations.append(
            {
                "rule": "profiling-iterations",
                "summary": "--iterations must be >= 1.",
                "details": {"iterations": args.iterations},
            }
        )

    if not selected_cases:
        hard_violations.append(
            {
                "rule": "profiling-cases",
                "summary": "No profiling cases selected.",
                "details": {"case_ids": sorted(case_ids)},
            }
        )

    cli_path = repo_root / "services" / "simulation-worker" / "simulation_worker" / "cli.py"
    if not cli_path.exists():
        hard_violations.append(
            {
                "rule": "worker-cli-missing",
                "summary": "Worker CLI path is missing.",
                "details": {"path": str(cli_path)},
            }
        )

    for case in selected_cases:
        fixture_path = repo_root / case["fixture"]
        if not fixture_path.exists():
            open_gaps.append(
                {
                    "id": f"{case['id']}-profiling-fixture-missing",
                    "severity": "high",
                    "summary": "Required Phase 0 profiling fixture is missing.",
                    "evidence": {"fixture": case["fixture"], "case_id": case["id"]},
                }
            )
            continue

        for solver in solvers:
            for iteration in range(1, args.iterations + 1):
                run_id = f"{case['id']}_{solver}_iter{iteration}"
                run_record = run_profile(
                    repo_root=repo_root,
                    cli_path=cli_path,
                    fixture_path=fixture_path,
                    job_dir=job_dir,
                    artifact_root=artifact_root,
                    profile_dir=profile_dir,
                    stdout_dir=stdout_dir,
                    stderr_dir=stderr_dir,
                    case=case,
                    solver=solver,
                    iteration=iteration,
                    run_id=run_id,
                )
                runs.append(run_record)
                if run_record["exit_code"] != 0:
                    hard_violations.append(
                        {
                            "rule": "profiling-worker-exit-code",
                            "summary": "Profiled worker run exited non-zero.",
                            "details": run_record,
                        }
                    )
                elif run_record["status"] != "succeeded":
                    hard_violations.append(
                        {
                            "rule": "profiling-run-status",
                            "summary": "Profiled worker run did not succeed.",
                            "details": run_record,
                        }
                    )
                elif run_record["profile_summary"]["total_profile_self_time_ms"] <= 0:
                    hard_violations.append(
                        {
                            "rule": "profiling-empty-profile",
                            "summary": "Profile stats had no self time.",
                            "details": run_record,
                        }
                    )

    coverage = bucket_coverage(runs)
    static_hotpath_markers = scan_static_markers(repo_root)
    static_marker_buckets = {marker["bucket"] for marker in static_hotpath_markers}
    zero_self_time_buckets = [
        bucket for bucket in REQUESTED_BUCKETS if coverage.get(bucket, 0.0) <= 0.0
    ]
    zero_self_time_notes = [
        {
            "bucket": bucket,
            "reason": "zero self-time is acceptable when the device-sync bucket has no measured runtime cost and a static marker remains.",
        }
        for bucket in zero_self_time_buckets
        if bucket in ZERO_SELF_TIME_OK_BUCKETS and bucket in static_marker_buckets
    ]
    missing_buckets = [
        bucket
        for bucket in zero_self_time_buckets
        if not (bucket in ZERO_SELF_TIME_OK_BUCKETS and bucket in static_marker_buckets)
    ]
    if missing_buckets:
        open_gaps.append(
            {
                "id": "profiling-requested-buckets-zero-self-time",
                "severity": "medium",
                "summary": "Some requested profiling buckets had no measured self time; inspect static markers and raw profiles before choosing hot-path work.",
                "evidence": {"missing_buckets": missing_buckets, "coverage_ms": coverage},
            }
        )

    status = "passed"
    if hard_violations:
        status = "failed"
    elif open_gaps:
        status = "partial"

    report = {
        "schema_version": "autowatersimu_performance_profiling_phase0.v1",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "repo_root": str(repo_root),
        "status": status,
        "fail_on_open_gaps": bool(args.fail_on_open_gaps),
        "summary": {
            "cases_defined": len(CASES),
            "cases_profiled": len(selected_cases),
            "solvers": list(solvers),
            "iterations": args.iterations,
            "runs": len(runs),
            "hard_violations": len(hard_violations),
            "open_gaps": len(open_gaps),
            "requested_buckets": list(REQUESTED_BUCKETS),
            "bucket_coverage_ms": coverage,
            "zero_self_time_notes": zero_self_time_notes,
        },
        "environment": environment(repo_root),
        "matrix": selected_cases,
        "static_hotpath_markers": static_hotpath_markers,
        "runs": runs,
        "open_gaps": open_gaps,
        "hard_violations": hard_violations,
    }

    evidence_path = evidence_dir / "performance-profiling-phase0.json"
    markdown_path = evidence_dir / "performance-profiling-phase0.md"
    write_json(evidence_path, report)
    markdown_path.write_text(render_markdown(report), encoding="utf-8")

    print(f"performance profiling phase0 status: {status}")
    print(f"evidence: {evidence_path}")
    print(f"markdown: {markdown_path}")
    print(f"runs: {len(runs)}")
    print(f"hard_violations: {len(hard_violations)}")
    print(f"open_gaps: {len(open_gaps)}")

    if hard_violations:
        return 1
    if args.fail_on_open_gaps and open_gaps:
        return 1
    return 0


def run_profile(
    *,
    repo_root: Path,
    cli_path: Path,
    fixture_path: Path,
    job_dir: Path,
    artifact_root: Path,
    profile_dir: Path,
    stdout_dir: Path,
    stderr_dir: Path,
    case: dict[str, Any],
    solver: str,
    iteration: int,
    run_id: str,
) -> dict[str, Any]:
    job = read_json(fixture_path)
    job["job_id"] = f"prof_phase0_{run_id}"
    job["request_id"] = f"req_prof_phase0_{run_id}"
    job["idempotency_key"] = f"idem_prof_phase0_{run_id}"
    job["payload"]["simulation_input_id"] = f"si_prof_phase0_{run_id}"
    job["payload"]["parameters"]["solver_method"] = solver
    if isinstance(job.get("context"), dict):
        job["context"]["trace_id"] = f"trace_prof_phase0_{run_id}"

    job_path = job_dir / f"{run_id}.compute_job.v1.json"
    artifact_dir = artifact_root / run_id
    profile_path = profile_dir / f"{run_id}.prof"
    stdout_path = stdout_dir / f"{run_id}.stdout.json"
    stderr_path = stderr_dir / f"{run_id}.stderr.txt"
    artifact_dir.mkdir(parents=True, exist_ok=True)
    write_json(job_path, job)

    result_path = stdout_path
    command = [
        sys.executable,
        str(Path(__file__).resolve()),
        "--profile-worker-run-internal",
        "--repo-root",
        str(repo_root),
        "--job-path",
        str(job_path),
        "--artifact-dir",
        str(artifact_dir),
        "--profile-path",
        str(profile_path),
        "--result-path",
        str(result_path),
    ]
    started = time.perf_counter()
    process = subprocess.run(
        command,
        cwd=repo_root,
        text=True,
        capture_output=True,
        check=False,
    )
    wall_ms = int((time.perf_counter() - started) * 1000)
    stderr_path.write_text(process.stderr, encoding="utf-8")

    result: dict[str, Any] | None = None
    parse_error = ""
    if result_path.exists() and result_path.read_text(encoding="utf-8").strip():
        try:
            result = read_json(result_path)
        except json.JSONDecodeError as exc:
            parse_error = str(exc)

    profile_summary = parse_profile(profile_path, repo_root) if profile_path.exists() else empty_profile_summary()
    status = str(result.get("status", "unparsed")) if result else "unparsed"
    summary = result.get("summary", {}) if result else {}
    runtime_audit = result.get("runtime_audit", {}) if result else {}
    timings = runtime_audit.get("timings_ms", {}) if isinstance(runtime_audit, dict) else {}
    artifacts = result.get("artifacts", []) if result else []
    artifact_size = sum(int(artifact.get("size_bytes") or 0) for artifact in artifacts if isinstance(artifact, dict))

    return {
        "run_id": run_id,
        "case_id": case["id"],
        "size": case["size"],
        "purpose": case["purpose"],
        "fixture": case["fixture"],
        "solver_method": solver,
        "iteration": iteration,
        "command": command,
        "exit_code": process.returncode,
        "wall_ms": wall_ms,
        "status": status,
        "job_type": str(result.get("job_type", "")) if result else "",
        "runtime_timings_ms": timings,
        "artifact_count": len(artifacts),
        "artifact_size_bytes": artifact_size,
        "total_steps": summary.get("total_steps"),
        "total_time": summary.get("total_time"),
        "stdout_path": relative(stdout_path, repo_root),
        "stderr_path": relative(stderr_path, repo_root),
        "profile_path": relative(profile_path, repo_root),
        "stdout_parse_error": parse_error,
        "stderr_excerpt": process.stderr[-2000:],
        "profile_summary": profile_summary,
    }


def parse_profile(profile_path: Path, repo_root: Path) -> dict[str, Any]:
    stats = pstats.Stats(str(profile_path))
    category_self_seconds: dict[str, float] = {}
    top_self: list[dict[str, Any]] = []
    top_cumulative: list[dict[str, Any]] = []
    entries: list[dict[str, Any]] = []
    total_self = 0.0

    for func, stat in stats.stats.items():
        primitive_calls, total_calls, self_time, cumulative_time, _callers = stat
        filename, line, func_name = func
        rel_file = relative(Path(filename), repo_root) if filename and filename != "~" else filename
        category = categorize(rel_file, func_name)
        total_self += self_time
        category_self_seconds[category] = category_self_seconds.get(category, 0.0) + self_time
        entries.append(
            {
                "file": rel_file,
                "line": line,
                "function": func_name,
                "category": category,
                "primitive_calls": primitive_calls,
                "total_calls": total_calls,
                "self_time_ms": round(self_time * 1000, 3),
                "cumulative_time_ms": round(cumulative_time * 1000, 3),
            }
        )

    top_self = sorted(entries, key=lambda item: item["self_time_ms"], reverse=True)[:20]
    top_cumulative = sorted(entries, key=lambda item: item["cumulative_time_ms"], reverse=True)[:20]
    categories = []
    for category, seconds in sorted(category_self_seconds.items(), key=lambda item: item[1], reverse=True):
        percent = (seconds / total_self * 100.0) if total_self > 0 else 0.0
        categories.append(
            {
                "category": category,
                "self_time_ms": round(seconds * 1000, 3),
                "self_time_pct": round(percent, 2),
            }
        )

    return {
        "total_calls": stats.total_calls,
        "primitive_calls": stats.prim_calls,
        "total_profile_self_time_ms": round(total_self * 1000, 3),
        "categories": categories,
        "top_self_time_functions": top_self,
        "top_cumulative_time_functions": top_cumulative,
    }


def empty_profile_summary() -> dict[str, Any]:
    return {
        "total_calls": 0,
        "primitive_calls": 0,
        "total_profile_self_time_ms": 0.0,
        "categories": [],
        "top_self_time_functions": [],
        "top_cumulative_time_functions": [],
    }


def categorize(rel_file: str, func_name: str) -> str:
    path = rel_file.replace("\\", "/").lower()
    name = func_name.lower()
    if path == "~" and any(
        token in name
        for token in (
            "nt.stat",
            "io.open_code",
            "_imp.create_dynamic",
            "nt._getfinalpathname",
        )
    ):
        return "dependency_import"
    if "item" == name or ".item" in name or ("item" in name and "tensor" in name):
        return "item_device_sync"
    if "adapters" in path or "simulation_input_adapter" in path or "simulation_input_to_material_balance_input" in name:
        return "adapter_conversion"
    if "runner.py" in path and ("artifact" in name or "json_safe" in name):
        return "artifact_serialization"
    if "json/encoder" in path and ("iterencode" in name or "encode" in name):
        return "artifact_serialization"
    if "jsonschema" in path or "_validate_against_schema" in name:
        return "schema_validation"
    if "importlib" in path or "frozen importlib" in path:
        return "dependency_import"
    if "udm_expression.py" in path or ("udm_engine.py" in path and ("evaluate" in name or "reaction" in name)):
        return "expression"
    if "torchdiffeq" in path or "scipy" in path or any(token in name for token in ("odeint", "solve_ivp", "adaptive_heun", "rk4", "dopri")):
        return "ode_framework"
    if "material_balance/core.py" in path and any(
        token in name
        for token in (
            "balance_param",
            "edge",
            "transport",
            "flow",
            "sparse",
            "convert_to_tensors",
            "runtime_edge",
        )
    ):
        return "transport_dense_sparse"
    if "material_balance/core.py" in path or "material_balance/asm/" in path or "udm_ode.py" in path:
        return "core_compute"
    if "torch" in path:
        return "torch_ops"
    if "runner.py" in path or "cli.py" in path:
        return "worker_runner"
    return "other"


def bucket_coverage(runs: list[dict[str, Any]]) -> dict[str, float]:
    coverage = {bucket: 0.0 for bucket in REQUESTED_BUCKETS}
    for run in runs:
        for category in run.get("profile_summary", {}).get("categories", []):
            name = category.get("category")
            if name in coverage:
                coverage[name] += float(category.get("self_time_ms") or 0.0)
    return {key: round(value, 3) for key, value in coverage.items()}


def scan_static_markers(repo_root: Path) -> list[dict[str, Any]]:
    markers: list[dict[str, Any]] = []
    for relative_file in STATIC_SCAN_FILES:
        path = repo_root / relative_file
        if not path.exists():
            continue
        lines = path.read_text(encoding="utf-8").splitlines()
        for line_number, line in enumerate(lines, start=1):
            for bucket, tokens in HOT_PATH_MARKERS.items():
                if any(token in line for token in tokens):
                    markers.append(
                        {
                            "bucket": bucket,
                            "file": relative_file,
                            "line": line_number,
                            "text": line.strip()[:200],
                        }
                    )
    return markers


def environment(repo_root: Path) -> dict[str, Any]:
    torch_info: dict[str, Any] = {"available": False}
    try:
        import torch

        torch_info = {
            "available": True,
            "version": torch.__version__,
            "num_threads": torch.get_num_threads(),
            "num_interop_threads": torch.get_num_interop_threads(),
            "cuda_available": bool(torch.cuda.is_available()),
        }
    except Exception as exc:
        torch_info = {"available": False, "error": str(exc)}

    return {
        "git_sha": git_text(repo_root, "rev-parse", "--short", "HEAD"),
        "git_branch": git_text(repo_root, "branch", "--show-current"),
        "git_status_short": git_lines(repo_root, "status", "--short"),
        "python": sys.executable,
        "python_version": platform.python_version(),
        "platform": platform.platform(),
        "processor": platform.processor(),
        "cpu_count": os.cpu_count(),
        "torch": torch_info,
    }


def render_markdown(report: dict[str, Any]) -> str:
    lines = [
        "# Performance Profiling Phase 0",
        "",
        f"- Status: `{report['status']}`",
        f"- Generated at: `{report['generated_at']}`",
        f"- Runs: `{report['summary']['runs']}`",
        f"- Hard violations: `{report['summary']['hard_violations']}`",
        f"- Open gaps: `{report['summary']['open_gaps']}`",
        "",
        "## Environment",
        "",
        f"- Git SHA: `{report['environment'].get('git_sha', '')}`",
        f"- Python: `{report['environment'].get('python_version', '')}`",
        f"- Platform: `{report['environment'].get('platform', '')}`",
        f"- CPU count: `{report['environment'].get('cpu_count', '')}`",
        f"- Torch: `{report['environment'].get('torch', {}).get('version', 'unavailable')}`",
        f"- Torch threads: `{report['environment'].get('torch', {}).get('num_threads', 'unknown')}`",
        "",
        "## Run Summary",
        "",
        "| Case | Solver | Status | Wall ms | Compute ms | Adapter ms | Artifact ms | Top self-time buckets | Raw profile |",
        "|---|---|---:|---:|---:|---:|---:|---|---|",
    ]
    for run in report["runs"]:
        timings = run.get("runtime_timings_ms") or {}
        requested_categories = [
            item
            for item in run.get("profile_summary", {}).get("categories", [])
            if item.get("category") in REQUESTED_BUCKETS
        ]
        buckets = ", ".join(f"{item['category']} {item['self_time_pct']}%" for item in requested_categories[:5])
        lines.append(
            "| {case} | {solver} | {status} | {wall} | {compute} | {adapter} | {artifact} | {buckets} | `{profile}` |".format(
                case=run["case_id"],
                solver=run["solver_method"],
                status=run["status"],
                wall=run["wall_ms"],
                compute=timings.get("compute", ""),
                adapter=timings.get("adapter_convert", ""),
                artifact=timings.get("artifact_serialize", ""),
                buckets=buckets,
                profile=run["profile_path"],
            )
        )

    lines.extend(["", "## Requested Bucket Coverage", "", "| Bucket | Self time ms |", "|---|---:|"])
    for bucket, value in report["summary"]["bucket_coverage_ms"].items():
        lines.append(f"| {bucket} | {value} |")

    if report["summary"].get("zero_self_time_notes"):
        lines.extend(["", "## Zero Self-Time Notes", ""])
        for note in report["summary"]["zero_self_time_notes"]:
            lines.append(f"- `{note['bucket']}`: {note['reason']}")

    lines.extend(["", "## Static Hot-Path Markers", "", "| Bucket | File | Line | Marker |", "|---|---|---:|---|"])
    for marker in report["static_hotpath_markers"][:80]:
        text = marker["text"].replace("|", "\\|")
        lines.append(f"| {marker['bucket']} | `{marker['file']}` | {marker['line']} | `{text}` |")

    if report["open_gaps"]:
        lines.extend(["", "## Open Gaps", ""])
        for gap in report["open_gaps"]:
            lines.append(f"- `{gap['id']}`: {gap['summary']}")

    if report["hard_violations"]:
        lines.extend(["", "## Hard Violations", ""])
        for violation in report["hard_violations"]:
            lines.append(f"- `{violation['rule']}`: {violation['summary']}")

    lines.append("")
    return "\n".join(lines)


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value: Any) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def relative(path: Path, root: Path) -> str:
    try:
        return str(path.resolve().relative_to(root.resolve())).replace("\\", "/")
    except Exception:
        return str(path).replace("\\", "/")


def git_text(repo_root: Path, *args: str) -> str:
    git = shutil.which("git")
    if not git:
        return ""
    try:
        result = subprocess.run(
            [git, "-C", str(repo_root), *args],
            text=True,
            capture_output=True,
            check=False,
        )
    except Exception:
        return ""
    if result.returncode != 0:
        return ""
    return result.stdout.strip()


def git_lines(repo_root: Path, *args: str) -> list[str]:
    text = git_text(repo_root, *args)
    return [line for line in text.splitlines() if line.strip()]


def profile_worker_run_internal() -> int:
    parser = argparse.ArgumentParser(description=argparse.SUPPRESS)
    parser.add_argument("--repo-root", required=True)
    parser.add_argument("--job-path", required=True)
    parser.add_argument("--artifact-dir", required=True)
    parser.add_argument("--profile-path", required=True)
    parser.add_argument("--result-path", required=True)
    args = parser.parse_args(sys.argv[2:])

    repo_root = Path(args.repo_root).resolve()
    worker_parent = repo_root / "services" / "simulation-worker"
    sys.path.insert(0, str(worker_parent))
    from simulation_worker.runner import run_job_file

    profile = cProfile.Profile()
    profile.enable()
    result = run_job_file(args.job_path, args.artifact_dir)
    profile.disable()

    Path(args.profile_path).parent.mkdir(parents=True, exist_ok=True)
    Path(args.result_path).parent.mkdir(parents=True, exist_ok=True)
    profile.dump_stats(args.profile_path)
    write_json(Path(args.result_path), result)
    return 0


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--profile-worker-run-internal":
        raise SystemExit(profile_worker_run_internal())
    raise SystemExit(main())
