from app.services.udm_expression import validate_udm_definition
from app.services.udm_seed_templates import (
    get_udm_seed_template,
    list_udm_seed_templates,
)


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
