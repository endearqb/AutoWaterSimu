from __future__ import annotations

from typing import Any


class SimulationCoreAdapterError(ValueError):
    """Validation failure while adapting contract payloads for simulation core."""

    def __init__(self, message: str, details: list[dict[str, Any]] | None = None):
        super().__init__(message)
        self.details = details or []

    def to_contract_error(self, trace_id: str = "trace_simulation_core_adapter") -> dict[str, Any]:
        return {
            "schema_version": "contract_error.v1",
            "error_code": "VALIDATION_FAILED",
            "message": str(self),
            "details": {"items": self.details},
            "retryable": False,
            "trace_id": trace_id,
        }
