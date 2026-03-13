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


def test_create_and_read_udm_model_preserves_parameter_label(
    client: TestClient,
    superuser_token_headers: dict[str, str],
) -> None:
    payload = {
        "name": "UDM Parameter Label Test",
        "description": "verify parameter labels round-trip through create/read",
        "tags": ["test"],
        "components": [
            {
                "name": "S_S",
                "label": "可溶性基质",
                "default_value": 20.0,
            }
        ],
        "parameters": [
            {
                "name": "mu_H",
                "label": "最大比增长速率",
                "default_value": 6.0,
                "min_value": 0.1,
                "max_value": 20.0,
                "scale": "lin",
            }
        ],
        "processes": [
            {
                "name": "growth",
                "rate_expr": "mu_H*S_S",
                "stoich_expr": {"S_S": "-1"},
            }
        ],
        "meta": None,
    }

    create_response = client.post(
        f"{settings.API_V1_STR}/udm-models/",
        headers=superuser_token_headers,
        json=payload,
    )
    assert create_response.status_code == 200
    created = create_response.json()

    assert created["latest_version"]["parameters"][0]["label"] == "最大比增长速率"

    read_response = client.get(
        f"{settings.API_V1_STR}/udm-models/{created['id']}",
        headers=superuser_token_headers,
    )
    assert read_response.status_code == 200
    reread = read_response.json()

    assert reread["latest_version"]["parameters"][0]["name"] == "mu_H"
    assert reread["latest_version"]["parameters"][0]["label"] == "最大比增长速率"
