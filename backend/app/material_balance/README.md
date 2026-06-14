# 目录说明：backend/app/material_balance

## 1. 目录职责

本目录保存 legacy backend 的物料衡算、ASM 和 UDM runtime。

本目录负责：

- legacy `MaterialBalanceCalculator` import path compatibility；实际 calculator 委托 `simulation_core` runtime。
- compatibility-only legacy Pydantic/SQLModel input/result import paths。
- ASM1/ASM1Slim/ASM2d/ASM3 runtime helper。
- UDM ODE、表达式绑定和节点 runtime。

本目录不负责：

- HTTP route。
- 数据库 job lifecycle。
- Next worker artifact 写入。

## 2. 核心文件

| 文件/子目录 | 作用 |
|---|---|
| `core.py` | compatibility entrypoint that re-exports `autowatersimu_simulation_core.material_balance.core.MaterialBalanceCalculator` |
| `models.py` | compatibility-only legacy local input/result import path；not the active runtime input contract for new backend/core migration work |
| `asm/` | ASM runtime helper |
| `udm_engine.py`、`udm_ode.py` | UDM runtime and ODE support |
| `utils.py` | compatibility re-export of `autowatersimu_simulation_core.material_balance.utils` |
| `exceptions.py` | compatibility re-export of `autowatersimu_simulation_core.material_balance.exceptions` |

## 3. 维护约定

1. `core.py` 是 backend calculator 兼容入口，不再保存独立 calculator implementation；`simulation_core` 是实际 runtime calculator。
2. 大时间序列不应写入主表 JSON；route/service 层应只入库 summary 或 artifact reference。
3. 数值相关改动必须补充 targeted tests，避免只通过 API smoke 判断。
4. 与 `simulation_core/python/.../material_balance` 出现差异时，应明确记录是 legacy bugfix 还是 core migration 差异。
5. `core.py`、`exceptions.py`、calculator result model 与 `utils.py` 已 thin-shell 化；保持 backend/core calculator class identity、exception class identity、calculator 返回值 class identity 和 utility helper object identity，不要重新定义本地 calculator、异常类、本地构造结果模型或本地复制 utility helper。
6. `models.py` 的旧输入模型只保留 compatibility-only import path；legacy FastAPI route schema 仍来自 `app.models.MaterialBalanceInput`，新 backend/core migration work 的 runtime input contract 应显式使用 `autowatersimu_simulation_core.material_balance.models.MaterialBalanceInput`。
7. `models.py` 的旧本地输入模型、ASM/UDM helpers 仍未迁移，不得把 calculator thin shell 误读为整文件 re-export、legacy route schema 变更、worker strict mode 变更或热路径性能优化完成。

## 4. 对外接口

本目录对 routes、services、backend tests 和 migration adapter 暴露 calculator compatibility path、legacy compatibility models、ASM/UDM helpers。

## 5. 依赖边界

可以依赖：

- numpy / scipy / torch / torchdiffeq。
- `app.models` 中 legacy API/data models。
- `autowatersimu_simulation_core.material_balance` 的稳定 public surface，用于 calculator/runtime thin-shell compatibility。

不应该依赖：

- FastAPI request object。
- frontend store。
- worker process runtime。

## 6. 测试与验证

```powershell
cd backend; .venv\Scripts\python -m pytest app\tests\material_balance_exceptions_thin_shell_test.py app\tests\material_balance_result_thin_shell_test.py app\tests\material_balance_utils_thin_shell_test.py -q
cd backend; .venv\Scripts\python -m pytest app\tests\material_balance_calculator_thin_shell_test.py app\tests\services\simulation_input_adapter_boundary_test.py app\tests\material_balance_calculator_delegation_preflight_test.py -q
cd backend; .venv\Scripts\python -m pytest app\tests\time_segment_validation_test.py app\tests\material_balance_segment_overrides_test.py app\tests\hybrid_udm_validation_test.py app\tests\udm_engine_variable_binding_test.py -q
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-simulation-core-boundary.ps1
```

## 7. AI 操作提示

1. 改 `core.py` 或 runtime model 前先搜 route、service、test 和 `simulation_core` parity 用例。
2. 不要为了适配前端临时 payload 直接放宽核心 runtime 语义；应在 adapter/service 层转换。
