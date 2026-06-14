from __future__ import annotations

import argparse
import hashlib
import importlib
import json
import math
import platform
import re
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import torch


DEFAULT_SOLVERS = ("scipy_solver", "rk4", "adaptive_heun")
ALLOWED_SOLVERS = {"scipy_solver", "euler", "rk4", "adaptive_heun"}
FIXED_SEED = 0
DEFAULT_TOLERANCE = 1e-6

FULL_RUN_CASES: list[dict[str, Any]] = [
    {
        "id": "small_material_balance",
        "fixture": "contracts/examples/valid/material_balance_minimal.compute_job.v1.json",
        "purpose": "default material-balance branch current-state L3 golden",
        "priority_tags": ["default_branch_clamp_current_state"],
    },
    {
        "id": "medium_asm1",
        "fixture": "contracts/examples/valid/asm1_independent.compute_job.v1.json",
        "purpose": "ASM1 branch L3 golden",
        "priority_tags": ["solver_matrix"],
    },
    {
        "id": "udm_single",
        "fixture": "contracts/examples/valid/udm_independent.compute_job.v1.json",
        "purpose": "single UDM branch L3 golden",
        "priority_tags": ["l1_l2_l3", "solver_matrix"],
    },
    {
        "id": "mixed_asm_udm",
        "fixture": "contracts/examples/valid/mixed_asm_udm.compute_job.v1.json",
        "purpose": "mixed ASM/UDM supported dispatch L3 golden",
        "priority_tags": ["mixed_asm_udm", "solver_matrix"],
    },
]

TOLERANCE_LAYERS = {
    "L1": {
        "scope": "expression-level equivalence",
        "f64_max_abs": 1e-12,
        "f32_max_abs": 1e-6,
    },
    "L2": {
        "scope": "single RHS or balance-kernel equivalence",
        "f64_max_abs": 1e-12,
        "f32_max_abs": 1e-6,
    },
    "L3": {
        "scope": "full simulation trajectory equivalence against f64 reference",
        "relative": 1e-4,
        "absolute_floor": 1e-8,
        "conservation_relative": 1e-6,
    },
}

DOCS_TEST_CLASSIFICATIONS = {
    "test_mixed_model_golden.py::test_solo_udm_reaction_applies": {
        "classification": "current-state positive control",
        "status": "active",
        "reason": "Solo UDM reaction proves the UDM kernel still applies when no competing model branch exists.",
    },
    "test_mixed_model_golden.py::test_mixed_udm_reaction_applies": {
        "classification": "mixed-model regression guard",
        "status": "active",
        "reason": "PR-38 selects supported mixed-model semantics; UDM reactions must apply in mixed ASM/UDM graphs.",
    },
    "test_mixed_model_golden.py::test_mixed_asm_udm_l3_golden": {
        "classification": "mixed-model target golden",
        "status": "active",
        "reason": "Supported mixed ASM/UDM semantics compare the mixed UDM trajectory against the solo UDM reference.",
    },
    "test_mixed_model_golden.py::test_mixed_models_rejected_at_build": {
        "classification": "historical unsupported-error alternative",
        "status": "skip",
        "reason": "PR-38 selected supported mixed-model semantics, so the unsupported-error path is not active.",
    },
    "test_parallel_edge_golden.py::test_sparse_parallel_edge_is_golden": {
        "classification": "current-state golden",
        "status": "active",
        "reason": "Sparse parallel edge aggregation is the physical reference behavior.",
    },
    "test_parallel_edge_golden.py::test_dense_matches_sparse_parallel_edge": {
        "classification": "current-state repro",
        "status": "xfail",
        "reason": "Records PR-32 dense parallel-edge overwrite behavior before dense/sparse unification.",
    },
    "test_parallel_edge_golden.py::test_dense_matches_sparse_single_edge": {
        "classification": "current-state regression guard",
        "status": "active",
        "reason": "Single-edge dense/sparse equivalence must keep passing while PR-32 is pending.",
    },
}


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Build CPU/f64/fixed-seed Phase 0 golden evidence for simulation_core."
    )
    parser.add_argument("--repo-root", default="")
    parser.add_argument("--evidence-dir", default="")
    parser.add_argument("--golden-dir", default="")
    parser.add_argument("--solver", action="append", dest="solvers")
    parser.add_argument("--case-id", action="append", dest="case_ids")
    parser.add_argument("--fail-on-open-gaps", action="store_true")
    args = parser.parse_args()

    repo_root = Path(args.repo_root).resolve() if args.repo_root else Path(__file__).resolve().parents[2]
    evidence_dir = Path(args.evidence_dir).resolve() if args.evidence_dir else repo_root / "tmp" / "ci-evidence"
    golden_dir = Path(args.golden_dir).resolve() if args.golden_dir else repo_root / "tmp" / "performance-golden-phase0" / "goldens"
    evidence_dir.mkdir(parents=True, exist_ok=True)
    golden_dir.mkdir(parents=True, exist_ok=True)

    solvers = tuple(args.solvers or DEFAULT_SOLVERS)
    case_ids = set(args.case_ids or [case["id"] for case in FULL_RUN_CASES])
    selected_cases = [case for case in FULL_RUN_CASES if case["id"] in case_ids]

    hard_violations: list[dict[str, Any]] = []
    open_gaps: list[dict[str, Any]] = []
    runs: list[dict[str, Any]] = []
    micro_goldens: list[dict[str, Any]] = []

    invalid_solvers = [solver for solver in solvers if solver not in ALLOWED_SOLVERS]
    if invalid_solvers:
        hard_violations.append(
            {
                "rule": "golden-solver-method",
                "summary": "Unknown solver method requested.",
                "details": {"invalid_solvers": invalid_solvers, "allowed_solvers": sorted(ALLOWED_SOLVERS)},
            }
        )

    if not selected_cases:
        hard_violations.append(
            {
                "rule": "golden-cases",
                "summary": "No golden cases selected.",
                "details": {"case_ids": sorted(case_ids)},
            }
        )

    removed_backend_paths = remove_backend_project_paths(repo_root)
    deterministic = configure_determinism()
    import_context = import_core_modules(repo_root)
    modules = import_context["modules"]

    if not hard_violations:
        for case in selected_cases:
            fixture_path = repo_root / case["fixture"]
            if not fixture_path.exists():
                hard_violations.append(
                    {
                        "rule": "golden-fixture-missing",
                        "summary": "Required Phase 0 golden fixture is missing.",
                        "details": {"case_id": case["id"], "fixture": case["fixture"]},
                    }
                )
                continue

            for solver in solvers:
                if solver in invalid_solvers:
                    continue
                run_record = run_full_golden(
                    repo_root=repo_root,
                    fixture_path=fixture_path,
                    golden_dir=golden_dir,
                    case=case,
                    solver=solver,
                    modules=modules,
                )
                runs.append(run_record)
                if run_record["status"] != "passed":
                    hard_violations.append(
                        {
                            "rule": "golden-full-run",
                            "summary": "Full simulation golden generation failed.",
                            "details": run_record,
                        }
                    )

        micro_goldens = build_micro_goldens(golden_dir=golden_dir, modules=modules)
        hard_violations.extend(
            {
                "rule": "golden-micro-run",
                "summary": "Micro golden generation failed.",
                "details": micro,
            }
            for micro in micro_goldens
            if micro.get("hard_violation")
        )

    docs_classification = classify_docs_tests(repo_root)
    if docs_classification["unclassified_tests"]:
        open_gaps.append(
            {
                "id": "docs-simulation-core-test-unclassified",
                "severity": "medium",
                "summary": "Some docs/rebuild/simulation_core tests are not classified as current-state repro or target golden.",
                "evidence": {"tests": docs_classification["unclassified_tests"]},
            }
        )
    if docs_classification["app_import_violations"] or docs_classification["backend_sys_path_violations"]:
        hard_violations.append(
            {
                "rule": "core-only-docs-tests",
                "summary": "Core-only golden tests must not top-level import app.* or add backend to sys.path.",
                "details": {
                    "app_import_violations": docs_classification["app_import_violations"],
                    "backend_sys_path_violations": docs_classification["backend_sys_path_violations"],
                },
            }
        )

    backend_project_paths = backend_project_paths_in_sys_path(repo_root)
    imported_app_modules = sorted(
        name for name in sys.modules if name == "app" or name.startswith("app.")
    )
    if backend_project_paths or imported_app_modules:
        hard_violations.append(
            {
                "rule": "golden-backend-oracle-independence",
                "summary": "Golden generator must stay independent from legacy backend oracle.",
                "details": {
                    "backend_project_paths_in_sys_path": backend_project_paths,
                    "imported_app_modules": imported_app_modules,
                },
            }
        )

    priority_coverage = build_priority_coverage(runs, micro_goldens, solvers)
    for item in priority_coverage.values():
        if item["status"] != "covered":
            open_gaps.append(
                {
                    "id": item["id"],
                    "severity": "medium",
                    "summary": item["summary"],
                    "evidence": item,
                }
            )

    status = "passed"
    if hard_violations:
        status = "failed"
    elif open_gaps:
        status = "partial"

    report = {
        "schema_version": "autowatersimu_performance_golden_phase0.v1",
        "generated_at": utc_now(),
        "repo_root": str(repo_root),
        "status": status,
        "fail_on_open_gaps": bool(args.fail_on_open_gaps),
        "summary": {
            "cases_defined": len(FULL_RUN_CASES),
            "cases_generated": len({run["case_id"] for run in runs if run["status"] == "passed"}),
            "solvers": list(solvers),
            "full_runs": len(runs),
            "full_runs_passed": len([run for run in runs if run["status"] == "passed"]),
            "micro_goldens": len(micro_goldens),
            "hard_violations": len(hard_violations),
            "open_gaps": len(open_gaps),
            "legacy_backend_oracle_used": False,
        },
        "environment": environment(repo_root, import_context, deterministic, removed_backend_paths),
        "tolerance_layers": TOLERANCE_LAYERS,
        "matrix": selected_cases,
        "priority_coverage": priority_coverage,
        "core_only_checks": {
            "legacy_backend_oracle_used": False,
            "backend_project_paths_in_sys_path": backend_project_paths,
            "imported_app_modules": imported_app_modules,
            "docs_test_classification": docs_classification,
        },
        "runs": runs,
        "micro_goldens": micro_goldens,
        "open_gaps": open_gaps,
        "hard_violations": hard_violations,
    }

    evidence_path = evidence_dir / "performance-golden-phase0.json"
    markdown_path = evidence_dir / "performance-golden-phase0.md"
    write_json(evidence_path, report)
    markdown_path.write_text(render_markdown(report), encoding="utf-8")

    print(f"performance golden phase0 status: {status}")
    print(f"evidence: {evidence_path}")
    print(f"markdown: {markdown_path}")
    print(f"goldens: {golden_dir}")
    print(f"full_runs: {len(runs)}")
    print(f"micro_goldens: {len(micro_goldens)}")
    print(f"hard_violations: {len(hard_violations)}")
    print(f"open_gaps: {len(open_gaps)}")

    if hard_violations:
        return 1
    if args.fail_on_open_gaps and open_gaps:
        return 1
    return 0


def configure_determinism() -> dict[str, Any]:
    torch.manual_seed(FIXED_SEED)
    torch.set_num_threads(1)
    deterministic_algorithms = "enabled"
    deterministic_error = None
    try:
        torch.use_deterministic_algorithms(True)
    except Exception as exc:  # pragma: no cover - backend dependent
        deterministic_algorithms = "best_effort_failed"
        deterministic_error = repr(exc)
    return {
        "seed": FIXED_SEED,
        "torch_num_threads": torch.get_num_threads(),
        "torch_default_dtype": str(torch.get_default_dtype()),
        "torch_deterministic_algorithms": deterministic_algorithms,
        "torch_deterministic_error": deterministic_error,
    }


def import_core_modules(repo_root: Path) -> dict[str, Any]:
    fallback_paths: list[str] = []
    modules: dict[str, Any] = {}
    try:
        modules["core_package"] = importlib.import_module("autowatersimu_simulation_core")
    except ModuleNotFoundError:
        for relative in ("simulation_core/python", "contracts/python"):
            path = str((repo_root / relative).resolve())
            if path not in sys.path:
                sys.path.insert(0, path)
                fallback_paths.append(path)
        modules["core_package"] = importlib.import_module("autowatersimu_simulation_core")

    adapters = importlib.import_module("autowatersimu_simulation_core.adapters")
    material_balance = importlib.import_module("autowatersimu_simulation_core.material_balance")
    udm_expression = importlib.import_module(
        "autowatersimu_simulation_core.material_balance.udm_expression"
    )
    modules["simulation_input_to_material_balance_input"] = (
        adapters.simulation_input_to_material_balance_input
    )
    modules["MaterialBalanceCalculator"] = material_balance.MaterialBalanceCalculator
    modules["compile_expression"] = udm_expression.compile_expression

    return {
        "modules": modules,
        "repo_path_fallback_used": bool(fallback_paths),
        "repo_path_fallback_paths": fallback_paths,
        "core_module_file": str(Path(modules["core_package"].__file__).resolve()),
    }


def run_full_golden(
    *,
    repo_root: Path,
    fixture_path: Path,
    golden_dir: Path,
    case: dict[str, Any],
    solver: str,
    modules: dict[str, Any],
) -> dict[str, Any]:
    run_id = f"{case['id']}_{solver}"
    started = time.perf_counter()
    try:
        job = read_json(fixture_path)
        payload = dict(job["payload"])
        parameters = dict(payload.get("parameters") or {})
        parameters["solver_method"] = solver
        parameters["tolerance"] = DEFAULT_TOLERANCE
        payload["parameters"] = parameters
        payload["simulation_input_id"] = f"si_perf_golden_{run_id}"

        adapter = modules["simulation_input_to_material_balance_input"]
        calculator_cls = modules["MaterialBalanceCalculator"]
        material_balance_input = adapter(payload)
        calculator = calculator_cls()
        calculator.device = torch.device("cpu")
        calculator.dtype = torch.float64

        result = calculator.calculate(material_balance_input)
        elapsed_ms = int((time.perf_counter() - started) * 1000)
        stable_result = stable_material_balance_result(result)
        stable_hash = sha256_json(stable_result)
        sampling_grid = {
            "hours": material_balance_input.parameters.hours,
            "steps_per_hour": material_balance_input.parameters.steps_per_hour,
            "sampling_interval_hours": material_balance_input.parameters.sampling_interval_hours,
            "actual_samples": len(result.timestamps),
            "first_timestamp": result.timestamps[0] if result.timestamps else None,
            "last_timestamp": result.timestamps[-1] if result.timestamps else None,
        }
        golden_payload = {
            "schema_version": "autowatersimu_phase0_f64_golden_result.v1",
            "generated_at": utc_now(),
            "case_id": case["id"],
            "run_id": run_id,
            "source_fixture": relative_path(fixture_path, repo_root),
            "purpose": case["purpose"],
            "priority_tags": case["priority_tags"],
            "device": "cpu",
            "dtype": "torch.float64",
            "seed": FIXED_SEED,
            "solver_method": solver,
            "tolerance": material_balance_input.parameters.tolerance,
            "sampling_grid": sampling_grid,
            "tolerance_layer": "L3",
            "stable_result_sha256": stable_hash,
            "stable_result": stable_result,
        }
        golden_path = golden_dir / f"{run_id}.golden.json"
        write_json(golden_path, golden_payload)
        return {
            "run_id": run_id,
            "case_id": case["id"],
            "solver_method": solver,
            "status": "passed",
            "source_fixture": relative_path(fixture_path, repo_root),
            "golden_path": str(golden_path),
            "stable_result_sha256": stable_hash,
            "elapsed_ms": elapsed_ms,
            "device": "cpu",
            "dtype": "torch.float64",
            "tolerance": material_balance_input.parameters.tolerance,
            "sampling_grid": sampling_grid,
            "summary": stable_result["summary"],
        }
    except Exception as exc:
        return {
            "run_id": run_id,
            "case_id": case["id"],
            "solver_method": solver,
            "status": "failed",
            "source_fixture": relative_path(fixture_path, repo_root),
            "error_type": type(exc).__name__,
            "error": str(exc),
        }


def stable_material_balance_result(result: Any) -> dict[str, Any]:
    summary = dict(result.summary)
    summary.pop("calculation_time_seconds", None)
    return json_safe(
        {
            "status": result.status,
            "timestamps": result.timestamps,
            "node_data": result.node_data,
            "edge_data": result.edge_data,
            "segment_markers": result.segment_markers or [],
            "parameter_change_events": result.parameter_change_events or [],
            "summary": summary,
        }
    )


def build_micro_goldens(*, golden_dir: Path, modules: dict[str, Any]) -> list[dict[str, Any]]:
    calculator_cls = modules["MaterialBalanceCalculator"]
    compile_expression = modules["compile_expression"]
    calculator = calculator_cls()
    calculator.device = torch.device("cpu")
    calculator.dtype = torch.float64
    records: list[dict[str, Any]] = []

    def add_record(record: dict[str, Any]) -> None:
        stable = json_safe({key: value for key, value in record.items() if key != "generated_at"})
        stable_hash = sha256_json(stable)
        payload = {
            "schema_version": "autowatersimu_phase0_f64_micro_golden.v1",
            "generated_at": utc_now(),
            "stable_result_sha256": stable_hash,
            "stable_result": stable,
        }
        path = golden_dir / f"{record['id']}.golden.json"
        write_json(path, payload)
        record["golden_path"] = str(path)
        record["stable_result_sha256"] = stable_hash
        records.append(record)

    try:
        expr = compile_expression("k_decay * S + max(P, 1.0)")
        variables = {
            "k_decay": torch.tensor(0.05, dtype=torch.float64),
            "S": torch.tensor([8.0, 10.0], dtype=torch.float64),
            "P": torch.tensor([1.5, 0.5], dtype=torch.float64),
        }
        actual = expr(variables)
        expected = variables["k_decay"] * variables["S"] + torch.maximum(
            variables["P"],
            torch.tensor(1.0, dtype=torch.float64),
        )
        max_abs = max_abs_diff(actual, expected)
        add_record(
            {
                "id": "udm_expression_l1",
                "status": "passed" if max_abs <= TOLERANCE_LAYERS["L1"]["f64_max_abs"] else "failed",
                "hard_violation": max_abs > TOLERANCE_LAYERS["L1"]["f64_max_abs"],
                "classification": "L1 expression-level golden",
                "max_abs": max_abs,
                "expected": expected,
                "actual": actual,
                "device": "cpu",
                "dtype": "torch.float64",
            }
        )
    except Exception as exc:
        records.append(failed_micro("udm_expression_l1", exc))

    try:
        bundle = parallel_edge_bundle()
        concentrations = torch.tensor([[10.0], [0.0]], dtype=torch.float64)
        delta_m, delta_q = calculator._balance_param_sparse(concentrations, bundle)
        expected_delta_m = torch.tensor([[-60.0], [60.0]], dtype=torch.float64)
        expected_delta_q = torch.tensor([-2.0, 2.0], dtype=torch.float64)
        max_abs = max(max_abs_diff(delta_m, expected_delta_m), max_abs_diff(delta_q, expected_delta_q))
        add_record(
            {
                "id": "parallel_edge_sparse_l2",
                "status": "passed" if max_abs <= TOLERANCE_LAYERS["L2"]["f64_max_abs"] else "failed",
                "hard_violation": max_abs > TOLERANCE_LAYERS["L2"]["f64_max_abs"],
                "classification": "L2 sparse parallel-edge current-state golden",
                "max_abs": max_abs,
                "expected_delta_m": expected_delta_m,
                "actual_delta_m": delta_m,
                "expected_delta_q": expected_delta_q,
                "actual_delta_q": delta_q,
                "device": "cpu",
                "dtype": "torch.float64",
            }
        )
    except Exception as exc:
        records.append(failed_micro("parallel_edge_sparse_l2", exc))

    try:
        bundle = parallel_edge_bundle()
        concentrations = torch.tensor([[10.0], [0.0]], dtype=torch.float64)
        delta_m_sparse, _ = calculator._balance_param_sparse(concentrations, bundle)
        q_out, prop_a, prop_b = dense_like_core(bundle, 2, 1, torch.float64)
        delta_m_dense, _, *_ = calculator._balance_param(concentrations, q_out, prop_a, prop_b)
        max_abs = max_abs_diff(delta_m_dense, delta_m_sparse)
        add_record(
            {
                "id": "parallel_edge_dense_current_repro_l2",
                "status": "current_state_repro",
                "hard_violation": False,
                "classification": "L2 dense/sparse divergence repro pending PR-32",
                "max_abs_dense_vs_sparse": max_abs,
                "expected_current_state": "dense and sparse differ for repeated src/dst edges because dense factors overwrite.",
                "dense_delta_m": delta_m_dense,
                "sparse_delta_m": delta_m_sparse,
                "device": "cpu",
                "dtype": "torch.float64",
            }
        )
    except Exception as exc:
        records.append(failed_micro("parallel_edge_dense_current_repro_l2", exc))

    try:
        bundle = {
            "src": torch.tensor([0]),
            "dst": torch.tensor([1]),
            "q": torch.tensor([1.0], dtype=torch.float64),
            "a": torch.tensor([[3.0]], dtype=torch.float64),
            "b": torch.tensor([[1.0]], dtype=torch.float64),
            "shape": (2, 2),
        }
        concentrations = torch.tensor([[10.0], [0.0]], dtype=torch.float64)
        delta_m_sparse, _ = calculator._balance_param_sparse(concentrations, bundle)
        q_out, prop_a, prop_b = dense_like_core(bundle, 2, 1, torch.float64)
        delta_m_dense, _, *_ = calculator._balance_param(concentrations, q_out, prop_a, prop_b)
        max_abs = max_abs_diff(delta_m_dense, delta_m_sparse)
        add_record(
            {
                "id": "single_edge_dense_sparse_l2",
                "status": "passed" if max_abs <= TOLERANCE_LAYERS["L2"]["f64_max_abs"] else "failed",
                "hard_violation": max_abs > TOLERANCE_LAYERS["L2"]["f64_max_abs"],
                "classification": "L2 single-edge dense/sparse regression guard",
                "max_abs_dense_vs_sparse": max_abs,
                "dense_delta_m": delta_m_dense,
                "sparse_delta_m": delta_m_sparse,
                "device": "cpu",
                "dtype": "torch.float64",
            }
        )
    except Exception as exc:
        records.append(failed_micro("single_edge_dense_sparse_l2", exc))

    try:
        concentrations = torch.tensor([[1.0], [2.0]], dtype=torch.float64)
        q_out = torch.zeros((2, 2), dtype=torch.float64)
        prop_a = torch.ones((2, 2, 1), dtype=torch.float64)
        prop_b = torch.zeros((2, 2, 1), dtype=torch.float64)
        delta_m, delta_q, *_ = calculator._balance_param(concentrations, q_out, prop_a, prop_b)
        expected_delta_m = torch.zeros((2, 1), dtype=torch.float64)
        expected_delta_q = torch.zeros(2, dtype=torch.float64)
        max_abs = max(max_abs_diff(delta_m, expected_delta_m), max_abs_diff(delta_q, expected_delta_q))
        add_record(
            {
                "id": "balance_param_zero_flow_degenerate_l2",
                "status": "passed" if max_abs <= TOLERANCE_LAYERS["L2"]["f64_max_abs"] else "failed",
                "hard_violation": max_abs > TOLERANCE_LAYERS["L2"]["f64_max_abs"],
                "classification": "L2 zero-flow degenerate current-state golden",
                "max_abs": max_abs,
                "expected_delta_m": expected_delta_m,
                "actual_delta_m": delta_m,
                "expected_delta_q": expected_delta_q,
                "actual_delta_q": delta_q,
                "device": "cpu",
                "dtype": "torch.float64",
            }
        )
    except Exception as exc:
        records.append(failed_micro("balance_param_zero_flow_degenerate_l2", exc))

    try:
        concentrations = torch.tensor([[1.0], [2.0]], dtype=torch.float64)
        q_out = torch.zeros((2, 3), dtype=torch.float64)
        prop_a = torch.ones((2, 3, 1), dtype=torch.float64)
        prop_b = torch.zeros((2, 3, 1), dtype=torch.float64)
        calculator._balance_param(concentrations, q_out, prop_a, prop_b)
        add_record(
            {
                "id": "balance_param_non_square_current_repro_l2",
                "status": "failed",
                "hard_violation": True,
                "classification": "L2 non-square _balance_param current-state repro",
                "expected_current_state": "non-square dense balance currently raises instead of producing a rectangular delta.",
                "error": "Expected non-square dense balance to raise, but it returned successfully.",
                "device": "cpu",
                "dtype": "torch.float64",
            }
        )
    except Exception as exc:
        add_record(
            {
                "id": "balance_param_non_square_current_repro_l2",
                "status": "current_state_repro",
                "hard_violation": False,
                "classification": "L2 non-square _balance_param current-state repro",
                "expected_current_state": "non-square dense balance currently raises; future shape policy must replace this repro with a target golden.",
                "error_type": type(exc).__name__,
                "error": str(exc),
                "device": "cpu",
                "dtype": "torch.float64",
            }
        )

    return records


def failed_micro(case_id: str, exc: Exception) -> dict[str, Any]:
    return {
        "id": case_id,
        "status": "failed",
        "hard_violation": True,
        "error_type": type(exc).__name__,
        "error": str(exc),
    }


def parallel_edge_bundle() -> dict[str, Any]:
    return {
        "src": torch.tensor([0, 0]),
        "dst": torch.tensor([1, 1]),
        "q": torch.tensor([1.0, 1.0], dtype=torch.float64),
        "a": torch.tensor([[2.0], [4.0]], dtype=torch.float64),
        "b": torch.tensor([[0.0], [0.0]], dtype=torch.float64),
        "shape": (2, 2),
    }


def dense_like_core(bundle: dict[str, Any], n: int, r: int, dtype: torch.dtype) -> tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
    q_out = torch.zeros(n, n, dtype=dtype)
    q_out.index_put_((bundle["src"], bundle["dst"]), bundle["q"], accumulate=True)
    prop_a = torch.ones(n, n, r, dtype=dtype)
    prop_b = torch.zeros(n, n, r, dtype=dtype)
    prop_a[bundle["src"], bundle["dst"], :] = bundle["a"]
    prop_b[bundle["src"], bundle["dst"], :] = bundle["b"]
    return q_out, prop_a, prop_b


def classify_docs_tests(repo_root: Path) -> dict[str, Any]:
    docs_dir = repo_root / "docs" / "rebuild" / "simulation_core"
    discovered_tests: list[str] = []
    app_import_violations: list[dict[str, Any]] = []
    backend_sys_path_violations: list[dict[str, Any]] = []
    if not docs_dir.exists():
        return {
            "docs_dir": str(docs_dir),
            "discovered_tests": [],
            "classified_tests": DOCS_TEST_CLASSIFICATIONS,
            "unclassified_tests": [],
            "app_import_violations": [],
            "backend_sys_path_violations": [],
        }

    for path in sorted(docs_dir.glob("test_*.py")):
        text = path.read_text(encoding="utf-8")
        relative_name = path.name
        for match in re.finditer(r"^def\s+(test_[A-Za-z0-9_]+)\s*\(", text, re.MULTILINE):
            discovered_tests.append(f"{relative_name}::{match.group(1)}")
        for line_number, line in enumerate(text.splitlines(), start=1):
            stripped = line.strip()
            if re.match(r"^(from\s+app(\.|\s)|import\s+app(\.|\s|$))", stripped):
                app_import_violations.append(
                    {"file": str(path), "line": line_number, "text": stripped}
                )
            if "sys.path" in stripped and "backend" in stripped:
                backend_sys_path_violations.append(
                    {"file": str(path), "line": line_number, "text": stripped}
                )

    unclassified = sorted(
        test for test in discovered_tests if test not in DOCS_TEST_CLASSIFICATIONS
    )
    missing_from_disk = sorted(
        test for test in DOCS_TEST_CLASSIFICATIONS if test not in discovered_tests
    )
    return {
        "docs_dir": str(docs_dir),
        "discovered_tests": sorted(discovered_tests),
        "classified_tests": DOCS_TEST_CLASSIFICATIONS,
        "unclassified_tests": unclassified,
        "classified_tests_missing_from_disk": missing_from_disk,
        "app_import_violations": app_import_violations,
        "backend_sys_path_violations": backend_sys_path_violations,
    }


def build_priority_coverage(
    runs: list[dict[str, Any]],
    micro_goldens: list[dict[str, Any]],
    solvers: tuple[str, ...],
) -> dict[str, dict[str, Any]]:
    passed_runs = [run for run in runs if run.get("status") == "passed"]
    passed_run_ids = {run["run_id"] for run in passed_runs}
    micro_ids = {micro["id"] for micro in micro_goldens if micro.get("status") in {"passed", "current_state_repro"}}
    cases_by_id = {run["case_id"] for run in passed_runs}
    solvers_by_case: dict[str, set[str]] = {}
    for run in passed_runs:
        solvers_by_case.setdefault(run["case_id"], set()).add(run["solver_method"])

    coverage = {
        "mixed_asm_udm": {
            "id": "golden-mixed-asm-udm-missing",
            "summary": "mixed ASM/UDM current-state L3 golden is missing.",
            "status": "covered" if "mixed_asm_udm" in cases_by_id else "missing",
            "evidence": sorted(run_id for run_id in passed_run_ids if run_id.startswith("mixed_asm_udm_")),
        },
        "parallel_edge": {
            "id": "golden-parallel-edge-missing",
            "summary": "parallel-edge sparse golden and dense divergence repro are missing.",
            "status": "covered"
            if {"parallel_edge_sparse_l2", "parallel_edge_dense_current_repro_l2"}.issubset(micro_ids)
            else "missing",
            "evidence": sorted(micro_id for micro_id in micro_ids if micro_id.startswith("parallel_edge_")),
        },
        "default_branch_clamp_current_state": {
            "id": "golden-default-branch-current-state-missing",
            "summary": "default material-balance current-state L3 golden is missing.",
            "status": "covered" if "small_material_balance" in cases_by_id else "missing",
            "evidence": sorted(run_id for run_id in passed_run_ids if run_id.startswith("small_material_balance_")),
        },
        "balance_param_non_square_degenerate": {
            "id": "golden-balance-param-shape-cases-missing",
            "summary": "_balance_param non-square repro or degenerate zero-flow golden is missing.",
            "status": "covered"
            if {"balance_param_zero_flow_degenerate_l2", "balance_param_non_square_current_repro_l2"}.issubset(micro_ids)
            else "missing",
            "evidence": sorted(micro_id for micro_id in micro_ids if micro_id.startswith("balance_param_")),
        },
        "solver_matrix": {
            "id": "golden-solver-matrix-incomplete",
            "summary": "Full-run solver matrix does not cover every selected case and solver.",
            "status": "covered"
            if all(set(solvers).issubset(solvers_by_case.get(case["id"], set())) for case in FULL_RUN_CASES)
            else "missing",
            "evidence": {
                case_id: sorted(case_solvers)
                for case_id, case_solvers in sorted(solvers_by_case.items())
            },
        },
        "l1_l2_l3_layers": {
            "id": "golden-layered-tolerances-incomplete",
            "summary": "Layered L1/L2/L3 tolerance evidence is incomplete.",
            "status": "covered"
            if "udm_expression_l1" in micro_ids
            and "parallel_edge_sparse_l2" in micro_ids
            and bool(passed_runs)
            else "missing",
            "evidence": {
                "L1": "udm_expression_l1" if "udm_expression_l1" in micro_ids else None,
                "L2": "parallel_edge_sparse_l2" if "parallel_edge_sparse_l2" in micro_ids else None,
                "L3_full_runs": len(passed_runs),
            },
        },
    }
    return coverage


def environment(
    repo_root: Path,
    import_context: dict[str, Any],
    deterministic: dict[str, Any],
    removed_backend_paths: list[str],
) -> dict[str, Any]:
    return {
        "python": sys.version,
        "platform": platform.platform(),
        "machine": platform.machine(),
        "processor": platform.processor(),
        "torch_version": torch.__version__,
        "torch_cuda": getattr(torch.version, "cuda", None),
        "torch_parallel_info": safe_torch_parallel_info(),
        "torch_config": safe_torch_config(),
        "blas": safe_torch_parallel_info(),
        "determinism": deterministic,
        "removed_backend_project_paths": removed_backend_paths,
        "git": git_metadata(repo_root),
        "import_context": {
            "core_module_file": import_context["core_module_file"],
            "repo_path_fallback_used": import_context["repo_path_fallback_used"],
            "repo_path_fallback_paths": import_context["repo_path_fallback_paths"],
        },
    }


def safe_torch_parallel_info() -> str:
    try:
        return str(torch.__config__.parallel_info())
    except Exception as exc:  # pragma: no cover - torch build dependent
        return f"unavailable: {exc!r}"


def safe_torch_config() -> str:
    try:
        return str(torch.__config__.show())
    except Exception as exc:  # pragma: no cover - torch build dependent
        return f"unavailable: {exc!r}"


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


def backend_project_paths_in_sys_path(repo_root: Path) -> list[str]:
    backend = (repo_root / "backend").resolve()
    backend_app = (repo_root / "backend" / "app").resolve()
    found: list[str] = []
    for item in sys.path:
        if not item:
            continue
        try:
            resolved = Path(item).resolve()
        except Exception:
            continue
        if resolved in {backend, backend_app}:
            found.append(str(resolved))
    return sorted(set(found))


def remove_backend_project_paths(repo_root: Path) -> list[str]:
    backend = (repo_root / "backend").resolve()
    backend_app = (repo_root / "backend" / "app").resolve()
    removed: list[str] = []
    retained: list[str] = []
    for item in sys.path:
        if not item:
            retained.append(item)
            continue
        try:
            resolved = Path(item).resolve()
        except Exception:
            retained.append(item)
            continue
        if resolved in {backend, backend_app}:
            removed.append(str(resolved))
        else:
            retained.append(item)
    if removed:
        sys.path[:] = retained
    return sorted(set(removed))


def max_abs_diff(actual: torch.Tensor, expected: torch.Tensor) -> float:
    return float((actual.double() - expected.double()).abs().max().item())


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(canonical_json(json_safe(value)) + "\n", encoding="utf-8")


def sha256_json(value: Any) -> str:
    return hashlib.sha256(canonical_json(json_safe(value)).encode("utf-8")).hexdigest()


def canonical_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False)


def json_safe(value: Any) -> Any:
    if isinstance(value, torch.Tensor):
        return json_safe(value.detach().cpu().tolist())
    if isinstance(value, Path):
        return str(value)
    if isinstance(value, dict):
        return {str(key): json_safe(inner) for key, inner in value.items()}
    if isinstance(value, (list, tuple)):
        return [json_safe(inner) for inner in value]
    if isinstance(value, float):
        if not math.isfinite(value):
            return str(value)
        return float(value)
    return value


def relative_path(path: Path, repo_root: Path) -> str:
    try:
        return str(path.resolve().relative_to(repo_root.resolve())).replace("\\", "/")
    except ValueError:
        return str(path)


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def render_markdown(report: dict[str, Any]) -> str:
    lines = [
        "# Performance Golden Phase 0 Evidence",
        "",
        f"- Status: `{report['status']}`",
        f"- Generated at: `{report['generated_at']}`",
        f"- Full runs: `{report['summary']['full_runs_passed']}/{report['summary']['full_runs']}`",
        f"- Micro goldens: `{report['summary']['micro_goldens']}`",
        f"- Hard violations: `{report['summary']['hard_violations']}`",
        f"- Open gaps: `{report['summary']['open_gaps']}`",
        f"- Legacy backend oracle used: `{report['summary']['legacy_backend_oracle_used']}`",
        "",
        "## Priority Coverage",
        "",
        "| Priority | Status | Evidence |",
        "|---|---|---|",
    ]
    for name, item in report["priority_coverage"].items():
        evidence = json.dumps(item["evidence"], ensure_ascii=False, sort_keys=True)
        lines.append(f"| `{name}` | `{item['status']}` | `{evidence}` |")

    lines.extend(
        [
            "",
            "## Full-Run Goldens",
            "",
            "| Run | Status | Hash | Golden |",
            "|---|---|---|---|",
        ]
    )
    for run in report["runs"]:
        path = run.get("golden_path", "")
        lines.append(
            f"| `{run['run_id']}` | `{run['status']}` | `{run.get('stable_result_sha256', '')}` | `{path}` |"
        )

    lines.extend(
        [
            "",
            "## Micro Goldens",
            "",
            "| Case | Status | Classification | Hash |",
            "|---|---|---|---|",
        ]
    )
    for micro in report["micro_goldens"]:
        lines.append(
            f"| `{micro['id']}` | `{micro['status']}` | `{micro.get('classification', '')}` | `{micro.get('stable_result_sha256', '')}` |"
        )

    lines.extend(
        [
            "",
            "## Core-Only Checks",
            "",
            f"- Backend project paths in `sys.path`: `{len(report['core_only_checks']['backend_project_paths_in_sys_path'])}`",
            f"- Imported `app.*` modules: `{len(report['core_only_checks']['imported_app_modules'])}`",
            f"- Unclassified docs tests: `{len(report['core_only_checks']['docs_test_classification']['unclassified_tests'])}`",
            "",
        ]
    )
    return "\n".join(lines)


if __name__ == "__main__":
    raise SystemExit(main())
