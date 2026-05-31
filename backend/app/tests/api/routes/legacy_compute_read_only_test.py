from __future__ import annotations

import pytest
from fastapi import HTTPException
from fastapi.routing import APIRoute

from app.api.routes import asm1, asm1slim, asm3, material_balance, udm
from app.api.routes.legacy_compute import ensure_legacy_compute_writable
from app.core.config import settings


LEGACY_COMPUTE_ROUTE_MODULES = [
    material_balance,
    asm1,
    asm1slim,
    asm3,
    udm,
]

MUTATING_COMPUTE_ROUTES = {
    ("POST", "/calculate"),
    ("POST", "/calculate-from-flowchart"),
    ("DELETE", "/jobs/{job_id}"),
}


def test_legacy_compute_guard_allows_default_writable_mode(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "LEGACY_COMPUTE_READ_ONLY", False)

    assert ensure_legacy_compute_writable() is None


def test_legacy_compute_guard_rejects_read_only_mode(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "LEGACY_COMPUTE_READ_ONLY", True)

    with pytest.raises(HTTPException) as exc_info:
        ensure_legacy_compute_writable()

    assert exc_info.value.status_code == 409
    assert exc_info.value.detail["code"] == "LEGACY_COMPUTE_READ_ONLY"
    assert exc_info.value.detail["replacement"] == "/api/v1/simulation-checks"


@pytest.mark.parametrize(
    "route_module",
    LEGACY_COMPUTE_ROUTE_MODULES,
    ids=lambda module: module.__name__.rsplit(".", 1)[-1],
)
def test_mutating_legacy_compute_routes_use_read_only_guard(route_module) -> None:
    guarded_routes = set()

    for route in route_module.router.routes:
        if not isinstance(route, APIRoute):
            continue

        for method in route.methods or set():
            route_key = (method, route.path)
            if route_key not in MUTATING_COMPUTE_ROUTES:
                continue

            has_guard = any(
                dependency.call is ensure_legacy_compute_writable
                for dependency in route.dependant.dependencies
            )
            if has_guard:
                guarded_routes.add(route_key)

    assert guarded_routes == MUTATING_COMPUTE_ROUTES
