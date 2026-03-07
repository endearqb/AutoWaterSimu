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

MAX_AST_DEPTH = 50


@dataclass
class ValidationIssue:
    code: str
    message: str
    process: Optional[str] = None
    location: Optional["ValidationLocation"] = None


@dataclass
class ValidationLocation:
    section: Optional[str] = None
    processName: Optional[str] = None
    componentName: Optional[str] = None
    parameterName: Optional[str] = None
    cellKey: Optional[str] = None


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


def _with_location(issue: ValidationIssue, location: Optional[ValidationLocation]) -> ValidationIssue:
    return ValidationIssue(
        code=issue.code,
        message=issue.message,
        process=issue.process,
        location=location,
    )


def _process_location(process_name: str) -> ValidationLocation:
    return ValidationLocation(section="processes", processName=process_name)


def _rate_expr_location(
    process_name: str,
    parameter_name: Optional[str] = None,
) -> ValidationLocation:
    return ValidationLocation(
        section="rateExpr",
        processName=process_name,
        parameterName=parameter_name,
        cellKey=f"{process_name}:rateExpr",
    )


def _stoich_location(
    process_name: str,
    component_name: Optional[str] = None,
    parameter_name: Optional[str] = None,
) -> ValidationLocation:
    return ValidationLocation(
        section="stoich",
        processName=process_name,
        componentName=component_name,
        parameterName=parameter_name,
        cellKey=f"{process_name}:{component_name}" if component_name else None,
    )


def _parameter_location(parameter_name: str) -> ValidationLocation:
    return ValidationLocation(section="parameters", parameterName=parameter_name)


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
                        message=f"Disallowed operator: {type(node.op).__name__}",
                        process=process_name,
                    )
                )
            continue
        if isinstance(node, ast.UnaryOp):
            if not isinstance(node.op, allowed_unary):
                issues.append(
                    ValidationIssue(
                        code="DISALLOWED_OPERATOR",
                        message=f"Disallowed unary operator: {type(node.op).__name__}",
                        process=process_name,
                    )
                )
            continue
        if isinstance(node, ast.Call):
            if not isinstance(node.func, ast.Name):
                issues.append(
                    ValidationIssue(
                        code="DISALLOWED_CALL",
                        message="Only allowlisted function calls are permitted",
                        process=process_name,
                    )
                )
                continue
            if node.func.id not in ALLOWED_FUNCTIONS:
                issues.append(
                    ValidationIssue(
                        code="DISALLOWED_FUNC",
                        message=f"Function {node.func.id} is not allowed",
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
                    message="Only numeric literals are allowed",
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
                    message=f"Disallowed syntax construct: {type(node).__name__}",
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
            ValidationIssue(
                code="NO_COMPONENTS",
                message="At least one component definition is required",
                location=ValidationLocation(section="components"),
            )
        )

    if len(component_set) != len(component_list):
        errors.append(
            ValidationIssue(
                code="DUPLICATE_COMPONENT",
                message="Component names must be unique",
                location=ValidationLocation(section="components"),
            )
        )

    process_name_seen: Set[str] = set()
    for idx, process in enumerate(processes):
        process_name = str(process.get("name") or f"process_{idx + 1}")
        if process_name in process_name_seen:
            errors.append(
                ValidationIssue(
                    code="DUPLICATE_PROCESS",
                    message=f"Duplicate process name: {process_name}",
                    process=process_name,
                    location=_process_location(process_name),
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
                    message="Process rate expression must not be empty",
                    process=process_name,
                    location=_rate_expr_location(process_name),
                )
            )
            continue

        try:
            tree = ast.parse(rate_expr, mode="eval")
        except SyntaxError as ex:
            errors.append(
                ValidationIssue(
                    code="INVALID_SYNTAX",
                    message=f"Expression syntax error: {ex.msg}",
                    process=process_name,
                    location=_rate_expr_location(process_name),
                )
            )
            continue

        errors.extend(
            _with_location(issue, _rate_expr_location(process_name))
            for issue in _validate_ast(tree, process_name)
        )

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
                        message=f"Undefined symbol: {symbol}",
                        process=process_name,
                        location=_rate_expr_location(process_name, parameter_name=symbol),
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
                    message="stoich_expr/stoich must be an object mapping",
                    process=process_name,
                    location=_stoich_location(process_name),
                )
            )
            continue

        nonzero_count = 0
        for component_name, coeff_expr in raw_stoich_expr.items():
            if component_name not in component_set:
                errors.append(
                    ValidationIssue(
                        code="UNKNOWN_COMPONENT",
                        message=f"Unknown component: {component_name}",
                        process=process_name,
                        location=_stoich_location(process_name, component_name=component_name),
                    )
                )
            expr_text = str(coeff_expr or "").strip() or "0"
            try:
                stoich_tree = ast.parse(expr_text, mode="eval")
            except SyntaxError as ex:
                errors.append(
                    ValidationIssue(
                        code="INVALID_STOICH_EXPR",
                        message=f"Stoichiometry syntax error for component {component_name}: {ex.msg}",
                        process=process_name,
                        location=_stoich_location(process_name, component_name=component_name),
                    )
                )
                continue

            stoich_issues = _validate_ast(stoich_tree, process_name)
            for issue in stoich_issues:
                errors.append(
                    ValidationIssue(
                        code=f"STOICH_{issue.code}",
                        message=f"Invalid stoichiometry for component {component_name}: {issue.message}",
                        process=process_name,
                        location=_stoich_location(process_name, component_name=component_name),
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
                            message=f"Undefined symbol: {symbol}",
                            process=process_name,
                            location=_stoich_location(
                                process_name,
                                component_name=component_name,
                                parameter_name=symbol,
                            ),
                        )
                    )

            component_refs = sorted(
                symbol for symbol in stoich_identifiers if symbol in component_set
            )
            for symbol in component_refs:
                errors.append(
                    ValidationIssue(
                        code="STOICH_COMPONENT_REF",
                        message=f"Stoichiometry must not reference component variable: {symbol}",
                        process=process_name,
                        location=_stoich_location(process_name, component_name=component_name),
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
                    message="All stoichiometric coefficients for this process are zero",
                    process=process_name,
                    location=_stoich_location(process_name),
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


def _evaluate_ast(node: ast.AST, variables: Dict[str, Any], _depth: int = 0) -> Any:
    if _depth > MAX_AST_DEPTH:
        raise UnsafeExpressionError(f"Expression exceeds maximum nesting depth ({MAX_AST_DEPTH})")
    if isinstance(node, ast.Expression):
        return _evaluate_ast(node.body, variables, _depth + 1)
    if _is_numeric_constant(node):
        return float(node.value)
    if isinstance(node, ast.Name):
        if node.id in RESERVED_CONSTANTS:
            return math.pi if node.id == "pi" else math.e
        if node.id not in variables:
            raise UnsafeExpressionError(f"Unknown symbol: {node.id}")
        return variables[node.id]
    if isinstance(node, ast.BinOp):
        left = _evaluate_ast(node.left, variables, _depth + 1)
        right = _evaluate_ast(node.right, variables, _depth + 1)
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
        operand = _evaluate_ast(node.operand, variables, _depth + 1)
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
        args = [_evaluate_ast(arg, variables, _depth + 1) for arg in node.args]
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
