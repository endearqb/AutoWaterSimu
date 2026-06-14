"""物料平衡计算模块

该模块为流程图提供物料平衡计算功能。
包含用于求解化工过程中物料和体积平衡相关微分方程的算法。

主要功能：
- 物料平衡微分方程求解
- 多组分浓度变化计算
- 节点体积动态变化模拟
- 流程图数据结构处理
- 计算结果可视化支持

核心类：
- MaterialBalanceCalculator: 兼容导入路径，实际委托 simulation_core 物料平衡计算器
- MaterialBalanceInput / NodeData / EdgeData / CalculationParameters: 旧导入路径兼容模型，不是新的 runtime input contract
- MaterialBalanceResult: 旧导入路径兼容结果模型；calculator runtime 已迁向 simulation_core
- Local input models: compatibility-only local input models, not the active runtime input contract.

新 backend/core 迁移代码应显式使用
autowatersimu_simulation_core.material_balance.models.MaterialBalanceInput
作为 runtime input contract。
"""

from .core import MaterialBalanceCalculator
from .models import (
    MaterialBalanceInput,
    MaterialBalanceResult,
    NodeData,
    EdgeData,
    CalculationParameters
)
from .exceptions import (
    MaterialBalanceError,
    InvalidInputError,
    CalculationError
)

__all__ = [
    "MaterialBalanceCalculator",
    "MaterialBalanceInput",
    "MaterialBalanceResult", 
    "NodeData",
    "EdgeData",
    "CalculationParameters",
    "MaterialBalanceError",
    "InvalidInputError",
    "CalculationError"
]
