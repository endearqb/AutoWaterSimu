from __future__ import annotations

import ast
from dataclasses import dataclass, field
from typing import Any, Dict, Iterable, List, Optional, Set, Tuple


def build_model_key(model_id: str, version: int) -> str:
    return f"{model_id}@{version}"


def build_pair_key(
    source_model_id: str,
    source_version: int,
    target_model_id: str,
    target_version: int,
) -> str:
    return (
        f"{build_model_key(source_model_id, source_version)}->"
        f"{build_model_key(target_model_id, target_version)}"
    )


def _to_int(value: Any) -> Optional[int]:
    try:
        return int(value)
    except Exception:
        return None


def _to_bool(value: Any, default: bool = False) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value != 0
    if isinstance(value, str):
        norm = value.strip().lower()
        if norm in {"1", "true", "yes", "on"}:
            return True
        if norm in {"0", "false", "no", "off"}:
            return False
    return default


def _to_dict(value: Any) -> Dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _to_list(value: Any) -> List[Any]:
    return value if isinstance(value, list) else []


def _normalize_name(value: Any) -> str:
    return str(value or "").strip()


def _extract_identifiers(expr: str) -> Set[str]:
    try:
        tree = ast.parse(expr, mode="eval")
    except Exception:
        return set()

    names: Set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Name):
            names.add(node.id)
    return names


def _extract_component_names(components: Iterable[Any]) -> List[str]:
    names: List[str] = []
    seen: Set[str] = set()
    for component in components:
        if not isinstance(component, dict):
            continue
        name = _normalize_name(component.get("name"))
        if not name or name in seen:
            continue
        seen.add(name)
        names.append(name)
    return names


def _extract_focal_variables(
    *,
    component_names: Set[str],
    processes: Iterable[Any],
) -> Set[str]:
    focal_vars: Set[str] = set()
    for process in processes:
        if not isinstance(process, dict):
            continue
        raw_expr = process.get("rate_expr")
        if raw_expr is None:
            raw_expr = process.get("rateExpr")
        expr = _normalize_name(raw_expr)
        if not expr:
            continue
        identifiers = _extract_identifiers(expr)
        focal_vars.update(name for name in identifiers if name in component_names)
    return focal_vars


def _extract_udm_model_binding(node: Dict[str, Any]) -> Tuple[str, Optional[str], Optional[int]]:
    node_id = _normalize_name(node.get("id"))
    data = _to_dict(node.get("data"))
    udm_model = _to_dict(data.get("udmModel"))

    model_id = _normalize_name(
        node.get("udmModelId")
        or data.get("udmModelId")
        or udm_model.get("id")
        or udm_model.get("modelId")
    )
    raw_version = (
        node.get("udmModelVersion")
        or data.get("udmModelVersion")
        or udm_model.get("version")
        or udm_model.get("currentVersion")
    )
    version = _to_int(raw_version)
    return node_id, (model_id or None), version


def _extract_node_udm_snapshot(node: Dict[str, Any]) -> Dict[str, Any]:
    data = _to_dict(node.get("data"))
    snapshot = _to_dict(data.get("udmModelSnapshot"))
    if snapshot:
        return snapshot

    udm_model = _to_dict(data.get("udmModel"))
    if udm_model:
        compact: Dict[str, Any] = {}
        for key in (
            "id",
            "name",
            "version",
            "hash",
            "components",
            "parameters",
            "processes",
            "meta",
        ):
            if key in udm_model:
                compact[key] = udm_model.get(key)
        if compact:
            return compact

    result: Dict[str, Any] = {}
    if isinstance(data.get("udmComponents"), list):
        result["components"] = data.get("udmComponents")
    if isinstance(data.get("udmProcesses"), list):
        result["processes"] = data.get("udmProcesses")
    if isinstance(data.get("udmParameters"), dict):
        result["parameters"] = data.get("udmParameters")
    if isinstance(data.get("udmParameterValues"), dict):
        result["parameter_values"] = data.get("udmParameterValues")
    return result


def _extract_snapshot_payload(raw_model: Dict[str, Any]) -> Dict[str, Any]:
    snapshot = _to_dict(raw_model.get("snapshot"))
    if snapshot:
        return snapshot

    latest_version = _to_dict(raw_model.get("latest_version"))
    if latest_version:
        merged = dict(latest_version)
        if "version" not in merged:
            merged["version"] = raw_model.get("version")
        if "id" not in merged:
            merged["id"] = raw_model.get("model_id") or raw_model.get("modelId")
        if "name" not in merged:
            merged["name"] = raw_model.get("name")
        return merged

    return raw_model


@dataclass
class HybridModelInfo:
    model_id: str
    version: int
    name: str = ""
    content_hash: str = ""
    components: List[Dict[str, Any]] = field(default_factory=list)
    parameters: List[Dict[str, Any]] = field(default_factory=list)
    processes: List[Dict[str, Any]] = field(default_factory=list)
    meta: Dict[str, Any] = field(default_factory=dict)
    component_names: List[str] = field(default_factory=list)
    focal_vars: Set[str] = field(default_factory=set)

    @property
    def key(self) -> str:
        return build_model_key(self.model_id, self.version)


@dataclass
class HybridRuntimeInfo:
    is_hybrid: bool
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    normalized_hybrid_config: Dict[str, Any] = field(default_factory=dict)
    canonical_components: List[str] = field(default_factory=list)
    node_variable_bindings: Dict[str, List[Dict[str, str]]] = field(default_factory=dict)
    selected_models: Dict[str, HybridModelInfo] = field(default_factory=dict)


def _normalize_model_info(raw_model: Dict[str, Any]) -> Tuple[Optional[HybridModelInfo], Optional[str]]:
    model_id = _normalize_name(raw_model.get("model_id") or raw_model.get("modelId"))
    version = _to_int(raw_model.get("version"))
    if not model_id or version is None:
        return None, "selected_models 包含缺失 model_id/version 的条目"

    payload = _extract_snapshot_payload(raw_model)
    components = _to_list(
        payload.get("components")
        or raw_model.get("components")
    )
    parameters = _to_list(
        payload.get("parameters")
        or raw_model.get("parameters")
    )
    processes = _to_list(
        payload.get("processes")
        or raw_model.get("processes")
    )
    meta = _to_dict(payload.get("meta") or raw_model.get("meta"))

    component_names = _extract_component_names(components)
    focal_vars = _extract_focal_variables(
        component_names=set(component_names),
        processes=processes,
    )

    info = HybridModelInfo(
        model_id=model_id,
        version=version,
        name=_normalize_name(raw_model.get("name")),
        content_hash=_normalize_name(
            raw_model.get("hash")
            or raw_model.get("content_hash")
            or payload.get("hash")
            or payload.get("content_hash")
        ),
        components=[item for item in components if isinstance(item, dict)],
        parameters=[item for item in parameters if isinstance(item, dict)],
        processes=[item for item in processes if isinstance(item, dict)],
        meta=meta,
        component_names=component_names,
        focal_vars=focal_vars,
    )
    return info, None


def _build_default_components_from_models(selected_models: Dict[str, HybridModelInfo]) -> List[str]:
    canonical: List[str] = []
    seen: Set[str] = set()
    for model in selected_models.values():
        for component_name in model.component_names:
            if component_name in seen:
                continue
            seen.add(component_name)
            canonical.append(component_name)
    return canonical


def _normalize_pair_mapping_key(raw_key: str, mapping: Dict[str, Any]) -> Optional[str]:
    source_model_id = _normalize_name(
        mapping.get("source_model_id") or mapping.get("sourceModelId")
    )
    source_version = _to_int(mapping.get("source_version") or mapping.get("sourceVersion"))
    target_model_id = _normalize_name(
        mapping.get("target_model_id") or mapping.get("targetModelId")
    )
    target_version = _to_int(mapping.get("target_version") or mapping.get("targetVersion"))

    if source_model_id and source_version is not None and target_model_id and target_version is not None:
        return build_pair_key(source_model_id, source_version, target_model_id, target_version)

    if raw_key and "->" in raw_key and "@" in raw_key:
        return raw_key
    return None


def _normalize_variable_map_items(raw_items: Iterable[Any]) -> List[Dict[str, Any]]:
    normalized: List[Dict[str, Any]] = []
    for item in raw_items:
        if not isinstance(item, dict):
            continue
        enabled = _to_bool(item.get("enabled"), default=True)
        target_var = _normalize_name(item.get("target_var") or item.get("targetVar"))
        source_var = _normalize_name(item.get("source_var") or item.get("sourceVar"))
        local_exempt = _to_bool(
            item.get("local_exempt")
            if item.get("local_exempt") is not None
            else item.get("localExempt"),
            default=False,
        )
        mode = _normalize_name(item.get("mode"))
        if mode in {"local", "local_exempt", "local-fixed", "local_fixed"}:
            local_exempt = True

        normalized.append(
            {
                "enabled": enabled,
                "target_var": target_var,
                "source_var": source_var,
                "local_exempt": local_exempt,
            }
        )
    return normalized


def _normalize_custom_parameter_names(flowchart_data: Dict[str, Any]) -> List[str]:
    custom_parameters = _to_list(flowchart_data.get("customParameters"))
    names: List[str] = []
    seen: Set[str] = set()
    for item in custom_parameters:
        if not isinstance(item, dict):
            continue
        name = _normalize_name(item.get("name"))
        if not name or name in seen:
            continue
        seen.add(name)
        names.append(name)
    return names


def build_hybrid_runtime_info(
    flowchart_data: Dict[str, Any],
    *,
    strict: bool = False,
) -> HybridRuntimeInfo:
    hybrid_config = _to_dict(
        flowchart_data.get("hybrid_config") or flowchart_data.get("hybridConfig")
    )
    mode = _normalize_name(hybrid_config.get("mode"))
    is_hybrid = mode == "udm_only"
    runtime = HybridRuntimeInfo(is_hybrid=is_hybrid)

    if not hybrid_config:
        return runtime

    if mode and mode != "udm_only":
        runtime.errors.append(f"Unsupported hybrid mode: {mode}")
        if strict:
            raise ValueError("; ".join(runtime.errors))
        return runtime

    raw_selected_models = _to_list(
        hybrid_config.get("selected_models") or hybrid_config.get("selectedModels")
    )
    if is_hybrid and not raw_selected_models:
        runtime.errors.append("hybrid_config.selected_models cannot be empty")

    selected_models: Dict[str, HybridModelInfo] = {}
    for raw in raw_selected_models:
        if not isinstance(raw, dict):
            runtime.errors.append("selected_models contains non-object entry")
            continue
        model_info, error = _normalize_model_info(raw)
        if error:
            runtime.errors.append(error)
            continue
        if model_info is None:
            continue
        selected_models[model_info.key] = model_info

    # Enrich selected model snapshots from UDM nodes if selected model payload lacks details.
    nodes = _to_list(flowchart_data.get("nodes"))
    udm_node_model_by_id: Dict[str, str] = {}
    for node in nodes:
        if not isinstance(node, dict):
            continue
        if _normalize_name(node.get("type")) != "udm":
            continue
        node_id, model_id, version = _extract_udm_model_binding(node)
        if model_id is None or version is None:
            if is_hybrid:
                runtime.errors.append(
                    f"UDM node {node_id or '<unknown>'} missing udmModelId/udmModelVersion"
                )
            continue

        model_key = build_model_key(model_id, version)
        udm_node_model_by_id[node_id] = model_key
        snapshot = _extract_node_udm_snapshot(node)
        if model_key not in selected_models:
            continue

        info = selected_models[model_key]
        if not info.components:
            info.components = [
                item for item in _to_list(snapshot.get("components")) if isinstance(item, dict)
            ]
        if not info.parameters:
            info.parameters = [
                item for item in _to_list(snapshot.get("parameters")) if isinstance(item, dict)
            ]
        if not info.processes:
            info.processes = [
                item for item in _to_list(snapshot.get("processes")) if isinstance(item, dict)
            ]
        if not info.meta:
            info.meta = _to_dict(snapshot.get("meta"))
        if not info.content_hash:
            info.content_hash = _normalize_name(
                snapshot.get("hash") or snapshot.get("content_hash")
            )
        if not info.component_names:
            info.component_names = _extract_component_names(info.components)
        if not info.focal_vars:
            info.focal_vars = _extract_focal_variables(
                component_names=set(info.component_names),
                processes=info.processes,
            )

    if is_hybrid:
        for model_key in udm_node_model_by_id.values():
            if model_key not in selected_models:
                runtime.errors.append(
                    f"UDM node bound model {model_key} is not in hybrid_config.selected_models"
                )

    raw_pair_mappings = _to_dict(
        hybrid_config.get("model_pair_mappings") or hybrid_config.get("modelPairMappings")
    )
    normalized_pair_mappings: Dict[str, Dict[str, Any]] = {}
    compiled_target_binding: Dict[str, Dict[str, Dict[str, Any]]] = {}

    for raw_key, raw_mapping in raw_pair_mappings.items():
        if not isinstance(raw_mapping, dict):
            runtime.errors.append(f"model_pair_mappings[{raw_key}] must be object")
            continue
        pair_key = _normalize_pair_mapping_key(str(raw_key), raw_mapping)
        if not pair_key:
            runtime.errors.append(f"model_pair_mappings[{raw_key}] missing source/target model info")
            continue
        normalized_variable_map = _normalize_variable_map_items(
            _to_list(raw_mapping.get("variable_map") or raw_mapping.get("variableMap"))
        )
        normalized_pair_mappings[pair_key] = {
            "source_model_id": _normalize_name(
                raw_mapping.get("source_model_id") or raw_mapping.get("sourceModelId")
            ),
            "source_version": _to_int(
                raw_mapping.get("source_version") or raw_mapping.get("sourceVersion")
            ),
            "target_model_id": _normalize_name(
                raw_mapping.get("target_model_id") or raw_mapping.get("targetModelId")
            ),
            "target_version": _to_int(
                raw_mapping.get("target_version") or raw_mapping.get("targetVersion")
            ),
            "variable_map": normalized_variable_map,
        }

        target_map: Dict[str, Dict[str, Any]] = {}
        for item in normalized_variable_map:
            if not item["enabled"]:
                continue
            target_var = item["target_var"]
            if not target_var:
                runtime.errors.append(f"{pair_key}: variable_map contains empty target_var")
                continue
            if target_var in target_map:
                previous = target_map[target_var]
                if previous.get("source_var") != item.get("source_var") or previous.get(
                    "local_exempt"
                ) != item.get("local_exempt"):
                    runtime.errors.append(
                        f"{pair_key}: duplicated mapping for target_var={target_var}"
                    )
                continue
            target_map[target_var] = item
        compiled_target_binding[pair_key] = target_map

    # Validate mapping variable existence.
    for pair_key, pair_payload in normalized_pair_mappings.items():
        source_model_id = _normalize_name(pair_payload.get("source_model_id"))
        source_version = _to_int(pair_payload.get("source_version"))
        target_model_id = _normalize_name(pair_payload.get("target_model_id"))
        target_version = _to_int(pair_payload.get("target_version"))

        if (
            not source_model_id
            or source_version is None
            or not target_model_id
            or target_version is None
        ):
            # key-level validation already reported; skip cascading errors.
            continue

        source_key = build_model_key(source_model_id, source_version)
        target_key = build_model_key(target_model_id, target_version)
        source_model = selected_models.get(source_key)
        target_model = selected_models.get(target_key)
        if source_model is None:
            runtime.errors.append(f"{pair_key}: source model {source_key} not found in selected_models")
            continue
        if target_model is None:
            runtime.errors.append(f"{pair_key}: target model {target_key} not found in selected_models")
            continue

        source_components = set(source_model.component_names)
        target_components = set(target_model.component_names)
        for item in compiled_target_binding.get(pair_key, {}).values():
            target_var = item.get("target_var") or ""
            source_var = item.get("source_var") or ""
            local_exempt = bool(item.get("local_exempt"))

            if target_var and target_var not in target_components:
                runtime.errors.append(f"{pair_key}: target_var {target_var} not found in target model")
            if not local_exempt:
                if not source_var:
                    runtime.errors.append(
                        f"{pair_key}: target_var {target_var} requires source_var or local_exempt=true"
                    )
                elif source_var not in source_components:
                    runtime.errors.append(
                        f"{pair_key}: source_var {source_var} not found in source model"
                    )

    # Build graph-required model pairs.
    required_pairs: Set[str] = set()
    for edge in _to_list(flowchart_data.get("edges")):
        if not isinstance(edge, dict):
            continue
        source_node_id = _normalize_name(edge.get("source"))
        target_node_id = _normalize_name(edge.get("target"))
        source_model_key = udm_node_model_by_id.get(source_node_id)
        target_model_key = udm_node_model_by_id.get(target_node_id)
        if not source_model_key or not target_model_key:
            continue
        if source_model_key == target_model_key:
            continue
        required_pairs.add(f"{source_model_key}->{target_model_key}")

    # Validate required pair coverage and focal variable coverage.
    for pair_key in required_pairs:
        if pair_key not in compiled_target_binding:
            runtime.errors.append(f"Missing model_pair_mapping for graph edge pair {pair_key}")
            continue

        source_key, target_key = pair_key.split("->", 1)
        target_model = selected_models.get(target_key)
        if target_model is None:
            continue
        target_focal_vars = set(target_model.focal_vars)
        if not target_focal_vars:
            continue
        covered_targets = set(compiled_target_binding[pair_key].keys())
        missing_targets = sorted(target_focal_vars - covered_targets)
        for target_var in missing_targets:
            runtime.errors.append(
                f"{pair_key}: focal variable {target_var} is not mapped and not exempted"
            )

    # Compile node-level local->canonical bindings.
    node_bindings: Dict[str, List[Dict[str, str]]] = {}
    incoming_pairs_by_target_node: Dict[str, Set[str]] = {}
    for edge in _to_list(flowchart_data.get("edges")):
        if not isinstance(edge, dict):
            continue
        source_node_id = _normalize_name(edge.get("source"))
        target_node_id = _normalize_name(edge.get("target"))
        source_model_key = udm_node_model_by_id.get(source_node_id)
        target_model_key = udm_node_model_by_id.get(target_node_id)
        if not source_model_key or not target_model_key:
            continue
        if source_model_key == target_model_key:
            continue
        incoming_pairs_by_target_node.setdefault(target_node_id, set()).add(
            f"{source_model_key}->{target_model_key}"
        )

    for node in nodes:
        if not isinstance(node, dict):
            continue
        if _normalize_name(node.get("type")) != "udm":
            continue
        node_id = _normalize_name(node.get("id"))
        model_key = udm_node_model_by_id.get(node_id)
        if not model_key:
            continue
        model_info = selected_models.get(model_key)
        if model_info is None:
            continue

        local_to_canonical: Dict[str, str] = {
            component_name: component_name for component_name in model_info.component_names
        }
        for pair_key in incoming_pairs_by_target_node.get(node_id, set()):
            item_map = compiled_target_binding.get(pair_key, {})
            for target_var, item in item_map.items():
                if target_var not in local_to_canonical:
                    continue
                canonical_var = target_var if item.get("local_exempt") else item.get("source_var")
                canonical_var = _normalize_name(canonical_var)
                if not canonical_var:
                    continue
                prev = local_to_canonical.get(target_var)
                if prev and prev != canonical_var and prev != target_var:
                    runtime.errors.append(
                        f"{pair_key}: node {node_id} target_var {target_var} has conflicting canonical source ({prev} vs {canonical_var})"
                    )
                    continue
                local_to_canonical[target_var] = canonical_var

        node_bindings[node_id] = [
            {"local_var": local_var, "canonical_var": canonical_var}
            for local_var, canonical_var in local_to_canonical.items()
        ]

    canonical_components = _normalize_custom_parameter_names(flowchart_data)
    seen_canonical = set(canonical_components)

    for component_name in _build_default_components_from_models(selected_models):
        if component_name in seen_canonical:
            continue
        seen_canonical.add(component_name)
        canonical_components.append(component_name)

    for bindings in node_bindings.values():
        for binding in bindings:
            canonical_var = _normalize_name(binding.get("canonical_var"))
            if not canonical_var or canonical_var in seen_canonical:
                continue
            seen_canonical.add(canonical_var)
            canonical_components.append(canonical_var)

    normalized_selected_models = []
    for model in selected_models.values():
        normalized_selected_models.append(
            {
                "model_id": model.model_id,
                "version": model.version,
                "name": model.name,
                "hash": model.content_hash,
                "components": model.components,
                "parameters": model.parameters,
                "processes": model.processes,
                "meta": model.meta,
            }
        )

    runtime.selected_models = selected_models
    runtime.normalized_hybrid_config = {
        "mode": "udm_only" if is_hybrid else mode,
        "selected_models": normalized_selected_models,
        "model_pair_mappings": normalized_pair_mappings,
    }
    runtime.canonical_components = canonical_components
    runtime.node_variable_bindings = node_bindings

    if strict and runtime.errors:
        raise ValueError("; ".join(runtime.errors))
    return runtime


def validate_hybrid_flowchart(flowchart_data: Dict[str, Any]) -> Dict[str, Any]:
    runtime = build_hybrid_runtime_info(flowchart_data, strict=False)
    details = {
        "is_hybrid": runtime.is_hybrid,
        "selected_model_count": len(runtime.selected_models),
        "canonical_component_count": len(runtime.canonical_components),
        "node_binding_count": len(runtime.node_variable_bindings),
    }
    return {
        "is_valid": len(runtime.errors) == 0,
        "errors": runtime.errors,
        "warnings": runtime.warnings,
        "details": details,
        "normalized_hybrid_config": runtime.normalized_hybrid_config,
    }
