"""物料平衡计算异常类

物料平衡计算的自定义异常类定义。

该模块定义了物料平衡计算过程中可能出现的各种异常：
- 基础异常类（MaterialBalanceError）
- 输入错误异常（InvalidInputError）
- 计算错误异常（CalculationError）
- 收敛错误异常（ConvergenceError）
- 维度不匹配异常（DimensionMismatchError）
- 负体积错误异常（NegativeVolumeError）
"""


class MaterialBalanceError(Exception):
    """物料平衡计算的基础异常类。
    
    所有物料平衡相关异常的父类，用于统一异常处理。
    """
    pass


class InvalidInputError(MaterialBalanceError):
    """输入参数无效时抛出的异常。
    
    当输入数据不符合要求时抛出，如节点数量不足、
    边连接无效、参数范围错误等。
    """
    pass


class CalculationError(MaterialBalanceError):
    """计算失败或产生无效结果时抛出的异常。
    
    当计算过程中出现错误或结果不合理时抛出，
    如数值计算失败、张量操作错误等。
    """
    pass


class ConvergenceError(CalculationError):
    """ODE求解器收敛失败时抛出的异常。
    
    当微分方程求解器无法在指定精度和迭代次数内
    收敛到解时抛出。
    """
    pass


class DimensionMismatchError(InvalidInputError):
    """张量维度不匹配预期值时抛出的异常。
    
    当张量的形状或维度与计算要求不符时抛出，
    如节点数量与张量大小不一致等。
    """
    pass


class NegativeVolumeError(CalculationError):
    """计算过程中体积变为负值时抛出的异常。
    
    当节点体积在计算过程中变为负数时抛出，
    这通常表示物理模型或参数设置有问题。
    """
    pass