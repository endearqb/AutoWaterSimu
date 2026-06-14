from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from app.models import MaterialBalanceInput as LegacyMaterialBalanceInput
from app.services.simulation_input_adapter import (
    simulation_input_to_core_material_balance_input,
    simulation_input_to_material_balance_input,
)
from autowatersimu_simulation_core.material_balance.models import (
    MaterialBalanceInput as CoreMaterialBalanceInput,
)

REPO_ROOT = Path(__file__).resolve().parents[4]


def _load_minimal_simulation_input() -> dict[str, Any]:
    path = (
        REPO_ROOT
        / "contracts"
        / "examples"
        / "valid"
        / "material_balance_minimal.simulation_input.v1.json"
    )
    return json.loads(path.read_text(encoding="utf-8"))


def test_simulation_input_has_legacy_and_core_material_balance_boundaries() -> None:
    simulation_input = _load_minimal_simulation_input()

    legacy_input = simulation_input_to_material_balance_input(simulation_input)
    core_input = simulation_input_to_core_material_balance_input(simulation_input)

    assert type(legacy_input) is LegacyMaterialBalanceInput
    assert type(core_input) is CoreMaterialBalanceInput


def test_core_runtime_adapter_preserves_material_balance_input_shape() -> None:
    simulation_input = _load_minimal_simulation_input()
    simulation_input["component_schema"]["components"] = ["COD", "NH3"]
    simulation_input["nodes"][0]["initial_concentrations"] = {"NH3": 2.0, "COD": 1.0}
    simulation_input["edges"][0]["concentration_transform"] = {
        "COD": {"a": 2.0, "b": ""}
    }

    core_input = simulation_input_to_core_material_balance_input(simulation_input)

    assert core_input.nodes[0].initial_concentrations == [1.0, 2.0]
    assert core_input.edges[0].concentration_factor_a == [2.0, 1.0]
    assert core_input.edges[0].concentration_factor_b == [0.0, 0.0]
