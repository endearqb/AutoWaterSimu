from app.material_balance import utils as backend_utils
from autowatersimu_simulation_core.material_balance import utils as core_utils


def test_backend_material_balance_utils_are_core_reexports() -> None:
    for name in (
        "validate_tensor_dimensions",
        "convert_flowchart_json_to_input",
        "convert_result_to_json",
        "paginate_timeseries_data",
        "validate_calculation_parameters",
        "estimate_memory_usage",
        "create_example_input",
    ):
        assert getattr(backend_utils, name) is getattr(core_utils, name)
