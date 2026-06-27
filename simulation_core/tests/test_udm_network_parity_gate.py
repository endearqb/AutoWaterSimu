from __future__ import annotations

import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
SIMULATION_CORE_PYTHON = REPO_ROOT / "simulation_core" / "python"
TESTS_DIR = REPO_ROOT / "simulation_core" / "tests"

sys.path.insert(0, str(SIMULATION_CORE_PYTHON))
sys.path.insert(0, str(TESTS_DIR))

from autowatersimu_simulation_core.udm_network import build_v1_migration_gate  # noqa: E402
from test_material_balance_core import CORE_F64_GOLDEN_CASES  # noqa: E402


REQUIRED_MODEL_FAMILIES = {
    "material_balance",
    "udm",
    "asm1slim",
    "asm1",
    "asm3",
}


def test_v1_migration_gate_declares_all_five_model_families() -> None:
    gate = build_v1_migration_gate()

    assert gate.gate_id == "udm_network_v2_five_model_parity.v1"
    assert {case.model_family for case in gate.cases} == REQUIRED_MODEL_FAMILIES


def test_v1_migration_gate_links_existing_committed_f64_golden_cases() -> None:
    gate = build_v1_migration_gate()

    for case in gate.cases:
        golden = CORE_F64_GOLDEN_CASES[case.v1_golden_case_id]
        assert (REPO_ROOT / case.v1_fixture) == golden["fixture"]
        assert golden["fixture"].is_file()

        payload = json.loads(golden["fixture"].read_text(encoding="utf-8"))
        assert payload["job_type"] == case.v1_job_type


def test_v1_migration_gate_stays_closed_until_all_v2_l2_parity_evidence_passes() -> None:
    gate = build_v1_migration_gate()

    assert gate.ready_for_v2_cutover is False
    assert len(gate.blocking_reasons) == len(gate.cases)
    assert all(case.v2_required_evidence for case in gate.cases)
    assert all(case.v2_parity_status in {"pending", "partial"} for case in gate.cases)


def test_v1_migration_gate_report_is_json_serializable() -> None:
    gate = build_v1_migration_gate()
    report = gate.as_dict()

    assert report["ready_for_v2_cutover"] is False
    assert len(report["cases"]) == 5
    json.dumps(report, sort_keys=True)
