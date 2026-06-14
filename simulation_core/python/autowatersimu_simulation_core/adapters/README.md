# 目录说明：adapters

## 1. 目录职责

本目录负责把合同 payload 转为 simulation core runtime model。

本目录负责：

- `simulation_input.v1 -> MaterialBalanceInput`，当前支持 `simulation.material_balance.v1`、`simulation.asm1slim.v1`、`simulation.asm1.v1`、`simulation.asm3.v1` 与 `simulation.udm.v1`。
- core adapter validation error 归一化。
- 保持组件顺序、默认值和 time segments 语义。
- 保留 ASM1Slim / ASM1 / ASM3 / UDM 节点 runtime binding 字段，供 material balance runtime 的模型分支使用。

本目录不负责：

- JSON Schema 文件校验。
- worker artifact 输出。
- legacy FastAPI route adapter。

## 2. 核心文件

| 文件/子目录 | 作用 |
|---|---|
| `__init__.py` | adapter public exports |
| `material_balance.py` | material balance simulation input adapter |

## 3. 维护约定

1. 组件顺序以 `component_schema.components` 为唯一来源。
2. 空字符串、`null`、缺失浓度按 legacy 行为转 `0.0`。
3. input/output 缺失 volume 默认 `1.0`；普通 reactor 缺失 volume 返回 validation error。
4. 可选模型字段必须区分“字段缺失”和“显式空数组/空对象”，不得用 truthy fallback 丢弃输入。
5. 本 adapter 与 `backend/app/services/simulation_input_adapter.py` 的字段保留语义必须保持一致。
6. 未知字段策略属于 adapter 输入契约职责；`simulation_input_to_material_balance_input(..., validation_mode="compat")` 是默认兼容路径，静默忽略 adapter 不消费的未知字段；`validation_mode="warn"` 接受 payload 并把未知字段写入 `MaterialBalanceInput.contract_warnings`；`validation_mode="strict"` 在计算前返回 `SimulationCoreAdapterError`。`simulation_input.v1` 的合同字段使用 canonical snake_case，camelCase 模型字段只作为直接调用 adapter 时的迁移兼容路径。worker 当前仍使用默认 `compat`，切换 worker 调用模式前必须同步更新 audit evidence 和 core-only tests。

## 4. 对外接口

本目录对外暴露：

- `AdapterValidationMode`
- `simulation_input_to_material_balance_input`
- `SimulationCoreAdapterError`

## 5. 依赖边界

可以依赖：

- `autowatersimu_simulation_core.material_balance.models`
- `pydantic`

不应该依赖：

- `app.models`
- FastAPI / SQLModel。

## 6. 测试与验证

修改本目录后建议运行：

```powershell
backend\.venv\Scripts\python -m pytest simulation_core\tests -q
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-simulation-core-input-contract.ps1
```

## 7. AI 操作提示

1. 对齐 backend adapter 行为时先补测试再改实现。
2. 不要在 adapter 中执行仿真计算。
3. adapter 错误需要能映射到 `contract_error.v1` 风格。
