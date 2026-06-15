"""Compatibility re-export for material balance runtime models.

The active model definitions live in ``autowatersimu_simulation_core``. This
module only preserves the legacy ``app.material_balance.models`` import path.
Legacy FastAPI routes still expose ``app.models.MaterialBalanceInput`` as their
request schema; service entrypoints revalidate that API model into these core
runtime models before calculator execution.
"""

from autowatersimu_simulation_core.material_balance.models import (
    CalculationParameters,
    EdgeData,
    MaterialBalanceInput,
    MaterialBalanceResult,
    NodeData,
    SegmentEdgeOverride,
    SegmentFactorAB,
    TimeSegment,
)

__all__ = [
    "CalculationParameters",
    "EdgeData",
    "MaterialBalanceInput",
    "MaterialBalanceResult",
    "NodeData",
    "SegmentEdgeOverride",
    "SegmentFactorAB",
    "TimeSegment",
]
