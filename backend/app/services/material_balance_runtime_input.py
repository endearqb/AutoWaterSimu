from __future__ import annotations

from typing import Any

from app.models import MaterialBalanceInput as LegacyMaterialBalanceInput
from autowatersimu_simulation_core.material_balance.models import (
    MaterialBalanceInput as CoreMaterialBalanceInput,
)


def material_balance_input_to_core_runtime(
    input_data: LegacyMaterialBalanceInput | CoreMaterialBalanceInput | dict[str, Any],
) -> CoreMaterialBalanceInput:
    """Validate a legacy backend material-balance input against the core runtime contract."""

    if isinstance(input_data, CoreMaterialBalanceInput):
        return input_data

    if isinstance(input_data, dict):
        payload: dict[str, Any] = input_data
    elif hasattr(input_data, "model_dump"):
        payload = input_data.model_dump(mode="json")
    else:
        raise TypeError(
            "material balance calculation input must be a backend/core model or dict"
        )

    return CoreMaterialBalanceInput.model_validate(payload)
