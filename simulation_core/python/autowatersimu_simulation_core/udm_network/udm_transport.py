from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any, Mapping

from .graph import EdgeKind, RuntimeEdge

TAKACS_MODEL_ID = "takacs_settling.v1"

DEFAULT_TSS_WEIGHTS = {
    "X_I": 0.75,
    "X_S": 0.75,
    "X_BH": 0.75,
    "X_BA": 0.75,
    "X_P": 0.75,
    "X_ND": 0.0,
}


class UDMTransportError(ValueError):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code


@dataclass(frozen=True)
class ComponentPolicy:
    mode: str
    include: tuple[str, ...]
    exclude: tuple[str, ...]


@dataclass(frozen=True)
class UDMTransportModel:
    model_id: str
    model_version: str
    source_schema_id: str
    target_schema_id: str
    parameters: dict[str, float]
    component_policy: ComponentPolicy


@dataclass(frozen=True)
class TransportEvaluation:
    source_delta: dict[str, float]
    target_delta: dict[str, float]
    source_volume_delta: float
    target_volume_delta: float
    total_solids_flux: float
    settling_velocity: float
    component_flux: dict[str, float]


def build_transport_model(
    edge_or_definition: RuntimeEdge | Mapping[str, Any],
    *,
    source_schema_id: str = "",
    target_schema_id: str = "",
) -> UDMTransportModel:
    if isinstance(edge_or_definition, RuntimeEdge):
        if edge_or_definition.edge_kind is not EdgeKind.SETTLING:
            raise UDMTransportError(
                "UDM_TRANSPORT_CONTEXT_INVALID",
                "UDM transport model can only be built for settling edges",
            )
        raw_model = edge_or_definition.transport_model or {}
        raw_policy = edge_or_definition.component_policy
    else:
        raw_model = edge_or_definition.get("transport_model") or edge_or_definition
        raw_policy = edge_or_definition.get("component_policy") or {}

    model_id = str(raw_model.get("model_id") or "").strip()
    if model_id != TAKACS_MODEL_ID:
        raise UDMTransportError(
            "UDM_TRANSPORT_MODEL_UNSUPPORTED",
            f"unsupported UDM transport model: {model_id or '<empty>'}",
        )

    return UDMTransportModel(
        model_id=model_id,
        model_version=str(raw_model.get("model_version") or raw_model.get("version") or ""),
        source_schema_id=source_schema_id,
        target_schema_id=target_schema_id,
        parameters=_float_values(raw_model.get("parameters") or {}),
        component_policy=_component_policy(raw_policy),
    )


def evaluate_transport(
    model: UDMTransportModel,
    *,
    t: float,
    source_state: Mapping[str, Any],
    target_state: Mapping[str, Any],
    flow: float = 0.0,
    parameters: Mapping[str, Any] | None = None,
    signals: Mapping[str, Any] | None = None,
) -> TransportEvaluation:
    if model.model_id != TAKACS_MODEL_ID:
        raise UDMTransportError(
            "UDM_TRANSPORT_MODEL_UNSUPPORTED",
            f"unsupported UDM transport model: {model.model_id}",
        )

    del t, flow
    source = _float_values(source_state)
    target = _float_values(target_state)
    params = dict(model.parameters)
    params.update(_float_values(parameters or {}))
    signal_values = _float_values(signals or {})

    components = _settling_components(model.component_policy, source, target, params)
    total_tss = _source_tss(source, components, params)
    if total_tss <= 0:
        return _zero_evaluation(components)

    projection_components = _projection_components(components, source)
    projection_total = sum(max(source.get(component, 0.0), 0.0) for component in projection_components)
    if projection_total <= 0:
        return _zero_evaluation(components)

    x_feed = _feed_tss(params, signal_values, total_tss)
    velocity = _takacs_velocity(total_tss, x_feed, params)
    total_flux = velocity * total_tss * max(params.get("area_m2", 1.0), 0.0)
    total_flux = _limit_total_flux(total_flux, params)

    component_flux = {
        component: total_flux * max(source.get(component, 0.0), 0.0) / projection_total
        for component in projection_components
    }
    source_delta = {component: -component_flux.get(component, 0.0) for component in components}
    target_delta = {component: component_flux.get(component, 0.0) for component in components}

    return TransportEvaluation(
        source_delta=source_delta,
        target_delta=target_delta,
        source_volume_delta=0.0,
        target_volume_delta=0.0,
        total_solids_flux=total_flux,
        settling_velocity=velocity,
        component_flux=component_flux,
    )


def _component_policy(raw_policy: Mapping[str, Any]) -> ComponentPolicy:
    return ComponentPolicy(
        mode=str(raw_policy.get("mode") or "all"),
        include=tuple(str(component) for component in raw_policy.get("include") or ()),
        exclude=tuple(str(component) for component in raw_policy.get("exclude") or ()),
    )


def _settling_components(
    policy: ComponentPolicy,
    source: Mapping[str, float],
    target: Mapping[str, float],
    parameters: Mapping[str, float],
) -> tuple[str, ...]:
    if policy.mode == "include":
        components = tuple(policy.include)
    else:
        if "X_TSS" in source:
            components = ("X_TSS",)
        else:
            weights = _tss_weights(parameters)
            components = tuple(component for component in weights if component in source)
        if policy.mode == "exclude":
            excluded = set(policy.exclude)
            components = tuple(component for component in components if component not in excluded)

    if not components:
        return ()

    missing_source = [component for component in components if component not in source]
    missing_target = [component for component in components if component not in target]
    if missing_source or missing_target:
        missing = ", ".join(sorted(set(missing_source + missing_target)))
        raise UDMTransportError(
            "UDM_TRANSPORT_CONTEXT_INVALID",
            f"settling transport references missing component(s): {missing}",
        )
    return components


def _source_tss(
    source: Mapping[str, float],
    components: tuple[str, ...],
    parameters: Mapping[str, float],
) -> float:
    if "X_TSS" in components:
        return max(source.get("X_TSS", 0.0), 0.0)

    weights = _tss_weights(parameters)
    return sum(
        weights.get(component, 0.0) * max(source.get(component, 0.0), 0.0)
        for component in components
    )


def _projection_components(
    components: tuple[str, ...],
    source: Mapping[str, float],
) -> tuple[str, ...]:
    return tuple(component for component in components if max(source.get(component, 0.0), 0.0) > 0)


def _takacs_velocity(
    x_tss: float,
    x_feed: float,
    parameters: Mapping[str, float],
) -> float:
    v0 = max(parameters.get("v0_m_per_day", 250.0), 0.0)
    v0_max = max(parameters.get("v0_max_m_per_day", 474.0), 0.0)
    r_h = max(parameters.get("r_h_m3_per_g", 0.000576), 0.0)
    r_p = max(parameters.get("r_p_m3_per_g", 0.00286), 0.0)
    f_ns = max(parameters.get("f_ns", 0.00228), 0.0)
    x_eff = max(x_tss - f_ns * max(x_feed, 0.0), 0.0)
    velocity = v0 * (math.exp(-r_h * x_eff) - math.exp(-r_p * x_eff))
    return min(v0_max, max(velocity, 0.0))


def _feed_tss(
    parameters: Mapping[str, float],
    signals: Mapping[str, float],
    fallback: float,
) -> float:
    for key in ("X_feed", "x_feed", "feed_x_tss"):
        if key in signals:
            return signals[key]
        if key in parameters:
            return parameters[key]
    return fallback


def _limit_total_flux(total_flux: float, parameters: Mapping[str, float]) -> float:
    limit = parameters.get("max_total_flux_g_per_day")
    if limit is None or limit <= 0:
        return total_flux
    return min(total_flux, limit)


def _zero_evaluation(components: tuple[str, ...]) -> TransportEvaluation:
    zero = {component: 0.0 for component in components}
    return TransportEvaluation(
        source_delta=dict(zero),
        target_delta=dict(zero),
        source_volume_delta=0.0,
        target_volume_delta=0.0,
        total_solids_flux=0.0,
        settling_velocity=0.0,
        component_flux=dict(zero),
    )


def _tss_weights(parameters: Mapping[str, float]) -> dict[str, float]:
    weights = dict(DEFAULT_TSS_WEIGHTS)
    for component in tuple(weights):
        key = f"tss_weight_{component}"
        if key in parameters:
            weights[component] = parameters[key]
    return weights


def _float_values(raw_values: Mapping[str, Any]) -> dict[str, float]:
    values: dict[str, float] = {}
    for key, value in raw_values.items():
        values[str(key)] = _float(value, str(key))
    return values


def _float(value: Any, name: str) -> float:
    try:
        if hasattr(value, "detach"):
            value = value.detach().cpu().item()
        return float(value)
    except Exception as exc:
        raise UDMTransportError(
            "UDM_TRANSPORT_CONTEXT_INVALID",
            f"transport value {name} must be numeric",
        ) from exc
