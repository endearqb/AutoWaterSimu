from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest
from jsonschema import Draft202012Validator

CONTRACTS_DIR = Path(__file__).resolve().parents[1]
VALID_EXAMPLES_DIR = CONTRACTS_DIR / "examples" / "valid"


def _load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _validate(schema_name: str, payload: dict[str, Any]) -> None:
    Draft202012Validator(_load_json(CONTRACTS_DIR / schema_name)).validate(payload)


@pytest.mark.parametrize(
    "compute_job_path",
    sorted(VALID_EXAMPLES_DIR.glob("*.compute_job.v1.json")),
    ids=lambda path: path.name,
)
def test_compute_job_fixtures_embed_valid_payload(compute_job_path: Path) -> None:
    compute_job = _load_json(compute_job_path)

    _validate("compute_job.v1.json", compute_job)
    payload_schema = f"{compute_job['payload']['schema_version']}.json"
    _validate(payload_schema, compute_job["payload"])
    assert compute_job["payload"]["job_type"] == compute_job["job_type"]
