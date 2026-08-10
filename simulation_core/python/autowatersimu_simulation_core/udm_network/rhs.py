from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping, Sequence

from .flow_balance import FlowBalanceResult, solve_flow_balance
from .graph import EdgeKind, RuntimeEdge, RuntimeNode
from .results import CompiledNetworkSystem, StateSlice
from .udm_reaction import build_node_reaction_model, evaluate_reaction
from .udm_transport import build_transport_model, evaluate_transport


class UDMNetworkRHSError(ValueError):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code


@dataclass(frozen=True)
class RHSAssemblyResult:
    derivative: tuple[float, ...]
    flow_balance: FlowBalanceResult | None
    reaction_by_node: dict[str, dict[str, float]]
    transport_by_edge: dict[str, dict[str, Any]]
    diagnostics: tuple[str, ...] = ()


def assemble_rhs(
    system: CompiledNetworkSystem,
    state_vector: Sequence[Any],
    *,
    t: float = 0.0,
    resolved_flows: Mapping[str, Any] | None = None,
    parameters: Mapping[str, Any] | None = None,
    signals: Mapping[str, Any] | None = None,
    strict_flow_balance: bool = True,
) -> RHSAssemblyResult:
    state = _state_vector(state_vector, system.state_size)
    derivative = [0.0] * system.state_size
    node_by_id = system.node_by_id
    flow_balance = None

    if resolved_flows is None and _has_flow_edges(system):
        flow_balance = solve_flow_balance(system, strict=strict_flow_balance)
        flow_by_edge = flow_balance.resolved_flow_by_edge
    else:
        flow_by_edge = _float_mapping(resolved_flows or {}, "resolved_flows")

    reaction_by_node: dict[str, dict[str, float]] = {}
    transport_by_edge: dict[str, dict[str, Any]] = {}

    for edge in system.edges:
        if edge.edge_kind in {EdgeKind.HYDRAULIC, EdgeKind.PUMP}:
            source_delta, target_delta = _hydraulic_transport(edge, node_by_id, state, system.state_slices, flow_by_edge)
            _apply_mass_delta(system, node_by_id[edge.source_node_id], derivative, source_delta)
            _apply_mass_delta(system, node_by_id[edge.target_node_id], derivative, target_delta)
            transport_by_edge[edge.edge_id] = {
                "kind": edge.edge_kind.value,
                "flow": flow_by_edge[edge.edge_id],
                "source_delta": source_delta,
                "target_delta": target_delta,
            }
        elif edge.edge_kind is EdgeKind.SETTLING:
            source_delta, target_delta, audit = _settling_transport(
                edge,
                node_by_id,
                state,
                system.state_slices,
                parameters=_scoped_mapping(parameters, edge.edge_id),
                signals=_scoped_mapping(signals, edge.edge_id),
                t=t,
            )
            _apply_mass_delta(system, node_by_id[edge.source_node_id], derivative, source_delta)
            _apply_mass_delta(system, node_by_id[edge.target_node_id], derivative, target_delta)
            transport_by_edge[edge.edge_id] = audit

    for node in system.nodes:
        state_slice = system.state_slices[node.node_id]
        if state_slice.size == 0:
            continue
        local_state = _node_state(node, state_slice, state)
        reaction = evaluate_reaction(
            build_node_reaction_model(node),
            t=t,
            local_state=local_state,
            parameters=_scoped_mapping(parameters, node.node_id),
            signals=_scoped_mapping(signals, node.node_id),
        )
        reaction_by_node[node.node_id] = reaction
        _apply_reaction_delta(state_slice, derivative, reaction)

    return RHSAssemblyResult(
        derivative=tuple(derivative),
        flow_balance=flow_balance,
        reaction_by_node=reaction_by_node,
        transport_by_edge=transport_by_edge,
    )


def _has_flow_edges(system: CompiledNetworkSystem) -> bool:
    return any(edge.edge_kind in {EdgeKind.HYDRAULIC, EdgeKind.PUMP} for edge in system.edges)


def _hydraulic_transport(
    edge: RuntimeEdge,
    node_by_id: dict[str, RuntimeNode],
    state: tuple[float, ...],
    state_slices: dict[str, StateSlice],
    flow_by_edge: Mapping[str, float],
) -> tuple[dict[str, float], dict[str, float]]:
    if edge.stream_adapter is not None:
        raise UDMNetworkRHSError(
            "UDM_RHS_STREAM_ADAPTER_NOT_IMPLEMENTED",
            f"edge {edge.edge_id} stream_adapter execution is not implemented yet",
        )
    if edge.edge_id not in flow_by_edge:
        raise UDMNetworkRHSError("UDM_RHS_FLOW_MISSING", f"resolved flow is missing for edge {edge.edge_id}")

    source = node_by_id[edge.source_node_id]
    source_state = _node_state(source, state_slices[source.node_id], state)
    flow = float(flow_by_edge[edge.edge_id])
    source_delta: dict[str, float] = {}
    target_delta: dict[str, float] = {}
    for component in edge.component_names:
        flux = flow * source_state.get(component, 0.0)
        source_delta[component] = source_delta.get(component, 0.0) - flux
        target_delta[component] = target_delta.get(component, 0.0) + flux
    return source_delta, target_delta


def _settling_transport(
    edge: RuntimeEdge,
    node_by_id: dict[str, RuntimeNode],
    state: tuple[float, ...],
    state_slices: dict[str, StateSlice],
    *,
    parameters: Mapping[str, Any],
    signals: Mapping[str, Any],
    t: float,
) -> tuple[dict[str, float], dict[str, float], dict[str, Any]]:
    if edge.stream_adapter is not None:
        raise UDMNetworkRHSError(
            "UDM_RHS_STREAM_ADAPTER_NOT_IMPLEMENTED",
            f"edge {edge.edge_id} stream_adapter execution is not implemented yet",
        )
    source = node_by_id[edge.source_node_id]
    target = node_by_id[edge.target_node_id]
    evaluation = evaluate_transport(
        build_transport_model(
            edge,
            source_schema_id=source.component_schema_id,
            target_schema_id=target.component_schema_id,
        ),
        t=t,
        source_state=_node_state(source, state_slices[source.node_id], state),
        target_state=_node_state(target, state_slices[target.node_id], state),
        parameters=parameters,
        signals=signals,
    )
    audit = {
        "kind": edge.edge_kind.value,
        "total_solids_flux": evaluation.total_solids_flux,
        "settling_velocity": evaluation.settling_velocity,
        "component_flux": evaluation.component_flux,
        "source_delta": evaluation.source_delta,
        "target_delta": evaluation.target_delta,
    }
    return evaluation.source_delta, evaluation.target_delta, audit


def _apply_mass_delta(
    system: CompiledNetworkSystem,
    node: RuntimeNode,
    derivative: list[float],
    delta: Mapping[str, float],
) -> None:
    state_slice = system.state_slices[node.node_id]
    if state_slice.size == 0:
        return
    volume = _volume(node)
    for offset, component in enumerate(state_slice.component_names):
        derivative[state_slice.start + offset] += float(delta.get(component, 0.0)) / volume


def _apply_reaction_delta(
    state_slice: StateSlice,
    derivative: list[float],
    reaction: Mapping[str, float],
) -> None:
    for offset, component in enumerate(state_slice.component_names):
        derivative[state_slice.start + offset] += float(reaction.get(component, 0.0))


def _node_state(
    node: RuntimeNode,
    state_slice: StateSlice,
    state: tuple[float, ...],
) -> dict[str, float]:
    if state_slice.size == 0:
        return {
            component: float(node.initial_conditions.get(component, 0.0))
            for component in node.component_names
        }
    return {
        component: state[state_slice.start + offset]
        for offset, component in enumerate(state_slice.component_names)
    }


def _volume(node: RuntimeNode) -> float:
    if node.volume is None or node.volume <= 0:
        raise UDMNetworkRHSError(
            "UDM_RHS_VOLUME_REQUIRED",
            f"stateful node {node.node_id} requires a positive volume for transport RHS assembly",
        )
    return node.volume


def _state_vector(state_vector: Sequence[Any], expected_size: int) -> tuple[float, ...]:
    values = tuple(_float(value, f"state_vector[{index}]") for index, value in enumerate(state_vector))
    if len(values) != expected_size:
        raise UDMNetworkRHSError(
            "UDM_RHS_STATE_SIZE_MISMATCH",
            f"state_vector length {len(values)} does not match compiled state size {expected_size}",
        )
    return values


def _float_mapping(values: Mapping[str, Any], label: str) -> dict[str, float]:
    return {str(key): _float(value, f"{label}.{key}") for key, value in values.items()}


def _scoped_mapping(values: Mapping[str, Any] | None, key: str) -> Mapping[str, Any]:
    if values is None:
        return {}
    scoped = values.get(key)
    if isinstance(scoped, Mapping):
        return scoped
    return values


def _float(value: Any, label: str) -> float:
    try:
        if hasattr(value, "detach"):
            value = value.detach().cpu().item()
        return float(value)
    except Exception as exc:
        raise UDMNetworkRHSError("UDM_RHS_NUMERIC_VALUE_REQUIRED", f"{label} must be numeric") from exc
