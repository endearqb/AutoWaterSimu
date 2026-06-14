"""共享 fixtures、分层容差助手与输入构造器（core-only golden 套件）。

设计约束（对应需求文档 v1.2 / 开发计划 v1.3）：

* REQ-P0-006 分层容差方法论：
    - L1 表达式级：同 dtype old/new evaluator max_abs ≤ 1e-6(f32) / 1e-12(f64)
    - L2 单步 RHS：同状态新旧 RHS max_abs ≤ 1e-6(f32)，用于纯重排优化
    - L3 全仿真轨迹：relative ≤ 1e-4（f64 reference 分母 + atol 1e-8）
                     守恒量 relative ≤ 1e-6；自适应求解器以 rk4 固定步长为主判据
* REQ-P0-002 / P0-006 golden 生成端：CPU + f64 + 固定 seed + use_deterministic_algorithms
* PR-37：core-only 测试文件模块顶层**禁止** import ``app.*``，禁止把 ``backend/`` 加入 sys.path。
  本文件只依赖 ``autowatersimu_simulation_core``。

注意：``MaterialBalanceCalculator.__init__`` 把 device/dtype 硬编码为
（cuda-if-available, float32）。golden 必须强制 CPU + f64，因此统一通过
``deterministic_calculator`` fixture 构造并覆盖这两个属性，不要直接 new。
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

import pytest
import torch

from autowatersimu_simulation_core.material_balance import (
    CalculationParameters,
    EdgeData,
    MaterialBalanceCalculator,
    MaterialBalanceInput,
    NodeData,
)

# --------------------------------------------------------------------------- #
# 分层容差常量（REQ-P0-006 / KPI-004）
# --------------------------------------------------------------------------- #
L1_ATOL_F64 = 1e-12
L1_ATOL_F32 = 1e-6
L2_ATOL_F64 = 1e-12
L2_ATOL_F32 = 1e-6
L3_RTOL = 1e-4          # 相对误差（f64 reference 作分母）
L3_ATOL = 1e-8          # 防止分母接近 0 的绝对兜底
CONSERVATION_RTOL = 1e-6  # 守恒量相对容差


# --------------------------------------------------------------------------- #
# 决定性环境（REQ-P0-002 / P0-006）
# --------------------------------------------------------------------------- #
@pytest.fixture(scope="session", autouse=True)
def _deterministic_session() -> None:
    """会话级决定性设置：CPU、固定 seed、确定性算法。

    golden 必须可跨机复现。use_deterministic_algorithms 为 best-effort：
    某些算子在特定后端可能不支持，捕获后降级（不阻断收集）。
    """
    torch.manual_seed(0)
    torch.set_num_threads(1)
    try:
        torch.use_deterministic_algorithms(True)
    except Exception:  # pragma: no cover - 后端相关
        pass


@pytest.fixture()
def deterministic_calculator() -> MaterialBalanceCalculator:
    """构造强制 CPU + float64 的计算器（golden 唯一允许的构造方式）。"""
    calc = MaterialBalanceCalculator()
    calc.device = torch.device("cpu")
    calc.dtype = torch.float64
    return calc


# --------------------------------------------------------------------------- #
# 分层断言助手
# --------------------------------------------------------------------------- #
def assert_l1(actual: torch.Tensor, expected: torch.Tensor, *, f64: bool = True) -> None:
    """L1：表达式级 max_abs 等价。"""
    atol = L1_ATOL_F64 if f64 else L1_ATOL_F32
    max_abs = (actual.double() - expected.double()).abs().max().item()
    assert max_abs <= atol, f"L1 max_abs={max_abs:.3e} > {atol:.0e}"


def assert_l2(actual: torch.Tensor, expected: torch.Tensor, *, f64: bool = True) -> None:
    """L2：单步 RHS / _balance_param max_abs 等价（纯重排优化判据）。"""
    atol = L2_ATOL_F64 if f64 else L2_ATOL_F32
    max_abs = (actual.double() - expected.double()).abs().max().item()
    assert max_abs <= atol, f"L2 max_abs={max_abs:.3e} > {atol:.0e}"


def assert_l3(actual: torch.Tensor, reference: torch.Tensor) -> None:
    """L3：全轨迹相对误差（f64 reference 作分母 + atol 兜底）。

    judged on sampled points; reference 须为 f64/CPU/rk4 产出。
    """
    a = actual.double()
    r = reference.double()
    assert a.shape == r.shape, f"shape mismatch {tuple(a.shape)} vs {tuple(r.shape)}"
    denom = r.abs() + L3_ATOL
    rel = ((a - r).abs() / denom).max().item()
    assert rel <= L3_RTOL, f"L3 relative={rel:.3e} > {L3_RTOL:.0e}"


# --------------------------------------------------------------------------- #
# 输入构造器（最小可复现图）
# --------------------------------------------------------------------------- #
# ASM1 反应核按固定列位读 11 个组分（asm1.py: C[:,0..10]）。
# 为了让 asm1 节点不 IndexError、且 udm 能按名引用子集，统一用这组组分空间。
ASM1_COMPONENTS: List[str] = [
    "X_BH", "X_BA", "X_S", "X_i", "X_ND",
    "S_O", "S_S", "S_NO", "S_NH", "S_ND", "S_ALK",
]

# 一组非负的占位 ASM1 参数（19 个）。golden 数值来自参考路径运行时计算，
# 这里只要求“合法、可复现”，不要求物理标定。
ASM1_PARAMS_19: List[float] = [
    4.0, 10.0, 0.2, 0.5, 0.8, 0.3, 0.5, 1.0, 0.4, 0.05,
    0.67, 0.24, 0.08, 0.06, 0.08, 0.4, 0.05, 3.0, 0.03,
]


def concentrations(**named: float) -> List[float]:
    """按 ASM1_COMPONENTS 顺序构造浓度向量，未指定的组分为 0。"""
    vec = [0.0] * len(ASM1_COMPONENTS)
    for name, value in named.items():
        vec[ASM1_COMPONENTS.index(name)] = float(value)
    return vec


def make_parameters(
    *,
    hours: float = 2.0,
    steps_per_hour: int = 10,
    solver_method: str = "rk4",
    tolerance: float = 1e-6,
    sampling_interval_hours: Optional[float] = None,
) -> CalculationParameters:
    """默认用 rk4（L3 主判据求解器，REQ-P0-006/P0-013）。"""
    return CalculationParameters(
        hours=hours,
        steps_per_hour=steps_per_hour,
        solver_method=solver_method,
        tolerance=tolerance,
        sampling_interval_hours=sampling_interval_hours,
    )


def flowchart_meta() -> Dict[str, Any]:
    """让结果 node_data 用真实组分名作 key（_get_original_parameter_names）。"""
    return {"customParameters": [{"name": c} for c in ASM1_COMPONENTS]}


def udm_decay_node(
    node_id: str = "udm1",
    *,
    s_s: float = 50.0,
    k: float = 0.5,
    volume: float = 1000.0,
) -> NodeData:
    """单进程一阶衰减 UDM 节点：rate = k*S_S, stoich(S_S) = -1。

    可作为“反应是否生效”的探针：S_S 应随时间下降。
    """
    return NodeData(
        node_id=node_id,
        node_type="udm",
        initial_volume=volume,
        initial_concentrations=concentrations(S_S=s_s, S_NH=10.0),
        udm_component_names=["S_S", "S_NH"],
        udm_processes=[
            {"name": "decay", "rate_expr": "k * S_S", "stoich": {"S_S": -1.0}}
        ],
        udm_parameter_values={"k": k},
    )


def asm1_reactor_node(node_id: str = "asm1", *, volume: float = 1000.0) -> NodeData:
    return NodeData(
        node_id=node_id,
        node_type="asm1",
        initial_volume=volume,
        initial_concentrations=concentrations(
            X_BH=100.0, S_S=50.0, S_O=2.0, S_NH=10.0, S_ALK=5.0
        ),
        asm1_parameters=ASM1_PARAMS_19,
    )


def inlet_node(node_id: str = "in") -> NodeData:
    return NodeData(
        node_id=node_id,
        node_type="input",
        is_inlet=True,
        initial_volume=1.0,
        initial_concentrations=concentrations(
            S_S=50.0, S_NH=10.0, X_BH=100.0, S_O=2.0, S_ALK=5.0
        ),
    )


def outlet_node(node_id: str = "out") -> NodeData:
    return NodeData(
        node_id=node_id,
        node_type="output",
        is_outlet=True,
        initial_volume=1.0,
        initial_concentrations=concentrations(),
    )


def edge(eid: str, src: str, dst: str, q: float = 100.0) -> EdgeData:
    return EdgeData(edge_id=eid, source_node_id=src, target_node_id=dst, flow_rate=q)
