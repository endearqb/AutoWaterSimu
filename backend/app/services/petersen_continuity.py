"""Petersen 矩阵连续性检查服务

对每个过程、每个守恒维度（COD/N/ALK），检查化学计量系数乘以换算系数之和
是否为零。返回可解释的逐项拆解结果。
"""

from __future__ import annotations

import logging
from typing import Any

from app.models import ContinuityCheckItem
from app.services.udm_expression import compile_expression

logger = logging.getLogger(__name__)

DEFAULT_DIMENSIONS = ["COD", "N", "ALK"]


def _evaluate_stoich_value(
    stoich_expr: str,
    param_defaults: dict[str, float],
) -> float | None:
    """尝试用参数默认值对 stoich 表达式进行数值求值。"""
    try:
        executor = compile_expression(stoich_expr)
        result = executor(param_defaults)
        # compile_expression 可能返回 torch tensor
        if hasattr(result, "item"):
            return float(result.item())
        return float(result)
    except Exception:
        logger.debug("Cannot evaluate stoich_expr '%s', skipping", stoich_expr)
        return None


def check_continuity(
    *,
    components: list[dict[str, Any]],
    processes: list[dict[str, Any]],
    parameters: list[dict[str, Any]],
    dimensions: list[str] | None = None,
    mode: str = "teaching",
    tolerance: float = 1e-6,
) -> list[ContinuityCheckItem]:
    """对 Petersen 矩阵进行守恒维度连续性检查。

    Parameters
    ----------
    components : 组分列表（含可选 conversion_factors）
    processes : 过程列表（含 stoich 数值 + stoich_expr 表达式）
    parameters : 参数列表（用于对符号表达式求值）
    dimensions : 要检查的守恒维度列表，None 表示检查所有可用维度
    mode : "strict" | "teaching" | "off"
    tolerance : 平衡值绝对值阈值

    Returns
    -------
    List[ContinuityCheckItem]
    """
    if mode == "off":
        return []

    # 构建组分名 -> conversion_factors 映射
    comp_factors: dict[str, dict[str, float]] = {}
    for comp in components:
        name = comp.get("name", "")
        factors = comp.get("conversion_factors")
        if factors and isinstance(factors, dict):
            comp_factors[name] = factors

    if not comp_factors:
        return []

    # 收集所有可用维度
    available_dims: set[str] = set()
    for factors in comp_factors.values():
        available_dims.update(factors.keys())

    check_dims = dimensions if dimensions else sorted(available_dims)
    if not check_dims:
        return []

    # 构建参数默认值映射
    param_defaults: dict[str, float] = {}
    for param in parameters:
        name = param.get("name", "")
        default = param.get("default_value")
        if name and default is not None:
            param_defaults[name] = float(default)

    results: list[ContinuityCheckItem] = []

    for proc in processes:
        proc_name = proc.get("name", "unnamed")
        stoich: dict[str, float] = proc.get("stoich", {})
        stoich_expr: dict[str, str] = proc.get("stoich_expr", {})

        # 合并所有涉及的组分名
        involved_components = set(stoich.keys()) | set(stoich_expr.keys())

        for dim in check_dims:
            contributions: list[dict[str, Any]] = []
            balance = 0.0
            has_any_factor = False

            for comp_name in sorted(involved_components):
                factor = comp_factors.get(comp_name, {}).get(dim)
                if factor is None:
                    continue
                has_any_factor = True

                # 优先使用 stoich 数值，回退到 stoich_expr 求值
                stoich_val = stoich.get(comp_name)
                expr_str = stoich_expr.get(comp_name, "")

                if stoich_val is None and expr_str:
                    stoich_val = _evaluate_stoich_value(expr_str, param_defaults)

                if stoich_val is None:
                    continue

                contrib = stoich_val * factor
                balance += contrib
                contributions.append({
                    "component": comp_name,
                    "stoich": stoich_val,
                    "factor": factor,
                    "contribution": contrib,
                    "expr": expr_str,
                })

            if not has_any_factor:
                continue

            # 构建可读的说明
            explanation_parts = []
            for c in contributions:
                expr_part = c["expr"] if c["expr"] else str(c["stoich"])
                explanation_parts.append(
                    f"{c['component']}: {expr_part} × {c['factor']} = {c['contribution']:.6g}"
                )
            explanation = " + ".join(explanation_parts) + f" = {balance:.6g}"

            if abs(balance) < tolerance:
                status = "pass"
                suggestion = None
            elif mode == "strict":
                status = "error"
                suggestion = (
                    f"过程 '{proc_name}' 的 {dim} 守恒不平衡 "
                    f"(Δ={balance:.6g})，请检查化学计量系数。"
                )
            else:
                status = "warn"
                suggestion = (
                    f"过程 '{proc_name}' 的 {dim} 守恒偏差为 {balance:.6g}，"
                    "可能是简化模型或系数不完整导致的。"
                )

            results.append(
                ContinuityCheckItem(
                    process_name=proc_name,
                    dimension=dim,
                    balance_value=round(balance, 10),
                    status=status,
                    explanation=explanation,
                    suggestion=suggestion,
                    details={"contributions": contributions},
                )
            )

    return results
