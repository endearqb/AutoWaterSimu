from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
SIMULATION_CORE_PYTHON = REPO_ROOT / "simulation_core" / "python"
BACKEND_PATH = REPO_ROOT / "backend"
VALID_SIMULATION_INPUT = (
    REPO_ROOT
    / "contracts"
    / "examples"
    / "valid"
    / "material_balance_minimal.simulation_input.v1.json"
)
ASM1SLIM_SIMULATION_INPUT = (
    REPO_ROOT
    / "contracts"
    / "examples"
    / "valid"
    / "asm1slim_minimal.simulation_input.v1.json"
)
ASM1SLIM_INDEPENDENT_SIMULATION_INPUT = (
    REPO_ROOT
    / "contracts"
    / "examples"
    / "valid"
    / "asm1slim_independent.simulation_input.v1.json"
)
ASM1_INDEPENDENT_SIMULATION_INPUT = (
    REPO_ROOT
    / "contracts"
    / "examples"
    / "valid"
    / "asm1_independent.simulation_input.v1.json"
)
ASM3_INDEPENDENT_SIMULATION_INPUT = (
    REPO_ROOT
    / "contracts"
    / "examples"
    / "valid"
    / "asm3_independent.simulation_input.v1.json"
)
UDM_INDEPENDENT_SIMULATION_INPUT = (
    REPO_ROOT
    / "contracts"
    / "examples"
    / "valid"
    / "udm_independent.simulation_input.v1.json"
)

sys.path.insert(0, str(SIMULATION_CORE_PYTHON))
sys.path.insert(0, str(BACKEND_PATH))

from app.material_balance.core import MaterialBalanceCalculator as BackendMaterialBalanceCalculator
from app.services.simulation_input_adapter import (
    simulation_input_to_material_balance_input as backend_simulation_input_to_material_balance_input,
)
from autowatersimu_simulation_core.adapters import (
    simulation_input_to_material_balance_input,
)
from autowatersimu_simulation_core.material_balance import MaterialBalanceCalculator


def _load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _minimal_simulation_input() -> dict[str, Any]:
    return _load_json(VALID_SIMULATION_INPUT)


def _final_component_value(result: Any, node_id: str, component_name: str, component_index: int) -> float:
    node_data = result.node_data[node_id]
    values = node_data.get(component_name) or node_data[f"concentration_{component_index}"]
    return values[-1]


def test_core_calculator_matches_backend_baseline() -> None:
    simulation_input = _minimal_simulation_input()

    core_input = simulation_input_to_material_balance_input(simulation_input)
    backend_input = backend_simulation_input_to_material_balance_input(simulation_input)

    core_result = MaterialBalanceCalculator().calculate(core_input)
    backend_result = BackendMaterialBalanceCalculator().calculate(backend_input)

    assert core_result.status == "success"
    assert core_result.summary["total_steps"] == backend_result.summary["total_steps"]
    assert _final_component_value(core_result, "n_tank", "COD", 0) == pytest.approx(
        _final_component_value(backend_result, "n_tank", "COD", 0),
        rel=1e-6,
        abs=1e-9,
    )


def test_core_calculator_matches_backend_for_asm1slim_runtime_binding() -> None:
    simulation_input = _load_json(ASM1SLIM_SIMULATION_INPUT)

    core_input = simulation_input_to_material_balance_input(simulation_input)
    backend_input = backend_simulation_input_to_material_balance_input(simulation_input)

    core_result = MaterialBalanceCalculator().calculate(core_input)
    backend_result = BackendMaterialBalanceCalculator().calculate(backend_input)

    assert core_result.status == "success"
    assert backend_result.status == "success"
    assert core_input.nodes[1].node_type == "asm1slim"
    assert core_input.nodes[1].asm1slim_parameters == [0.12, 0.08, 2.5, 10.0, 0.5, 0.8, 0.4]
    assert core_result.summary["total_steps"] == backend_result.summary["total_steps"]
    assert _final_component_value(core_result, "n_reactor", "S_S", 1) == pytest.approx(
        _final_component_value(backend_result, "n_reactor", "S_S", 1),
        rel=1e-6,
        abs=1e-9,
    )


def test_core_calculator_matches_backend_for_independent_asm1slim_job_type() -> None:
    simulation_input = _load_json(ASM1SLIM_INDEPENDENT_SIMULATION_INPUT)

    core_input = simulation_input_to_material_balance_input(simulation_input)
    backend_input = backend_simulation_input_to_material_balance_input(simulation_input)

    core_result = MaterialBalanceCalculator().calculate(core_input)
    backend_result = BackendMaterialBalanceCalculator().calculate(backend_input)

    assert simulation_input["job_type"] == "simulation.asm1slim.v1"
    assert core_result.status == "success"
    assert backend_result.status == "success"
    assert core_input.nodes[1].node_type == "asm1slim"
    assert core_result.summary["total_steps"] == backend_result.summary["total_steps"]
    assert _final_component_value(core_result, "n_reactor", "S_S", 1) == pytest.approx(
        _final_component_value(backend_result, "n_reactor", "S_S", 1),
        rel=1e-6,
        abs=1e-9,
    )


def test_core_calculator_matches_backend_for_independent_asm1_job_type() -> None:
    simulation_input = _load_json(ASM1_INDEPENDENT_SIMULATION_INPUT)

    core_input = simulation_input_to_material_balance_input(simulation_input)
    backend_input = backend_simulation_input_to_material_balance_input(simulation_input)

    core_result = MaterialBalanceCalculator().calculate(core_input)
    backend_result = BackendMaterialBalanceCalculator().calculate(backend_input)

    assert simulation_input["job_type"] == "simulation.asm1.v1"
    assert core_result.status == "success"
    assert backend_result.status == "success"
    assert core_input.nodes[1].node_type == "asm1"
    assert core_input.nodes[1].asm1_parameters is not None
    assert len(core_input.nodes[1].asm1_parameters) == 19
    assert core_result.summary["total_steps"] == backend_result.summary["total_steps"]
    assert _final_component_value(core_result, "n_reactor", "S_S", 1) == pytest.approx(
        _final_component_value(backend_result, "n_reactor", "S_S", 1),
        rel=1e-6,
        abs=1e-9,
    )


def test_core_calculator_matches_backend_for_independent_asm3_job_type() -> None:
    simulation_input = _load_json(ASM3_INDEPENDENT_SIMULATION_INPUT)

    core_input = simulation_input_to_material_balance_input(simulation_input)
    backend_input = backend_simulation_input_to_material_balance_input(simulation_input)

    core_result = MaterialBalanceCalculator().calculate(core_input)
    backend_result = BackendMaterialBalanceCalculator().calculate(backend_input)

    assert simulation_input["job_type"] == "simulation.asm3.v1"
    assert core_result.status == "success"
    assert backend_result.status == "success"
    assert core_input.nodes[1].node_type == "asm3"
    assert core_input.nodes[1].asm3_parameters is not None
    assert len(core_input.nodes[1].asm3_parameters) == 37
    assert core_result.summary["total_steps"] == backend_result.summary["total_steps"]
    assert _final_component_value(core_result, "n_reactor", "S_S", 1) == pytest.approx(
        _final_component_value(backend_result, "n_reactor", "S_S", 1),
        rel=1e-6,
        abs=1e-9,
    )


def test_core_calculator_matches_backend_for_independent_udm_job_type() -> None:
    simulation_input = _load_json(UDM_INDEPENDENT_SIMULATION_INPUT)

    core_input = simulation_input_to_material_balance_input(simulation_input)
    backend_input = backend_simulation_input_to_material_balance_input(simulation_input)

    core_result = MaterialBalanceCalculator().calculate(core_input)
    backend_result = BackendMaterialBalanceCalculator().calculate(backend_input)

    assert simulation_input["job_type"] == "simulation.udm.v1"
    assert core_result.status == "success"
    assert backend_result.status == "success"
    assert core_input.nodes[1].node_type == "udm"
    assert core_input.nodes[1].udm_model_snapshot is not None
    assert core_input.nodes[1].udm_variable_bindings is not None
    assert core_result.summary["total_steps"] == backend_result.summary["total_steps"]
    assert _final_component_value(core_result, "n_reactor", "A", 1) == pytest.approx(
        _final_component_value(backend_result, "n_reactor", "A", 1),
        rel=1e-6,
        abs=1e-9,
    )
