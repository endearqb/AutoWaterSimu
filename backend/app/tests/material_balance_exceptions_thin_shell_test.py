from app.material_balance import exceptions as backend_exceptions
from autowatersimu_simulation_core.material_balance import exceptions as core_exceptions


def test_backend_material_balance_exceptions_are_core_reexports() -> None:
    for name in (
        "MaterialBalanceError",
        "InvalidInputError",
        "CalculationError",
        "ConvergenceError",
        "DimensionMismatchError",
        "NegativeVolumeError",
    ):
        assert getattr(backend_exceptions, name) is getattr(core_exceptions, name)
