"""Compatibility re-exports for material balance calculation exceptions.

The legacy backend keeps this module path stable while the exception classes
move to the pure simulation core package.
"""

from autowatersimu_simulation_core.material_balance.exceptions import (
    CalculationError,
    ConvergenceError,
    DimensionMismatchError,
    InvalidInputError,
    MaterialBalanceError,
    NegativeVolumeError,
)

__all__ = [
    "CalculationError",
    "ConvergenceError",
    "DimensionMismatchError",
    "InvalidInputError",
    "MaterialBalanceError",
    "NegativeVolumeError",
]
