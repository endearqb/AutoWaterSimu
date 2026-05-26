# 目录说明：autowatersimu_simulation_core

## 1. 目录职责

本目录负责 AutoWaterSimu Next 的纯 Python simulation core package。

本目录负责：

- material balance runtime 的公开 import surface。
- `simulation_input.v1` 到 core runtime model 的 adapter。
- core-side validation error 到 `contract_error.v1` 风格的映射。

本目录不负责：

- 读取 worker CLI 参数。
- 写 artifact。
- 管理 job 状态或事件。

## 2. 核心文件

| 文件/子目录 | 作用 |
|---|---|
| `__init__.py` | core package version |
| `adapters/` | 合同 payload 到 runtime model 的转换层 |
| `errors.py` | core adapter 错误类型 |
| `material_balance/` | material balance 计算器、模型和运行时依赖 |

## 3. 维护约定

1. 公开 import surface 变更时同步更新 worker README 和测试。
2. adapter 必须返回 core 包内的模型，不能返回 backend SQLModel。
3. 与 legacy backend 的数值差异必须通过测试显式说明。

## 4. 对外接口

本目录对外暴露：

- `autowatersimu_simulation_core.material_balance.MaterialBalanceCalculator`
- `autowatersimu_simulation_core.material_balance.MaterialBalanceInput`
- `autowatersimu_simulation_core.adapters.simulation_input_to_material_balance_input`
- `autowatersimu_simulation_core.errors.SimulationCoreAdapterError`

## 5. 依赖边界

可以依赖：

- 本包内部模块。
- 科学计算库。

不应该依赖：

- `app.*`
- FastAPI / SQLModel / 数据库。

## 6. 测试与验证

修改本目录后建议运行：

```powershell
backend\.venv\Scripts\python -m pytest simulation_core\tests -q
```

## 7. AI 操作提示

1. 先确认 import boundary 测试仍能在没有 `backend/` 的 `PYTHONPATH` 下通过。
2. 不要在 adapter 中读取文件系统、数据库或环境变量。
3. 保持 worker-facing API 小而稳定。
