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

本目录不负责：

- ODE/time-step integration。
- Takacs transport runtime。
- Worker job lifecycle。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `graph.py` | Edge kind、runtime node/edge dataclasses and compiler error |
| `compiler.py` | `compile_network()` payload-to-runtime compiler |
| `results.py` | compiled system, state slices and edge bundles |
| `flow_balance.py` | `Aq=b` flow balance solver and strict diagnostics |
| `udm_reaction.py` | Passive/reaction-enabled UDM node evaluator and seed model dataclasses |

## 3. 维护约定

1. Contract-facing names stay snake_case and mirror `contracts/` payload fields.
2. Explicit node ports are strict; executable inputs without ports may infer ports from edge kind.
3. Compiler errors must carry stable `code` values for API/worker diagnostics.
4. Flow balance only resolves hydraulic/pump edges; settling/signal edges must not enter `Aq=b`。
5. Reaction expressions reuse `material_balance.udm_expression.compile_expression`; do not add a second expression language here.

## 4. 对外接口

本目录暴露 `compile_network()`、`solve_flow_balance()`、`build_reaction_model()`、`build_node_reaction_model()`、`evaluate_reaction()` and dataclasses under `autowatersimu_simulation_core.udm_network`。

## 5. 依赖边界

可以依赖 Python standard library and core package internals。

不应该依赖 FastAPI, Go API, worker CLI, frontend or databases。

## 6. 测试与验证

```powershell
backend\.venv\Scripts\python -m pytest simulation_core\tests\test_udm_network_compiler.py -q
backend\.venv\Scripts\python -m pytest simulation_core\tests\test_udm_network_flow_balance.py -q
backend\.venv\Scripts\python -m pytest simulation_core\tests\test_udm_network_reaction.py -q
```

## 7. AI 操作提示

新增 runtime execution 前先保持 compiler、flow balance and reaction tests green；不要把 worker artifact/result envelope 写进本目录。
