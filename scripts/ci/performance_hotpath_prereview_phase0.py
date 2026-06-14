from __future__ import annotations

import argparse
import json
import statistics
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


EVIDENCE_FILES = {
    "baseline": "performance-baseline-phase0.json",
    "profiling": "performance-profiling-phase0.json",
    "golden": "performance-golden-phase0.json",
}
UDM_PROFILE_CASES = {"udm_single", "mixed_asm_udm"}
UDM_PROFILE_BUCKETS = (
    "expression",
    "item_device_sync",
    "core_compute",
    "ode_framework",
)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Summarize Phase 0 baseline/profiling/golden evidence before hot-path implementation."
    )
    parser.add_argument("--repo-root", default="")
    parser.add_argument("--evidence-dir", default="")
    parser.add_argument("--fail-on-open-gaps", action="store_true")
    args = parser.parse_args()

    repo_root = Path(args.repo_root).resolve() if args.repo_root else Path(__file__).resolve().parents[2]
    evidence_dir = Path(args.evidence_dir).resolve() if args.evidence_dir else repo_root / "tmp" / "ci-evidence"
    evidence_dir.mkdir(parents=True, exist_ok=True)

    hard_violations: list[dict[str, Any]] = []
    open_gaps: list[dict[str, Any]] = []
    sources: dict[str, Any] = {}
    for source_id, filename in EVIDENCE_FILES.items():
        path = evidence_dir / filename
        if not path.exists():
            hard_violations.append(
                {
                    "rule": "p08-source-evidence-missing",
                    "summary": "Required prerequisite evidence file is missing.",
                    "details": {"source": source_id, "path": str(path)},
                }
            )
            continue
        evidence = read_json(path)
        sources[source_id] = summarize_source(source_id, path, evidence)
        if evidence.get("status") != "passed":
            hard_violations.append(
                {
                    "rule": "p08-source-evidence-not-passed",
                    "summary": "Required prerequisite evidence is not passed.",
                    "details": {
                        "source": source_id,
                        "path": str(path),
                        "status": evidence.get("status"),
                    },
                }
            )

    if "golden" in sources:
        uncovered = [
            name
            for name, item in sources["golden"]["priority_coverage"].items()
            if item.get("status") != "covered"
        ]
        if uncovered:
            hard_violations.append(
                {
                    "rule": "p08-golden-priority-coverage",
                    "summary": "P-03 golden priority coverage is incomplete.",
                    "details": {"uncovered": uncovered},
                }
            )

    profiling_summary = build_profiling_summary(sources.get("profiling", {}))
    baseline_summary = build_baseline_summary(sources.get("baseline", {}))
    golden_summary = build_golden_summary(sources.get("golden", {}))
    candidates = build_candidates(profiling_summary, baseline_summary, golden_summary)
    first_batch = [candidate for candidate in candidates if candidate["decision"] == "first_batch"]
    if not first_batch:
        open_gaps.append(
            {
                "id": "p08-no-first-batch-candidate",
                "severity": "high",
                "summary": "No first-batch hot-path candidate could be selected from current evidence.",
                "evidence": {"candidates": candidates},
            }
        )

    status = "passed"
    if hard_violations:
        status = "failed"
    elif open_gaps:
        status = "partial"

    report = {
        "schema_version": "autowatersimu_performance_hotpath_prereview_phase0.v1",
        "generated_at": utc_now(),
        "repo_root": str(repo_root),
        "status": status,
        "fail_on_open_gaps": bool(args.fail_on_open_gaps),
        "summary": {
            "source_statuses": {key: value.get("status") for key, value in sources.items()},
            "first_batch_candidates": [candidate["id"] for candidate in first_batch],
            "deferred_candidates": [
                candidate["id"] for candidate in candidates if candidate["decision"] == "defer"
            ],
            "hard_violations": len(hard_violations),
            "open_gaps": len(open_gaps),
        },
        "git": git_metadata(repo_root),
        "sources": sources,
        "profiling_summary": profiling_summary,
        "baseline_summary": baseline_summary,
        "golden_summary": golden_summary,
        "candidates": candidates,
        "answers": build_dod_answers(first_batch, profiling_summary),
        "global_forbidden_changes": global_forbidden_changes(),
        "open_gaps": open_gaps,
        "hard_violations": hard_violations,
    }

    evidence_path = evidence_dir / "performance-hotpath-prereview-phase0.json"
    markdown_path = evidence_dir / "performance-hotpath-prereview-phase0.md"
    write_json(evidence_path, report)
    markdown_path.write_text(render_markdown(report), encoding="utf-8")

    print(f"performance hotpath prereview phase0 status: {status}")
    print(f"evidence: {evidence_path}")
    print(f"markdown: {markdown_path}")
    print(f"first_batch_candidates: {len(first_batch)}")
    print(f"hard_violations: {len(hard_violations)}")
    print(f"open_gaps: {len(open_gaps)}")

    if hard_violations:
        return 1
    if args.fail_on_open_gaps and open_gaps:
        return 1
    return 0


def read_json(path: Path) -> Any:
    text = path.read_text(encoding="utf-8-sig")
    return json.loads(text)


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def summarize_source(source_id: str, path: Path, evidence: dict[str, Any]) -> dict[str, Any]:
    summary = {
        "path": str(path),
        "status": evidence.get("status"),
        "schema_version": evidence.get("schema_version"),
        "generated_at": evidence.get("generated_at"),
        "summary": evidence.get("summary", {}),
    }
    if source_id == "golden":
        summary["priority_coverage"] = evidence.get("priority_coverage", {})
        summary["core_only_checks"] = evidence.get("core_only_checks", {})
    if source_id == "profiling":
        summary["runs"] = evidence.get("runs", [])
        summary["static_hotpath_markers"] = evidence.get("static_hotpath_markers", {})
    if source_id == "baseline":
        summary["runs"] = evidence.get("runs", [])
    return summary


def build_profiling_summary(source: dict[str, Any]) -> dict[str, Any]:
    summary = source.get("summary", {})
    runs = source.get("runs", [])
    requested = summary.get("bucket_coverage_ms", {})
    category_totals: dict[str, float] = {}
    for run in runs:
        for item in run.get("profile_summary", {}).get("categories", []):
            category = item.get("category")
            if not category:
                continue
            category_totals[category] = round(
                category_totals.get(category, 0.0) + float(item.get("self_time_ms") or 0.0),
                3,
            )
    requested_total = sum(float(value or 0.0) for value in requested.values())
    requested_rank = [
        {
            "bucket": bucket,
            "self_time_ms": round(float(value or 0.0), 3),
            "share_of_requested": round(float(value or 0.0) / requested_total, 4)
            if requested_total > 0
            else 0.0,
        }
        for bucket, value in sorted(requested.items(), key=lambda item: float(item[1] or 0.0), reverse=True)
    ]
    return {
        "requested_bucket_coverage_ms": requested,
        "requested_bucket_rank": requested_rank,
        "profile_category_totals_ms": category_totals,
        "udm_solver_bucket_breakdown": build_udm_solver_bucket_breakdown(runs),
        "runs": len(runs),
    }


def build_udm_solver_bucket_breakdown(runs: list[dict[str, Any]]) -> dict[str, Any]:
    rows: list[dict[str, Any]] = []
    totals_by_solver: dict[str, dict[str, float]] = {}

    for run in runs:
        case_id = str(run.get("case_id") or "")
        if case_id not in UDM_PROFILE_CASES:
            continue

        solver = str(run.get("solver_method") or "")
        categories = {
            str(item.get("category")): float(item.get("self_time_ms") or 0.0)
            for item in run.get("profile_summary", {}).get("categories", [])
        }
        runtime_timings = run.get("runtime_timings_ms") or {}
        compute_ms = float(runtime_timings.get("compute") or 0.0)
        bucket_values = {
            bucket: round(float(categories.get(bucket) or 0.0), 3)
            for bucket in UDM_PROFILE_BUCKETS
        }
        expression_plus_sync = round(
            bucket_values["expression"] + bucket_values["item_device_sync"],
            3,
        )
        row = {
            "case_id": case_id,
            "solver_method": solver,
            "compute_ms": round(compute_ms, 3),
            "wall_ms": round(float(run.get("wall_ms") or 0.0), 3),
            **{f"{bucket}_ms": value for bucket, value in bucket_values.items()},
            "expression_plus_item_sync_ms": expression_plus_sync,
            "expression_plus_item_sync_share_of_compute": round(
                expression_plus_sync / compute_ms,
                4,
            )
            if compute_ms > 0
            else 0.0,
        }
        rows.append(row)

        solver_totals = totals_by_solver.setdefault(
            solver,
            {
                "runs": 0.0,
                "compute_ms": 0.0,
                "wall_ms": 0.0,
                **{f"{bucket}_ms": 0.0 for bucket in UDM_PROFILE_BUCKETS},
                "expression_plus_item_sync_ms": 0.0,
            },
        )
        solver_totals["runs"] += 1
        solver_totals["compute_ms"] += compute_ms
        solver_totals["wall_ms"] += float(run.get("wall_ms") or 0.0)
        solver_totals["expression_plus_item_sync_ms"] += expression_plus_sync
        for bucket, value in bucket_values.items():
            solver_totals[f"{bucket}_ms"] += value

    totals = []
    for solver, values in sorted(totals_by_solver.items()):
        compute_ms = values["compute_ms"]
        totals.append(
            {
                "solver_method": solver,
                "runs": int(values["runs"]),
                "compute_ms": round(compute_ms, 3),
                "wall_ms": round(values["wall_ms"], 3),
                **{
                    f"{bucket}_ms": round(values[f"{bucket}_ms"], 3)
                    for bucket in UDM_PROFILE_BUCKETS
                },
                "expression_plus_item_sync_ms": round(
                    values["expression_plus_item_sync_ms"],
                    3,
                ),
                "expression_plus_item_sync_share_of_compute": round(
                    values["expression_plus_item_sync_ms"] / compute_ms,
                    4,
                )
                if compute_ms > 0
                else 0.0,
            }
        )

    return {
        "scope": "UDM-related profiling rows grouped by solver for KPI-001/KPI-003 evidence.",
        "cases": sorted(UDM_PROFILE_CASES),
        "buckets": list(UDM_PROFILE_BUCKETS),
        "rows": sorted(rows, key=lambda item: (item["case_id"], item["solver_method"])),
        "totals_by_solver": totals,
    }


def build_baseline_summary(source: dict[str, Any]) -> dict[str, Any]:
    runs = source.get("runs", [])
    compute_values = [
        float((run.get("timing_segments") or {}).get("compute") or 0.0)
        for run in runs
        if run.get("status") == "succeeded"
    ]
    by_case: dict[str, list[float]] = {}
    by_solver: dict[str, list[float]] = {}
    for run in runs:
        if run.get("status") != "succeeded":
            continue
        compute = float((run.get("timing_segments") or {}).get("compute") or 0.0)
        by_case.setdefault(str(run.get("case_id")), []).append(compute)
        by_solver.setdefault(str(run.get("solver_method")), []).append(compute)
    return {
        "runs": len(runs),
        "compute_ms": stats(compute_values),
        "compute_ms_by_case": {key: stats(values) for key, values in sorted(by_case.items())},
        "compute_ms_by_solver": {key: stats(values) for key, values in sorted(by_solver.items())},
    }


def build_golden_summary(source: dict[str, Any]) -> dict[str, Any]:
    checks = source.get("core_only_checks", {})
    docs = checks.get("docs_test_classification", {})
    return {
        "priority_coverage": {
            key: value.get("status")
            for key, value in source.get("priority_coverage", {}).items()
        },
        "legacy_backend_oracle_used": source.get("summary", {}).get("legacy_backend_oracle_used"),
        "backend_project_paths_in_sys_path": len(checks.get("backend_project_paths_in_sys_path", [])),
        "imported_app_modules": len(checks.get("imported_app_modules", [])),
        "unclassified_docs_tests": len(docs.get("unclassified_tests", [])),
    }


def build_candidates(
    profiling_summary: dict[str, Any],
    baseline_summary: dict[str, Any],
    golden_summary: dict[str, Any],
) -> list[dict[str, Any]]:
    requested = profiling_summary.get("requested_bucket_coverage_ms", {})
    transport_ms = float(requested.get("transport_dense_sparse") or 0.0)
    expression_ms = float(requested.get("expression") or 0.0)
    item_sync_ms = float(requested.get("item_device_sync") or 0.0)
    ode_ms = float(requested.get("ode_framework") or 0.0)
    compute_stats = baseline_summary.get("compute_ms", {})
    golden_ok = all(
        status == "covered"
        for status in golden_summary.get("priority_coverage", {}).values()
    )

    return [
        {
            "id": "transport-runtime-tensor-precompute-no-semantics",
            "decision": "first_batch" if golden_ok and transport_ms > 0 else "defer",
            "why_first": (
                "It is the largest non-solver requested bucket and can be scoped to "
                "internal tensor/index preparation without changing solver choice or model semantics."
            ),
            "implementation_scope": [
                "Precompute or cache stable edge/node/component tensors used by transport and balance kernels.",
                "Preserve PR-32 dense/sparse weighted-merge semantics for parallel edges.",
                "Keep worker API, schema, artifact format, solver defaults, and sampling grid unchanged.",
            ],
            "profiler_segment": "transport_dense_sparse",
            "current_profile_self_time_ms": round(transport_ms, 3),
            "worker_segment": "compute",
            "current_worker_compute_ms": compute_stats,
            "tolerance_layers": ["L2 balance-kernel micro goldens", "L3 full-run f64 goldens"],
            "required_validation": [
                "scripts\\ci\\performance-golden-phase0.ps1",
                "backend\\.venv\\Scripts\\python -m pytest docs\\rebuild\\simulation_core -q",
                "backend\\.venv\\Scripts\\python -m pytest simulation_core\\tests -q",
                "scripts\\audit-simulation-core-correctness-freeze.ps1",
                "scripts\\ci\\performance-baseline-phase0.ps1",
                "scripts\\ci\\performance-profiling-phase0.ps1",
            ],
            "forbidden_changes": [
                "Do not change PR-32 dense parallel-edge weighted-merge semantics.",
                "Do not change default branch output clamp policy.",
                "Do not change supported mixed ASM/UDM dispatch semantics.",
                "Do not change solver defaults, step grid, output sampling, schemas, or generated clients.",
            ],
            "benefit_measurement": (
                "Compare transport_dense_sparse profile self-time and worker runtime_audit.timings_ms.compute "
                "against the Phase 0 baseline/profiling evidence."
            ),
        },
        {
            "id": "udm-expression-cache-and-device-sync-reduction",
            "decision": "second_batch" if golden_ok and (expression_ms + item_sync_ms) > 0 else "defer",
            "why_not_first": (
                "Expression plus item-sync evidence is present but much smaller than transport/dense-sparse "
                "in the current matrix; use it after the transport-only slice or when UDM-heavy fixtures show higher share."
            ),
            "implementation_scope": [
                "Cache compiled expression/environment mapping where inputs are stable.",
                "Reduce avoidable scalar synchronization only when L1 expression and L3 UDM goldens remain stable.",
            ],
            "profiler_segment": "expression + item_device_sync",
            "current_profile_self_time_ms": round(expression_ms + item_sync_ms, 3),
            "worker_segment": "compute",
            "tolerance_layers": ["L1 expression micro goldens", "L3 UDM/mixed full-run f64 goldens"],
            "forbidden_changes": [
                "Do not change expression validation allowed syntax.",
                "Do not change fail-late/fail-early behavior in the same PR.",
                "Do not change UDM variable binding semantics.",
            ],
        },
        {
            "id": "asm-stable-reaction-runtime-precompute",
            "decision": "completed",
            "why_completed": (
                "ASM active compute masks now produce stable node indices and filtered parameter rows "
                "before solver RHS execution, keeping the per-step RHS off boolean-mask parameter gathers."
            ),
            "implementation_scope": [
                "Precompute active ASM1Slim/ASM1/ASM3 node indices and filtered parameter rows during tensor conversion.",
                "Reuse the runtime payload in single-model and combined ASM/UDM RHS paths.",
                "Keep solver defaults, mixed dispatch semantics, oxygen zeroing scope, schemas, and worker behavior unchanged.",
            ],
            "profiler_segment": "ode_framework / ASM mask gather",
            "current_profile_self_time_ms": round(ode_ms, 3),
            "worker_segment": "compute",
            "tolerance_layers": ["L3 full-run f64 goldens", "correctness-freeze audit"],
            "forbidden_changes": [
                "Do not change supported mixed ASM/UDM dispatch semantics.",
                "Do not change ASM oxygen zeroing active compute scope.",
                "Do not change solver defaults, output grid, schema, worker strict mode, or fallback behavior.",
            ],
        },
        {
            "id": "solver-framework-or-output-grid-change",
            "decision": "defer",
            "why_deferred": (
                "ODE framework is the largest bucket, but changing solver framework, solver defaults, "
                "or output grid has high semantic risk and must be a separate correctness-backed PR."
            ),
            "profiler_segment": "ode_framework",
            "current_profile_self_time_ms": round(ode_ms, 3),
            "required_before_work": [
                "Explicit solver-grid design and release note.",
                "L3 f64 golden comparison for every affected solver and case.",
                "ADR update for default branch output clamp or supported mixed-model dispatch if touched.",
            ],
            "forbidden_changes": [
                "Do not bundle solver default changes with transport or expression micro-optimizations.",
                "Do not alter output sampling grid in a performance-only PR.",
            ],
        },
    ]


def stats(values: list[float]) -> dict[str, Any]:
    if not values:
        return {"count": 0, "min": None, "max": None, "mean": None, "median": None}
    return {
        "count": len(values),
        "min": round(min(values), 3),
        "max": round(max(values), 3),
        "mean": round(statistics.fmean(values), 3),
        "median": round(statistics.median(values), 3),
    }


def build_dod_answers(first_batch: list[dict[str, Any]], profiling_summary: dict[str, Any]) -> dict[str, Any]:
    if not first_batch:
        return {
            "why_this_first": "No first-batch candidate selected.",
            "how_to_prove_correctness": [],
            "how_benefit_returns_to_worker_compute": "",
        }
    candidate = first_batch[0]
    return {
        "why_this_first": candidate["why_first"],
        "how_to_prove_correctness": candidate["required_validation"],
        "how_benefit_returns_to_worker_compute": candidate["benefit_measurement"],
        "source_profile_rank": profiling_summary.get("requested_bucket_rank", []),
    }


def global_forbidden_changes() -> list[str]:
    return [
        "No supported mixed ASM/UDM dispatch semantics change.",
        "No PR-32 dense parallel-edge weighted-merge semantic change.",
        "No default output clamp policy change.",
        "No solver default, output grid, tolerance default, schema, OpenAPI, generated client, worker strict-mode, or fallback deletion change.",
        "No benchmark target rewrite to make the numbers look better.",
    ]


def git_metadata(repo_root: Path) -> dict[str, Any]:
    return {
        "commit": run_git(repo_root, "rev-parse", "HEAD"),
        "branch": run_git(repo_root, "rev-parse", "--abbrev-ref", "HEAD"),
        "dirty": bool(run_git(repo_root, "status", "--porcelain")),
    }


def run_git(repo_root: Path, *args: str) -> str:
    try:
        completed = subprocess.run(
            ["git", *args],
            cwd=repo_root,
            check=True,
            capture_output=True,
            text=True,
        )
        return completed.stdout.strip()
    except Exception:
        return ""


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def render_markdown(report: dict[str, Any]) -> str:
    lines = [
        "# Performance Hot-Path Prereview Phase 0",
        "",
        f"- Status: `{report['status']}`",
        f"- Generated at: `{report['generated_at']}`",
        f"- First batch candidates: `{', '.join(report['summary']['first_batch_candidates'])}`",
        f"- Hard violations: `{report['summary']['hard_violations']}`",
        f"- Open gaps: `{report['summary']['open_gaps']}`",
        "",
        "## Evidence Sources",
        "",
        "| Source | Status | Path |",
        "|---|---|---|",
    ]
    for source_id, source in report["sources"].items():
        lines.append(f"| `{source_id}` | `{source.get('status')}` | `{source.get('path')}` |")

    lines.extend(
        [
            "",
            "## Requested Bucket Rank",
            "",
            "| Bucket | Self Time ms | Share |",
            "|---|---:|---:|",
        ]
    )
    for item in report["profiling_summary"].get("requested_bucket_rank", []):
        lines.append(
            f"| `{item['bucket']}` | {item['self_time_ms']} | {item['share_of_requested']} |"
        )

    udm_breakdown = report["profiling_summary"].get("udm_solver_bucket_breakdown", {})
    lines.extend(
        [
            "",
            "## UDM Solver Bucket Breakdown",
            "",
            "| Solver | Runs | Compute ms | Expression ms | Item Sync ms | Core Compute ms | ODE Framework ms | Expr+Sync Share |",
            "|---|---:|---:|---:|---:|---:|---:|---:|",
        ]
    )
    for item in udm_breakdown.get("totals_by_solver", []):
        lines.append(
            "| `{solver}` | {runs} | {compute} | {expression} | {item_sync} | {core} | {ode} | {share} |".format(
                solver=item["solver_method"],
                runs=item["runs"],
                compute=item["compute_ms"],
                expression=item["expression_ms"],
                item_sync=item["item_device_sync_ms"],
                core=item["core_compute_ms"],
                ode=item["ode_framework_ms"],
                share=item["expression_plus_item_sync_share_of_compute"],
            )
        )

    lines.extend(
        [
            "",
            "## Candidates",
            "",
            "| Candidate | Decision | Segment | Current ms |",
            "|---|---|---|---:|",
        ]
    )
    for candidate in report["candidates"]:
        lines.append(
            f"| `{candidate['id']}` | `{candidate['decision']}` | `{candidate.get('profiler_segment', '')}` | {candidate.get('current_profile_self_time_ms', '')} |"
        )

    lines.extend(
        [
            "",
            "## DoD Answers",
            "",
            f"- Why this first: {report['answers']['why_this_first']}",
            f"- Benefit path: {report['answers']['how_benefit_returns_to_worker_compute']}",
            "",
            "## Forbidden Changes",
            "",
        ]
    )
    for item in report["global_forbidden_changes"]:
        lines.append(f"- {item}")
    lines.append("")
    return "\n".join(lines)


if __name__ == "__main__":
    raise SystemExit(main())
