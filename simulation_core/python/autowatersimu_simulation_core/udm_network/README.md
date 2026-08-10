# 目录说明：udm_network

> 类型：contract
> Canonical sources：
> - `contracts/network_process_graph.v1.json`
> - `contracts/network_simulation_input.v1.json`
> - `docs/rebuild/AutoWaterSimu_UDM_v2_Docs/02_技术规格说明.md`

## 1. 目录职责

本目录负责：

- UDM Network v2 graph compiler MVP。
- 把 network process graph / network simulation input payload 归一化为 runtime system。
- node、edge、port、component schema 和 state slice registry 校验。
- Hydraulic / pump edge flow balance solver for fixed、balanced、split、ratio and residual constraints。
- UDM-v2 node reaction/passive evaluator for local component state, parameters, `t` and signals。
- UDM-v2 `takacs_settling.v1` edge transport evaluator for total-solids settling mass flux。
- UDM-v2 pure core RHS assembly for hydraulic/pump advection, settling transport and local reaction contributions。
- UDM Network v2 five-model v1 migration parity gate manifest。
- SecondaryClarifier10Layer reference profile primitive graph generation。

本目录不负责：

- ODE solver / time-step integration beyond pure RHS assembly。
- BSM1 full plant benchmark conformance。
- Worker job lifecycle。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `graph.py` | Edge kind、runtime node/edge dataclasses and compiler error |
| `compiler.py` | `compile_network()` payload-to-runtime compiler |
| `results.py` | compiled system, state slices and edge bundles |
| `flow_balance.py` | `Aq=b` flow balance solver and strict diagnostics |
| `udm_reaction.py` | Passive/reaction-enabled UDM node evaluator and seed model dataclasses |
| `udm_transport.py` | `takacs_settling.v1` transport evaluator and edge transport dataclasses |
| `rhs.py` | Pure core RHS assembly over compiled network systems |
| `parity.py` | Five-model v1/v2 parity migration gate manifest |
| `composites/` | Composite-to-primitive graph generators |

## 3. 维护约定

1. Contract-facing names stay snake_case and mirror `contracts/` payload fields.
2. Explicit node ports are strict; executable inputs without ports may infer ports from edge kind.
3. Compiler errors must carry stable `code` values for API/worker diagnostics.
4. Flow balance only resolves hydraulic/pump edges; settling/signal edges must not enter `Aq=b`。
5. Reaction expressions reuse `material_balance.udm_expression.compile_expression`; do not add a second expression language here.
6. Takacs settling direct `X_TSS` mode uses `v_s * X_TSS * area`; 13-state mode computes `X_TSS=sum(w_i X_i)`, then component raw fluxes `q_s * C_i`, and scales them only if weighted raw TSS flux exceeds the total-flux limiter. `X_ND` has TSS weight 0 but still moves with sludge when included.
7. The v1 migration parity gate must stay closed until every model family has explicit v2 L2 parity evidence.
8. SecondaryClarifier reference profile must generate 10 layers x 8 states/layer with `reaction_enabled=false`。
9. Stream adapters are compile-time bridge metadata for supported schema pairs; RHS execution must fail explicitly until adapter math is implemented.

## 4. 对外接口

本目录暴露 `compile_network()`、`solve_flow_balance()`、`assemble_rhs()`、`build_reaction_model()`、`build_node_reaction_model()`、`evaluate_reaction()`、`build_transport_model()`、`evaluate_transport()`、`build_v1_migration_gate()`、`build_secondary_clarifier_reference_graph()` and dataclasses under `autowatersimu_simulation_core.udm_network`。

## 5. 依赖边界

可以依赖 Python standard library and core package internals。

不应该依赖 FastAPI, Go API, worker CLI, frontend or databases。

## 6. 测试与验证

```powershell
backend\.venv\Scripts\python -m pytest simulation_core\tests\test_udm_network_compiler.py -q
backend\.venv\Scripts\python -m pytest simulation_core\tests\test_udm_network_flow_balance.py -q
backend\.venv\Scripts\python -m pytest simulation_core\tests\test_udm_network_reaction.py -q
backend\.venv\Scripts\python -m pytest simulation_core\tests\test_udm_network_transport.py -q
backend\.venv\Scripts\python -m pytest simulation_core\tests\test_udm_network_rhs.py -q
backend\.venv\Scripts\python -m pytest simulation_core\tests\test_udm_network_parity_gate.py -q
backend\.venv\Scripts\python -m pytest simulation_core\tests\test_udm_network_secondary_clarifier.py -q
```

## 7. AI 操作提示

新增 runtime execution 前先保持 compiler、flow balance、reaction、transport、parity gate and secondary clarifier tests green；不要把 worker artifact/result envelope 写进本目录。
