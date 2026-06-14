"""Compatibility entrypoint for the material balance calculator.

The backend calculator now delegates to the pure simulation_core runtime while
preserving the legacy ``app.material_balance.core`` import path used by routes,
services, and tests.
"""

from autowatersimu_simulation_core.material_balance.core import (
    MaterialBalanceCalculator,
)

__all__ = ["MaterialBalanceCalculator"]
