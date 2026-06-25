from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest
from jsonschema import Draft202012Validator
from jsonschema.exceptions import ValidationError
from jsonschema.validators import validator_for

CONTRACTS_DIR = Path(__file__).resolve().parents[1]
VALID_EXAMPLES_DIR = CONTRACTS_DIR / "examples" / "valid"
INVALID_EXAMPLES_DIR = CONTRACTS_DIR / "examples" / "invalid"


def _load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _schema_files() -> list[Path]:
    return sorted(CONTRACTS_DIR.glob("*.v1.json"))


def _schema_name_from_example(path: Path) -> str:
    name = path.name
    for schema_path in _schema_files():
        schema_name = schema_path.name
        if name.endswith(f".{schema_name}"):
            return schema_name
    raise AssertionError(f"Cannot resolve schema for example {path}")


@pytest.mark.parametrize("schema_path", _schema_files(), ids=lambda path: path.name)
def test_contract_schema_is_valid_json_schema(schema_path: Path) -> None:
    schema = _load_json(schema_path)
    validator_class = validator_for(schema)
    validator_class.check_schema(schema)


@pytest.mark.parametrize("schema_path", _schema_files(), ids=lambda path: path.name)
def test_schema_version_matches_file_name(schema_path: Path) -> None:
    schema = _load_json(schema_path)

    assert schema["properties"]["schema_version"]["const"] == schema_path.stem


@pytest.mark.parametrize(
    "example_path",
    sorted(VALID_EXAMPLES_DIR.glob("*.v1.json")),
    ids=lambda path: path.name,
)
def test_valid_examples_pass_schema_validation(example_path: Path) -> None:
    example = _load_json(example_path)
    schema_name = _schema_name_from_example(example_path)
    schema = _load_json(CONTRACTS_DIR / schema_name)

    Draft202012Validator(schema).validate(example)
    _validate_contract_semantics(schema_name, example)


@pytest.mark.parametrize(
    "example_path",
    sorted(INVALID_EXAMPLES_DIR.glob("*.v1.json")),
    ids=lambda path: path.name,
)
def test_invalid_examples_fail_schema_validation(example_path: Path) -> None:
    example = _load_json(example_path)
    schema_name = _schema_name_from_example(example_path)
    schema = _load_json(CONTRACTS_DIR / schema_name)

    with pytest.raises(ValidationError):
        Draft202012Validator(schema).validate(example)
        _validate_contract_semantics(schema_name, example)


def _validate_contract_semantics(schema_name: str, document: dict[str, Any]) -> None:
    if schema_name != "material_balance_time_series.v1.json":
        return

    timestamps = document.get("timestamps")
    if not isinstance(timestamps, list):
        return
    expected_length = len(timestamps)
    for section in ("node_data", "edge_data"):
        values = document.get(section)
        if not isinstance(values, dict):
            continue
        for item_id, series_map in values.items():
            if not isinstance(series_map, dict):
                continue
            for field, value in series_map.items():
                if isinstance(value, list) and len(value) != expected_length:
                    raise ValidationError(
                        f"{section}.{item_id}.{field} length {len(value)} does not match timestamps length {expected_length}"
                    )
