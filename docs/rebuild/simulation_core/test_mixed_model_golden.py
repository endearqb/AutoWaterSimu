"""多模型混合节点调度 golden（REQ-P0-014 / PR-38 / KPI-018）。

PR-38 已选择支持混合：
    单次 RHS 内对各 mask 子集分别叠加反应项，混合 asm+udm 中的 UDM 反应
    不再被 ASM 分支静默丢弃。本文档化测试保留 unsupported-error 骨架作为
    历史备选记录，但当前常绿路径是 supported mixed-model semantics。
"""

from __future__ import annotations

import pytest
import torch

from autowatersimu_simulation_core.material_balance import MaterialBalanceInput

from .conftest import (
    assert_l3,
    asm1_reactor_node,
    edge,
    flowchart_meta,
    inlet_node,
    make_parameters,
    outlet_node,
    udm_decay_node,
)


def _mixed_input() -> MaterialBalanceInput:
    """inlet 同时喂一个 ASM1 反应器和一个 UDM 反应器，各自汇入 outlet。"""
    return MaterialBalanceInput(
        nodes=[inlet_node(), udm_decay_node(), asm1_reactor_node(), outlet_node()],
        edges=[
            edge("e1", "in", "udm1"),
            edge("e2", "in", "asm1"),
            edge("e3", "udm1", "out"),
            edge("e4", "asm1", "out"),
        ],
        parameters=make_parameters(hours=2.0, steps_per_hour=10),
        original_flowchart_data=flowchart_meta(),
    )


def _solo_udm_input() -> MaterialBalanceInput:
    """同一个 UDM 节点，但图中没有其它反应模型（正控）。"""
    return MaterialBalanceInput(
        nodes=[inlet_node(), udm_decay_node(), outlet_node()],
        edges=[edge("e1", "in", "udm1"), edge("e3", "udm1", "out")],
        parameters=make_parameters(hours=2.0, steps_per_hour=10),
        original_flowchart_data=flowchart_meta(),
    )


# --------------------------------------------------------------------------- #
# 正控：单独 UDM 节点，衰减反应必须生效（现状应通过）
# --------------------------------------------------------------------------- #
def test_solo_udm_reaction_applies(deterministic_calculator):
    """证明 UDM 衰减反应本身是工作的：S_S 应随时间显著下降。"""
    result = deterministic_calculator.calculate(_solo_udm_input())
    s_s = result.node_data["udm1"]["S_S"]
    assert s_s[0] == pytest.approx(50.0)
    assert s_s[-1] < s_s[0] - 1.0, "单独 UDM 节点的衰减反应未生效——正控失败，先查反应核"


# --------------------------------------------------------------------------- #
# 差分判据：断言“正确行为”（混合图里 UDM 反应也应生效）。
# 唯一与正控的差别是图中多了一个 ASM1 节点：因此末值偏离 solo 会指向调度回归。
# --------------------------------------------------------------------------- #
def test_mixed_udm_reaction_applies(deterministic_calculator):
    """正确行为：混合图中 UDM 的 S_S 末值应与单独 UDM（solo）一致（传输条件相同）。"""
    mixed = deterministic_calculator.calculate(_mixed_input())
    solo = deterministic_calculator.calculate(_solo_udm_input())
    s_s_mixed = mixed.node_data["udm1"]["S_S"][-1]
    s_s_solo = solo.node_data["udm1"]["S_S"][-1]
    assert s_s_mixed == pytest.approx(s_s_solo, rel=1e-4, abs=1e-8)


# --------------------------------------------------------------------------- #
# 结局 A —— 支持混合（PR-38 当前决策）
# --------------------------------------------------------------------------- #
def test_mixed_asm_udm_l3_golden(deterministic_calculator):
    """混合 asm+udm L3 golden（KPI-018，支持方案）。

    最小正确性锚点（无需完整 fixture 也能先卡住）：
        混合图中 UDM 的 S_S 末值应与 test_solo_udm_reaction_applies 的末值一致
        （传输条件相同，反应应同样生效）。
    """
    result = deterministic_calculator.calculate(_mixed_input())
    solo = deterministic_calculator.calculate(_solo_udm_input()).node_data["udm1"]["S_S"]
    assert_l3(torch.tensor(result.node_data["udm1"]["S_S"]), torch.tensor(solo))


# --------------------------------------------------------------------------- #
# 结局 B —— 不支持混合（PR-38 决策为“构建期报错”时启用）
# --------------------------------------------------------------------------- #
@pytest.mark.skip(reason="PR-38 已选择支持混合；不支持方案仅作为历史备选记录保留。")
def test_mixed_models_rejected_at_build(deterministic_calculator):
    """不支持方案：同图多反应模型共存 → 构建期报错（KPI-018，不支持方案）。"""
    # from autowatersimu_simulation_core.material_balance.exceptions import InvalidInputError
    # with pytest.raises(InvalidInputError):
    #     deterministic_calculator.calculate(_mixed_input())
    raise NotImplementedError
