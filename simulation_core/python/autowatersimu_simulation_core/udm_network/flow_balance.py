from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from .graph import EdgeKind, RuntimeEdge
from .results import CompiledNetworkSystem


class FlowBalanceError(ValueError):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code


@dataclass(frozen=True)
class FlowBalanceResult:
    resolved_flow_by_edge: dict[str, float]
    constraint_residuals: dict[str, float]
    rank: int
    condition_number: float
    diagnostics: tuple[str, ...] = ()


def solve_flow_balance(system: CompiledNetworkSystem, *, strict: bool = True) -> FlowBalanceResult:
    flow_edges = [
        edge
        for edge in system.edges
        if edge.edge_kind in {EdgeKind.HYDRAULIC, EdgeKind.PUMP}
    ]
    if not flow_edges:
        raise FlowBalanceError("FLOW_GRAPH_EMPTY", "flow graph has no hydraulic or pump edges")

    edge_index = {edge.edge_id: index for index, edge in enumerate(flow_edges)}
    rows: list[list[float]] = []
    rhs: list[float] = []
    labels: list[str] = []
    residual_edges: set[str] = set()

    _add_node_conservation(system, flow_edges, edge_index, rows, rhs, labels)
    _add_flow_spec_rows(flow_edges, edge_index, rows, rhs, labels)
    _add_constraint_rows(system, flow_edges, edge_index, rows, rhs, labels, residual_edges)

    if not rows:
        raise FlowBalanceError("FLOW_UNDERDETERMINED", "flow graph has no constraints")

    matrix = np.asarray(rows, dtype=float)
    vector = np.asarray(rhs, dtype=float)
    rank = int(np.linalg.matrix_rank(matrix))
    augmented_rank = int(np.linalg.matrix_rank(np.column_stack([matrix, vector])))
    if augmented_rank > rank:
        raise FlowBalanceError("FLOW_INCONSISTENT", "flow constraints are inconsistent")
    if rank < len(flow_edges):
        raise FlowBalanceError("FLOW_UNDERDETERMINED", "flow constraints do not determine every edge")

    solution, *_ = np.linalg.lstsq(matrix, vector, rcond=None)
    residual_vector = matrix @ solution - vector
    if np.max(np.abs(residual_vector)) > 1e-7:
        raise FlowBalanceError("FLOW_INCONSISTENT", "flow constraints are inconsistent")

    resolved = {
        edge.edge_id: _clean_float(solution[edge_index[edge.edge_id]])
        for edge in flow_edges
    }
    if strict:
        _check_negative_flows(resolved, residual_edges)
        _check_bounds(flow_edges, resolved)

    return FlowBalanceResult(
        resolved_flow_by_edge=resolved,
        constraint_residuals={
            labels[index]: _clean_float(residual_vector[index])
            for index in range(len(labels))
        },
        rank=rank,
        condition_number=float(np.linalg.cond(matrix)),
    )


def _add_node_conservation(
    system: CompiledNetworkSystem,
    flow_edges: list[RuntimeEdge],
    edge_index: dict[str, int],
    rows: list[list[float]],
    rhs: list[float],
    labels: list[str],
) -> None:
    for node in system.nodes:
        incoming = [edge for edge in flow_edges if edge.target_node_id == node.node_id]
        outgoing = [edge for edge in flow_edges if edge.source_node_id == node.node_id]
        if not incoming or not outgoing:
            continue
        row = [0.0] * len(flow_edges)
        for edge in incoming:
            row[edge_index[edge.edge_id]] += 1.0
        for edge in outgoing:
            row[edge_index[edge.edge_id]] -= 1.0
        rows.append(row)
        rhs.append(0.0)
        labels.append(f"node_conservation:{node.node_id}")


def _add_flow_spec_rows(
    flow_edges: list[RuntimeEdge],
    edge_index: dict[str, int],
    rows: list[list[float]],
    rhs: list[float],
    labels: list[str],
) -> None:
    for edge in flow_edges:
        flow_spec = edge.flow_spec or {}
        mode = str(flow_spec.get("mode", "balanced"))
        if mode == "fixed":
            value = flow_spec.get("value")
            if value is None:
                raise FlowBalanceError("FLOW_FIXED_VALUE_MISSING", f"edge {edge.edge_id} fixed flow requires value")
            row = [0.0] * len(flow_edges)
            row[edge_index[edge.edge_id]] = 1.0
            rows.append(row)
            rhs.append(float(value))
            labels.append(f"fixed:{edge.edge_id}")
        elif mode == "ratio_to_edge":
            reference = str(flow_spec.get("reference_edge_id", ""))
            ratio = flow_spec.get("ratio")
            if reference not in edge_index or ratio is None:
                raise FlowBalanceError("FLOW_RATIO_REFERENCE_MISSING", f"edge {edge.edge_id} ratio reference is missing")
            row = [0.0] * len(flow_edges)
            row[edge_index[edge.edge_id]] = 1.0
            row[edge_index[reference]] = -float(ratio)
            rows.append(row)
            rhs.append(0.0)
            labels.append(f"ratio_to_edge:{edge.edge_id}")
        elif mode in {"balanced", "split_fraction", "residual"}:
            continue
        elif mode in {"controlled", "timeseries"}:
            raise FlowBalanceError("CONTROL_SIGNAL_MISSING", f"edge {edge.edge_id} mode {mode} needs external signal data")
        else:
            raise FlowBalanceError("FLOW_MODE_UNSUPPORTED", f"edge {edge.edge_id} has unsupported flow mode: {mode}")


def _add_constraint_rows(
    system: CompiledNetworkSystem,
    flow_edges: list[RuntimeEdge],
    edge_index: dict[str, int],
    rows: list[list[float]],
    rhs: list[float],
    labels: list[str],
    residual_edges: set[str],
) -> None:
    for constraint in system.flow_constraints:
        constraint_type = str(constraint.get("constraint_type", ""))
        if constraint_type == "split_fraction":
            _add_split_rows(constraint, flow_edges, edge_index, rows, rhs, labels)
        elif constraint_type == "ratio_to_edge":
            _add_ratio_row(constraint, edge_index, rows, rhs, labels)
        elif constraint_type == "residual":
            _add_residual_row(constraint, system, flow_edges, edge_index, rows, rhs, labels, residual_edges)
        elif constraint_type in {"fixed_edge_flow", "controlled_edge_flow", "node_conservation", "pump_bounds"}:
            raise FlowBalanceError(
                "FLOW_CONSTRAINT_NOT_IMPLEMENTED",
                f"flow constraint is recognized but not implemented: {constraint_type}",
            )
        else:
            raise FlowBalanceError("FLOW_CONSTRAINT_UNSUPPORTED", f"unsupported flow constraint: {constraint_type}")


def _add_split_rows(
    constraint: dict[str, object],
    flow_edges: list[RuntimeEdge],
    edge_index: dict[str, int],
    rows: list[list[float]],
    rhs: list[float],
    labels: list[str],
) -> None:
    edge_fractions = dict(constraint.get("edge_fractions") or {})
    if constraint.get("sum_to_one", True) and abs(sum(float(v) for v in edge_fractions.values()) - 1.0) > 1e-9:
        raise FlowBalanceError("FLOW_SPLIT_FRACTION_SUM_INVALID", "split fractions must sum to 1")
    edge_ids = list(edge_fractions)
    for edge_id in edge_ids:
        if edge_id not in edge_index:
            raise FlowBalanceError("FLOW_RATIO_REFERENCE_MISSING", f"split edge is missing: {edge_id}")
    for edge_id, fraction in edge_fractions.items():
        row = [0.0] * len(flow_edges)
        row[edge_index[edge_id]] = 1.0
        for sibling_id in edge_ids:
            row[edge_index[sibling_id]] -= float(fraction)
        rows.append(row)
        rhs.append(0.0)
        labels.append(f"split_fraction:{constraint.get('constraint_id', edge_id)}:{edge_id}")


def _add_ratio_row(
    constraint: dict[str, object],
    edge_index: dict[str, int],
    rows: list[list[float]],
    rhs: list[float],
    labels: list[str],
) -> None:
    edge_id = str(constraint.get("edge_id", ""))
    reference = str(constraint.get("reference_edge_id", ""))
    ratio = constraint.get("ratio")
    if edge_id not in edge_index or reference not in edge_index or ratio is None:
        raise FlowBalanceError("FLOW_RATIO_REFERENCE_MISSING", f"ratio constraint has missing edge/reference: {constraint}")
    row = [0.0] * len(edge_index)
    row[edge_index[edge_id]] = 1.0
    row[edge_index[reference]] = -float(ratio)
    rows.append(row)
    rhs.append(0.0)
    labels.append(f"ratio_to_edge:{constraint.get('constraint_id', edge_id)}")


def _add_residual_row(
    constraint: dict[str, object],
    system: CompiledNetworkSystem,
    flow_edges: list[RuntimeEdge],
    edge_index: dict[str, int],
    rows: list[list[float]],
    rhs: list[float],
    labels: list[str],
    residual_edges: set[str],
) -> None:
    node_id = str(constraint.get("node_id", ""))
    residual_edge_id = str(constraint.get("residual_edge_id", ""))
    known_outflows = [str(edge_id) for edge_id in constraint.get("known_outflow_edges", [])]
    if residual_edge_id not in edge_index:
        raise FlowBalanceError("FLOW_RATIO_REFERENCE_MISSING", f"residual edge is missing: {residual_edge_id}")
    residual_edges.add(residual_edge_id)
    incoming = [edge for edge in flow_edges if edge.target_node_id == node_id]
    if not incoming:
        raise FlowBalanceError("FLOW_RATIO_REFERENCE_MISSING", f"residual node has no incoming flow: {node_id}")

    row = [0.0] * len(flow_edges)
    row[edge_index[residual_edge_id]] = 1.0
    for edge in incoming:
        row[edge_index[edge.edge_id]] -= 1.0
    for edge_id in known_outflows:
        if edge_id not in edge_index:
            raise FlowBalanceError("FLOW_RATIO_REFERENCE_MISSING", f"known residual outflow is missing: {edge_id}")
        row[edge_index[edge_id]] += 1.0
    rows.append(row)
    rhs.append(0.0)
    labels.append(f"residual:{constraint.get('constraint_id', residual_edge_id)}")


def _check_negative_flows(resolved: dict[str, float], residual_edges: set[str]) -> None:
    for edge_id, value in resolved.items():
        if value >= -1e-9:
            continue
        if edge_id in residual_edges:
            raise FlowBalanceError("FLOW_NEGATIVE_RESIDUAL", f"residual flow is negative: {edge_id}={value}")
        raise FlowBalanceError("FLOW_NEGATIVE", f"flow is negative: {edge_id}={value}")


def _check_bounds(flow_edges: list[RuntimeEdge], resolved: dict[str, float]) -> None:
    for edge in flow_edges:
        value = resolved[edge.edge_id]
        bounds = dict(edge.flow_spec or {})
        if edge.pump:
            bounds.update({k: v for k, v in edge.pump.items() if k in {"min_flow", "max_flow"}})
        min_flow = bounds.get("min", bounds.get("min_flow"))
        max_flow = bounds.get("max", bounds.get("max_flow"))
        if min_flow is not None and value < float(min_flow) - 1e-9:
            raise FlowBalanceError("PUMP_BOUNDS_VIOLATION", f"edge {edge.edge_id} is below min flow")
        if max_flow is not None and value > float(max_flow) + 1e-9:
            raise FlowBalanceError("PUMP_BOUNDS_VIOLATION", f"edge {edge.edge_id} exceeds max flow")


def _clean_float(value: float) -> float:
    cleaned = round(float(value), 12)
    if abs(cleaned) < 1e-9:
        return 0.0
    return cleaned
