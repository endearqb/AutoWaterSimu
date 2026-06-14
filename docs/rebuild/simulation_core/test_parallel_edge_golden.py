"""并行边 dense/sparse 语义统一 golden（REQ-P2-003 / PR-32 / KPI-006）。

现状（已复现的存量 bug）：
    ``_convert_to_tensors`` 用 ``prop_a[src,dst,:] = a_edge`` **赋值**，重复 (src,dst)
    下后写的边覆盖先写的；而 ``Q_out.index_put_(..., accumulate=True)`` 是**累加**。
    于是一组并行边在 dense 路径下“流量累加、因子只剩末边”，结果既 ≠ sparse
    （物理正确路径），自身也是错的。

本文件分两层：
    1. test_sparse_parallel_edge_is_golden —— 锁定 sparse 的物理正确语义为 golden，
       现在就应通过；任何对 sparse 路径的改动都不得破坏它。
    2. test_dense_matches_sparse_parallel_edge —— dense ↔ sparse L2 等价。
       **PR-32 落地前 xfail（记录分歧），落地后摘掉 xfail 即成常绿等价门。**

数值 golden 推导（两条 0→1 边，C0=10，q=1，a=[2,4]，b=0）：
    每条边出流质量 = q * (C_src * a) = 1*(10*2)=20 与 1*(10*4)=40，合计 60。
    节点 0 出流聚合 = 60 → delta_m[0] = -60；节点 1 入流聚合 = 60 → delta_m[1] = +60。
"""

from __future__ import annotations

import pytest
import torch

from .conftest import assert_l2


def _parallel_edge_bundle(dtype: torch.dtype = torch.float64) -> dict:
    """两条 0→1 并行边，因子不同（a=2 / a=4）。"""
    return {
        "src": torch.tensor([0, 0]),
        "dst": torch.tensor([1, 1]),
        "q": torch.tensor([1.0, 1.0], dtype=dtype),
        "a": torch.tensor([[2.0], [4.0]], dtype=dtype),
        "b": torch.tensor([[0.0], [0.0]], dtype=dtype),
        "shape": (2, 2),
    }


def _concentrations(dtype: torch.dtype = torch.float64) -> torch.Tensor:
    # node0 浓度 10、node1 浓度 0，单组分
    return torch.tensor([[10.0], [0.0]], dtype=dtype)


def _build_dense_like_core(bundle: dict, n: int, r: int, dtype: torch.dtype):
    """完全复刻 _convert_to_tensors 的 dense 构造方式（含覆盖式赋值）。"""
    Q_out = torch.zeros(n, n, dtype=dtype)
    Q_out.index_put_((bundle["src"], bundle["dst"]), bundle["q"], accumulate=True)
    prop_a = torch.ones(n, n, r, dtype=dtype)
    prop_b = torch.zeros(n, n, r, dtype=dtype)
    prop_a[bundle["src"], bundle["dst"], :] = bundle["a"]  # 末边覆盖：bug 源
    prop_b[bundle["src"], bundle["dst"], :] = bundle["b"]
    return Q_out, prop_a, prop_b


# --------------------------------------------------------------------------- #
# (1) sparse = golden（现状应通过）
# --------------------------------------------------------------------------- #
def test_sparse_parallel_edge_is_golden(deterministic_calculator):
    calc = deterministic_calculator
    bundle = _parallel_edge_bundle()
    C = _concentrations()

    delta_m, delta_Q = calc._balance_param_sparse(C, bundle)

    expected_delta_m = torch.tensor([[-60.0], [60.0]], dtype=torch.float64)
    expected_delta_Q = torch.tensor([-2.0, 2.0], dtype=torch.float64)  # q 累加 1+1=2
    assert_l2(delta_m, expected_delta_m)
    assert_l2(delta_Q, expected_delta_Q)


# --------------------------------------------------------------------------- #
# (2) dense ↔ sparse 等价（PR-32 前 xfail）
# --------------------------------------------------------------------------- #
@pytest.mark.xfail(
    reason="PR-32 未落地：dense 覆盖式赋值导致并行边因子被末边覆盖，与 sparse 不等价。"
    " 修复（dense 报错 或 a_eff=Σqᵢaᵢ/Σqᵢ 合并）后摘除本标记。",
    strict=True,
)
def test_dense_matches_sparse_parallel_edge(deterministic_calculator):
    calc = deterministic_calculator
    bundle = _parallel_edge_bundle()
    C = _concentrations()
    n, r = 2, 1

    delta_m_sparse, _ = calc._balance_param_sparse(C, bundle)
    Q_out, prop_a, prop_b = _build_dense_like_core(bundle, n, r, torch.float64)
    delta_m_dense, _, *_ = calc._balance_param(C, Q_out, prop_a, prop_b)

    assert_l2(delta_m_dense, delta_m_sparse)


# --------------------------------------------------------------------------- #
# (3) 单边场景：dense 与 sparse 必须一致（回归护栏，现状应通过）
#     —— 证明分歧只来自“并行边”，而非两条路径本身实现不同。
# --------------------------------------------------------------------------- #
def test_dense_matches_sparse_single_edge(deterministic_calculator):
    calc = deterministic_calculator
    dtype = torch.float64
    bundle = {
        "src": torch.tensor([0]),
        "dst": torch.tensor([1]),
        "q": torch.tensor([1.0], dtype=dtype),
        "a": torch.tensor([[3.0]], dtype=dtype),
        "b": torch.tensor([[1.0]], dtype=dtype),
        "shape": (2, 2),
    }
    C = _concentrations(dtype)
    n, r = 2, 1

    delta_m_sparse, _ = calc._balance_param_sparse(C, bundle)
    Q_out, prop_a, prop_b = _build_dense_like_core(bundle, n, r, dtype)
    delta_m_dense, _, *_ = calc._balance_param(C, Q_out, prop_a, prop_b)

    assert_l2(delta_m_dense, delta_m_sparse)
