import copy
import json
import os
from pathlib import Path
from typing import Any, Dict, List


def _contracts_dir() -> Path:
    configured = (
        os.environ.get("AUTOWATERSIMU_CONTRACTS_DIR")
        or os.environ.get("COMPUTE_API_CONTRACTS_DIR")
    )
    if configured:
        return Path(configured)
    return Path(__file__).resolve().parents[3] / "contracts"


def _load_catalog() -> Dict[str, Any]:
    path = _contracts_dir() / "catalogs" / "udm_seed_catalog.v1.json"
    with path.open("r", encoding="utf-8") as handle:
        catalog = json.load(handle)
    if catalog.get("schema_version") != "udm_seed_catalog.v1":
        raise ValueError("UDM seed catalog schema_version must be udm_seed_catalog.v1")
    return catalog


def _template_map() -> Dict[str, Dict[str, Any]]:
    templates = _load_catalog().get("templates", [])
    return {
        template["key"]: template
        for template in templates
        if isinstance(template, dict) and template.get("key")
    }


def list_udm_seed_templates(
    *,
    tags: list[str] | None = None,
    exclude_tags: list[str] | None = None,
) -> List[Dict[str, Any]]:
    summaries = []
    for key, template in _template_map().items():
        template_tags = template.get("tags", [])
        if tags and not all(t in template_tags for t in tags):
            continue
        if exclude_tags and any(t in template_tags for t in exclude_tags):
            continue
        summaries.append(
            {
                "key": key,
                "name": template.get("name"),
                "description": template.get("description"),
                "tags": template_tags,
                "components_count": len(template.get("components", [])),
                "processes_count": len(template.get("processes", [])),
                "parameters_count": len(template.get("parameters", [])),
            }
        )
    return summaries


def get_udm_seed_template(template_key: str) -> Dict[str, Any]:
    templates = _template_map()
    if template_key not in templates:
        raise KeyError(f"Unknown UDM template: {template_key}")
    return copy.deepcopy(templates[template_key])
