from dataclasses import dataclass
from typing import Any, Callable, Dict, Iterable, List

import torch

from app.services.udm_expression import compile_expression


@dataclass
class UDMNodeRuntime:
    """Compiled UDM runtime payload for a single reactor node."""

    node_index: int
    global_component_names: List[str]
    local_component_names: List[str]
    local_to_global_indices: torch.Tensor  # [L], long
    parameter_values: Dict[str, float]
    rate_evaluators: List[Callable[[Dict[str, Any]], Any]]
    stoich_matrix: torch.Tensor  # [P, L]
    fixed_component_mask: torch.Tensor  # [M], bool (global component space)

    def evaluate_reaction(self, concentrations: torch.Tensor) -> torch.Tensor:
        """
        Evaluate reaction term dC/dt(reaction) in global canonical space.

        Args:
            concentrations: canonical concentration vector for this node [M]
        Returns:
            torch.Tensor: reaction term vector in canonical space [M]
        """
        env: Dict[str, Any] = {}
        for local_idx, component_name in enumerate(self.local_component_names):
            canonical_idx = int(self.local_to_global_indices[local_idx].item())
            if canonical_idx < 0 or canonical_idx >= concentrations.shape[0]:
                continue
            env[component_name] = concentrations[canonical_idx]
        for parameter_name, parameter_value in self.parameter_values.items():
            env[parameter_name] = parameter_value

        rates: List[torch.Tensor] = []
        for evaluator in self.rate_evaluators:
            value = evaluator(env)
            if torch.is_tensor(value):
                rates.append(value)
            else:
                rates.append(
                    torch.as_tensor(
                        value,
                        dtype=concentrations.dtype,
                        device=concentrations.device,
                    )
                )

        if len(rates) == 0:
            return torch.zeros_like(concentrations)

        rates_tensor = torch.stack(rates)  # [P]
        local_reaction = torch.matmul(self.stoich_matrix.transpose(0, 1), rates_tensor)  # [L]
        global_reaction = torch.zeros_like(concentrations)
        global_reaction.index_add_(0, self.local_to_global_indices, local_reaction)
        return global_reaction


def _normalize_global_component_names(component_names: Iterable[str]) -> List[str]:
    raw = [str(name or "").strip() for name in component_names]
    if len(raw) == 0:
        return []
    if any(not name for name in raw):
        return [f"concentration_{idx}" for idx in range(len(raw))]
    if len(set(raw)) != len(raw):
        return [f"concentration_{idx}" for idx in range(len(raw))]
    return raw


def _normalize_local_component_names(
    local_component_names: Iterable[str],
    fallback_names: List[str],
) -> List[str]:
    cleaned = [str(name or "").strip() for name in local_component_names]
    cleaned = [name for name in cleaned if name]
    if not cleaned:
        return list(fallback_names)
    # Keep order and uniqueness.
    seen: set[str] = set()
    unique: List[str] = []
    for name in cleaned:
        if name in seen:
            continue
        seen.add(name)
        unique.append(name)
    return unique


def _normalize_parameter_values(parameters: Dict[str, Any]) -> Dict[str, float]:
    normalized: Dict[str, float] = {}
    for key, value in (parameters or {}).items():
        try:
            normalized[str(key)] = float(value)
        except Exception:
            continue
    return normalized


def _to_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value != 0
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "on"}
    return False


def _extract_fixed_component_names(node: Any) -> set[str]:
    snapshot = getattr(node, "udm_model_snapshot", None)
    if not isinstance(snapshot, dict):
        return set()

    components = snapshot.get("components")
    if not isinstance(components, list):
        return set()

    fixed_names: set[str] = set()
    for component in components:
        if not isinstance(component, dict):
            continue
        raw_name = component.get("name")
        if raw_name is None:
            continue
        component_name = str(raw_name).strip()
        if not component_name:
            continue
        raw_fixed = component.get("is_fixed")
        if raw_fixed is None:
            raw_fixed = component.get("isFixed")
        if _to_bool(raw_fixed):
            fixed_names.add(component_name)
    return fixed_names


def _normalize_variable_binding_map(node: Any) -> Dict[str, str]:
    raw_bindings = getattr(node, "udm_variable_bindings", None) or []
    binding_map: Dict[str, str] = {}
    if not isinstance(raw_bindings, list):
        return binding_map
    for item in raw_bindings:
        if not isinstance(item, dict):
            continue
        local_var = str(item.get("local_var") or item.get("localVar") or "").strip()
        canonical_var = str(
            item.get("canonical_var") or item.get("canonicalVar") or ""
        ).strip()
        if not local_var or not canonical_var:
            continue
        binding_map[local_var] = canonical_var
    return binding_map


def _resolve_local_to_global_indices(
    *,
    local_component_names: List[str],
    global_index_by_name: Dict[str, int],
    variable_binding_map: Dict[str, str],
    device: torch.device,
) -> torch.Tensor:
    indices: List[int] = []
    global_count = len(global_index_by_name)
    for local_idx, local_name in enumerate(local_component_names):
        canonical_name = variable_binding_map.get(local_name, local_name)
        index = global_index_by_name.get(canonical_name)
        if index is None:
            # Fallback strategy keeps backward compatibility when names are absent.
            fallback_name = local_name if local_name in global_index_by_name else None
            if fallback_name is not None:
                index = global_index_by_name[fallback_name]
            else:
                index = min(local_idx, max(global_count - 1, 0))
        indices.append(int(index))
    return torch.tensor(indices, dtype=torch.long, device=device)


def _build_fixed_component_mask(
    *,
    local_component_names: List[str],
    local_to_global_indices: torch.Tensor,
    fixed_component_names: set[str],
    global_component_count: int,
    device: torch.device,
) -> torch.Tensor:
    mask = torch.zeros(global_component_count, dtype=torch.bool, device=device)
    for local_idx, local_name in enumerate(local_component_names):
        if local_name not in fixed_component_names:
            continue
        canonical_idx = int(local_to_global_indices[local_idx].item())
        if canonical_idx < 0 or canonical_idx >= global_component_count:
            continue
        mask[canonical_idx] = True
    return mask


def build_udm_runtime_payload(
    *,
    nodes: Iterable[Any],
    global_component_names: List[str],
    device: torch.device,
    dtype: torch.dtype,
) -> List[UDMNodeRuntime]:
    runtimes: List[UDMNodeRuntime] = []
    normalized_global_names = _normalize_global_component_names(global_component_names)
    if len(normalized_global_names) == 0:
        return runtimes

    global_index_by_name = {
        name: idx for idx, name in enumerate(normalized_global_names)
    }

    for node_index, node in enumerate(nodes):
        if getattr(node, "node_type", None) != "udm":
            continue

        local_component_names = _normalize_local_component_names(
            getattr(node, "udm_component_names", None) or [],
            normalized_global_names,
        )
        process_rows = getattr(node, "udm_processes", None) or []
        parameter_values = _normalize_parameter_values(
            getattr(node, "udm_parameter_values", None) or {}
        )
        variable_binding_map = _normalize_variable_binding_map(node)
        local_to_global_indices = _resolve_local_to_global_indices(
            local_component_names=local_component_names,
            global_index_by_name=global_index_by_name,
            variable_binding_map=variable_binding_map,
            device=device,
        )
        fixed_component_names = _extract_fixed_component_names(node)
        fixed_component_mask = _build_fixed_component_mask(
            local_component_names=local_component_names,
            local_to_global_indices=local_to_global_indices,
            fixed_component_names=fixed_component_names,
            global_component_count=len(normalized_global_names),
            device=device,
        )

        if len(process_rows) == 0:
            continue

        rate_evaluators: List[Callable[[Dict[str, Any]], Any]] = []
        stoich_rows: List[List[float]] = []

        for process in process_rows:
            if not isinstance(process, dict):
                continue
            rate_expr = process.get("rate_expr")
            if rate_expr is None:
                rate_expr = process.get("rateExpr")
            if not rate_expr:
                continue

            evaluator = compile_expression(str(rate_expr))
            rate_evaluators.append(evaluator)

            stoich_map = process.get("stoich", {}) or {}
            stoich_expr_map = process.get("stoich_expr")
            if stoich_expr_map is None:
                stoich_expr_map = process.get("stoichExpr")
            if stoich_expr_map is None:
                stoich_expr_map = {}

            compiled_stoich_expr: Dict[str, Callable[[Dict[str, Any]], Any]] = {}
            if isinstance(stoich_expr_map, dict):
                for component_name, expr in stoich_expr_map.items():
                    expr_text = str(expr or "").strip()
                    if not expr_text:
                        continue
                    compiled_stoich_expr[str(component_name)] = compile_expression(
                        expr_text
                    )

            coeff_env: Dict[str, Any] = {name: 0.0 for name in local_component_names}
            coeff_env.update(parameter_values)
            row: List[float] = []
            for component_name in local_component_names:
                try:
                    if component_name in compiled_stoich_expr:
                        coeff_value = compiled_stoich_expr[component_name](coeff_env)
                        if torch.is_tensor(coeff_value):
                            row.append(float(coeff_value.item()))
                        else:
                            row.append(float(coeff_value))
                    else:
                        row.append(float(stoich_map.get(component_name, 0.0)))
                except Exception:
                    row.append(0.0)
            stoich_rows.append(row)

        if len(rate_evaluators) == 0:
            continue

        stoich_matrix = torch.tensor(stoich_rows, dtype=dtype, device=device)  # [P, L]

        runtimes.append(
            UDMNodeRuntime(
                node_index=node_index,
                global_component_names=normalized_global_names,
                local_component_names=local_component_names,
                local_to_global_indices=local_to_global_indices,
                parameter_values=parameter_values,
                rate_evaluators=rate_evaluators,
                stoich_matrix=stoich_matrix,
                fixed_component_mask=fixed_component_mask,
            )
        )

    return runtimes
