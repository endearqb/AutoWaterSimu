from __future__ import annotations

import ast
from pathlib import Path

import pytest

ROUTE_FILES = sorted(Path("app/api/routes").glob("*.py"))


@pytest.mark.parametrize("route_file", ROUTE_FILES, ids=lambda path: path.name)
def test_routes_do_not_call_print(route_file: Path) -> None:
    tree = ast.parse(route_file.read_text(encoding="utf-8-sig"))

    print_calls = [
        node
        for node in ast.walk(tree)
        if isinstance(node, ast.Call)
        and isinstance(node.func, ast.Name)
        and node.func.id == "print"
    ]

    assert print_calls == []
