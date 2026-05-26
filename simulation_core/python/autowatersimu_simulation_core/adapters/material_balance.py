from __future__ import annotations

from typing import Any

from pydantic import ValidationError

from autowatersimu_simulation_core.errors import SimulationCoreAdapterError
from autowatersimu_simulation_core.material_balance.models import (
    CalculationParameters,
    EdgeData,
    MaterialBalanceInput,
    NodeData,
    TimeSegment,
)


def simulation_input_to_material_balance_input(
    simulation_input: dict[str, Any],
) -> MaterialBalanceInput:
    if simulation_input.get("schema_version") != "simulation_input.v1":
        raise SimulationCoreAdapterError(
            "simulation_input schema_version must be simulation_input.v1",
            [_detail("$.schema_version", "schema_version must be simulation_input.v1", None)],
        )
    if simulation_input.get("job_type") != "simulation.material_balance.v1":
        raise SimulationCoreAdapterError(
            "unsupported simulation input job_type",
            [
                _detail(
                    "$.job_type",
                    "only simulation.material_balance.v1 is supported",
                    simulation_input.get("job_type"),
                )
            ],
        )

    try:
        components = _components(simulation_input)
        nodes = [
            _adapt_node(node, components, index)
            for index, node in enumerate(_as_list(simulation_input.get("nodes")))
        ]
        edges = [
            _adapt_edge(edge, components, index)
            for index, edge in enumerate(_as_list(simulation_input.get("edges")))
        ]
        parameters = CalculationParameters(**_as_dict(simulation_input.get("parameters")))
        time_segments = _adapt_time_segments(simulation_input.get("time_segments"))

        return MaterialBalanceInput(
            nodes=nodes,
            edges=edges,
            parameters=parameters,
            time_segments=time_segments,
            original_flowchart_data={
                "schema_version": "simulation_input.v1",
                "customParameters": [
                    {"name": component, "label": component}
                    for component in components
                ],
            },
        )
    except SimulationCoreAdapterError:
        raise
    except ValidationError as exc:
        raise SimulationCoreAdapterError(
            "simulation_input adapter validation failed",
            _validation_error_details(exc),
        ) from exc


def _adapt_node(node: dict[str, Any], components: list[str], index: int) -> NodeData:
    node_id = _string_value(node.get("node_id"))
    node_type = _string_value(node.get("node_type"))
    is_inlet = bool(node.get("is_inlet")) or node_type in {"input", "inlet"}
    is_outlet = bool(node.get("is_outlet")) or node_type in {"output", "outlet"}
    raw_volume = node.get("initial_volume")

    if raw_volume in (None, "") and (is_inlet or is_outlet):
        volume = 1.0
    elif raw_volume in (None, ""):
        raise SimulationCoreAdapterError(
            "reactor node initial_volume is required",
            [
                _detail(
                    f"$.nodes[{index}].initial_volume",
                    "reactor volume is required",
                    node_id,
                )
            ],
        )
    else:
        volume = _number(raw_volume, path=f"$.nodes[{index}].initial_volume")

    initial_concentrations = _as_dict(node.get("initial_concentrations"))
    return NodeData(
        node_id=node_id,
        node_type=node_type or "default",
        is_inlet=is_inlet,
        is_outlet=is_outlet,
        initial_volume=volume,
        initial_concentrations=[
            _number(
                initial_concentrations.get(component),
                default=0.0,
                path=f"$.nodes[{index}].initial_concentrations.{component}",
            )
            for component in components
        ],
    )


def _adapt_edge(edge: dict[str, Any], components: list[str], index: int) -> EdgeData:
    transform = _as_dict(edge.get("concentration_transform"))
    factor_a: list[float] = []
    factor_b: list[float] = []
    for component in components:
        factor = _as_dict(transform.get(component))
        factor_a.append(
            _number(
                factor.get("a"),
                default=1.0,
                path=f"$.edges[{index}].concentration_transform.{component}.a",
            )
        )
        factor_b.append(
            _number(
                factor.get("b"),
                default=0.0,
                path=f"$.edges[{index}].concentration_transform.{component}.b",
            )
        )

    return EdgeData(
        edge_id=_string_value(edge.get("edge_id")),
        source_node_id=_string_value(edge.get("source_node_id")),
        target_node_id=_string_value(edge.get("target_node_id")),
        flow_rate=_number(
            edge.get("flow_rate"),
            default=1000.0,
            path=f"$.edges[{index}].flow_rate",
        ),
        concentration_factor_a=factor_a,
        concentration_factor_b=factor_b,
    )


def _adapt_time_segments(value: Any) -> list[TimeSegment]:
    segments: list[TimeSegment] = []
    for index, raw_segment in enumerate(_as_list(value)):
        if not isinstance(raw_segment, dict):
            raise SimulationCoreAdapterError(
                "time segment must be an object",
                [
                    _detail(
                        f"$.time_segments[{index}]",
                        "time segment must be an object",
                        None,
                    )
                ],
            )
        segments.append(TimeSegment(**raw_segment))
    return segments


def _components(simulation_input: dict[str, Any]) -> list[str]:
    component_schema = _as_dict(simulation_input.get("component_schema"))
    components = [
        _string_value(component)
        for component in _as_list(component_schema.get("components"))
    ]
    components = [component for component in components if component]
    if not components:
        raise SimulationCoreAdapterError(
            "component_schema.components is required",
            [
                _detail(
                    "$.component_schema.components",
                    "at least one component is required",
                    None,
                )
            ],
        )
    if len(components) != len(set(components)):
        raise SimulationCoreAdapterError(
            "component_schema.components must be unique",
            [
                _detail(
                    "$.component_schema.components",
                    "component names must be unique",
                    None,
                )
            ],
        )
    return components


def _number(value: Any, *, path: str, default: float | None = None) -> float:
    if value in (None, "") and default is not None:
        return default
    try:
        return float(value)
    except (TypeError, ValueError) as exc:
        raise SimulationCoreAdapterError(
            "numeric conversion failed",
            [_detail(path, "value must be numeric", None)],
        ) from exc


def _string_value(value: Any) -> str:
    return str(value).strip() if value is not None else ""


def _as_dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _as_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def _detail(path: str, reason: str, source_id: Any) -> dict[str, Any]:
    return {"path": path, "reason": reason, "source_id": source_id}


def _validation_error_details(exc: ValidationError) -> list[dict[str, Any]]:
    details: list[dict[str, Any]] = []
    for error in exc.errors():
        loc = ".".join(str(part) for part in error.get("loc", ()))
        details.append(
            _detail(
                f"$.{loc}" if loc else "$",
                str(error.get("msg", "validation error")),
                None,
            )
        )
    return details
