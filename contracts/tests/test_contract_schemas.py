from __future__ import annotations

import json
import hashlib
from pathlib import Path
from typing import Any

import pytest
from jsonschema import Draft202012Validator
from jsonschema.exceptions import ValidationError
from jsonschema.validators import validator_for

CONTRACTS_DIR = Path(__file__).resolve().parents[1]
CATALOGS_DIR = CONTRACTS_DIR / "catalogs"
VALID_EXAMPLES_DIR = CONTRACTS_DIR / "examples" / "valid"
INVALID_EXAMPLES_DIR = CONTRACTS_DIR / "examples" / "invalid"
UDM_TEMPLATE_KEYS = {
    "asm1",
    "asm1slim",
    "asm3",
    "petersen-chapter-1",
    "petersen-chapter-2",
    "petersen-chapter-3",
    "petersen-chapter-7",
}


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


@pytest.mark.parametrize(
    "catalog_path",
    sorted(CATALOGS_DIR.glob("*.v1.json")),
    ids=lambda path: path.name,
)
def test_catalog_documents_pass_schema_and_semantic_validation(catalog_path: Path) -> None:
    catalog = _load_json(catalog_path)
    schema_name = f"{catalog['schema_version']}.json"
    schema = _load_json(CONTRACTS_DIR / schema_name)

    Draft202012Validator(schema).validate(catalog)
    _validate_contract_semantics(schema_name, catalog)


def _validate_contract_semantics(schema_name: str, document: dict[str, Any]) -> None:
    if schema_name == "udm_seed_catalog.v1.json":
        _validate_udm_seed_catalog(document)
        return

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


def _validate_udm_seed_catalog(document: dict[str, Any]) -> None:
    templates = document.get("templates")
    if not isinstance(templates, list):
        return
    by_key = {str(item.get("key")): item for item in templates if isinstance(item, dict)}
    if document.get("seed_source") == "fixture":
        return
    if set(by_key) != UDM_TEMPLATE_KEYS:
        raise ValidationError(f"UDM seed catalog keys mismatch: {sorted(by_key)}")
    expected_counts = {
        "asm1": (11, 19, 8),
        "asm1slim": (5, 7, 3),
        "asm3": (13, 22, 7),
    }
    for key, (component_count, parameter_count, process_count) in expected_counts.items():
        template = by_key[key]
        if (
            len(template.get("components", [])) != component_count
            or len(template.get("parameters", [])) != parameter_count
            or len(template.get("processes", [])) != process_count
        ):
            raise ValidationError(f"UDM template {key} count mismatch")
    for key, template in by_key.items():
        expected_hash = _udm_template_hash(template)
        if template.get("template_content_hash") != expected_hash:
            raise ValidationError(f"UDM template {key} content hash mismatch")


def _udm_template_hash(template: dict[str, Any]) -> str:
    payload = {
        "key": template.get("key"),
        "name": template.get("name", ""),
        "description": template.get("description", ""),
        "tags": template.get("tags", []),
        "components": template.get("components", []),
        "parameters": template.get("parameters", []),
        "processes": template.get("processes", []),
        "meta": template.get("meta", {}),
        "template_schema_version": template.get("template_schema_version"),
        "template_revision": template.get("template_revision"),
        "seed_source": template.get("seed_source"),
    }
    raw = json.dumps(
        payload,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")
    return "sha256:" + hashlib.sha256(raw).hexdigest()
