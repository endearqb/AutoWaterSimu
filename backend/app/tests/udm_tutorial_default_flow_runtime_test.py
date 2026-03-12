from __future__ import annotations

from typing import Any

import pytest

from app.material_balance.core import MaterialBalanceCalculator
from app.services.data_conversion_service import DataConversionService
from app.services.udm_seed_templates import get_udm_seed_template


def _to_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _build_custom_parameters(components: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        {
            "name": str(component["name"]),
            "label": str(component.get("label") or component["name"]),
            "description": str(component.get("unit") or ""),
            "defaultValue": _to_float(component.get("default_value"), 0.0),
        }
        for component in components
        if str(component.get("name") or "").strip()
    ]


def _build_plain_node_data(
    label: str,
    components: list[dict[str, Any]],
    *,
    volume: str,
    overrides: dict[str, float] | None = None,
) -> dict[str, Any]:
    node_data: dict[str, Any] = {"label": label, "volume": volume}
    overrides = overrides or {}

    for component in components:
        name = str(component.get("name") or "").strip()
        if not name:
            continue
        node_data[name] = str(
            overrides.get(name, _to_float(component.get("default_value"), 0.0))
        )

    return node_data


def _build_bound_udm_node_data(
    *,
    label: str,
    model_id: str,
    model_name: str,
    model_version: int,
    model_hash: str,
    components: list[dict[str, Any]],
    parameters: list[dict[str, Any]],
    processes: list[dict[str, Any]],
    meta: dict[str, Any],
    volume: str,
) -> dict[str, Any]:
    parameter_values = {
        str(param["name"]): _to_float(param.get("default_value"), 0.0)
        for param in parameters
        if str(param.get("name") or "").strip()
    }
    base = _build_plain_node_data(label, components, volume=volume)

    base.update(
        {
            "udmModel": {
                "id": model_id,
                "name": model_name,
                "version": model_version,
                "hash": model_hash,
                "components": components,
                "parameters": parameters,
                "processes": processes,
                "parameterValues": parameter_values,
            },
            "udmModelSnapshot": {
                "id": model_id,
                "name": model_name,
                "version": model_version,
                "hash": model_hash,
                "components": components,
                "parameters": parameters,
                "processes": processes,
                "meta": meta,
            },
            "udmComponents": components,
            "udmComponentNames": [str(component["name"]) for component in components],
            "udmProcesses": processes,
            "udmParameters": parameter_values,
            "udmParameterValues": parameter_values,
            "udmModelId": model_id,
            "udmModelVersion": model_version,
            "udmModelHash": model_hash,
        }
    )

    return base


def _build_edge_data(
    custom_parameters: list[dict[str, Any]], flow_rate: float
) -> dict[str, Any]:
    edge_data: dict[str, Any] = {"flow": flow_rate}
    for parameter in custom_parameters:
        name = str(parameter.get("name") or "").strip()
        if not name:
            continue
        edge_data[f"{name}_a"] = 1.0
        edge_data[f"{name}_b"] = 0.0
    return edge_data


def _build_tutorial_flowchart(
    *,
    template_key: str,
    input_overrides: dict[str, float],
    reactor_volume: str,
    edge_flow_rate: float,
    hours: float,
) -> dict[str, Any]:
    template = get_udm_seed_template(template_key)
    components = list(template["components"])
    parameters = list(template["parameters"])
    processes = list(template["processes"])
    custom_parameters = _build_custom_parameters(components)
    edge_data = _build_edge_data(custom_parameters, edge_flow_rate)

    return {
        "nodes": [
            {
                "id": "udm-input-1",
                "type": "input",
                "data": _build_plain_node_data(
                    "Influent",
                    components,
                    volume="1e-3",
                    overrides=input_overrides,
                ),
            },
            {
                "id": "udm-reactor-1",
                "type": "udm",
                "data": _build_bound_udm_node_data(
                    label="UDM Reactor",
                    model_id=template_key,
                    model_name=str(template["name"]),
                    model_version=1,
                    model_hash=f"{template_key}-hash",
                    components=components,
                    parameters=parameters,
                    processes=processes,
                    meta=dict(template.get("meta") or {}),
                    volume=reactor_volume,
                ),
            },
            {
                "id": "udm-output-1",
                "type": "output",
                "data": _build_plain_node_data(
                    "Effluent",
                    components,
                    volume="1e-3",
                ),
            },
        ],
        "edges": [
            {
                "id": "udm-edge-1",
                "source": "udm-input-1",
                "target": "udm-reactor-1",
                "type": "editable",
                "data": dict(edge_data),
            },
            {
                "id": "udm-edge-2",
                "source": "udm-reactor-1",
                "target": "udm-output-1",
                "type": "editable",
                "data": dict(edge_data),
            },
        ],
        "customParameters": custom_parameters,
        "calculationParameters": {
            "hours": hours,
            "steps_per_hour": 12,
        },
        "timeSegments": [],
        "version": "1.0",
    }


def _count_changed_series(node_data: dict[str, Any], *, tolerance: float = 1e-6) -> int:
    changed = 0
    for values in node_data.values():
        if not isinstance(values, list) or len(values) < 2:
            continue
        baseline = _to_float(values[0])
        if any(abs(_to_float(value) - baseline) > tolerance for value in values[1:]):
            changed += 1
    return changed


@pytest.mark.parametrize(
    ("template_key", "input_overrides", "reactor_volume", "edge_flow_rate"),
    [
        (
            "petersen-chapter-2",
            {
                "dissolvedOxygen": 2.0,
                "cod": 200.0,
                "nitrate": 0.0,
                "ammonia": 25.0,
                "totalAlkalinity": 100.0,
            },
            "800",
            800.0,
        ),
        (
            "petersen-chapter-7",
            {
                "S_S": 200.0,
                "S_O": 0.0,
                "S_NH": 25.0,
                "S_NO": 0.0,
                "S_ND": 5.0,
                "X_BH": 0.0,
                "X_BA": 0.0,
                "X_S": 50.0,
                "X_i": 0.0,
                "X_ND": 0.0,
                "S_ALK": 4.0,
            },
            "1000",
            1000.0,
        ),
    ],
)
def test_tutorial_default_flows_keep_boundary_nodes_fixed(
    template_key: str,
    input_overrides: dict[str, float],
    reactor_volume: str,
    edge_flow_rate: float,
) -> None:
    flowchart_data = _build_tutorial_flowchart(
        template_key=template_key,
        input_overrides=input_overrides,
        reactor_volume=reactor_volume,
        edge_flow_rate=edge_flow_rate,
        hours=2.0,
    )

    input_data = DataConversionService().convert_flowchart_to_material_balance_input(
        flowchart_data
    )
    assert input_data.time_segments == []

    result = MaterialBalanceCalculator().calculate(input_data)

    assert _count_changed_series(result.node_data["udm-input-1"]) == 0
    assert _count_changed_series(result.node_data["udm-output-1"]) == 0
    assert _count_changed_series(result.node_data["udm-reactor-1"]) > 0
