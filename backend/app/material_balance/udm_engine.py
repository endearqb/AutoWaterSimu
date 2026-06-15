"""Compatibility re-export for UDM runtime helpers.

The implementation lives in ``autowatersimu_simulation_core``. Keep this
module as the legacy backend import path only.
"""

from autowatersimu_simulation_core.material_balance.udm_engine import (
    UDMNodeRuntime,
    _build_fixed_component_mask,
    _extract_fixed_component_names,
    _normalize_global_component_names,
    _normalize_local_component_names,
    _normalize_parameter_values,
    _normalize_variable_binding_map,
    _resolve_local_to_global_indices,
    _to_bool,
    _validate_process_component_targets,
    build_udm_runtime_payload,
)

__all__ = [
    "UDMNodeRuntime",
    "_build_fixed_component_mask",
    "_extract_fixed_component_names",
    "_normalize_global_component_names",
    "_normalize_local_component_names",
    "_normalize_parameter_values",
    "_normalize_variable_binding_map",
    "_resolve_local_to_global_indices",
    "_to_bool",
    "_validate_process_component_targets",
    "build_udm_runtime_payload",
]
