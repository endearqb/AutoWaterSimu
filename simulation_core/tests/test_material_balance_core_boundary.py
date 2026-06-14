from __future__ import annotations

import json
import os
import subprocess
import sys
from copy import deepcopy
from pathlib import Path
from typing import Any

import pytest
import torch
from pydantic import ValidationError

REPO_ROOT = Path(__file__).resolve().parents[2]
SIMULATION_CORE_PYTHON = REPO_ROOT / "simulation_core" / "python"
VALID_SIMULATION_INPUT = (
    REPO_ROOT
    / "contracts"
    / "examples"
    / "valid"
    / "material_balance_minimal.simulation_input.v1.json"
)

sys.path.insert(0, str(SIMULATION_CORE_PYTHON))

from autowatersimu_simulation_core.adapters import (  # noqa: E402
    SimulationCoreAdapterError,
    simulation_input_to_material_balance_input,
)
from autowatersimu_simulation_core.material_balance.models import (  # noqa: E402
    CalculationParameters,
    EdgeData,
    MaterialBalanceInput,
    NodeData,
)
from autowatersimu_simulation_core.material_balance import (  # noqa: E402
    MaterialBalanceCalculator,
)
from autowatersimu_simulation_core.material_balance import core as core_module  # noqa: E402
from autowatersimu_simulation_core.material_balance.udm_engine import (  # noqa: E402
    build_udm_runtime_payload,
)
from autowatersimu_simulation_core.material_balance.udm_expression import (  # noqa: E402
    compile_expression,
)
from autowatersimu_simulation_core.material_balance.udm_ode import udm_ode_balance  # noqa: E402


def _load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _minimal_simulation_input() -> dict[str, Any]:
    return _load_json(VALID_SIMULATION_INPUT)


def _simulation_input_with_unknown_fields() -> dict[str, Any]:
    simulation_input = deepcopy(_minimal_simulation_input())
    simulation_input["unknown_top_level_for_test"] = {"ignored": True}
    simulation_input["nodes"][0]["unknown_node_field_for_test"] = "node-extra"
    simulation_input["edges"][0]["unknown_edge_field_for_test"] = "edge-extra"
    return simulation_input


def _run_hours_base_kwargs(calculator: MaterialBalanceCalculator) -> dict[str, Any]:
    device = calculator.device
    dtype = calculator.dtype
    return {
        "hours": 1.0,
        "x0": torch.tensor([[[1.0, 2.0]]], dtype=dtype, device=device),
        "Q_out": torch.zeros(1, 1, dtype=dtype, device=device),
        "m": 1,
        "steps": 1,
        "prop_a": torch.ones(1, 1, 1, dtype=dtype, device=device),
        "prop_b": torch.zeros(1, 1, 1, dtype=dtype, device=device),
        "method": "rk4",
        "tolerance": 1e-3,
        "compute_mask": torch.tensor([True], dtype=torch.bool, device=device),
    }


def _run_hours_model_kwargs(
    calculator: MaterialBalanceCalculator,
    enabled_branches: list[str],
) -> dict[str, Any]:
    device = calculator.device
    dtype = calculator.dtype
    kwargs: dict[str, Any] = {}
    if "asm1slim" in enabled_branches:
        kwargs["asm1slim_params"] = torch.ones(1, 7, dtype=dtype, device=device)
        kwargs["asm1slim_mask"] = torch.tensor([True], dtype=torch.bool, device=device)
    if "asm1" in enabled_branches:
        kwargs["asm1_params"] = torch.ones(1, 19, dtype=dtype, device=device)
        kwargs["asm1_mask"] = torch.tensor([True], dtype=torch.bool, device=device)
    if "asm3" in enabled_branches:
        kwargs["asm3_params"] = torch.ones(1, 37, dtype=dtype, device=device)
        kwargs["asm3_mask"] = torch.tensor([True], dtype=torch.bool, device=device)
    if "udm" in enabled_branches:
        kwargs["udm_mask"] = torch.tensor([True], dtype=torch.bool, device=device)
        kwargs["udm_runtime_payload"] = [object()]
    return kwargs


ASM1_COMPONENTS = [
    "X_BH",
    "X_BA",
    "X_S",
    "X_i",
    "X_ND",
    "S_O",
    "S_S",
    "S_NO",
    "S_NH",
    "S_ND",
    "S_ALK",
]

ASM1_PARAMS_19 = [
    4.0,
    10.0,
    0.2,
    0.5,
    0.8,
    0.3,
    0.5,
    1.0,
    0.4,
    0.05,
    0.67,
    0.24,
    0.08,
    0.06,
    0.08,
    0.4,
    0.05,
    3.0,
    0.03,
]


def _component_vector(**named: float) -> list[float]:
    vector = [0.0] * len(ASM1_COMPONENTS)
    for name, value in named.items():
        vector[ASM1_COMPONENTS.index(name)] = float(value)
    return vector


def _flowchart_meta() -> dict[str, Any]:
    return {"customParameters": [{"name": name} for name in ASM1_COMPONENTS]}


def _mixed_asm_udm_input() -> MaterialBalanceInput:
    return MaterialBalanceInput(
        nodes=[
            NodeData(
                node_id="in",
                node_type="input",
                is_inlet=True,
                initial_volume=1.0,
                initial_concentrations=_component_vector(
                    S_S=50.0,
                    S_NH=10.0,
                    X_BH=100.0,
                    S_O=2.0,
                    S_ALK=5.0,
                ),
            ),
            NodeData(
                node_id="udm1",
                node_type="udm",
                initial_volume=1000.0,
                initial_concentrations=_component_vector(S_S=50.0, S_NH=10.0),
                udm_component_names=["S_S", "S_NH"],
                udm_processes=[
                    {
                        "name": "decay",
                        "rate_expr": "k * S_S",
                        "stoich": {"S_S": -1.0},
                    }
                ],
                udm_parameter_values={"k": 0.5},
            ),
            NodeData(
                node_id="asm1",
                node_type="asm1",
                initial_volume=1000.0,
                initial_concentrations=_component_vector(
                    X_BH=100.0,
                    S_S=50.0,
                    S_O=2.0,
                    S_NH=10.0,
                    S_ALK=5.0,
                ),
                asm1_parameters=ASM1_PARAMS_19,
            ),
            NodeData(
                node_id="out",
                node_type="output",
                is_outlet=True,
                initial_volume=1.0,
                initial_concentrations=_component_vector(),
            ),
        ],
        edges=[
            EdgeData(edge_id="e1", source_node_id="in", target_node_id="udm1", flow_rate=100.0),
            EdgeData(edge_id="e2", source_node_id="in", target_node_id="asm1", flow_rate=100.0),
            EdgeData(edge_id="e3", source_node_id="udm1", target_node_id="out", flow_rate=100.0),
            EdgeData(edge_id="e4", source_node_id="asm1", target_node_id="out", flow_rate=100.0),
        ],
        parameters=CalculationParameters(
            hours=2.0,
            steps_per_hour=10,
            solver_method="rk4",
            tolerance=1e-6,
        ),
        original_flowchart_data=_flowchart_meta(),
    )


def _solo_udm_input() -> MaterialBalanceInput:
    data = _mixed_asm_udm_input()
    return MaterialBalanceInput(
        nodes=[data.nodes[0], data.nodes[1], data.nodes[3]],
        edges=[
            EdgeData(edge_id="e1", source_node_id="in", target_node_id="udm1", flow_rate=100.0),
            EdgeData(edge_id="e3", source_node_id="udm1", target_node_id="out", flow_rate=100.0),
        ],
        parameters=data.parameters,
        original_flowchart_data=data.original_flowchart_data,
    )


def _install_odeint_branch_spy(monkeypatch: pytest.MonkeyPatch) -> list[str]:
    selected_branches: list[str] = []

    def fake_odeint(ode_func: Any, x0: torch.Tensor, t0: torch.Tensor, **_: Any) -> torch.Tensor:
        target = getattr(ode_func, "func", ode_func)
        selected_branches.append(getattr(target, "__name__", repr(target)))
        return torch.full(
            (len(t0),) + tuple(x0.shape),
            -1.0,
            dtype=x0.dtype,
            device=x0.device,
        )

    monkeypatch.setattr(core_module, "odeint", fake_odeint)
    return selected_branches


def _udm_binding_node() -> NodeData:
    return NodeData(
        node_id="node_1",
        node_type="udm",
        initial_volume=1.0,
        initial_concentrations=[10.0, 2.0],
        is_inlet=False,
        is_outlet=False,
        udm_component_names=["S", "P"],
        udm_processes=[
            {
                "name": "growth",
                "rate_expr": "k * S",
                "stoich": {"S": -1.0, "P": 1.0},
            }
        ],
        udm_parameter_values={"k": 0.05},
        udm_variable_bindings=[
            {"local_var": "S", "canonical_var": "A"},
            {"local_var": "P", "canonical_var": "B"},
        ],
        udm_model_snapshot={
            "components": [
                {"name": "S", "is_fixed": False},
                {"name": "P", "is_fixed": True},
            ]
        },
    )


def test_simulation_core_import_boundary_uses_core_python_only() -> None:
    env = os.environ.copy()
    env["PYTHONPATH"] = str(SIMULATION_CORE_PYTHON)
    completed = subprocess.run(
        [
            sys.executable,
            "-c",
            (
                "import autowatersimu_simulation_core; "
                "from autowatersimu_simulation_core.material_balance import MaterialBalanceCalculator; "
                "print(MaterialBalanceCalculator.__name__)"
            ),
        ],
        cwd=REPO_ROOT,
        env=env,
        capture_output=True,
        text=True,
        check=False,
    )

    assert completed.returncode == 0, completed.stderr
    assert completed.stdout.strip() == "MaterialBalanceCalculator"


def test_core_adapter_preserves_component_order_defaults_and_time_segments() -> None:
    simulation_input = _minimal_simulation_input()
    simulation_input["component_schema"]["components"] = ["COD", "NH3"]
    simulation_input["nodes"][0]["initial_concentrations"] = {"NH3": 2.0, "COD": 1.0}
    simulation_input["edges"][0]["concentration_transform"] = {"COD": {"a": 2.0, "b": ""}}
    simulation_input["time_segments"] = [
        {
            "id": "seg_1",
            "start_hour": 0.0,
            "end_hour": 2.0,
            "edge_overrides": {
                "e_in_tank": {
                    "flow": 80.0,
                    "factors": {"COD": {"a": 0.8, "b": 0.1}},
                }
            },
        },
        {"id": "seg_2", "start_hour": 2.0, "end_hour": 4.0, "edge_overrides": {}},
    ]

    adapted = simulation_input_to_material_balance_input(simulation_input)

    assert adapted.nodes[0].initial_concentrations == [1.0, 2.0]
    assert adapted.edges[0].concentration_factor_a == [2.0, 1.0]
    assert adapted.edges[0].concentration_factor_b == [0.0, 0.0]
    assert [segment.id for segment in adapted.time_segments] == ["seg_1", "seg_2"]
    assert adapted.time_segments[0].edge_overrides["e_in_tank"].flow == 80.0
    assert adapted.time_segments[0].edge_overrides["e_in_tank"].factors["COD"].a == 0.8


def test_udm_expression_compile_uses_lru_cache_for_repeated_expressions() -> None:
    compile_expression.cache_clear()

    first = compile_expression("k * S")
    second = compile_expression("k * S")
    other = compile_expression("k + S")

    assert first is second
    assert first is not other
    assert first({"k": 0.05, "S": torch.tensor(10.0)}).item() == pytest.approx(0.5)


def test_udm_runtime_precomputes_indices_and_fixed_component_metadata() -> None:
    runtimes = build_udm_runtime_payload(
        nodes=[_udm_binding_node()],
        global_component_names=["A", "B"],
        device=torch.device("cpu"),
        dtype=torch.float32,
    )

    assert len(runtimes) == 1
    runtime = runtimes[0]
    assert runtime.local_to_global_index_values == [0, 1]
    assert runtime.component_index_pairs == [("S", 0), ("P", 1)]
    assert runtime.has_fixed_components is True
    assert runtime.fixed_component_indices.tolist() == [1]

    reaction = runtime.evaluate_reaction(torch.tensor([10.0, 2.0], dtype=torch.float32))
    assert reaction.tolist() == pytest.approx([-0.5, 0.5])


def test_udm_ode_balance_uses_precomputed_active_indices_and_fixed_components() -> None:
    runtime = build_udm_runtime_payload(
        nodes=[_udm_binding_node()],
        global_component_names=["A", "B"],
        device=torch.device("cpu"),
        dtype=torch.float32,
    )[0]
    y_extended = torch.tensor([[10.0, 2.0, 1.0]], dtype=torch.float32)
    q_out = torch.zeros(1, 1, dtype=torch.float32)
    prop_a = torch.ones(1, 1, 2, dtype=torch.float32)
    prop_b = torch.zeros(1, 1, 2, dtype=torch.float32)
    compute_mask = torch.tensor([True], dtype=torch.bool)
    udm_mask = torch.tensor([True], dtype=torch.bool)

    def zero_balance(
        y: torch.Tensor,
        _q_out: torch.Tensor,
        _prop_a: torch.Tensor,
        _prop_b: torch.Tensor,
    ) -> tuple[torch.Tensor, torch.Tensor]:
        return torch.zeros_like(y), torch.zeros(y.shape[0], dtype=y.dtype, device=y.device)

    derivative = udm_ode_balance(
        0.0,
        y_extended,
        1,
        prop_a,
        prop_b,
        q_out,
        compute_mask,
        udm_mask,
        [runtime],
        udm_active_node_indices={0},
        balance_param=zero_balance,
        balance_param_sparse=lambda y, _sparse: (
            torch.zeros_like(y),
            torch.zeros(y.shape[0], dtype=y.dtype, device=y.device),
        ),
    )
    inactive_derivative = udm_ode_balance(
        0.0,
        y_extended,
        1,
        prop_a,
        prop_b,
        q_out,
        compute_mask,
        udm_mask,
        [runtime],
        udm_active_node_indices=set(),
        balance_param=zero_balance,
        balance_param_sparse=lambda y, _sparse: (
            torch.zeros_like(y),
            torch.zeros(y.shape[0], dtype=y.dtype, device=y.device),
        ),
    )

    assert derivative[0, 0].item() == pytest.approx(-0.5)
    assert derivative[0, 1].item() == pytest.approx(0.0)
    assert derivative[0, 2].item() == pytest.approx(0.0)
    assert torch.all(inactive_derivative == 0)


def test_default_segment_reuses_precomputed_runtime_edge_tensors() -> None:
    calculator = MaterialBalanceCalculator()
    input_data = simulation_input_to_material_balance_input(_minimal_simulation_input())
    tensors = calculator._convert_to_tensors(input_data)
    segment = calculator._prepare_segments(input_data, input_data.parameters.hours)[0]
    parameter_names = calculator._resolve_parameter_names(
        input_data,
        len(input_data.nodes[0].initial_concentrations),
    )

    q_vals, a_edge, b_edge = calculator._resolve_segment_edge_values(
        input_data,
        segment,
        tensors["sparse_bundle"],
        parameter_names,
    )
    q_out, prop_a, prop_b, runtime_sparse_bundle = calculator._build_runtime_edge_tensors(
        tensors=tensors,
        q_vals=q_vals,
        a_edge=a_edge,
        b_edge=b_edge,
    )

    assert q_vals is tensors["sparse_bundle"]["q"]
    assert a_edge is tensors["sparse_bundle"]["a"]
    assert b_edge is tensors["sparse_bundle"]["b"]
    assert q_out is tensors["Q_out"]
    assert prop_a is tensors["prop_a"]
    assert prop_b is tensors["prop_b"]
    assert runtime_sparse_bundle is tensors["sparse_bundle"]


def test_segment_override_clones_edge_tensors_without_mutating_precomputed_bundle() -> None:
    calculator = MaterialBalanceCalculator()
    input_data = simulation_input_to_material_balance_input(_minimal_simulation_input())
    tensors = calculator._convert_to_tensors(input_data)
    segment = {
        "id": "override",
        "start_hour": 0.0,
        "end_hour": input_data.parameters.hours,
        "edge_overrides": {
            input_data.edges[0].edge_id: {
                "flow": 80.0,
                "factors": {"COD": {"a": 0.8, "b": 0.1}},
            }
        },
    }
    parameter_names = calculator._resolve_parameter_names(
        input_data,
        len(input_data.nodes[0].initial_concentrations),
    )
    base_q = tensors["sparse_bundle"]["q"].clone()
    base_a = tensors["sparse_bundle"]["a"].clone()
    base_b = tensors["sparse_bundle"]["b"].clone()

    q_vals, a_edge, b_edge = calculator._resolve_segment_edge_values(
        input_data,
        segment,
        tensors["sparse_bundle"],
        parameter_names,
    )
    q_out, prop_a, prop_b, runtime_sparse_bundle = calculator._build_runtime_edge_tensors(
        tensors=tensors,
        q_vals=q_vals,
        a_edge=a_edge,
        b_edge=b_edge,
    )

    assert q_vals is not tensors["sparse_bundle"]["q"]
    assert a_edge is not tensors["sparse_bundle"]["a"]
    assert b_edge is not tensors["sparse_bundle"]["b"]
    assert q_vals[0].item() == pytest.approx(80.0)
    assert a_edge[0, 0].item() == pytest.approx(0.8)
    assert b_edge[0, 0].item() == pytest.approx(0.1)
    assert torch.equal(tensors["sparse_bundle"]["q"], base_q)
    assert torch.equal(tensors["sparse_bundle"]["a"], base_a)
    assert torch.equal(tensors["sparse_bundle"]["b"], base_b)
    assert q_out is not tensors["Q_out"]
    assert prop_a is not tensors["prop_a"]
    assert prop_b is not tensors["prop_b"]
    assert runtime_sparse_bundle is not tensors["sparse_bundle"]


def test_dense_transport_merges_parallel_edges_with_sparse_semantics() -> None:
    calculator = MaterialBalanceCalculator()
    calculator.device = torch.device("cpu")
    calculator.dtype = torch.float64
    device = calculator.device
    dtype = calculator.dtype
    src = torch.tensor([0, 0], dtype=torch.long, device=device)
    dst = torch.tensor([1, 1], dtype=torch.long, device=device)
    q_vals = torch.tensor([1.0, 3.0], dtype=dtype, device=device)
    a_edge = torch.tensor([[2.0], [4.0]], dtype=dtype, device=device)
    b_edge = torch.tensor([[1.0], [2.0]], dtype=dtype, device=device)
    concentrations = torch.tensor([[10.0], [0.0]], dtype=dtype, device=device)
    sparse_bundle = {
        "src": src,
        "dst": dst,
        "q": q_vals,
        "a": a_edge,
        "b": b_edge,
        "shape": (2, 2),
    }

    q_out, prop_a, prop_b = calculator._build_dense_transport_tensors(
        src=src,
        dst=dst,
        q_vals=q_vals,
        a_edge=a_edge,
        b_edge=b_edge,
        shape=(2, 2),
        n_components=1,
    )
    dense_delta_m, dense_delta_q, *_ = calculator._balance_param(
        concentrations,
        q_out,
        prop_a,
        prop_b,
    )
    sparse_delta_m, sparse_delta_q = calculator._balance_param_sparse(
        concentrations,
        sparse_bundle,
    )

    assert q_out[0, 1].item() == pytest.approx(4.0)
    assert prop_a[0, 1, 0].item() == pytest.approx(3.5)
    assert prop_b[0, 1, 0].item() == pytest.approx(1.75)
    assert torch.allclose(dense_delta_m, sparse_delta_m, atol=1e-12, rtol=0)
    assert torch.allclose(dense_delta_q, sparse_delta_q, atol=1e-12, rtol=0)


def test_balance_param_rejects_non_square_dense_matrix_explicitly() -> None:
    calculator = MaterialBalanceCalculator()
    calculator.device = torch.device("cpu")
    calculator.dtype = torch.float64
    concentrations = torch.tensor([[1.0], [2.0]], dtype=torch.float64)
    q_out = torch.zeros((2, 3), dtype=torch.float64)
    prop_a = torch.ones((2, 3, 1), dtype=torch.float64)
    prop_b = torch.zeros((2, 3, 1), dtype=torch.float64)

    with pytest.raises(ValueError, match="requires square Q_out"):
        calculator._balance_param(concentrations, q_out, prop_a, prop_b)


def test_generate_segment_timestamps_constructs_sampling_grid_on_cpu(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calculator = MaterialBalanceCalculator()
    calculator.device = torch.device("cuda")
    linspace_devices: list[str] = []
    arange_devices: list[str] = []
    original_linspace = torch.linspace
    original_arange = torch.arange

    def linspace_spy(*args: Any, **kwargs: Any) -> torch.Tensor:
        linspace_devices.append(str(kwargs.get("device")))
        return original_linspace(*args, **kwargs)

    def arange_spy(*args: Any, **kwargs: Any) -> torch.Tensor:
        arange_devices.append(str(kwargs.get("device")))
        return original_arange(*args, **kwargs)

    monkeypatch.setattr(core_module.torch, "linspace", linspace_spy)
    monkeypatch.setattr(core_module.torch, "arange", arange_spy)

    timestamps = calculator._generate_segment_timestamps(
        hours=1.0,
        steps_per_hour=4,
        sampling_interval_hours=0.5,
    )

    assert timestamps == pytest.approx([0.0, 0.5, 1.0])
    assert linspace_devices == ["cpu"]
    assert arange_devices == ["cpu"]


def test_core_adapter_wraps_invalid_parameters_as_contract_style_error() -> None:
    simulation_input = _minimal_simulation_input()
    simulation_input["parameters"]["tolerance"] = 0.1

    with pytest.raises(SimulationCoreAdapterError) as exc_info:
        simulation_input_to_material_balance_input(simulation_input)

    assert str(exc_info.value) == "simulation_input adapter validation failed"
    assert any("tolerance" in item["path"] for item in exc_info.value.details)
    assert exc_info.value.to_contract_error()["error_code"] == "VALIDATION_FAILED"


def test_core_adapter_preserves_model_runtime_bindings() -> None:
    simulation_input = deepcopy(_minimal_simulation_input())
    reactor = simulation_input["nodes"][1]
    reactor["node_type"] = "asm1slim"
    reactor["asm1slim_parameters"] = [0.12, 0.08, 2.5, 10.0, 0.5, 0.8, 0.4]
    reactor["udm_model_id"] = "udm_model_a"
    reactor["udm_model_version"] = "2"
    reactor["udm_model_hash"] = "sha256:" + ("a" * 64)
    reactor["udm_component_names"] = ["A", "B"]
    reactor["udm_processes"] = [{"id": "p1", "rate_expr": "k * A", "stoich": {"A": -1}}]
    reactor["udm_parameter_values"] = {"k": "0.1"}
    reactor["udm_model_snapshot"] = {"id": "udm_model_a", "version": 2}
    reactor["udm_variable_bindings"] = [{"local_var": "A_local", "canonical_var": "A"}]

    adapted = simulation_input_to_material_balance_input(simulation_input)
    adapted_node = adapted.nodes[1]

    assert adapted_node.asm1slim_parameters == [0.12, 0.08, 2.5, 10.0, 0.5, 0.8, 0.4]
    assert adapted_node.udm_model_id == "udm_model_a"
    assert adapted_node.udm_model_version == 2
    assert adapted_node.udm_model_hash == "sha256:" + ("a" * 64)
    assert adapted_node.udm_component_names == ["A", "B"]
    assert adapted_node.udm_processes == [{"id": "p1", "rate_expr": "k * A", "stoich": {"A": -1}}]
    assert adapted_node.udm_parameter_values == {"k": 0.1}
    assert adapted_node.udm_model_snapshot == {"id": "udm_model_a", "version": 2}
    assert adapted_node.udm_variable_bindings == [{"local_var": "A_local", "canonical_var": "A"}]


def test_core_adapter_default_compat_silently_ignores_unknown_fields() -> None:
    simulation_input = _simulation_input_with_unknown_fields()

    adapted = simulation_input_to_material_balance_input(simulation_input)

    assert adapted.contract_warnings == []
    assert (getattr(adapted.nodes[0], "model_extra", None) or {}) == {}
    assert (getattr(adapted.edges[0], "model_extra", None) or {}) == {}


def test_core_runtime_models_reject_direct_unknown_fields() -> None:
    with pytest.raises(ValidationError) as node_exc:
        NodeData(
            node_id="n_probe",
            node_type="input",
            is_inlet=True,
            initial_volume=1.0,
            initial_concentrations=[1.0],
            unknown_runtime_node_field_for_test="node-extra",
        )

    with pytest.raises(ValidationError) as edge_exc:
        EdgeData(
            edge_id="e_probe",
            source_node_id="n_probe",
            target_node_id="n_target",
            flow_rate=1.0,
            unknown_runtime_edge_field_for_test="edge-extra",
        )

    assert any(error["loc"] == ("unknown_runtime_node_field_for_test",) for error in node_exc.value.errors())
    assert any(error["loc"] == ("unknown_runtime_edge_field_for_test",) for error in edge_exc.value.errors())


def test_core_adapter_warns_for_unknown_fields_without_rejecting_payload() -> None:
    simulation_input = _simulation_input_with_unknown_fields()

    adapted = simulation_input_to_material_balance_input(
        simulation_input,
        validation_mode="warn",
    )

    warning_paths = {item["path"] for item in adapted.contract_warnings}
    assert warning_paths == {
        "$.unknown_top_level_for_test",
        "$.nodes[0].unknown_node_field_for_test",
        "$.edges[0].unknown_edge_field_for_test",
    }
    assert adapted.contract_warnings[0]["source_id"] == "si_material_balance_minimal"
    assert adapted.nodes[0].node_id == "n_in"
    assert adapted.edges[0].edge_id == "e_in_tank"


def test_core_adapter_strict_rejects_unknown_fields() -> None:
    simulation_input = _simulation_input_with_unknown_fields()

    with pytest.raises(SimulationCoreAdapterError) as exc_info:
        simulation_input_to_material_balance_input(
            simulation_input,
            validation_mode="strict",
        )

    assert str(exc_info.value) == "simulation_input contains unknown fields"
    detail_paths = {item["path"] for item in exc_info.value.details}
    assert detail_paths == {
        "$.unknown_top_level_for_test",
        "$.nodes[0].unknown_node_field_for_test",
        "$.edges[0].unknown_edge_field_for_test",
    }


def test_run_hours_uses_combined_dispatch_for_mixed_models(monkeypatch: pytest.MonkeyPatch) -> None:
    calculator = MaterialBalanceCalculator()
    selected_branches = _install_odeint_branch_spy(monkeypatch)
    kwargs = _run_hours_base_kwargs(calculator)
    kwargs.update(_run_hours_model_kwargs(calculator, ["asm1slim", "asm1", "asm3", "udm"]))

    result = calculator._run_hours(**kwargs)

    assert selected_branches == ["_combined_reaction_ode_balance"]
    assert torch.all(result == 0)


@pytest.mark.parametrize(
    ("enabled_branches", "expected_branch", "should_clamp"),
    [
        (["asm1slim"], "_asm1slim_ode_balance", True),
        (["asm1"], "_asm1_ode_balance", True),
        (["asm3"], "_asm3_ode_balance", True),
        (["udm"], "udm_ode_balance", True),
        ([], "_ode_balance", False),
    ],
)
def test_run_hours_single_model_branch_and_clamp_policy(
    monkeypatch: pytest.MonkeyPatch,
    enabled_branches: list[str],
    expected_branch: str,
    should_clamp: bool,
) -> None:
    calculator = MaterialBalanceCalculator()
    selected_branches = _install_odeint_branch_spy(monkeypatch)
    kwargs = _run_hours_base_kwargs(calculator)
    kwargs.update(_run_hours_model_kwargs(calculator, enabled_branches))

    result = calculator._run_hours(**kwargs)

    assert selected_branches == [expected_branch]
    if should_clamp:
        assert torch.all(result == 0)
    else:
        assert torch.all(result == -1)


def test_mixed_asm_udm_applies_udm_reaction() -> None:
    calculator = MaterialBalanceCalculator()
    calculator.device = torch.device("cpu")
    calculator.dtype = torch.float64

    mixed = calculator.calculate(_mixed_asm_udm_input())
    solo = calculator.calculate(_solo_udm_input())

    mixed_s_s = mixed.node_data["udm1"]["S_S"][-1]
    solo_s_s = solo.node_data["udm1"]["S_S"][-1]
    assert solo_s_s < solo.node_data["udm1"]["S_S"][0] - 1.0
    assert mixed_s_s == pytest.approx(solo_s_s, rel=1e-4, abs=1e-8)


def test_asm_oxygen_zeroing_is_limited_to_active_compute_model_nodes() -> None:
    calculator = MaterialBalanceCalculator()
    dtype = calculator.dtype
    device = calculator.device
    y = torch.zeros(2, len(ASM1_COMPONENTS), dtype=dtype, device=device)
    y[0, ASM1_COMPONENTS.index("S_O")] = 2.0
    y[1, ASM1_COMPONENTS.index("S_O")] = 10.0
    y_extended = torch.cat(
        [y, torch.ones(2, 1, dtype=dtype, device=device)],
        dim=1,
    )
    q_out = torch.tensor([[0.0, 1.0], [0.0, 0.0]], dtype=dtype, device=device)
    prop_a = torch.ones(2, 2, len(ASM1_COMPONENTS), dtype=dtype, device=device)
    prop_b = torch.zeros(2, 2, len(ASM1_COMPONENTS), dtype=dtype, device=device)
    compute_mask = torch.tensor([True, True], dtype=torch.bool, device=device)
    asm1_mask = torch.tensor([True, False], dtype=torch.bool, device=device)
    asm1_params = torch.zeros(2, 19, dtype=dtype, device=device)

    derivative = calculator._asm1_ode_balance(
        0.0,
        y_extended,
        2,
        prop_a,
        prop_b,
        q_out,
        compute_mask,
        asm1_params,
        asm1_mask,
    )

    oxygen_idx = ASM1_COMPONENTS.index("S_O")
    assert derivative[0, oxygen_idx].item() == pytest.approx(0.0)
    assert derivative[1, oxygen_idx].item() == pytest.approx(-8.0)


def test_ode_balance_respects_compute_mask_for_state_and_volume_derivatives() -> None:
    calculator = MaterialBalanceCalculator()
    dtype = calculator.dtype
    device = calculator.device
    y_extended = torch.tensor(
        [
            [10.0, 1.0],
            [0.0, 1.0],
        ],
        dtype=dtype,
        device=device,
    )
    q_out = torch.tensor(
        [
            [0.0, 1.0],
            [0.0, 0.0],
        ],
        dtype=dtype,
        device=device,
    )
    prop_a = torch.ones(2, 2, 1, dtype=dtype, device=device)
    prop_b = torch.zeros(2, 2, 1, dtype=dtype, device=device)
    compute_mask = torch.tensor([False, True], dtype=torch.bool, device=device)

    derivative = calculator._ode_balance(
        0.0,
        y_extended,
        2,
        prop_a,
        prop_b,
        q_out,
        compute_mask,
    )

    assert torch.all(derivative[0] == 0)
    assert derivative[1, -1].item() == pytest.approx(1.0)
