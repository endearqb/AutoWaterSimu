from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable, Mapping, Sequence

from autowatersimu_simulation_core.material_balance.udm_expression import (
    UnsafeExpressionError,
    compile_expression,
)

ExpressionEvaluator = Callable[[dict[str, Any]], Any]


class UDMReactionError(ValueError):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code


@dataclass(frozen=True)
class UDMProcess:
    name: str
    rate_expr: str
    stoich: dict[str, float]
    stoich_expr: dict[str, str]
    rate_evaluator: ExpressionEvaluator = field(repr=False, compare=False)
    stoich_evaluators: dict[str, ExpressionEvaluator] = field(
        default_factory=dict,
        repr=False,
        compare=False,
    )


@dataclass(frozen=True)
class UDMReactionModel:
    model_id: str
    model_version: str
    local_components: tuple[str, ...]
    parameters: dict[str, float]
    processes: tuple[UDMProcess, ...]
    reaction_enabled: bool


def build_reaction_model(
    model_definition: Mapping[str, Any],
    *,
    reaction_enabled: bool | None = None,
    parameter_overrides: Mapping[str, Any] | None = None,
    fallback_components: Sequence[str] | None = None,
) -> UDMReactionModel:
    local_components = _component_names(
        model_definition.get("components"),
        fallback=fallback_components,
    )
    if not local_components:
        code = (
            "UDM_REACTION_COMPONENT_SCHEMA_EMPTY"
            if _bool_or_default(reaction_enabled, True)
            else "UDM_PASSIVE_NODE_SCHEMA_EMPTY"
        )
        raise UDMReactionError(code, "UDM reaction model requires local components")

    enabled = _bool_or_default(
        reaction_enabled,
        _bool_or_default(model_definition.get("reaction_enabled"), True),
    )
    parameters = _parameter_values(model_definition.get("parameters"))
    parameters.update(_float_values(parameter_overrides or {}))
    processes = _processes(model_definition.get("processes") or [], local_components)

    return UDMReactionModel(
        model_id=str(
            model_definition.get("model_id")
            or model_definition.get("key")
            or model_definition.get("name")
            or "inline"
        ),
        model_version=str(
            model_definition.get("model_version")
            or model_definition.get("template_revision")
            or model_definition.get("version")
            or ""
        ),
        local_components=tuple(local_components),
        parameters=parameters,
        processes=tuple(processes),
        reaction_enabled=enabled,
    )


def build_node_reaction_model(
    node: Any,
    *,
    model_definition: Mapping[str, Any] | None = None,
) -> UDMReactionModel:
    binding = getattr(node, "model_binding", {}) or {}
    definition = model_definition or binding.get("model_definition") or binding
    return build_reaction_model(
        definition,
        reaction_enabled=binding.get("reaction_enabled"),
        parameter_overrides=getattr(node, "parameter_binding", {}) or {},
        fallback_components=getattr(node, "component_names", ()) or (),
    )


def evaluate_reaction(
    model: UDMReactionModel,
    *,
    t: float,
    local_state: Mapping[str, Any] | Sequence[Any],
    parameters: Mapping[str, Any] | None = None,
    signals: Mapping[str, Any] | None = None,
) -> dict[str, float]:
    if not model.reaction_enabled or not model.processes:
        return {component: 0.0 for component in model.local_components}

    env = _evaluation_env(model, t=t, local_state=local_state, parameters=parameters, signals=signals)
    rates = [_evaluate(process.rate_evaluator, env, process.name) for process in model.processes]
    reaction = {component: 0.0 for component in model.local_components}

    for process, rate in zip(model.processes, rates):
        coeff_env = dict(env)
        for component in model.local_components:
            if component in process.stoich_evaluators:
                coefficient = _evaluate(process.stoich_evaluators[component], coeff_env, process.name)
            else:
                coefficient = process.stoich.get(component, 0.0)
            reaction[component] += coefficient * rate

    return reaction


def _component_names(
    raw_components: Any,
    *,
    fallback: Sequence[str] | None,
) -> list[str]:
    if raw_components is None:
        raw_components = fallback or []

    names: list[str] = []
    for component in raw_components or []:
        if isinstance(component, Mapping):
            raw_name = component.get("name") or component.get("component_name")
        else:
            raw_name = component
        name = str(raw_name or "").strip()
        if not name:
            continue
        names.append(name)

    if len(names) != len(set(names)):
        raise UDMReactionError(
            "UDM_REACTION_DUPLICATE_COMPONENT",
            "UDM reaction model local components must be unique",
        )
    return names


def _parameter_values(raw_parameters: Any) -> dict[str, float]:
    if isinstance(raw_parameters, Mapping):
        return _float_values(raw_parameters)

    values: dict[str, float] = {}
    for parameter in raw_parameters or []:
        if not isinstance(parameter, Mapping):
            continue
        name = str(parameter.get("name") or parameter.get("parameter_name") or "").strip()
        if not name:
            continue
        raw_value = parameter.get("value")
        if raw_value is None:
            raw_value = parameter.get("default_value")
        if raw_value is None:
            raw_value = parameter.get("defaultValue")
        values[name] = _float(raw_value, name)
    return values


def _float_values(raw_values: Mapping[str, Any]) -> dict[str, float]:
    values: dict[str, float] = {}
    for key, value in raw_values.items():
        values[str(key)] = _float(value, str(key))
    return values


def _processes(raw_processes: Any, local_components: list[str]) -> list[UDMProcess]:
    if not isinstance(raw_processes, list):
        raise UDMReactionError(
            "UDM_REACTION_INVALID_PROCESS",
            "UDM reaction processes must be a list",
        )

    component_set = set(local_components)
    processes: list[UDMProcess] = []
    seen: set[str] = set()
    for idx, raw_process in enumerate(raw_processes):
        if not isinstance(raw_process, Mapping):
            raise UDMReactionError(
                "UDM_REACTION_INVALID_PROCESS",
                "UDM reaction process rows must be objects",
            )
        process_name = str(raw_process.get("name") or raw_process.get("id") or f"process_{idx + 1}")
        if process_name in seen:
            raise UDMReactionError(
                "UDM_REACTION_DUPLICATE_PROCESS",
                f"duplicate UDM reaction process: {process_name}",
            )
        seen.add(process_name)

        rate_expr = raw_process.get("rate_expr")
        if rate_expr is None:
            rate_expr = raw_process.get("rateExpr")
        rate_expr = str(rate_expr or "").strip()
        if not rate_expr:
            raise UDMReactionError(
                "UDM_REACTION_RATE_EXPR_REQUIRED",
                f"UDM reaction process {process_name} requires rate_expr",
            )
        rate_evaluator = _compile(rate_expr, process_name)

        stoich = _stoich_map(raw_process.get("stoich") or {}, component_set, process_name)
        raw_stoich_expr = raw_process.get("stoich_expr")
        if raw_stoich_expr is None:
            raw_stoich_expr = raw_process.get("stoichExpr")
        stoich_expr = _stoich_expr_map(raw_stoich_expr or {}, component_set, process_name)
        stoich_evaluators = {
            component: _compile(expression, process_name)
            for component, expression in stoich_expr.items()
        }

        processes.append(
            UDMProcess(
                name=process_name,
                rate_expr=rate_expr,
                stoich=stoich,
                stoich_expr=stoich_expr,
                rate_evaluator=rate_evaluator,
                stoich_evaluators=stoich_evaluators,
            )
        )
    return processes


def _stoich_map(raw_stoich: Any, component_set: set[str], process_name: str) -> dict[str, float]:
    if not isinstance(raw_stoich, Mapping):
        raise UDMReactionError(
            "UDM_REACTION_INVALID_STOICH",
            f"UDM reaction process {process_name} stoich must be an object",
        )
    stoich: dict[str, float] = {}
    for component, coefficient in raw_stoich.items():
        component_name = str(component)
        _ensure_known_component(component_name, component_set, process_name)
        stoich[component_name] = _float(coefficient, component_name)
    return stoich


def _stoich_expr_map(raw_stoich_expr: Any, component_set: set[str], process_name: str) -> dict[str, str]:
    if not isinstance(raw_stoich_expr, Mapping):
        raise UDMReactionError(
            "UDM_REACTION_INVALID_STOICH",
            f"UDM reaction process {process_name} stoich_expr must be an object",
        )
    stoich_expr: dict[str, str] = {}
    for component, expression in raw_stoich_expr.items():
        component_name = str(component)
        _ensure_known_component(component_name, component_set, process_name)
        expression_text = str(expression or "").strip()
        if expression_text:
            stoich_expr[component_name] = expression_text
    return stoich_expr


def _evaluation_env(
    model: UDMReactionModel,
    *,
    t: float,
    local_state: Mapping[str, Any] | Sequence[Any],
    parameters: Mapping[str, Any] | None,
    signals: Mapping[str, Any] | None,
) -> dict[str, Any]:
    env: dict[str, Any] = dict(model.parameters)
    env.update(_float_values(parameters or {}))
    env.update({str(key): value for key, value in (signals or {}).items()})
    env["t"] = float(t)
    env.update(_state_values(model.local_components, local_state))
    return env


def _state_values(local_components: tuple[str, ...], local_state: Mapping[str, Any] | Sequence[Any]) -> dict[str, float]:
    if isinstance(local_state, Mapping):
        return {
            component: _float(local_state.get(component, 0.0), component)
            for component in local_components
        }

    if len(local_state) != len(local_components):
        raise UDMReactionError(
            "UDM_REACTION_STATE_SIZE_MISMATCH",
            "UDM reaction local_state length must match local_components",
        )
    return {
        component: _float(local_state[idx], component)
        for idx, component in enumerate(local_components)
    }


def _compile(expression: str, process_name: str) -> ExpressionEvaluator:
    try:
        return compile_expression(expression)
    except (SyntaxError, UnsafeExpressionError, ValueError) as exc:
        raise UDMReactionError(
            "UDM_REACTION_INVALID_EXPRESSION",
            f"invalid expression for UDM reaction process {process_name}: {exc}",
        ) from exc


def _evaluate(evaluator: ExpressionEvaluator, env: dict[str, Any], process_name: str) -> float:
    try:
        return _float(evaluator(env), process_name)
    except Exception as exc:
        raise UDMReactionError(
            "UDM_REACTION_EVAL_FAILED",
            f"failed to evaluate UDM reaction process {process_name}: {exc}",
        ) from exc


def _ensure_known_component(component_name: str, component_set: set[str], process_name: str) -> None:
    if component_name not in component_set:
        raise UDMReactionError(
            "UDM_REACTION_UNKNOWN_COMPONENT",
            f"UDM reaction process {process_name} references unknown component {component_name}",
        )


def _bool_or_default(value: Any, default: bool) -> bool:
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value != 0
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "on"}
    return default


def _float(value: Any, name: str) -> float:
    try:
        if hasattr(value, "detach"):
            value = value.detach().cpu().item()
        return float(value)
    except Exception as exc:
        raise UDMReactionError(
            "UDM_REACTION_NON_NUMERIC_VALUE",
            f"UDM reaction value {name} must be numeric",
        ) from exc
