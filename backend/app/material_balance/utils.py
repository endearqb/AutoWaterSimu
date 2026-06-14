"""Compatibility re-export for material balance utility helpers.

The implementation lives in ``autowatersimu_simulation_core``. Keep this
legacy backend import path stable while the broader backend material_balance
thin-shell migration proceeds leaf by leaf.
"""

from autowatersimu_simulation_core.material_balance.utils import (
    convert_flowchart_json_to_input,
    convert_result_to_json,
    create_example_input,
    estimate_memory_usage,
    paginate_timeseries_data,
    validate_calculation_parameters,
    validate_tensor_dimensions,
)

__all__ = [
    "convert_flowchart_json_to_input",
    "convert_result_to_json",
    "create_example_input",
    "estimate_memory_usage",
    "paginate_timeseries_data",
    "validate_calculation_parameters",
    "validate_tensor_dimensions",
]
