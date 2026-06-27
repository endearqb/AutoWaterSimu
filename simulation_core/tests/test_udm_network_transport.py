from __future__ import annotations

import json
import math
import sys
from pathlib import Path
from typing import Any

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
SIMULATION_CORE_PYTHON = REPO_ROOT / "simulation_core" / "python"
VALID_EXAMPLES = REPO_ROOT / "contracts" / "examples" / "valid"

sys.path.insert(0, str(SIMULATION_CORE_PYTHON))

from autowatersimu_simulation_core.udm_network import (  # noqa: E402
    UDMTransportError,
    build_transport_model,
    compile_network,
    evaluate_transport,
)


def _load_fixture(name: str) -> dict[str, Any]:
    return json.loads((VALID_EXAMPLES / name).read_text(encoding="utf-8"))


def _takacs_model(**parameters: float):
    return build_transport_model(
        {
            "transport_model": {
                "model_id": "takacs_settling.v1",
                "parameters": {
                    "area_m2": 1.0,
                    "v0_m_per_day": 1.0,
                    "v0_max_m_per_day": 10.0,
                    "r_h_m3_per_g": 0.0,
                    "r_p_m3_per_g": 1.0,
                    "f_ns": 0.0,
                    **parameters,
                },
            },
            "component_policy": {"mode": "include", "include": ["X_TSS"], "exclude": []},
        }
    )


def test_build_transport_model_from_compiled_settling_edge() -> None:
    system = compile_network(
        _load_fixture("udm_network_minimal.network_process_graph.v1.json")
    )
    model = build_transport_model(system.edge_by_id["e_clarifier_sludge"])

    assert model.model_id == "takacs_settling.v1"
    assert model.component_policy.include == ("X_TSS",)


def test_takacs_settling_conserves_component_mass() -> None:
    result = evaluate_transport(
        _takacs_model(),
        t=0.0,
        source_state={"X_TSS": 100.0},
        target_state={"X_TSS": 0.0},
    )

    assert result.source_delta["X_TSS"] == pytest.approx(-100.0)
    assert result.target_delta["X_TSS"] == pytest.approx(100.0)
    assert result.source_delta["X_TSS"] + result.target_delta["X_TSS"] == pytest.approx(0.0)


def test_takacs_settling_does_not_change_volume() -> None:
    result = evaluate_transport(
        _takacs_model(),
        t=0.0,
        source_state={"X_TSS": 100.0},
        target_state={"X_TSS": 0.0},
        flow=123.0,
    )

    assert result.source_volume_delta == 0.0
    assert result.target_volume_delta == 0.0


def test_takacs_zero_solids_has_no_movement() -> None:
    result = evaluate_transport(
        _takacs_model(),
        t=0.0,
        source_state={"X_TSS": 0.0},
        target_state={"X_TSS": 0.0},
    )

    assert result.total_solids_flux == 0.0
    assert result.source_delta == {"X_TSS": 0.0}
    assert result.target_delta == {"X_TSS": 0.0}


def test_takacs_high_solids_uses_shared_velocity_limiter() -> None:
    result = evaluate_transport(
        _takacs_model(v0_m_per_day=100.0, v0_max_m_per_day=2.0),
        t=0.0,
        source_state={"X_TSS": 50.0},
        target_state={"X_TSS": 0.0},
    )

    assert result.settling_velocity == 2.0
    assert result.total_solids_flux == 100.0
    assert result.target_delta["X_TSS"] == 100.0


def test_takacs_uses_total_solids_flux_not_per_component_flux() -> None:
    model = build_transport_model(
        {
            "transport_model": {
                "model_id": "takacs_settling.v1",
                "parameters": {
                    "area_m2": 1.0,
                    "v0_m_per_day": 250.0,
                    "v0_max_m_per_day": 1000.0,
                    "r_h_m3_per_g": 0.000576,
                    "r_p_m3_per_g": 0.00286,
                    "f_ns": 0.0,
                },
            },
            "component_policy": {
                "mode": "include",
                "include": ["X_I", "X_S"],
                "exclude": [],
            },
        }
    )

    result = evaluate_transport(
        model,
        t=0.0,
        source_state={"X_I": 100.0, "X_S": 100.0},
        target_state={"X_I": 0.0, "X_S": 0.0},
    )
    x_tss = 0.75 * (100.0 + 100.0)
    expected_velocity = 250.0 * (
        math.exp(-0.000576 * x_tss) - math.exp(-0.00286 * x_tss)
    )
    expected_total_flux = expected_velocity * x_tss
    expected_component_flux = expected_velocity * 100.0

    assert result.total_solids_flux == pytest.approx(expected_total_flux)
    assert result.target_delta["X_I"] == pytest.approx(expected_component_flux)
    assert result.target_delta["X_S"] == pytest.approx(expected_component_flux)
    assert 0.75 * sum(result.target_delta.values()) == pytest.approx(expected_total_flux)


def test_takacs_moves_zero_weight_xnd_with_sludge_flux() -> None:
    model = build_transport_model(
        {
            "transport_model": {
                "model_id": "takacs_settling.v1",
                "parameters": {
                    "area_m2": 2.0,
                    "v0_m_per_day": 1.0,
                    "v0_max_m_per_day": 10.0,
                    "r_h_m3_per_g": 0.0,
                    "r_p_m3_per_g": 1.0,
                    "f_ns": 0.0,
                },
            },
            "component_policy": {
                "mode": "include",
                "include": ["X_I", "X_ND"],
                "exclude": [],
            },
        }
    )

    result = evaluate_transport(
        model,
        t=0.0,
        source_state={"X_I": 100.0, "X_ND": 20.0},
        target_state={"X_I": 0.0, "X_ND": 0.0},
    )

    assert result.target_delta["X_I"] == pytest.approx(result.settling_velocity * 2.0 * 100.0)
    assert result.target_delta["X_ND"] == pytest.approx(result.settling_velocity * 2.0 * 20.0)
    assert result.total_solids_flux == pytest.approx(0.75 * result.target_delta["X_I"])


def test_takacs_rejects_missing_target_component() -> None:
    with pytest.raises(UDMTransportError) as error:
        evaluate_transport(
            _takacs_model(),
            t=0.0,
            source_state={"X_TSS": 100.0},
            target_state={},
        )

    assert error.value.code == "UDM_TRANSPORT_CONTEXT_INVALID"
