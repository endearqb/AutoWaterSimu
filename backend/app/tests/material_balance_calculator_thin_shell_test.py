from app.material_balance.core import (
    MaterialBalanceCalculator as BackendMaterialBalanceCalculator,
)
from autowatersimu_simulation_core.material_balance.core import (
    MaterialBalanceCalculator as CoreMaterialBalanceCalculator,
)


def test_backend_material_balance_calculator_is_core_calculator() -> None:
    assert BackendMaterialBalanceCalculator is CoreMaterialBalanceCalculator
