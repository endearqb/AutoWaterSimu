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
| `core.py` | legacy material balance calculator |
| `models.py` | legacy calculation input/output models |
| `asm/` | ASM runtime helper |
| `udm_engine.py`、`udm_ode.py` | UDM runtime and ODE support |
| `utils.py`、`exceptions.py` | helper 和异常 |

## 3. 维护约定

1. 这是 legacy 数值基线；迁移到 `simulation_core/` 前必须保留 parity tests。
2. 大时间序列不应写入主表 JSON；route/service 层应只入库 summary 或 artifact reference。
3. 数值相关改动必须补充 targeted tests，避免只通过 API smoke 判断。
4. 与 `simulation_core/python/.../material_balance` 出现差异时，应明确记录是 legacy bugfix 还是 core migration 差异。

## 4. 对外接口

本目录对 routes、services、backend tests 和 migration adapter 暴露 calculator、runtime models、ASM/UDM helpers。

## 5. 依赖边界

可以依赖：

- numpy / scipy / torch / torchdiffeq。
- `app.models` 中 legacy API/data models。

不应该依赖：

- FastAPI request object。
- frontend store。
- worker process runtime。

## 6. 测试与验证

```powershell
cd backend; .venv\Scripts\python -m pytest app\tests\time_segment_validation_test.py app\tests\material_balance_segment_overrides_test.py app\tests\hybrid_udm_validation_test.py app\tests\udm_engine_variable_binding_test.py -q
```

## 7. AI 操作提示

1. 改 `core.py` 或 runtime model 前先搜 route、service、test 和 `simulation_core` parity 用例。
2. 不要为了适配前端临时 payload 直接放宽核心 runtime 语义；应在 adapter/service 层转换。
