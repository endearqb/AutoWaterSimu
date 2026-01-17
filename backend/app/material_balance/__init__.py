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
- MaterialBalanceCalculator: 物料平衡计算器
- MaterialBalanceInput: 输入数据模型
- MaterialBalanceResult: 计算结果模型
- NodeData: 节点数据模型
- EdgeData: 边数据模型
- CalculationParameters: 计算参数模型
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