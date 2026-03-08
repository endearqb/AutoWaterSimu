import pytest

from app.services.petersen_continuity import check_continuity
from app.services.udm_expression import validate_udm_definition
from app.services.udm_seed_templates import (
    get_udm_seed_template,
    list_udm_seed_templates,
)


# ------------------------------------------------------------------
# 已有测试：位置元数据与模板结构
# ------------------------------------------------------------------


def test_rate_expr_issue_contains_location_metadata() -> None:
    result = validate_udm_definition(
        components=["S_S", "X_BH"],
        processes=[
            {
                "name": "growth",
                "rate_expr": "mu_H * S_S * X_BH",
                "stoich_expr": {"S_S": "-1", "X_BH": "1"},
            }
        ],
        declared_parameters=["K_S"],
    )

    issue = next(item for item in result.errors if item.code == "UNDEFINED_SYMBOL")

    assert issue.location is not None
    assert issue.location.section == "rateExpr"
    assert issue.location.processName == "growth"
    assert issue.location.parameterName == "mu_H"
    assert issue.location.cellKey == "growth:rateExpr"


def test_stoich_issue_contains_cell_location_metadata() -> None:
    result = validate_udm_definition(
        components=["S_S", "X_BH"],
        processes=[
            {
                "name": "growth",
                "rate_expr": "mu_H * X_BH",
                "stoich_expr": {"S_S": "-alpha", "X_BH": "S_S"},
            }
        ],
        declared_parameters=["mu_H"],
    )

    undefined_issue = next(item for item in result.errors if item.message == "Undefined symbol: alpha")
    component_ref_issue = next(
        item for item in result.errors if item.code == "STOICH_COMPONENT_REF"
    )

    assert undefined_issue.location is not None
    assert undefined_issue.location.section == "stoich"
    assert undefined_issue.location.processName == "growth"
    assert undefined_issue.location.componentName == "S_S"
    assert undefined_issue.location.parameterName == "alpha"
    assert undefined_issue.location.cellKey == "growth:S_S"

    assert component_ref_issue.location is not None
    assert component_ref_issue.location.section == "stoich"
    assert component_ref_issue.location.processName == "growth"
    assert component_ref_issue.location.componentName == "X_BH"
    assert component_ref_issue.location.cellKey == "growth:X_BH"


def test_tutorial_seed_templates_include_learning_meta() -> None:
    tutorial_template = get_udm_seed_template("petersen-chapter-1")
    base_template = get_udm_seed_template("asm1slim")

    learning = tutorial_template["meta"]["learning"]

    assert tutorial_template["key"] == "petersen-chapter-1"
    assert learning["track"] == "petersen"
    assert learning["lessonKey"] == "chapter-1"
    assert learning["stepConfig"]["defaultStep"] == 1
    assert "tutorial" in tutorial_template["tags"]
    assert "learning" not in base_template.get("meta", {})

    summaries = {item["key"]: item for item in list_udm_seed_templates()}
    assert "petersen-chapter-1" in summaries
    assert "tutorial" in summaries["petersen-chapter-1"]["tags"]


def test_list_templates_supports_tag_filtering() -> None:
    all_templates = list_udm_seed_templates()
    tutorial_only = list_udm_seed_templates(tags=["tutorial"])
    non_tutorial = list_udm_seed_templates(exclude_tags=["tutorial"])

    assert len(all_templates) == len(tutorial_only) + len(non_tutorial)
    assert all("tutorial" in item["tags"] for item in tutorial_only)
    assert all("tutorial" not in item["tags"] for item in non_tutorial)
    assert len(tutorial_only) >= 4  # at least the 4 petersen chapters

    petersen_only = list_udm_seed_templates(tags=["petersen-tutorial"])
    assert len(petersen_only) == len(tutorial_only)


# ------------------------------------------------------------------
# Phase 2A: 模板端到端验证 — 表达式合法性 + 连续性回归
# ------------------------------------------------------------------

TUTORIAL_TEMPLATE_KEYS = [
    "petersen-chapter-1",
    "petersen-chapter-2",
    "petersen-chapter-3",
    "petersen-chapter-7",
]


@pytest.mark.parametrize("template_key", TUTORIAL_TEMPLATE_KEYS)
def test_all_tutorial_templates_pass_validation(template_key: str) -> None:
    """每个教程模板的表达式、化学计量系数都应通过 validate_udm_definition。"""
    tpl = get_udm_seed_template(template_key)
    result = validate_udm_definition(
        components=[c["name"] for c in tpl["components"]],
        processes=tpl["processes"],
        declared_parameters=[p["name"] for p in tpl["parameters"]],
    )
    assert result.ok, f"{template_key} validation failed: {[e.message for e in result.errors]}"
    assert len(result.errors) == 0


CONTINUITY_CASES = [
    ("petersen-chapter-3", ["COD", "N"]),
    ("petersen-chapter-7", ["COD", "N", "ALK"]),
]


@pytest.mark.parametrize("template_key,dimensions", CONTINUITY_CASES)
def test_tutorial_templates_continuity(template_key: str, dimensions: list[str]) -> None:
    """模板连续性检查应能正常执行，且各结果都有有效的 status。"""
    tpl = get_udm_seed_template(template_key)
    results = check_continuity(
        components=tpl["components"],
        processes=tpl["processes"],
        parameters=tpl["parameters"],
        dimensions=dimensions,
        mode="strict",
    )
    assert len(results) > 0, f"{template_key} should produce continuity results"
    for r in results:
        assert r.status in ("pass", "warn", "error")
        assert r.dimension in dimensions
        assert r.process_name is not None


def test_chapter7_all_processes_pass_strict_continuity() -> None:
    """Chapter-7 (基于完整 ASM1) 关键过程在 COD/N 维度应通过守恒检查。"""
    tpl = get_udm_seed_template("petersen-chapter-7")
    results = check_continuity(
        components=tpl["components"],
        processes=tpl["processes"],
        parameters=tpl["parameters"],
        dimensions=["COD", "N", "ALK"],
        mode="strict",
    )
    # 验证结果非空且格式正确
    assert len(results) > 0

    # ASM1 核心过程 COD 守恒
    for proc_name in ("heterotrophic_growth_aerobic", "heterotrophic_growth_anoxic", "hydrolysis"):
        cod_items = [r for r in results if r.process_name == proc_name and r.dimension == "COD"]
        assert len(cod_items) == 1, f"expected 1 COD result for {proc_name}"
        assert cod_items[0].status == "pass", f"{proc_name} COD should pass"

    # ASM1 核心过程 N 守恒
    for proc_name in ("ammonification", "hydrolysis_nitrogen"):
        n_items = [r for r in results if r.process_name == proc_name and r.dimension == "N"]
        assert len(n_items) == 1, f"expected 1 N result for {proc_name}"
        assert n_items[0].status == "pass", f"{proc_name} N should pass"
