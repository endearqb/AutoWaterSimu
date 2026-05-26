from __future__ import annotations

from typing import Any


class ContractTransformError(ValueError):
    """Validation failure that can be mapped to contract_error.v1."""

    def __init__(self, message: str, details: list[dict[str, Any]] | None = None):
        super().__init__(message)
        self.details = details or []


def build_contract_error(
    message: str,
    *,
    details: dict[str, Any] | list[dict[str, Any]] | None = None,
    error_code: str = "VALIDATION_FAILED",
    retryable: bool = False,
    trace_id: str = "trace_contract_transform",
) -> dict[str, Any]:
    return {
        "schema_version": "contract_error.v1",
        "error_code": error_code,
        "message": message,
        "details": {"items": details or []} if isinstance(details, list) else (details or {}),
        "retryable": retryable,
        "trace_id": trace_id,
    }
