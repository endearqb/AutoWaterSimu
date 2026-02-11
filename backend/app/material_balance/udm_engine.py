from dataclasses import dataclass
from typing import Any, Callable, Dict, Iterable, List

import torch

from app.services.udm_expression import compile_expression


@dataclass
class UDMNodeRuntime:
    """Compiled UDM runtime payload for a single reactor node."""

    node_index: int
    component_names: List[str]
    parameter_values: Dict[str, float]
    rate_evaluators: List[Callable[[Dict[str, Any]], Any]]
    stoich_matrix: torch.Tensor  # [P, M]

    def evaluate_reaction(self, concentrations: torch.Tensor) -> torch.Tensor:
        """
        Evaluate reaction term dC/dt(reaction) for one node.

        Args:
            concentrations: component concentration vector for this node [M]
        Returns:
            torch.Tensor: reaction term vector [M]
        """
        env: Dict[str, Any] = {}
        for i, component_name in enumerate(self.component_names):
            env[component_name] = concentrations[i]
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
        return torch.matmul(self.stoich_matrix.transpose(0, 1), rates_tensor)  # [M]


def _normalize_component_names(component_names: Iterable[str], count: int) -> List[str]:
    names = [name for name in component_names if name]
    if len(names) != count:
        return [f"concentration_{idx}" for idx in range(count)]
    return names


def _normalize_parameter_values(parameters: Dict[str, Any]) -> Dict[str, float]:
    normalized: Dict[str, float] = {}
    for key, value in (parameters or {}).items():
        try:
            normalized[key] = float(value)
        except Exception:
            continue
    return normalized


def build_udm_runtime_payload(
    *,
    nodes: Iterable[Any],
    num_components: int,
    device: torch.device,
    dtype: torch.dtype,
) -> List[UDMNodeRuntime]:
    runtimes: List[UDMNodeRuntime] = []

    for node_index, node in enumerate(nodes):
        if getattr(node, "node_type", None) != "udm":
            continue

        component_names = _normalize_component_names(
            getattr(node, "udm_component_names", None) or [],
            num_components,
        )
        process_rows = getattr(node, "udm_processes", None) or []
        parameter_values = _normalize_parameter_values(
            getattr(node, "udm_parameter_values", None) or {}
        )

        if len(process_rows) == 0:
            continue

        rate_evaluators: List[Callable[[Dict[str, Any]], Any]] = []
        stoich_rows: List[List[float]] = []

        for process in process_rows:
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

            coeff_env: Dict[str, Any] = {name: 0.0 for name in component_names}
            coeff_env.update(parameter_values)
            row = []
            for component_name in component_names:
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

        stoich_matrix = torch.tensor(stoich_rows, dtype=dtype, device=device)  # [P, M]

        runtimes.append(
            UDMNodeRuntime(
                node_index=node_index,
                component_names=component_names,
                parameter_values=parameter_values,
                rate_evaluators=rate_evaluators,
                stoich_matrix=stoich_matrix,
            )
        )

    return runtimes
