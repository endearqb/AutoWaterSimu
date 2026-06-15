from __future__ import annotations

import ast
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
BACKEND_APP = REPO_ROOT / "backend" / "app"

LEGACY_LOCAL_INPUT_MODULES = {
    ".models",
    "app.material_balance.models",
    "material_balance.models",
}
LEGACY_LOCAL_INPUT_NAMES = {
    "CalculationParameters",
    "EdgeData",
    "MaterialBalanceInput",
    "NodeData",
}
ALLOWED_COMPATIBILITY_IMPORT_FILES = {
    "backend/app/material_balance/models.py",
}
EXCLUDED_PRODUCTION_FILES = {
    "backend/app/material_balance/simple_test.py",
    "backend/app/material_balance/test_module.py",
}


def _repo_relative(path: Path) -> str:
    return path.relative_to(REPO_ROOT).as_posix()


def _production_python_files() -> list[Path]:
    files: list[Path] = []
    for path in sorted(BACKEND_APP.rglob("*.py")):
        relative = _repo_relative(path)
        if "__pycache__" in path.parts:
            continue
        if relative.startswith("backend/app/tests/"):
            continue
        if relative in EXCLUDED_PRODUCTION_FILES:
            continue
        files.append(path)
    return files


def _normalized_import_from_module(node: ast.ImportFrom) -> str:
    if node.level <= 0:
        return node.module or ""
    return f"{'.' * node.level}{node.module or ''}"


def _legacy_local_model_import_hits(path: Path) -> list[str]:
    tree = ast.parse(path.read_text(encoding="utf-8-sig"), filename=str(path))
    hits: list[str] = []
    for node in ast.walk(tree):
        if not isinstance(node, ast.ImportFrom):
            continue
        if _normalized_import_from_module(node) not in LEGACY_LOCAL_INPUT_MODULES:
            continue
        imported_names = {alias.name for alias in node.names}
        forbidden_names = sorted(imported_names & LEGACY_LOCAL_INPUT_NAMES)
        if forbidden_names:
            hits.append(f"{_repo_relative(path)}:{node.lineno}: {', '.join(forbidden_names)}")
    return hits


def test_local_material_balance_models_are_marked_compatibility_only() -> None:
    models_text = (BACKEND_APP / "material_balance" / "models.py").read_text(encoding="utf-8-sig")
    init_text = (BACKEND_APP / "material_balance" / "__init__.py").read_text(encoding="utf-8-sig")

    assert "Compatibility re-export for material balance runtime models" in models_text
    assert "autowatersimu_simulation_core.material_balance.models" in models_text
    assert "package root no longer re-exports runtime input/result models" in init_text
    assert "Local input models: removed from this package" in init_text
    assert "legacy route schema still lives in app.models" in init_text


def test_material_balance_models_are_core_reexports() -> None:
    from app.material_balance import models as backend_models
    from autowatersimu_simulation_core.material_balance import models as core_models

    for name in LEGACY_LOCAL_INPUT_NAMES | {"MaterialBalanceResult"}:
        assert getattr(backend_models, name) is getattr(core_models, name)


def test_material_balance_package_root_does_not_export_runtime_models() -> None:
    import app.material_balance as backend_material_balance

    for name in LEGACY_LOCAL_INPUT_NAMES | {"MaterialBalanceResult"}:
        assert not hasattr(backend_material_balance, name)


def test_production_code_does_not_import_local_material_balance_input_models() -> None:
    hits: list[str] = []
    for path in _production_python_files():
        relative = _repo_relative(path)
        if relative in ALLOWED_COMPATIBILITY_IMPORT_FILES:
            continue
        hits.extend(_legacy_local_model_import_hits(path))

    assert hits == []
