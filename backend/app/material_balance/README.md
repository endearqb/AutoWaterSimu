# 目录说明：backend/app/material_balance

## 1. 目录职责

本目录保存 legacy backend 的物料衡算、ASM 和 UDM runtime。

本目录负责：

- legacy `MaterialBalanceCalculator`。
- 运行时 Pydantic/SQLModel 输入输出模型。
- ASM1/ASM1Slim/ASM2d/ASM3 runtime helper。
- UDM ODE、表达式绑定和节点 runtime。

本目录不负责：

- HTTP route。
- 数据库 job lifecycle。
- Next worker artifact 写入。

## 2. 核心文件

| 文件/子目录 | 作用 |
|---|---|
| `core.py` | legacy material balance calculator；返回 `autowatersimu_simulation_core.material_balance.models.MaterialBalanceResult` |
| `models.py` | legacy calculation input models and compatibility output model；`MaterialBalanceResult` runtime construction is migrating leaf-by-leaf to simulation_core |
| `asm/` | ASM runtime helper |
| `udm_engine.py`、`udm_ode.py` | UDM runtime and ODE support |
| `utils.py` | legacy helper functions；部分 flowchart 转换逻辑仍可能是薄壳化前的死代码候选 |
| `exceptions.py` | compatibility re-export of `autowatersimu_simulation_core.material_balance.exceptions` |

## 3. 维护约定

1. 这是 legacy 数值基线；迁移到 `simulation_core/` 前必须保留 parity tests。
2. 大时间序列不应写入主表 JSON；route/service 层应只入库 summary 或 artifact reference。
3. 数值相关改动必须补充 targeted tests，避免只通过 API smoke 判断。
4. 与 `simulation_core/python/.../material_balance` 出现差异时，应明确记录是 legacy bugfix 还是 core migration 差异。
5. `exceptions.py` 与 calculator result model 已是第一批 thin-shell leaf；保持 backend/core exception class identity 和 calculator 返回值 class identity，不要重新定义本地异常类或本地构造结果模型。
6. `models.py` 的旧输入模型仍未迁移，不得把 result model leaf 误读为整文件 re-export 或 PR-31 backend thin-shell 主迁移完成。

## 4. 对外接口

本目录对 routes、services、backend tests 和 migration adapter 暴露 calculator、runtime models、ASM/UDM helpers。

## 5. 依赖边界

可以依赖：

- numpy / scipy / torch / torchdiffeq。
- `app.models` 中 legacy API/data models。
- `autowatersimu_simulation_core.material_balance` 的稳定 public surface，仅用于 thin-shell leaf migration。

不应该依赖：

- FastAPI request object。
- frontend store。
- worker process runtime。

## 6. 测试与验证

```powershell
cd backend; .venv\Scripts\python -m pytest app\tests\material_balance_exceptions_thin_shell_test.py app\tests\material_balance_result_thin_shell_test.py -q
cd backend; .venv\Scripts\python -m pytest app\tests\time_segment_validation_test.py app\tests\material_balance_segment_overrides_test.py app\tests\hybrid_udm_validation_test.py app\tests\udm_engine_variable_binding_test.py -q
```

## 7. AI 操作提示

1. 改 `core.py` 或 runtime model 前先搜 route、service、test 和 `simulation_core` parity 用例。
2. 不要为了适配前端临时 payload 直接放宽核心 runtime 语义；应在 adapter/service 层转换。
