from __future__ import annotations

from typing import Any

from app.api.routes import asm1, udm
from app.models import MaterialBalanceValidationRequest, User


def _minimal_material_balance_payload() -> dict[str, Any]:
    return {
        "input_data": {
            "nodes": [
                {
                    "node_id": "n_in",
                    "node_type": "input",
                    "initial_volume": 1.0,
                    "initial_concentrations": [10.0],
                    "is_inlet": True,
                    "is_outlet": False,
                },
                {
                    "node_id": "n_out",
                    "node_type": "output",
                    "initial_volume": 1.0,
                    "initial_concentrations": [0.0],
                    "is_inlet": False,
                    "is_outlet": True,
                },
            ],
            "edges": [
                {
                    "edge_id": "edge_1",
                    "source_node_id": "n_in",
                    "target_node_id": "n_out",
                    "flow_rate": 100.0,
                    "concentration_factor_a": [1.0],
                    "concentration_factor_b": [0.0],
                }
            ],
            "parameters": {
                "hours": 1.0,
                "steps_per_hour": 10,
                "solver_method": "scipy_solver",
                "tolerance": 0.000001,
                "max_iterations": 1000,
                "max_memory_mb": 1000,
            },
            "time_segments": [],
        }
    }


def _assert_validate_response_shape(data: dict[str, Any]) -> None:
    assert data["is_valid"] is True
    assert "estimated_memory_mb" in data
    assert "estimated_time_seconds" in data
    assert "estimated_calculation_time_seconds" not in data
    assert isinstance(data["estimated_memory_mb"], int | float)
    assert isinstance(data["estimated_time_seconds"], int | float)


def _validation_request() -> MaterialBalanceValidationRequest:
    return MaterialBalanceValidationRequest.model_validate(
        _minimal_material_balance_payload()
    )


def _test_user() -> User:
    return User(email="phase01@example.com", hashed_password="not-used")


def test_asm1_validate_response_uses_material_balance_schema() -> None:
    response = asm1.validate_calculation_input(
        current_user=_test_user(),
        validation_request=_validation_request(),
    )

    _assert_validate_response_shape(response.model_dump())


def test_udm_validate_response_uses_material_balance_schema() -> None:
    response = udm.validate_calculation_input(
        current_user=_test_user(),
        validation_request=_validation_request(),
    )

    _assert_validate_response_shape(response.model_dump())
