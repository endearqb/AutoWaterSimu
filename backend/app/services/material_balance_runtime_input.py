from __future__ import annotations

from typing import Any

from app.models import MaterialBalanceInput as LegacyMaterialBalanceInput
from autowatersimu_simulation_core.material_balance.models import (
    MaterialBalanceInput as CoreMaterialBalanceInput,
)


def _custom_parameters_from_component_schema(
    component_schema: dict[str, Any] | None,
) -> list[dict[str, str]]:
    if not component_schema:
        return []

    raw_components = component_schema.get("components")
    if not isinstance(raw_components, list):
        return []

    return [
        {"name": str(component), "label": str(component)}
        for component in raw_components
        if component not in (None, "")
    ]


def _merge_legacy_route_metadata(payload: dict[str, Any]) -> dict[str, Any]:
    custom_parameters = payload.get("customParameters")
    component_schema = payload.get("component_schema")

    if not custom_parameters and isinstance(component_schema, dict):
        custom_parameters = _custom_parameters_from_component_schema(component_schema)

    if not custom_parameters and not component_schema:
        return payload

    merged_payload = dict(payload)
    original_flowchart_data = merged_payload.get("original_flowchart_data")
    if isinstance(original_flowchart_data, dict):
        merged_flowchart_data = dict(original_flowchart_data)
    else:
        merged_flowchart_data = {}

    if custom_parameters and "customParameters" not in merged_flowchart_data:
        merged_flowchart_data["customParameters"] = custom_parameters
    if component_schema and "component_schema" not in merged_flowchart_data:
        merged_flowchart_data["component_schema"] = component_schema

    merged_payload["original_flowchart_data"] = merged_flowchart_data
    return merged_payload


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

    payload = _merge_legacy_route_metadata(payload)
    return CoreMaterialBalanceInput.model_validate(payload)
