import ast
import math
from dataclasses import dataclass
from functools import reduce
from typing import Any, Callable, Dict, Iterable, List, Optional, Set

import torch


ALLOWED_FUNCTIONS = {
    "exp",
    "log",
    "sqrt",
    "pow",
    "min",
    "max",
    "abs",
    "clip",
}
RESERVED_CONSTANTS = {"pi", "e"}


@dataclass
class ValidationIssue:
    code: str
    message: str
    process: Optional[str] = None


@dataclass
class DefinitionValidationResult:
    ok: bool
    errors: List[ValidationIssue]
    warnings: List[ValidationIssue]
    extracted_parameters: List[str]


class UnsafeExpressionError(ValueError):
    """Raised when an expression contains unsupported syntax."""


def _is_numeric_constant(node: ast.AST) -> bool:
    return isinstance(node, ast.Constant) and isinstance(node.value, (int, float))


def _extract_identifiers(tree: ast.AST) -> Set[str]:
    identifiers: Set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Name):
            identifiers.add(node.id)
    return identifiers


def _validate_ast(tree: ast.AST, process_name: str) -> List[ValidationIssue]:
    issues: List[ValidationIssue] = []
    allowed_binops = (ast.Add, ast.Sub, ast.Mult, ast.Div, ast.Pow)
    allowed_unary = (ast.UAdd, ast.USub)

    for node in ast.walk(tree):
        if isinstance(node, ast.Expression):
            continue
        if isinstance(node, ast.Load):
            continue
        if isinstance(node, ast.BinOp):
            if not isinstance(node.op, allowed_binops):
                issues.append(
                    ValidationIssue(
                        code="DISALLOWED_OPERATOR",
                        message=f"不允许的运算符: {type(node.op).__name__}",
                        process=process_name,
                    )
                )
            continue
        if isinstance(node, ast.UnaryOp):
            if not isinstance(node.op, allowed_unary):
                issues.append(
                    ValidationIssue(
                        code="DISALLOWED_OPERATOR",
                        message=f"不允许的一元运算符: {type(node.op).__name__}",
                        process=process_name,
                    )
                )
            continue
        if isinstance(node, ast.Call):
            if not isinstance(node.func, ast.Name):
                issues.append(
                    ValidationIssue(
                        code="DISALLOWED_CALL",
                        message="只允许白名单函数调用",
                        process=process_name,
                    )
                )
                continue
            if node.func.id not in ALLOWED_FUNCTIONS:
                issues.append(
                    ValidationIssue(
                        code="DISALLOWED_FUNC",
                        message=f"函数 {node.func.id} 不被允许",
                        process=process_name,
                    )
                )
            continue
        if isinstance(node, ast.Name):
            continue
        if _is_numeric_constant(node):
            continue
        if isinstance(node, ast.Constant):
            issues.append(
                ValidationIssue(
                    code="NON_NUMERIC_LITERAL",
                    message="仅允许数值字面量",
                    process=process_name,
                )
            )
            continue

        # Explicitly block potentially dangerous constructs.
        if isinstance(
            node,
            (
                ast.Attribute,
                ast.Subscript,
                ast.Dict,
                ast.List,
                ast.Tuple,
                ast.Lambda,
                ast.Compare,
                ast.IfExp,
                ast.BoolOp,
                ast.Assign,
                ast.AugAssign,
                ast.Import,
                ast.ImportFrom,
                ast.For,
                ast.While,
                ast.With,
                ast.Try,
                ast.FunctionDef,
                ast.ClassDef,
            ),
        ):
            issues.append(
                ValidationIssue(
                    code="DISALLOWED_SYNTAX",
                    message=f"不允许的语法结构: {type(node).__name__}",
                    process=process_name,
                )
            )
            continue

    return issues


def validate_udm_definition(
    *,
    components: Iterable[str],
    processes: Iterable[Dict[str, Any]],
    declared_parameters: Optional[Iterable[str]] = None,
) -> DefinitionValidationResult:
    component_list = [c for c in components if c]
    component_set = set(component_list)
    declared_param_set = set(declared_parameters or [])
    all_extracted_params: Set[str] = set()
    errors: List[ValidationIssue] = []
    warnings: List[ValidationIssue] = []

    if len(component_set) == 0:
        errors.append(
            ValidationIssue(code="NO_COMPONENTS", message="至少需要一个组分定义")
        )

    if len(component_set) != len(component_list):
        errors.append(
            ValidationIssue(code="DUPLICATE_COMPONENT", message="组分名称不能重复")
        )

    process_name_seen: Set[str] = set()
    for idx, process in enumerate(processes):
        process_name = str(process.get("name") or f"process_{idx + 1}")
        if process_name in process_name_seen:
            errors.append(
                ValidationIssue(
                    code="DUPLICATE_PROCESS",
                    message=f"过程名称重复: {process_name}",
                    process=process_name,
                )
            )
        process_name_seen.add(process_name)

        rate_expr = process.get("rate_expr")
        if rate_expr is None:
            rate_expr = process.get("rateExpr")
        rate_expr = str(rate_expr or "").strip()
        if not rate_expr:
            errors.append(
                ValidationIssue(
                    code="EMPTY_RATE_EXPR",
                    message="过程速率表达式不能为空",
                    process=process_name,
                )
            )
            continue

        try:
            tree = ast.parse(rate_expr, mode="eval")
        except SyntaxError as ex:
            errors.append(
                ValidationIssue(
                    code="INVALID_SYNTAX",
                    message=f"表达式语法错误: {ex.msg}",
                    process=process_name,
                )
            )
            continue

        errors.extend(_validate_ast(tree, process_name))

        identifiers = _extract_identifiers(tree)
        extracted_params = {
            symbol
            for symbol in identifiers
            if symbol not in component_set
            and symbol not in ALLOWED_FUNCTIONS
            and symbol not in RESERVED_CONSTANTS
        }
        all_extracted_params.update(extracted_params)

        if declared_param_set:
            undefined = sorted(extracted_params - declared_param_set)
            for symbol in undefined:
                errors.append(
                    ValidationIssue(
                        code="UNDEFINED_SYMBOL",
                        message=f"未定义符号 {symbol}",
                        process=process_name,
                    )
                )

        raw_stoich_expr = process.get("stoich_expr")
        if raw_stoich_expr is None:
            raw_stoich_expr = process.get("stoichExpr")
        if raw_stoich_expr is None:
            raw_stoich_expr = process.get("stoich")
        if raw_stoich_expr is None:
            raw_stoich_expr = {}

        if not isinstance(raw_stoich_expr, dict):
            errors.append(
                ValidationIssue(
                    code="INVALID_STOICH",
                    message="stoich_expr/stoich 必须为对象映射",
                    process=process_name,
                )
            )
            continue

        nonzero_count = 0
        for component_name, coeff_expr in raw_stoich_expr.items():
            if component_name not in component_set:
                errors.append(
                    ValidationIssue(
                        code="UNKNOWN_COMPONENT",
                        message=f"未知组分 {component_name}",
                        process=process_name,
                    )
                )
            expr_text = str(coeff_expr or "").strip() or "0"
            try:
                stoich_tree = ast.parse(expr_text, mode="eval")
            except SyntaxError as ex:
                errors.append(
                    ValidationIssue(
                        code="INVALID_STOICH_EXPR",
                        message=f"组分 {component_name} 的计量表达式语法错误: {ex.msg}",
                        process=process_name,
                    )
                )
                continue

            stoich_issues = _validate_ast(stoich_tree, process_name)
            for issue in stoich_issues:
                errors.append(
                    ValidationIssue(
                        code=f"STOICH_{issue.code}",
                        message=f"组分 {component_name} 的计量表达式非法: {issue.message}",
                        process=process_name,
                    )
                )

            stoich_identifiers = _extract_identifiers(stoich_tree)
            stoich_extracted_params = {
                symbol
                for symbol in stoich_identifiers
                if symbol not in component_set
                and symbol not in ALLOWED_FUNCTIONS
                and symbol not in RESERVED_CONSTANTS
            }
            all_extracted_params.update(stoich_extracted_params)

            if declared_param_set:
                undefined = sorted(stoich_extracted_params - declared_param_set)
                for symbol in undefined:
                    errors.append(
                        ValidationIssue(
                            code="UNDEFINED_SYMBOL",
                            message=f"未定义符号 {symbol}",
                            process=process_name,
                        )
                    )

            component_refs = sorted(
                symbol for symbol in stoich_identifiers if symbol in component_set
            )
            for symbol in component_refs:
                errors.append(
                    ValidationIssue(
                        code="STOICH_COMPONENT_REF",
                        message=f"计量表达式不允许引用组分变量 {symbol}",
                        process=process_name,
                    )
                )

            try:
                coeff_value = float(expr_text)
                if math.isfinite(coeff_value) and abs(coeff_value) > 0:
                    nonzero_count += 1
            except Exception:
                # 非常量表达式默认视为潜在非零，避免误报 ZERO_STOICH
                nonzero_count += 1

        if nonzero_count == 0:
            warnings.append(
                ValidationIssue(
                    code="ZERO_STOICH",
                    message="该过程对所有组分的计量系数均为 0",
                    process=process_name,
                )
            )

    return DefinitionValidationResult(
        ok=len(errors) == 0,
        errors=errors,
        warnings=warnings,
        extracted_parameters=sorted(all_extracted_params),
    )


def _ensure_tensor(value: Any, reference: Optional[torch.Tensor]) -> torch.Tensor:
    if torch.is_tensor(value):
        return value
    if reference is not None:
        return torch.as_tensor(value, dtype=reference.dtype, device=reference.device)
    return torch.as_tensor(value, dtype=torch.float32)


def _first_tensor(values: List[Any]) -> Optional[torch.Tensor]:
    for item in values:
        if torch.is_tensor(item):
            return item
    return None


def _apply_function(name: str, args: List[Any]) -> Any:
    ref = _first_tensor(args)
    tensor_args = [_ensure_tensor(arg, ref) if (torch.is_tensor(arg) or ref is not None) else arg for arg in args]

    if name == "exp":
        return torch.exp(tensor_args[0])
    if name == "log":
        return torch.log(torch.clamp(tensor_args[0], min=1e-12))
    if name == "sqrt":
        return torch.sqrt(torch.clamp(tensor_args[0], min=0))
    if name == "pow":
        return torch.pow(tensor_args[0], tensor_args[1])
    if name == "abs":
        return torch.abs(tensor_args[0])
    if name == "clip":
        if len(tensor_args) == 2:
            return torch.clamp(tensor_args[0], min=tensor_args[1])
        if len(tensor_args) >= 3:
            return torch.clamp(tensor_args[0], min=tensor_args[1], max=tensor_args[2])
        raise UnsafeExpressionError("clip requires at least two arguments")
    if name == "min":
        return reduce(lambda acc, cur: torch.minimum(acc, _ensure_tensor(cur, acc)), tensor_args[1:], tensor_args[0])
    if name == "max":
        return reduce(lambda acc, cur: torch.maximum(acc, _ensure_tensor(cur, acc)), tensor_args[1:], tensor_args[0])

    raise UnsafeExpressionError(f"Unsupported function: {name}")


def _evaluate_ast(node: ast.AST, variables: Dict[str, Any]) -> Any:
    if isinstance(node, ast.Expression):
        return _evaluate_ast(node.body, variables)
    if _is_numeric_constant(node):
        return float(node.value)
    if isinstance(node, ast.Name):
        if node.id in RESERVED_CONSTANTS:
            return math.pi if node.id == "pi" else math.e
        if node.id not in variables:
            raise UnsafeExpressionError(f"Unknown symbol: {node.id}")
        return variables[node.id]
    if isinstance(node, ast.BinOp):
        left = _evaluate_ast(node.left, variables)
        right = _evaluate_ast(node.right, variables)
        if isinstance(node.op, ast.Add):
            return left + right
        if isinstance(node.op, ast.Sub):
            return left - right
        if isinstance(node.op, ast.Mult):
            return left * right
        if isinstance(node.op, ast.Div):
            denominator = right
            if torch.is_tensor(denominator):
                denominator = torch.clamp(denominator, min=1e-12)
            elif denominator == 0:
                denominator = 1e-12
            return left / denominator
        if isinstance(node.op, ast.Pow):
            return torch.pow(_ensure_tensor(left, _first_tensor([left, right])), _ensure_tensor(right, _first_tensor([left, right])))
        raise UnsafeExpressionError(f"Unsupported binary operator: {type(node.op).__name__}")
    if isinstance(node, ast.UnaryOp):
        operand = _evaluate_ast(node.operand, variables)
        if isinstance(node.op, ast.UAdd):
            return operand
        if isinstance(node.op, ast.USub):
            return -operand
        raise UnsafeExpressionError(f"Unsupported unary operator: {type(node.op).__name__}")
    if isinstance(node, ast.Call):
        if not isinstance(node.func, ast.Name):
            raise UnsafeExpressionError("Only simple function calls are supported")
        fn_name = node.func.id
        if fn_name not in ALLOWED_FUNCTIONS:
            raise UnsafeExpressionError(f"Function {fn_name} is not allowed")
        args = [_evaluate_ast(arg, variables) for arg in node.args]
        return _apply_function(fn_name, args)

    raise UnsafeExpressionError(f"Unsupported AST node: {type(node).__name__}")


def compile_expression(expression: str) -> Callable[[Dict[str, Any]], Any]:
    parsed = ast.parse(expression, mode="eval")

    # Reuse validation guard to block unsafe constructs before runtime.
    issues = _validate_ast(parsed, process_name="runtime")
    if issues:
        raise UnsafeExpressionError("; ".join(issue.message for issue in issues))

    def _executor(variables: Dict[str, Any]) -> Any:
        return _evaluate_ast(parsed, variables)

    return _executor
