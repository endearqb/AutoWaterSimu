from app.material_balance import udm_engine as backend_udm_engine
from app.material_balance import udm_ode as backend_udm_ode
from app.material_balance.asm import asm1 as backend_asm1
from app.material_balance.asm import asm1slim as backend_asm1slim
from app.material_balance.asm import asm2d as backend_asm2d
from app.material_balance.asm import asm3 as backend_asm3
from app.material_balance.asm import common as backend_asm_common
from autowatersimu_simulation_core.material_balance import udm_engine as core_udm_engine
from autowatersimu_simulation_core.material_balance import udm_ode as core_udm_ode
from autowatersimu_simulation_core.material_balance.asm import asm1 as core_asm1
from autowatersimu_simulation_core.material_balance.asm import asm1slim as core_asm1slim
from autowatersimu_simulation_core.material_balance.asm import asm2d as core_asm2d
from autowatersimu_simulation_core.material_balance.asm import asm3 as core_asm3
from autowatersimu_simulation_core.material_balance.asm import common as core_asm_common


def test_backend_material_balance_udm_helpers_are_core_reexports() -> None:
    assert backend_udm_engine.UDMNodeRuntime is core_udm_engine.UDMNodeRuntime
    assert backend_udm_engine.build_udm_runtime_payload is core_udm_engine.build_udm_runtime_payload
    assert backend_udm_ode.UDMNodeRuntime is core_udm_engine.UDMNodeRuntime
    assert backend_udm_ode.udm_ode_balance is core_udm_ode.udm_ode_balance


def test_backend_material_balance_asm_helpers_are_core_reexports() -> None:
    assert backend_asm_common.safe_div is core_asm_common.safe_div
    assert backend_asm_common.monod is core_asm_common.monod
    assert backend_asm_common.inhibition is core_asm_common.inhibition
    assert backend_asm1slim.reaction is core_asm1slim.reaction
    assert backend_asm1.reaction is core_asm1.reaction
    assert backend_asm2d.rates is core_asm2d.rates
    assert backend_asm2d.dC_dt is core_asm2d.dC_dt
    assert backend_asm3.reaction is core_asm3.reaction
