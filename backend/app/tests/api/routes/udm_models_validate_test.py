from __future__ import annotations

from copy import deepcopy
from typing import Any

from fastapi.testclient import TestClient

from app.core.config import settings
from app.services.udm_seed_templates import get_udm_seed_template


def _build_template_payload(template_key: str) -> dict[str, Any]:
    template = deepcopy(get_udm_seed_template(template_key))
    return {
        "name": template["name"],
        "description": template.get("description"),
        "tags": template.get("tags", []),
        "components": template["components"],
        "parameters": template["parameters"],
        "processes": template["processes"],
        "meta": template.get("meta"),
    }


def _build_imbalanced_payload() -> dict[str, Any]:
    return {
        "name": "Continuity Validate Test",
        "description": "payload for validate route continuity tests",
        "tags": [],
        "components": [
            {"name": "A", "conversion_factors": {"COD": 1.0}},
            {"name": "B", "conversion_factors": {"COD": 1.0}},
        ],
        "parameters": [],
        "processes": [
            {
                "name": "imbalanced_proc",
                "rate_expr": "1",
                "stoich": {"A": 1.0, "B": -2.0},
                "stoich_expr": {"A": "1", "B": "-2"},
            }
        ],
        "meta": {
            "learning": {
                "continuityProfiles": ["COD"],
            }
        },
    }


def test_validate_respects_continuity_profiles(client: TestClient) -> None:
    response = client.post(
        f"{settings.API_V1_STR}/udm-models/validate",
        json=_build_template_payload("petersen-chapter-3"),
    )

    assert response.status_code == 200
    data = response.json()

    dimensions = sorted({item["dimension"] for item in data["continuity_checks"]})
    assert dimensions == ["COD", "N"]


def test_validate_strict_mode_promotes_continuity_error(client: TestClient) -> None:
    response = client.post(
        f"{settings.API_V1_STR}/udm-models/validate",
        params={"validation_mode": "strict"},
        json=_build_imbalanced_payload(),
    )

    assert response.status_code == 200
    data = response.json()

    assert data["ok"] is False
    assert any(item["status"] == "error" for item in data["continuity_checks"])
    strict_error = next(
        item for item in data["errors"] if item["code"] == "CONTINUITY_IMBALANCE"
    )
    assert strict_error["process"] == "imbalanced_proc"
    assert strict_error["location"]["section"] == "stoich"
    assert strict_error["location"]["processName"] == "imbalanced_proc"


def test_validate_teaching_mode_keeps_continuity_as_warning_only(
    client: TestClient,
) -> None:
    response = client.post(
        f"{settings.API_V1_STR}/udm-models/validate",
        params={"validation_mode": "teaching"},
        json=_build_imbalanced_payload(),
    )

    assert response.status_code == 200
    data = response.json()

    assert data["ok"] is True
    assert all(item["code"] != "CONTINUITY_IMBALANCE" for item in data["errors"])
    assert any(item["status"] == "warn" for item in data["continuity_checks"])
