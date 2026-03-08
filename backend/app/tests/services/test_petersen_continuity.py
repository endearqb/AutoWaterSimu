"""PetersenContinuityService 单元测试"""

import copy

import pytest

from app.services.petersen_continuity import check_continuity
from app.services.udm_seed_templates import UDM_SEED_TEMPLATES


def _get_asm1_data():
    """获取 ASM1 模板数据的组分、过程、参数。"""
    tpl = copy.deepcopy(UDM_SEED_TEMPLATES["asm1"])
    return tpl["components"], tpl["processes"], tpl["parameters"]


def _get_asm1slim_data():
    tpl = copy.deepcopy(UDM_SEED_TEMPLATES["asm1slim"])
    return tpl["components"], tpl["processes"], tpl["parameters"]


# ------------------------------------------------------------------
# ASM1 守恒测试
# ------------------------------------------------------------------

class TestASM1CODContinuity:
    """ASM1 模板 COD 守恒检查"""

    def test_aerobic_growth_cod_pass(self):
        components, processes, parameters = _get_asm1_data()
        results = check_continuity(
            components=components,
            processes=processes,
            parameters=parameters,
            dimensions=["COD"],
            mode="strict",
        )
        aerobic = [r for r in results if r.process_name == "heterotrophic_growth_aerobic" and r.dimension == "COD"]
        assert len(aerobic) == 1
        assert aerobic[0].status == "pass"

    def test_anoxic_growth_cod_pass(self):
        components, processes, parameters = _get_asm1_data()
        results = check_continuity(
            components=components,
            processes=processes,
            parameters=parameters,
            dimensions=["COD"],
            mode="strict",
        )
        anoxic = [r for r in results if r.process_name == "heterotrophic_growth_anoxic" and r.dimension == "COD"]
        assert len(anoxic) == 1
        assert anoxic[0].status == "pass"

    def test_hydrolysis_cod_pass(self):
        components, processes, parameters = _get_asm1_data()
        results = check_continuity(
            components=components,
            processes=processes,
            parameters=parameters,
            dimensions=["COD"],
            mode="strict",
        )
        hydro = [r for r in results if r.process_name == "hydrolysis" and r.dimension == "COD"]
        assert len(hydro) == 1
        assert hydro[0].status == "pass"


class TestASM1NitrogenContinuity:
    """ASM1 模板 N 守恒检查"""

    def test_ammonification_n_pass(self):
        components, processes, parameters = _get_asm1_data()
        results = check_continuity(
            components=components,
            processes=processes,
            parameters=parameters,
            dimensions=["N"],
            mode="strict",
        )
        ammon = [r for r in results if r.process_name == "ammonification" and r.dimension == "N"]
        assert len(ammon) == 1
        assert ammon[0].status == "pass"

    def test_hydrolysis_nitrogen_n_pass(self):
        components, processes, parameters = _get_asm1_data()
        results = check_continuity(
            components=components,
            processes=processes,
            parameters=parameters,
            dimensions=["N"],
            mode="strict",
        )
        hydro_n = [r for r in results if r.process_name == "hydrolysis_nitrogen" and r.dimension == "N"]
        assert len(hydro_n) == 1
        assert hydro_n[0].status == "pass"


# ------------------------------------------------------------------
# 模式测试
# ------------------------------------------------------------------

class TestModes:
    """测试不同的 validation mode"""

    def test_off_mode_returns_empty(self):
        components, processes, parameters = _get_asm1_data()
        results = check_continuity(
            components=components,
            processes=processes,
            parameters=parameters,
            mode="off",
        )
        assert results == []

    def test_teaching_mode_returns_warn_for_imbalance(self):
        """构造一个不平衡的过程，teaching 模式应返回 warn"""
        components = [
            {"name": "A", "conversion_factors": {"COD": 1.0}},
            {"name": "B", "conversion_factors": {"COD": 1.0}},
        ]
        processes = [
            {"name": "test_proc", "stoich": {"A": 1.0, "B": -2.0}, "stoich_expr": {}},
        ]
        results = check_continuity(
            components=components,
            processes=processes,
            parameters=[],
            dimensions=["COD"],
            mode="teaching",
        )
        assert len(results) == 1
        assert results[0].status == "warn"
        assert results[0].balance_value != 0.0

    def test_strict_mode_returns_error_for_imbalance(self):
        """同样不平衡，strict 模式应返回 error"""
        components = [
            {"name": "A", "conversion_factors": {"COD": 1.0}},
            {"name": "B", "conversion_factors": {"COD": 1.0}},
        ]
        processes = [
            {"name": "test_proc", "stoich": {"A": 1.0, "B": -2.0}, "stoich_expr": {}},
        ]
        results = check_continuity(
            components=components,
            processes=processes,
            parameters=[],
            dimensions=["COD"],
            mode="strict",
        )
        assert len(results) == 1
        assert results[0].status == "error"

    def test_balanced_process_pass(self):
        """完全平衡的过程应返回 pass"""
        components = [
            {"name": "A", "conversion_factors": {"COD": 1.0}},
            {"name": "B", "conversion_factors": {"COD": 1.0}},
        ]
        processes = [
            {"name": "balanced", "stoich": {"A": 1.0, "B": -1.0}, "stoich_expr": {}},
        ]
        results = check_continuity(
            components=components,
            processes=processes,
            parameters=[],
            dimensions=["COD"],
            mode="strict",
        )
        assert len(results) == 1
        assert results[0].status == "pass"
        assert abs(results[0].balance_value) < 1e-6


# ------------------------------------------------------------------
# 边界情况
# ------------------------------------------------------------------

class TestEdgeCases:
    """边界情况测试"""

    def test_no_conversion_factors_returns_empty(self):
        """无 conversion_factors 的组分不参与检查"""
        components = [
            {"name": "A"},
            {"name": "B"},
        ]
        processes = [
            {"name": "proc", "stoich": {"A": 1.0, "B": -1.0}, "stoich_expr": {}},
        ]
        results = check_continuity(
            components=components,
            processes=processes,
            parameters=[],
            mode="teaching",
        )
        assert results == []

    def test_stoich_expr_fallback(self):
        """当 stoich 无数值时，使用 stoich_expr + 参数默认值求值"""
        components = [
            {"name": "A", "conversion_factors": {"COD": 1.0}},
            {"name": "B", "conversion_factors": {"COD": 1.0}},
        ]
        processes = [
            {"name": "expr_proc", "stoich": {}, "stoich_expr": {"A": "1/Y", "B": "-1/Y"}},
        ]
        parameters = [{"name": "Y", "default_value": 0.5}]
        results = check_continuity(
            components=components,
            processes=processes,
            parameters=parameters,
            dimensions=["COD"],
            mode="strict",
        )
        assert len(results) == 1
        assert results[0].status == "pass"

    def test_stoich_expr_overrides_placeholder_zero(self):
        """前端占位 stoich=0 时，连续性检查仍应优先按表达式求值。"""
        components = [
            {"name": "A", "conversion_factors": {"COD": 1.0}},
            {"name": "B", "conversion_factors": {"COD": 1.0}},
        ]
        processes = [
            {
                "name": "expr_proc",
                "stoich": {"A": 0.0, "B": 0.0},
                "stoich_expr": {"A": "1/Y", "B": "-1/Y"},
            },
        ]
        parameters = [{"name": "Y", "default_value": 0.5}]
        results = check_continuity(
            components=components,
            processes=processes,
            parameters=parameters,
            dimensions=["COD"],
            mode="strict",
        )
        assert len(results) == 1
        assert results[0].status == "pass"
        contributions = results[0].details["contributions"]
        assert [item["stoich"] for item in contributions] == [2.0, -2.0]

    def test_stoich_expr_details_use_resolved_value_not_placeholder_zero(self):
        """details.contributions.stoich 应记录表达式解析后的真实数值。"""
        components = [
            {"name": "A", "conversion_factors": {"COD": 1.0}},
        ]
        processes = [
            {
                "name": "expr_detail_proc",
                "stoich": {"A": 0.0},
                "stoich_expr": {"A": "1/Y"},
            },
        ]
        parameters = [{"name": "Y", "default_value": 0.5}]
        results = check_continuity(
            components=components,
            processes=processes,
            parameters=parameters,
            dimensions=["COD"],
            mode="teaching",
        )
        assert len(results) == 1
        assert results[0].details is not None
        assert results[0].details["contributions"][0]["stoich"] == 2.0
        assert "1/Y" in results[0].explanation

    def test_explanation_contains_components(self):
        """explanation 字段应包含组分名"""
        components = [
            {"name": "X", "conversion_factors": {"COD": 1.0}},
            {"name": "Y", "conversion_factors": {"COD": -1.0}},
        ]
        processes = [
            {"name": "p1", "stoich": {"X": 1.0, "Y": 1.0}, "stoich_expr": {"X": "1", "Y": "1"}},
        ]
        results = check_continuity(
            components=components,
            processes=processes,
            parameters=[],
            dimensions=["COD"],
            mode="teaching",
        )
        assert len(results) == 1
        assert "X" in results[0].explanation
        assert "Y" in results[0].explanation

    def test_details_has_contributions(self):
        """details 字段应包含各组分贡献明细"""
        components = [
            {"name": "A", "conversion_factors": {"COD": 1.0}},
        ]
        processes = [
            {"name": "p", "stoich": {"A": 2.0}, "stoich_expr": {}},
        ]
        results = check_continuity(
            components=components,
            processes=processes,
            parameters=[],
            dimensions=["COD"],
            mode="teaching",
        )
        assert len(results) == 1
        assert results[0].details is not None
        contribs = results[0].details["contributions"]
        assert len(contribs) == 1
        assert contribs[0]["component"] == "A"
        assert contribs[0]["stoich"] == 2.0
        assert contribs[0]["factor"] == 1.0

    def test_multiple_dimensions(self):
        """同时检查多个维度"""
        components = [
            {"name": "A", "conversion_factors": {"COD": 1.0, "N": 0.1}},
        ]
        processes = [
            {"name": "p", "stoich": {"A": 1.0}, "stoich_expr": {}},
        ]
        results = check_continuity(
            components=components,
            processes=processes,
            parameters=[],
            dimensions=["COD", "N"],
            mode="teaching",
        )
        assert len(results) == 2
        dims = {r.dimension for r in results}
        assert dims == {"COD", "N"}
